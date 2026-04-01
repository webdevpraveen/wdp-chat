const express = require("express");
const app = express();
const http = require("http").createServer(app);
const cors = require("cors");

// Middleware
app.use(cors());

// Socket.io initialization
const io = require("socket.io")(http, { 
  cors: { origin: "*" } 
});

// State Management
let mutedUsers = new Set();
let onlineUsers = {}; // uid -> true
let userSockets = {}; // uid -> socketId
let userNicknames = {}; // uid -> nickname (if set)
let adminSockets = new Set(); // socketId set
let disconnectTimeouts = {}; // uid -> timeoutId

let chatHistory = [];
let dmHistory = [];

/**
 * Utility: Generate a unique Room ID for DMs
 */
function makeRoomId() {
  return "dm-" + Math.random().toString(36).slice(2, 9);
}

/**
 * Utility: Current time in IST (UTC+5:30)
 */
function istTimestamp() {
  const d = new Date();
  // Simple offset for IST
  let hr = d.getUTCHours() + 5;
  let min = d.getUTCMinutes() + 30;
  if (min >= 60) { hr++; min -= 60; }
  hr = (hr + 24) % 24;
  const ampm = hr >= 12 ? "PM" : "AM";
  hr = hr % 12 || 12;
  min = min.toString().padStart(2, "0");
  return `${hr}:${min} ${ampm}`;
}

/**
 * Utility: Cleanup logs older than 60 minutes to keep memory usage low
 */
function cleanupOld() {
  const cutoff = Date.now() - 3600 * 1000;
  chatHistory = chatHistory.filter(m => m._t >= cutoff);
  dmHistory = dmHistory.filter(m => m._t >= cutoff);
  console.log(`[CLEANUP] Chat history pruned to ${chatHistory.length} messages.`);
}

setInterval(cleanupOld, 300000); // Every 5 minutes

// Health Check Endpoint
app.get("/_ping", (req, res) => {
  res.status(200).send("pong");
});

io.on("connection", socket => {
  console.log(`[CONNECTED] socket.id: ${socket.id}`);

  // Admin Registration
  socket.on("registerAdmin", () => {
    adminSockets.add(socket.id);
    io.to(socket.id).emit("adminUpdateOnline", Object.keys(onlineUsers));
    console.log(`[ADMIN] registered: ${socket.id}`);
  });

  // User Joins
  socket.on("userConnected", userId => {
    socket.data.userId = userId;

    // Grace period logic: if user reconnected within 5s, clear the disconnect timeout
    if (disconnectTimeouts[userId]) {
      clearTimeout(disconnectTimeouts[userId]);
      delete disconnectTimeouts[userId];
    }

    const wasAlreadyOnline = !!onlineUsers[userId];
    onlineUsers[userId] = true;
    userSockets[userId] = socket.id;

    console.log(`[USER] ${userId} connected via ${socket.id} (Resumed: ${wasAlreadyOnline})`);

    // Only broadcast "joined" if they weren't already online during the grace period
    if (!wasAlreadyOnline) {
      io.emit("onlineList", Object.keys(onlineUsers));
      io.emit("userJoinedEvent", userId);
    }
    
    // Load last 60m of history
    const lastChat = chatHistory.map(m => ({
      userId: m.userId,
      nickname: userNicknames[m.userId] || null,
      text: m.text,
      timestamp: m.timestamp,
      isAdmin: m.isAdmin,
      reactions: m.reactions || {},
      replyTo: m.replyTo || null
    }));
    socket.emit("loadHistory", lastChat);

    // Update admins
    adminSockets.forEach(sid => {
      io.to(sid).emit("adminUpdateOnline", Object.keys(onlineUsers).map(u => ({ uid: u, nick: userNicknames[u] || null })));
    });
  });

  // Nickname Update
  socket.on("updateNickname", data => {
    const { userId, nickname } = data;
    if (nickname && nickname.trim().length > 0) {
      userNicknames[userId] = nickname.trim().slice(0, 25);
      io.emit("onlineList", Object.keys(onlineUsers).map(u => ({ uid: u, nick: userNicknames[u] || null })));
    }
  });

  // Typing Events
  socket.on("typing", uid => socket.broadcast.emit("userTyping", uid));
  socket.on("stopTyping", uid => socket.broadcast.emit("userStopTyping", uid));

  // Chat Messages
  socket.on("chatMessage", msg => {
    // Spam/Mute Check
    if (mutedUsers.has("all") || mutedUsers.has(msg.userId)) return;
    
    const entry = {
      id: "m-" + Date.now() + Math.random().toString(36).slice(2, 5),
      userId: msg.userId,
      nickname: userNicknames[msg.userId] || null,
      text: msg.text,
      timestamp: istTimestamp(),
      isAdmin: !!msg.isAdmin,
      reactions: {},
      replyTo: msg.replyTo || null,
      _t: Date.now()
    };
    
    chatHistory.push(entry);
    io.emit("chatMessage", entry);
  });

  // Real-time Reaction Sync
  socket.on("messageReact", data => {
    const { msgId, emoji, userId } = data;
    const msg = chatHistory.find(m => m.id === msgId);
    if (msg) {
      if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
      const idx = msg.reactions[emoji].indexOf(userId);
      if (idx > -1) msg.reactions[emoji].splice(idx, 1);
      else msg.reactions[emoji].push(userId);
      
      io.emit("messageReactUpdate", { msgId, emoji, userList: msg.reactions[emoji] });
    }
  });

  // DM Messaging Logic
  socket.on("privateMessage", data => {
    if (mutedUsers.has("all") || mutedUsers.has(data.from) || mutedUsers.has(data.to)) return;

    const msg = {
      from: data.from,
      to: data.to,
      text: data.text,
      timestamp: istTimestamp(),
      isDM: true,
      _t: Date.now()
    };

    dmHistory.push(msg);

    const s1 = userSockets[data.to];
    const s2 = userSockets[data.from];

    if (s1) io.to(s1).emit("privateMessage", msg);
    if (s2) io.to(s2).emit("privateMessage", msg);

    // Notify admins about the DM activity (metadata only)
    adminSockets.forEach(sid => {
      io.to(sid).emit("adminNewDM", {
        from: msg.from,
        to: msg.to,
        timestamp: msg.timestamp
      });
    });
  });

  // DM Invitations
  socket.on("dmInvite", data => {
    const from = data.from;
    const to = data.to;
    const target = userSockets[to];

    if (!target) {
      io.to(socket.id).emit("dmInviteFailed", { to, reason: "User is offline" });
      return;
    }

    const roomId = makeRoomId();
    io.to(target).emit("incomingDmInvite", { from, to, roomId });
    io.to(socket.id).emit("dmInviteSent", { to, roomId });
  });

  socket.on("dmInviteResponse", data => {
    const { from, to, roomId, accept } = data;
    const inviterSid = userSockets[from];
    const targetSid = userSockets[to];

    if (accept) {
      if (inviterSid) io.to(inviterSid).emit("dmInviteAccepted", { roomId, from, to });
      if (targetSid) io.to(targetSid).emit("dmInviteAccepted", { roomId, from, to });
    } else {
      if (inviterSid) io.to(inviterSid).emit("dmInviteDeclined", { from, to });
    }
  });

  // Admin Controls
  socket.on("adminClearChat", () => {
    chatHistory = [];
    io.emit("clearChatNow");
    console.log("[ADMIN] Chat history cleared");
  });

  socket.on("adminMuteAll", () => {
    mutedUsers.add("all");
    io.emit("muteAllNow");
    console.log("[ADMIN] All users muted");
  });

  socket.on("adminUnmuteAll", () => {
    mutedUsers.clear();
    io.emit("unmuteAllNow");
    console.log("[ADMIN] All users unmuted");
  });

  socket.on("adminRequestDmLogs", () => {
    const cutoff = Date.now() - 3600 * 1000;
    const recentDM = dmHistory.filter(m => m._t >= cutoff);
    
    // Group DMs into sessions for admin view
    const sessions = {};
    recentDM.forEach(m => {
      const key = [m.from, m.to].sort().join("--");
      if (!sessions[key]) {
        sessions[key] = {
          a: m.from,
          b: m.to,
          started: m.timestamp,
          count: 0
        };
      }
      sessions[key].count++;
    });

    io.to(socket.id).emit("adminDmLogs", Object.values(sessions));
  });

  // Disconnect Handling
  socket.on("disconnect", () => {
    const uid = socket.data.userId;
    console.log(`[DISCONNECT] sid: ${socket.id}, uid: ${uid}`);

    adminSockets.delete(socket.id);

    if (uid) {
      // Don't announce "left" immediately. Wait 5s for potential refresh/reconnect.
      disconnectTimeouts[uid] = setTimeout(() => {
        delete onlineUsers[uid];
        delete userSockets[uid];
        delete disconnectTimeouts[uid];

        io.emit("onlineList", Object.keys(onlineUsers));
        io.emit("userLeftEvent", uid);

        // Update admins
        adminSockets.forEach(sid => {
          io.to(sid).emit("adminUpdateOnline", Object.keys(onlineUsers));
        });
        console.log(`[USER] ${uid} officially left after grace period.`);
      }, 5000); 
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`[SERVER] listening on port ${PORT}`);
});

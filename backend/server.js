const express = require("express");
const app = express();
const http = require("http").createServer(app);
const cors = require("cors");
app.use(cors());

const io = require("socket.io")(http, { cors: { origin: "*" } });

let mutedUsers = new Set();
let onlineUsers = {};
let userSockets = {};
let adminSockets = new Set();

let chatHistory = [];
let dmHistory = [];

// -----------------------
function makeRoomId() {
  return "dm-" + Math.random().toString(36).slice(2, 9);
}

function istTimestamp() {
  const d = new Date();
  let hr = d.getUTCHours() + 5;
  let min = d.getUTCMinutes() + 30;
  if (min >= 60) { hr++; min -= 60; }
  hr = (hr + 24) % 24;
  const ampm = hr >= 12 ? "PM" : "AM";
  hr = hr % 12 || 12;
  min = min.toString().padStart(2, "0");
  return `${hr}:${min} ${ampm}`;
}

function cleanupOld() {
  const cutoff = Date.now() - 3600 * 1000;
  chatHistory = chatHistory.filter(m => m._t >= cutoff);
  dmHistory = dmHistory.filter(m => m._t >= cutoff);
}

setInterval(cleanupOld, 60000);

// -----------------------
io.on("connection", socket => {

  socket.on("registerAdmin", () => {
    adminSockets.add(socket.id);
    socket.emit("adminUpdateOnline", Object.keys(onlineUsers));
  });

  socket.on("userConnected", userId => {
    socket.data.userId = userId;
    onlineUsers[userId] = true;
    userSockets[userId] = socket.id;

    io.emit("onlineList", Object.keys(onlineUsers));
    io.emit("userJoinedEvent", userId);

    const lastChat = chatHistory.map(m => ({
      userId: m.userId,
      text: m.text,
      timestamp: m.timestamp,
      isAdmin: m.isAdmin
    }));
    socket.emit("loadHistory", lastChat);

    adminSockets.forEach(sid => {
      io.to(sid).emit("adminUpdateOnline", Object.keys(onlineUsers));
    });
  });

  socket.on("typing", uid => socket.broadcast.emit("userTyping", uid));
  socket.on("stopTyping", uid => socket.broadcast.emit("userStopTyping", uid));

  socket.on("chatMessage", msg => {
    if (mutedUsers.has("all") || mutedUsers.has(msg.userId)) return;
    const entry = {
      userId: msg.userId,
      text: msg.text,
      timestamp: istTimestamp(),
      isAdmin: !!msg.isAdmin,
      _t: Date.now()
    };
    chatHistory.push(entry);
    io.emit("chatMessage", entry);
  });

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

    adminSockets.forEach(sid => {
      io.to(sid).emit("adminNewDM", {
        from: msg.from,
        to: msg.to,
        timestamp: msg.timestamp
      });
    });
  });

  socket.on("dmInvite", data => {
    const from = data.from;
    const to = data.to;
    const target = userSockets[to];

    if (!target) {
      io.to(socket.id).emit("dmInviteFailed", { to, reason: "User offline" });
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

  socket.on("pinMessage", text => io.emit("pinnedNow", text || ""));
  socket.on("unpinMessage", () => io.emit("pinnedNow", ""));

  socket.on("adminClearChat", () => {
    chatHistory = [];
    io.emit("clearChatNow");
  });

  socket.on("adminMuteAll", () => {
    mutedUsers.add("all");
    io.emit("muteAllNow");
  });

  socket.on("adminUnmuteAll", () => {
    mutedUsers.clear();
    io.emit("unmuteAllNow");
  });

  socket.on("adminRequestDmLogs", () => {
    const cutoff = Date.now() - 3600 * 1000;

    const recent = dmHistory
      .filter(m => m._t >= cutoff)
      .map(m => ({
        from: m.from,
        to: m.to,
        timestamp: m.timestamp,
        textLength: m.text.length
      }));

    const sessions = {};

    recent.forEach(m => {
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

  socket.on("disconnect", () => {
    const uid = socket.data.userId;

    adminSockets.delete(socket.id);

    if (uid) {
      delete onlineUsers[uid];
      delete userSockets[uid];
      io.emit("onlineList", Object.keys(onlineUsers));
      io.emit("userLeftEvent", uid);

      adminSockets.forEach(sid => {
        io.to(sid).emit("adminUpdateOnline", Object.keys(onlineUsers));
      });
    }
  });
});

http.listen(3000, () => {
  console.log("Server started on port 3000");
});

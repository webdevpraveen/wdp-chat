const express = require("express");
const app = express();
const http = require("http").createServer(app);
const cors = require("cors");
app.use(cors());
const io = require("socket.io")(http, { cors: { origin: "*" } });

let mutedUsers = new Set();
let onlineUsers = {};
let userSockets = {};

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

io.on("connection", (socket) => {

  socket.on("userConnected", (userId) => {
    socket.data.userId = userId;
    onlineUsers[userId] = true;
    userSockets[userId] = socket.id;
    io.emit("onlineList", Object.keys(onlineUsers));
    io.emit("userJoinedEvent", userId);
  });

  socket.on("typing", (userId) => {
    socket.broadcast.emit("userTyping", userId);
  });

  socket.on("stopTyping", (userId) => {
    socket.broadcast.emit("userStopTyping", userId);
  });

  socket.on("chatMessage", (msg) => {
    if (mutedUsers.has("all") || mutedUsers.has(msg.userId)) return;
    msg.timestamp = istTimestamp();
    io.emit("chatMessage", msg);
  });

  socket.on("privateMessage", (data) => {
    if (mutedUsers.has("all") || mutedUsers.has(data.from) || mutedUsers.has(data.to)) return;
    const msg = {
      from: data.from,
      to: data.to,
      text: data.text,
      timestamp: istTimestamp(),
      isDM: true
    };
    const targetSocket = userSockets[data.to];
    if (targetSocket) io.to(targetSocket).emit("privateMessage", msg);
    socket.emit("privateMessage", msg);
  });

  socket.on("dmInvite", (data) => {
    const from = data.from;
    const to = data.to;
    const targetSocket = userSockets[to];
    const inviterSocket = socket.id;
    if (!targetSocket) {
      io.to(inviterSocket).emit("dmInviteFailed", { to, reason: "User offline" });
      return;
    }
    const roomId = makeRoomId();
    io.to(targetSocket).emit("incomingDmInvite", { from, to, roomId });
    io.to(inviterSocket).emit("dmInviteSent", { to, roomId });
  });

  socket.on("dmInviteResponse", (data) => {
    const { from, to, roomId, accept } = data;
    const inviterSid = userSockets[from];
    const targetSid = userSockets[to] || socket.id;

    if (accept) {
      if (inviterSid) io.to(inviterSid).emit("dmInviteAccepted", { roomId, from, to });
      if (targetSid) io.to(targetSid).emit("dmInviteAccepted", { roomId, from, to });
    } else {
      if (inviterSid) io.to(inviterSid).emit("dmInviteDeclined", { from, to, roomId });
    }
  });

  socket.on("pinMessage", (text) => {
    io.emit("pinnedNow", text || "");
  });

  socket.on("unpinMessage", () => {
    io.emit("pinnedNow", "");
  });

  socket.on("adminClearChat", () => {
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

  socket.on("disconnect", () => {
    const uid = socket.data.userId;
    if (uid) {
      delete onlineUsers[uid];
      delete userSockets[uid];
      io.emit("onlineList", Object.keys(onlineUsers));
      io.emit("userLeftEvent", uid);
    }
  });
});

http.listen(3000, () => {
  console.log("Server started on port 3000");
});

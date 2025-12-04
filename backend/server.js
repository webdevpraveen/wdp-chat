const express = require("express");
const app = express();
const http = require("http").createServer(app);
const cors = require("cors");
app.use(cors());
const io = require("socket.io")(http, { cors: { origin: "*" } });

let mutedUsers = new Set();
let onlineUsers = {};
let userSockets = {};

function istTimestamp() {
  const d = new Date();
  let hr = d.getUTCHours() + 5;
  let min = d.getUTCMinutes() + 30;
  if (min >= 60) { hr++; min -= 60; }
  hr = (hr + 24) % 24;
  const ampm = hr >= 12 ? "PM" : "AM";
  const displayHr = hr % 12 || 12;
  return `${displayHr}:${min.toString().padStart(2, "0")} ${ampm}`;
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
      id: data.id || (Date.now().toString(36) + Math.random().toString(36).slice(2,8)),
      from: data.from,
      to: data.to,
      text: data.text,
      timestamp: istTimestamp(),
      isDM: true
    };
    const targetSocketId = userSockets[data.to];
    if (targetSocketId) {
      io.to(targetSocketId).emit("privateMessage", msg, (ack) => {
        // recipient acknowledged receipt -> mark delivered for sender
        io.to(socket.id).emit("dmDelivered", { id: msg.id, to: msg.to });
      });
    }
    // Also send copy back to sender so sender sees their own message immediately
    socket.emit("privateMessage", msg);
  });

  socket.on("dmSeen", (data) => {
    // data: { id, from, to }
    const senderSocketId = userSockets[data.from];
    const receiverSocketId = userSockets[data.to];
    if (senderSocketId) {
      io.to(senderSocketId).emit("dmSeenUpdate", { id: data.id, from: data.from, to: data.to });
    }
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("dmSeenUpdate", { id: data.id, from: data.from, to: data.to });
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

http.listen(process.env.PORT || 3000, () => {
  console.log("Server started on port", process.env.PORT || 3000);
});

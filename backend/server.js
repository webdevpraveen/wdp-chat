const express = require("express");
const app = express();
const http = require("http").createServer(app);
const cors = require("cors");
app.use(cors());

const io = require("socket.io")(http, {
  cors: { origin: "*" }
});

let mutedUsers = new Set();
let onlineUsers = {};
let pinnedMessage = "";

io.on("connection", (socket) => {

  socket.on("userConnected", (userId) => {
    socket.data.userId = userId;
    onlineUsers[userId] = true;

    io.emit("onlineList", Object.keys(onlineUsers));

    io.emit("chatMessage", {
      text: `👋 Welcome ${userId} to SRMU Web Chat!`,
      userId: "System",
      isWelcome: true
    });

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

    const d = new Date();
    let hr = d.getUTCHours() + 5;
    let min = d.getUTCMinutes() + 30;
    if (min >= 60) { hr++; min -= 60; }
    hr = (hr + 24) % 24;
    let ampm = hr >= 12 ? "PM" : "AM";
    hr = hr % 12 || 12;
    min = min.toString().padStart(2, "0");

    msg.timestamp = `${hr}:${min} ${ampm}`;

    io.emit("chatMessage", msg);
  });


  socket.on("pinMessage", (text) => {
    pinnedMessage = text;
    io.emit("pinnedNow", pinnedMessage);
  });

  socket.on("unpinMessage", () => {
    pinnedMessage = "";
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
      io.emit("onlineList", Object.keys(onlineUsers));
      io.emit("userLeftEvent", uid);
    }
  });
});

http.listen(3000, () => console.log("Server running on 3000"));

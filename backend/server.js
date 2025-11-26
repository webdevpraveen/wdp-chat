const express = require("express");
const app = express();
const http = require("http").createServer(app);
const cors = require("cors");
app.use(cors());

const io = require("socket.io")(http, {
  cors: { origin: "*" }
});

let mutedUsers = new Set();

io.on("connection", (socket) => {

  socket.on("userConnected", (userId) => {
    socket.data.userId = userId;
    io.emit("userJoined", userId);
  });

  socket.on("typing", (userId) => {
    socket.broadcast.emit("userTyping", userId);
  });

  socket.on("stopTyping", (userId) => {
    socket.broadcast.emit("userStopTyping", userId);
  });

  socket.on("chatMessage", (msg) => {
    if (mutedUsers.has("all") || mutedUsers.has(msg.userId)) return;
    io.emit("chatMessage", msg);
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
    if (uid) io.emit("userLeft", uid);
  });

});

http.listen(3000, () => {
  console.log("Server started on port 3000");
});

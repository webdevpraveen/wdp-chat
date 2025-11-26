const express = require("express");
const app = express();
const http = require("http").createServer(app);

const cors = require("cors");
app.use(cors());

const io = require("socket.io")(http, {
  cors: {
    origin: "*",
  },
});

// MEMORY STORE (Temporary)
let mutedUsers = new Set();

io.on("connection", (socket) => {
  console.log("User connected");

  // ---- TYPING EVENTS ----
  socket.on("typing", (userId) => {
    socket.broadcast.emit("userTyping", userId);
  });

  socket.on("stopTyping", (userId) => {
    socket.broadcast.emit("userStopTyping", userId);
  });

  // ---- NORMAL MESSAGE ----
  socket.on("chatMessage", (msg) => {
    // If "all" muted OR specific userID muted => block message
    if (mutedUsers.has("all") || mutedUsers.has(msg.userId)) return;

    io.emit("chatMessage", msg);
  });

  // ---- ADMIN: CLEAR CHAT ----
  socket.on("adminClearChat", () => {
    io.emit("clearChatNow");
  });

  // ---- ADMIN: MUTE ALL ----
  socket.on("adminMuteAll", () => {
    mutedUsers.add("all");
    io.emit("muteAllNow");
  });

  // ---- ADMIN: UNMUTE ALL ----
  socket.on("adminUnmuteAll", () => {
    mutedUsers.clear();
    io.emit("unmuteAllNow");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

http.listen(3000, () => {
  console.log("Server started on port 3000");
});

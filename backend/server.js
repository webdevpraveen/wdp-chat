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

  socket.on("typing", (userId) => {
    socket.broadcast.emit("userTyping", userId);
});

socket.on("stopTyping", (userId) => {
    socket.broadcast.emit("userStopTyping", userId);
});

  // Normal message
  socket.on("chatMessage", (msg) => {
    if (mutedUsers.has(msg.userId)) return; 
    io.emit("chatMessage", msg);
  });

  // ADMIN: Clear chat
  socket.on("adminClearChat", () => {
    io.emit("clearChatNow");
  });

  // ADMIN: Mute all
  socket.on("adminMuteAll", () => {
    mutedUsers = new Set(["all"]);
    io.emit("muteAllNow");
  });

  // ADMIN: Unmute all
  socket.on("adminUnmuteAll", () => {
    mutedUsers = new Set();
    io.emit("unmuteAllNow");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

http.listen(3000, () => {
  console.log("Server started on port 3000");
});

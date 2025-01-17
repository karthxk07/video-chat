const { Server } = require("socket.io");
const express = require("express");
const { createServer } = require("node:http");
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const cors = require("cors");

app.use(cors());

io.on("connection", (socket) => {
  let roomId;
  socket.on("join", (message) => {
    roomId = message.roomId;
    console.log(`User ${socket.id} joined the room : ${roomId}`);
    socket.join(roomId);
  });
  socket.on("offer", (offer) => {
    console.log("Received offer", offer);
    socket.to(roomId).emit("offer", offer);
  });
  socket.on("answer", (answer) => {
    socket.to(roomId).emit("answer", answer);
  });
  socket.on("new-ice-candidate", (answer) => {
    console.log(answer);
    socket.to(roomId).emit("new-ice-candidate", answer);
  });
});

server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});

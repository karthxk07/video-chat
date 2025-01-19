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
app.use(express.json());

const rooms = {};

io.on("connection", (socket) => {
  let roomId;
  socket.on("join", async (message) => {
    roomId = message.roomId;
    console.log(`User ${socket.id} joined the room : ${roomId}`);
    socket.join(roomId);
    rooms[roomId].push(socket.id);
    console.log(rooms);
  });
  socket.on("offer", (offer) => {
    socket.to(roomId).emit("offer", offer);
  });
  socket.on("answer", (answer) => {
    socket.to(roomId).emit("answer", answer);
  });
  socket.on("new-ice-candidate", (answer) => {
    socket.to(roomId).emit("new-ice-candidate", answer);
  });
  socket.on("disconnect", () => {
    console.log(`User ${socket.id} disconnected`);
    if (rooms[roomId]) {
      if (rooms[roomId].includes(socket.id)) {
        rooms[roomId] = rooms[roomId].filter((user) => user != socket.id);
        if (rooms[roomId].length <= 0) delete rooms[roomId];
      } else {
        console.log(`User ${socket.id} not found in any room`);
      }
    }
    console.log(rooms);
  });
});

app.get("/createRoom", (req, res) => {
  const newRoom = { id: Date.now(), users: [] };
  rooms[Date.now()] = [];
  console.log(rooms);
  res.json(newRoom);
});

app.get("/joinRoom/:roomId", (req, res) => {
  const roomId = parseInt(req.params.roomId);
  if (rooms[roomId] && rooms[roomId].length <= 1) {
    res.json(roomId);
  } else {
    res.status(400).json({ error: "Room full or not found" });
  }
});

server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});

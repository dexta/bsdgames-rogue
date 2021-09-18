//index.js
const express = require('express');
const cors = require('cors');
const app = express();
const server = require('http').Server(app);
const SocketService = require("./SocketService");

app.use(express.static('frontend'));
app.use(cors());
// app.options('*', cors());
const port = 3000;

server.listen(port, function () {
  console.log("Server listening on : ", port);
  const socketService = new SocketService();

  // We are going to pass server to socket.io in SocketService.js
  socketService.attachServer(server);
});
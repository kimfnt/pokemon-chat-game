const socketio = require('socket.io');

module.exports = function (server) {
  // io server
  const io = socketio(server);

  const FACING_DOWN = 0;
  const FACING_LEFT = 1;
  const FACING_RIGHT = 2;
  const FACING_UP = 3;
  const CYCLE_LOOP = [0, 1, 2, 3];
  const FRAME_LIMIT = 4;

  var frameCount = 0;
  var currentLoopIndex = 0;
  const players = {};


  io.on('connection', function (socket) {

    const canTalkTo = [];

    socket.on('new player', (name, pokemon) => {
      do {
        var x = Math.floor(Math.random() * (600 - 200 + 1) + 200);
        var y = Math.floor(Math.random() * (500 - 100 + 1) + 100);
      } while (map.layers[calculateDest(x, y)] != 0);

      players[socket.id] = {
        x: x,
        y: y,
        id: socket.id,
        speed: 4,
        name: name,
        pokemon: pokemon,
        direction: FACING_DOWN,
        pos: CYCLE_LOOP[currentLoopIndex]
      }

      socket.username = name;
      socket.broadcast.emit("join", name);
    });

    socket.on('check-user', (data) => {
      var answer = false;
      for (var i = 0; i < canTalkTo.length; i++) {
        if (canTalkTo[i].id == data.id) {

          answer = true;
          if (canTalkTo[i].answer == "yes") {

            var ans = canTalkTo[i].answer;
            var id = socket.id;
            socket.to(data.id).emit('start-chat-possible', { ans, id });
          } else {
            console.log("You don't want to talk");
          }
        }
      }
      if (answer == false) {
        socket.emit("ask-to-talk", data);
      }
    });

    socket.on('talking', (data) => {

      canTalkTo.push({
        id: data.id,
        answer: data.answer
      });

    });

    socket.on('check-answer', (data) => {

      for (var i = 0; i < canTalkTo.length; i++) {
        if (canTalkTo[i].id == data.id && canTalkTo[i].answer == data.ans) {
          socket.to(data.id).emit('open-chat', { username: socket.username });
        }
      }
    });

    socket.on('new message', (data) => {

      socket.to(data.id).emit("new message", {
        message: data.message,
        username: socket.username,
        time: data.time
      });
    });

    socket.on('move left', function () {
      var oldX = players[socket.id].x;
      players[socket.id].x -= players[socket.id].speed;
      players[socket.id].direction = FACING_LEFT;

      frameCount++;

      if (frameCount >= FRAME_LIMIT) {
        frameCount = 0;
        currentLoopIndex++;
        if (currentLoopIndex >= CYCLE_LOOP.length) {
          currentLoopIndex = 0;
        }
        players[socket.id].pos = CYCLE_LOOP[currentLoopIndex];
      }

      if (map.layers[calculateDest(players[socket.id].x, players[socket.id].y + 32)] == 1) {
        players[socket.id].x = oldX;
      }
    });

    socket.on('move up', function () {
      var oldY = players[socket.id].y;
      players[socket.id].y -= players[socket.id].speed;
      players[socket.id].direction = FACING_UP;

      frameCount++;

      if (frameCount >= FRAME_LIMIT) {
        frameCount = 0;
        currentLoopIndex++;
        if (currentLoopIndex >= CYCLE_LOOP.length) {
          currentLoopIndex = 0;
        }
        players[socket.id].pos = CYCLE_LOOP[currentLoopIndex];
      }

      if (map.layers[calculateDest(players[socket.id].x + 32, players[socket.id].y + 16)] == 1) {
        players[socket.id].y = oldY;
      }

    });

    socket.on('move right', function () {

      var oldX = players[socket.id].x;

      players[socket.id].x += players[socket.id].speed;
      players[socket.id].direction = FACING_RIGHT;

      frameCount++;

      if (frameCount >= FRAME_LIMIT) {
        frameCount = 0;
        currentLoopIndex++;
        if (currentLoopIndex >= CYCLE_LOOP.length) {
          currentLoopIndex = 0;
        }
        players[socket.id].pos = CYCLE_LOOP[currentLoopIndex];
      }

      if (map.layers[calculateDest(players[socket.id].x + 32, players[socket.id].y + 32)] == 1) {
        players[socket.id].x = oldX;
      }

    });

    socket.on('move down', function () {

      var oldY = players[socket.id].y;

      players[socket.id].y += players[socket.id].speed;
      players[socket.id].direction = FACING_DOWN;

      frameCount++;

      if (frameCount >= FRAME_LIMIT) {
        frameCount = 0;
        currentLoopIndex++;
        if (currentLoopIndex >= CYCLE_LOOP.length) {
          currentLoopIndex = 0;
        }
        players[socket.id].pos = CYCLE_LOOP[currentLoopIndex];
      }

      if (map.layers[calculateDest(players[socket.id].x + 32, players[socket.id].y + 40)] == 1) {
        players[socket.id].y = oldY;
      }

    });

    // delete disconnected player
    socket.on('disconnect', function () {

      socket.broadcast.emit('send-delete-user-array', socket.id);

      delete players[socket.id];
    });

    socket.on('removeUser', function () {

      socket.broadcast.emit('send-delete-user-array', socket.id);
      canTalkTo.splice(0, canTalkTo.length);
      delete players[socket.id];
    });

    socket.on('delete-user-array', (id) => {
      for (var i = 0; i < canTalkTo.length; i++) {
        if (canTalkTo[i].id == id) {
          canTalkTo.splice(i, 1);
        }
      }
    });

  });

  function update() {
    io.volatile.emit('players list', Object.values(players));
  }

  setInterval(update, 1000 / 60);

  var map = {
    cols: 25,
    rows: 19,
    tsize: 32,
    layers: [
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,
      1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1,
      1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1,
      1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,
      1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,
      1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,
      1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1,
      1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1,
      1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1,
      1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,
      1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,
      1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,
      1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1,
      1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,
      1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    ]
  };

  const calculateDest = function (x, y) {
    var col = Math.round(x / 32);
    if (col == -1 || col == -0) {
      col = 0;
    }
    var row = Math.round(y / 32);

    return row * map.cols + col;
  }
};

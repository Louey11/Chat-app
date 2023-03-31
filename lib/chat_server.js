var socketio = require('socket.io')
var io
var guestNumber = 1
var nickNames = {}
var namesUsed = []
var currentRoom = {}

// Function to assign guest names
function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
  // create name
  var name = 'Guest' + guestNumber
  // add name
  nickNames[socket.id] = name
  // send succes message
  socket.emit('nameResult', {
    succes: true,
    name: name,
  })
  // push name to used names
  namesUsed.push(name)
  // increment guestnumber
  return guestNumber + 1
}

// Function to join a room
function joinRoom(socket, room) {
  // join room
  socket.join(room)
  // add room to current room
  currentRoom[socket.id] = room
  // send message to client room.id
  socket.emit('joinResult', { room: room })
  // broadcast to all users the new user
  socket.broadcast.to(room).emit('message', {
    text: nickNames[socket.id] + 'has joined' + room + '.',
  })
  // get all clients
  var usersInRoom = io.sockets.clients(room)
  if (usersInRoom.length > 1) {
    var usersInRoomSummary = 'users currently in ' + room + ': '
    for (var index in usersInRoom) {
      var userSocketId = usersInRoom[index].id
      if (userSocketId != socket.id) {
        if (index > 0) {
          usersInRoomSummary += ', '
        }
        usersInRoomSummary += nickNames[userSocketId]
      }
    }
    usersInRoomSummary += '.'
    // send message to user with all current users
    socket.emit('message', { text: usersInRoomSummary })
  }
}

// Function that handle name change and cheks for errors
function handleNameChangeAttempts(socket, nickNames, namesUsed) {
  socket.on('nameAttempt', (name) => {
    if (name.indexOf('Guest') == 0) {
      socket.emit('nameResult', {
        succes: false,
        message: 'Names cannot begin with "Guest"',
      })
    } else {
      // check if chosen name exits in used names
      if (namesUsed.indexOf(name) == -1) {
        var previuosName = nickNames[socket.id]
        var previuosNameindex = namesUsed.indexOf(previuosName)
        namesUsed.push(name)
        nickNames[socket.id] = name
        delete namesUsed[previuosNameindex]
        socket.emit('nameResult', {
          succes: true,
          name: name,
        })
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
          text: previuosName + ' is now ' + name,
        })
      } else {
        socket.emit('nameResult', {
          succes: false,
          message: 'that name is already in use',
        })
      }
    }
  })
}

function handleMessageBroadcasting(socket) {
  socket.on('message', (message) => {
    socket.broadcast.to(message.room).emit('message', {
      text: nickNames[socket.id] + ':' + message.text,
    })
  })
}

function handleRoomJoining(socket) {
  socket.on('join', function (room) {
    socket.leave(currentRoom[socket.id])
    joinRoom(socket, room.newRoom)
  })
}
function handleClientDisconnection(socket) {
  socket.on('disconnect', function () {
    var nameIndex = namesUsed.indexOf(nickNames[socket.id])
    delete namesUsed[nameIndex]
    delete nickNames[socket.id]
  })
}

exports.listen = function (server) {
  io = socketio.listen(server)

  io.set('log level', 1)

  io.sockets.on('connection', function (socket) {
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed)
    joinRoom(socket, 'Lobby')
    handleMessageBroadcasting(socket, nickNames)
    handleNameChangeAttempts(socket, nickNames, namesUsed)
    handleRoomJoining(socket)

    socket.on('rooms', function () {
      socket.emit('rooms', io.sockets.manager.rooms)
    })

    handleClientDisconnection(socket, nickNames, namesUsed)
  })
}

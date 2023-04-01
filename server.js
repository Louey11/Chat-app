// require the necessary modules
var http = require('http')
var fs = require('fs')
var path = require('path')
var mime = require('mime')

// create a cache object to store frequently acceseed files
var cache = {}

// Require the chat server module
var chatServer = require('./lib/chat_server')

// Listen for chat-related events on the server
chatServer.listen(server)

// Function to send error 404 if resource not found
function send404(response) {
  response.writeHead(404, { 'content-type': 'text/plain' })
  response.write('Error 404 : resource not found')
  response.end()
}

// Function to send a file to the client
function sendFile(response, filePath, fileContents) {
  response.writeHead(200, {
    'content-type': mime.lookup(path.basename(filePath)),
  })
  response.end(fileContents)
}

// Function that checks a file in cache else it adds then send file
function serveStatic(response, cache, absPath) {
  if (cache[absPath]) {
    sendFile(response, absPath, cache[absPath])
  } else {
    fs.stat(absPath, (err, stats) => {
      if (stats) {
        fs.readFile(absPath, function (err, data) {
          if (err) {
            send404(response)
          } else {
            cache[absPath] = data
            sendFile(response, absPath, data)
          }
        })
      } else if (err) {
        send404(response)
      }
    })
  }
}

// Create the HTTP server
var server = http.createServer((req, res) => {
  var filePath = false
  if (req.url == '/') {
    filePath = 'public/index.html'
  } else {
    filePath = path.join('public', req.url)
  }
  var absPath = path.join('./', filePath)
  serveStatic(res, cache, absPath)
})

chatServer.listen(server)

// start the server on port 5000
server.listen(5000, () => {
  console.log('server listening on port 5000.')
})

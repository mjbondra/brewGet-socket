
/**
 *                     ___           ___           ___           ___           ___
 *      _____         /  /\         /  /\         /__/\         /  /\         /  /\          ___
 *     /  /::\       /  /::\       /  /:/_       _\_ \:\       /  /:/_       /  /:/_        /  /\
 *    /  /:/\:\     /  /:/\:\     /  /:/ /\     /__/\ \:\     /  /:/ /\     /  /:/ /\      /  /:/
 *   /  /:/~/::\   /  /:/~/:/    /  /:/ /:/_   _\_ \:\ \:\   /  /:/_/::\   /  /:/ /:/_    /  /:/
 *  /__/:/ /:/\:| /__/:/ /:/___ /__/:/ /:/ /\ /__/\ \:\ \:\ /__/:/__\/\:\ /__/:/ /:/ /\  /  /::\
 *  \  \:\/:/~/:/ \  \:\/:::::/ \  \:\/:/ /:/ \  \:\ \:\/:/ \  \:\ /~~/:/ \  \:\/:/ /:/ /__/:/\:\
 *   \  \::/ /:/   \  \::/~~~~   \  \::/ /:/   \  \:\ \::/   \  \:\  /:/   \  \::/ /:/  \__\/  \:\
 *    \  \:\/:/     \  \:\        \  \:\/:/     \  \:\/:/     \  \:\/:/     \  \:\/:/        \  \:\
 *     \  \::/       \  \:\        \  \::/       \  \::/       \  \::/       \  \::/          \__\/
 *      \__\/         \__\/         \__\/         \__\/         \__\/         \__\/
 *
 */

/**
 * Module dependencies
 */
var http = require('http')
  , net = require('net')
  , sockjs = require('sockjs');

/**
 * Ports
 */
var webSocketPort = 4000
  , nodeSocketPort = 4001;

/**
 * Web socket server
 */
var connections = {
  chat: [],
  global: []
};

var webSocket = sockjs.createServer();
webSocket.on('connection', function (conn) {
  console.log('connected!');
  conn.on('data', function (message) {
    console.log('message', message);
    conn.write(message);
  });
  conn.on('close', function () {
    console.log('closed!');
  });
});

var webSocketServer = http.createServer(function (req, res) {
  res.writeHead(302, { 'Location': 'http://brewget.com' });
  res.end();
});
webSocket.installHandlers(webSocketServer, { prefix:'/ws' });
webSocketServer.listen(webSocketPort, function (err) {
  console.log('Listening for web socket connections on port ' + webSocketPort);
});

/**
 * Node socket server
 */
var nodeSocketServer = net.createServer(function (socket) {
  // socket.write('Socket server connected on port ' + nodeSocketPort);
  socket.on('data', function (data) {
    console.log(data.toString());
  });
  socket.pipe(socket);
});

nodeSocketServer.listen(nodeSocketPort, function (err) {
  console.log('Listening for node socket connections on port ' + nodeSocketPort);
});

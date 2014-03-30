
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
 * Events
 */
var events = require('events')
  , socketEmitter = new events.EventEmitter();

socketEmitter.on('context.close', function (conn, context) {
  if (conn && conn.id && context && connectionData[conn.id] && connectionData[conn.id].context && typeof connectionData[conn.id].context[context] !== 'undefined') connectionData[conn.id].context[context] = 0;
});
socketEmitter.on('context.open', function (conn, context) {
  if (conn && conn.id && context && connectionData[conn.id] && connectionData[conn.id].context && typeof connectionData[conn.id].context[context] !== 'undefined') connectionData[conn.id].context[context] = 1;
});
socketEmitter.on('message', function (message, context) {
  if (!message || !context) return;
  var i = connections.length;
  while (i--) if (connectionData[connections[i].id] && connectionData[connections[i].id].context && connectionData[connections[i].id].context[context] === 1) connections[i].write(message);
});
socketEmitter.on('session.attach', function (cid, session) {});
socketEmitter.on('session.find', function (conn, sid) {
  if (conn && conn.id && sid && serverConnections.length > 0) serverConnections[Math.floor(Math.random() * serverConnections.length)].write(JSON.stringify({
    cid: conn.id,
    event: 'session.find',
    sid: sid
  }));
});
socketEmitter.on('session.update', function (id, sid) {});

/**
 * Web socket server
 */
var connections = []
  , connectionData = {};

var webSocket = sockjs.createServer();
webSocket.on('connection', function (conn) {
  connections.push(conn);
  connectionData[conn.id] = {
    context: {
      chat: 0
    }
  };
  conn.on('data', function (data) {
    try {
      var dataObj = JSON.parse(data);
      if (dataObj.event === 'context.open') socketEmitter.emit('context.open', conn, dataObj.context);
      else if (dataObj.event === 'message') socketEmitter.emit('message', data, dataObj.context);
      else if (dataObj.event === 'session.find') socketEmitter.emit('session.find', conn, dataObj.sid);
    } catch (err) {}
  });
  conn.on('close', function () {
    if (connectionData[conn.id]) delete connectionData[conn.id];
    if (connections.indexOf(conn) >= 0) connections.splice(connections.indexOf(conn), 1);
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
var serverConnections = [];

var nodeSocketServer = net.createServer(function (socket) {
  serverConnections.push(socket);
  socket.write(JSON.stringify({
    event: 'console.log',
    message: 'TCP server connected on port ' + nodeSocketPort
  }));
  socket.on('data', function (data) {
    try {
      var dataObj = JSON.parse(data);
      if (dataObj.event === 'console.log') console.log(dataObj.message);
    } catch (err) {}
  });
  socket.on('close', function () {
    if (serverConnections.indexOf(socket) >= 0) serverConnections.splice(serverConnections.indexOf(socket), 1);
  });
});

nodeSocketServer.listen(nodeSocketPort, function (err) {
  console.log('Listening for node socket connections on port ' + nodeSocketPort);
});

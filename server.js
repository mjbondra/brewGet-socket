
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
 * Event dependencies
 */
var events = require('events')
  , socketEmitter = new events.EventEmitter();

/*------------------------------------*\
    HELPER FUNCTIONS
\*------------------------------------*/

/**
 * Return a randomly-selected key-value of a TCP server connection connection
 */
var randomServerKey = function () {
  if (serverConnections.length === 0) return -1;
  return Math.floor(Math.random() * serverConnections.length);
};

/*------------------------------------*\
    EVENTS
\*------------------------------------*/

/**
 * Add session data to connection data
 */
socketEmitter.on('connection.session.add', function (cid, sid, user) {
  if (!cid || !sid || !connectionData[cid]) return;
  user = user || {};
  connectionData[cid].sid = sid;
  connectionData[cid].user = user;
  console.log(connectionData);
});

/**
 * Update session data in connection data
 */
socketEmitter.on('connection.session.update', function (sid, user) {
  if (!sid || !user) return;
  var dataKeys = Object.keys(connectionData)
    , i = dataKeys.length;
  while (i--) if (connectionData[dataKeys[i]].sid === sid) connectionData[dataKeys[i]].user = user;
  console.log(connectionData);
});

/**
 * Close context in connection data
 */
socketEmitter.on('context.close', function (conn, context) {
  if (conn && conn.id && context && connectionData[conn.id] && connectionData[conn.id].context && typeof connectionData[conn.id].context[context] !== 'undefined') connectionData[conn.id].context[context] = 0;
});

/**
 * Open context in connection data
 */
socketEmitter.on('context.open', function (conn, context) {
  if (conn && conn.id && context && connectionData[conn.id] && connectionData[conn.id].context && typeof connectionData[conn.id].context[context] !== 'undefined') connectionData[conn.id].context[context] = 1;
});

/**
 * Handle message relative to its context
 */
socketEmitter.on('message', function (message, context) {
  if (!message || !context) return;
  var i = connections.length;
  while (i--) if (connectionData[connections[i].id] && connectionData[connections[i].id].context && connectionData[connections[i].id].context[context] === 1) connections[i].write(message);
});

/**
 * Add connection data to session
 */
socketEmitter.on('session.connection.add', function (cid, sid) {
  if (!cid || !sid || serverConnections.length === 0) return;
  serverConnections[randomServerKey()].write(JSON.stringify({
    cid: cid,
    event: 'session.connection.add',
    sid: sid
  }));
});

/**
 * Remove connection data from session
 */
socketEmitter.on('session.connection.remove', function (sid) {
  if (!sid || serverConnections.length === 0) return;
  serverConnections[randomServerKey()].write(JSON.stringify({
    event: 'session.connection.remove',
    sid: sid
  }));
});

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
      else if (dataObj.event === 'session.connection.add') socketEmitter.emit('session.connection.add', conn.id, dataObj.sid);
    } catch (err) {}
  });
  conn.on('close', function () {
    if (conn.id && connectionData[conn.id]) {
      socketEmitter.emit('session.connection.remove', connectionData[conn.id].sid);
      delete connectionData[conn.id];
    }
    if (connections.indexOf(conn) >= 0) connections.splice(connections.indexOf(conn), 1);
  });
});

var webSocketServer = http.createServer(function (req, res) {
  res.writeHead(302, { Location: 'http://brewget.com' });
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
      else if (dataObj.event === 'connection.session.add') socketEmitter.emit('connection.session.add', dataObj.cid, dataObj.sid, dataObj.user);
      else if (dataObj.event === 'connection.session.update') socketEmitter.emit('connection.session.update', dataObj.sid, dataObj.user);
    } catch (err) {}
  });
  socket.on('close', function () {
    if (serverConnections.indexOf(socket) >= 0) serverConnections.splice(serverConnections.indexOf(socket), 1);
  });
});

nodeSocketServer.listen(nodeSocketPort, function (err) {
  console.log('Listening for node socket connections on port ' + nodeSocketPort);
});

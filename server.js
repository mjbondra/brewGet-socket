
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
  if (!cid || !sid) return;
  if (!connectionData[cid]) return socketEmitter.emit('session.connection.remove', sid, cid); // remove false connections from session
  user = user || {};
  connectionData[cid].sid = sid;
  connectionData[cid].user = user;
  console.log(connectionData);
});

/**
 * Close context in connection data
 */
socketEmitter.on('context.close', function (cid, context) {
  if (cid && context && connectionData[cid] && connectionData[cid].context && typeof connectionData[cid].context[context] !== 'undefined') connectionData[cid].context[context] = 0;
});

/**
 * Open context in connection data
 */
socketEmitter.on('context.open', function (cid, context) {
  if (cid && context && connectionData[cid] && connectionData[cid].context && typeof connectionData[cid].context[context] !== 'undefined') connectionData[cid].context[context] = 1;
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
 * Handle chat messages
 */
socketEmitter.on('message.chat', function (message) {
  if (!message) return;
  var i = connections.length;
  while (i--) if (connections[i] && connections[i].id && connectionData[connections[i].id] && connectionData[connections[i].id].context && connectionData[connections[i].id].context.chat === 1) connections.write(JSON.stringify({
    message: message
  }));
});

/**
 * Handle direct messages
 */
socketEmitter.on('message.direct', function (message) {

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
socketEmitter.on('session.connection.remove', function (sid, cid) {
  if (!sid || serverConnections.length === 0) return;
  serverConnections[randomServerKey()].write(JSON.stringify({
    cid: cid,
    event: 'session.connection.remove',
    sid: sid
  }));
});

/*------------------------------------*\
    WEB SOCKET SERVER
\*------------------------------------*/

var connections = []
  , connectionData = {};

var webSocket = sockjs.createServer();
webSocket.on('connection', function (conn) {
  connections.push(conn);
  connectionData[conn.id] = {
    context: {
      alert: 0,
      chat: 0,
      direct: 0
    }
  };
  conn.on('data', function (data) {
    try {
      var dataObj = JSON.parse(data);
      if (dataObj.event === 'context.close') socketEmitter.emit('context.close', conn.id, dataObj.context);
      else if (dataObj.event === 'context.open') socketEmitter.emit('context.open', conn.id, dataObj.context);
      else if (dataObj.event === 'message') socketEmitter.emit('message', data, dataObj.context);
      else if (dataObj.event === 'session.connection.add') socketEmitter.emit('session.connection.add', conn.id, dataObj.sid);
    } catch (err) {}
  });
  conn.on('close', function () {
    if (conn.id && connectionData[conn.id]) {
      socketEmitter.emit('session.connection.remove', connectionData[conn.id].sid, conn.id);
      delete connectionData[conn.id];
    }
    var connectionKey = connections.indexOf(conn);
    if (connectionKey >= 0) connections.splice(connectionKey, 1);
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

/*------------------------------------*\
    NODE SOCKET SERVER
\*------------------------------------*/

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
    } catch (err) {}
  });
  socket.on('close', function () {
    if (serverConnections.indexOf(socket) >= 0) serverConnections.splice(serverConnections.indexOf(socket), 1);
  });
});

nodeSocketServer.listen(nodeSocketPort, function (err) {
  console.log('Listening for node socket connections on port ' + nodeSocketPort);
});

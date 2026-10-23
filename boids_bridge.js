// boids_bridge.js — [node.script boids_bridge.js]
// Riceve da p5.js (osc-js WebsocketClientPlugin) pacchetti OSC binari su
// ws://localhost:8081 e li inoltra via UDP a 127.0.0.1:9000 ([udpreceive 9000]).
// Prima volta: "script npm install ws", poi "script start".
// Se hai già un altro bridge in esecuzione sulla porta 8081, non avviare questo.

const Max = require('max-api');
const WebSocket = require('ws');
const dgram = require('dgram');

const WS_PORT = 8081;
const UDP_HOST = '127.0.0.1';
const UDP_PORT = 9000;

const udp = dgram.createSocket('udp4');
const Server = WebSocket.WebSocketServer || WebSocket.Server;
const wss = new Server({ port: WS_PORT });

wss.on('connection', (socket) => {
  Max.post('p5.js connesso');
  socket.on('message', (data) => udp.send(data, UDP_PORT, UDP_HOST));
  socket.on('close', () => Max.post('p5.js disconnesso'));
});

Max.post(`WebSocket ws://localhost:${WS_PORT} -> UDP ${UDP_HOST}:${UDP_PORT}`);

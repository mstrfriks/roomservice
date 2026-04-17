'use strict';

const express = require('express');
const fs      = require('fs');
const http    = require('http');
const WebSocket = require('ws');
const path    = require('path');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.get('/service', (req, res) => res.sendFile(path.join(__dirname, 'public', 'service.html')));

const RENDER_URL = process.env.RENDER_EXTERNAL_URL || '';
if (RENDER_URL) {
  setInterval(() => { fetch(RENDER_URL).catch(() => {}); }, 10 * 60 * 1000);
}

const orders  = [];
let   nextId  = 1;
const sockets = new Set();
const DEFAULT_CONFIG = {
  projectName: '18 Elysée',
  rooms: [
    { id:'master',   icon:'👑',  label:'Master Suite',  available:true },
    { id:'chambre4', icon:'🛏️', label:'Bedroom 4',      available:true },
    { id:'chambre3', icon:'🛏️', label:'Bedroom 3',      available:true },
    { id:'chambre2', icon:'🛏️', label:'Bedroom 2',      available:true },
    { id:'chambre1', icon:'🛏️', label:'Bedroom 1',      available:true },
    { id:'office1',  icon:'🖥️', label:'Office 1',       available:true },
    { id:'office2',  icon:'🖥️', label:'Office 2',       available:true },
    { id:'dining',   icon:'🍽️', label:'Dining Room',    available:true },
    { id:'salon',    icon:'🛋️', label:'Living Room',    available:true },
    { id:'kitchen',  icon:'🍳',  label:'Kitchen',        available:true },
    { id:'wellness', icon:'🧘',  label:'Wellness',       available:true },
    { id:'gym',      icon:'🏋️', label:'Gym',            available:true },
    { id:'pool',     icon:'🏊',  label:'Swimming Pool',  available:true },
  ],
  drinks: [
    { id:'espresso',   icon:'☕', label:'Espresso',      available:true },
    { id:'flat-white', icon:'☕', label:'Flat White',    available:true },
    { id:'cappuccino', icon:'🥛', label:'Cappuccino',    available:true },
    { id:'black-tea',  icon:'🍵', label:'Black Tea',     available:true },
    { id:'green-tea',  icon:'🍵', label:'Green Tea',     available:true },
    { id:'hot-choc',   icon:'🍫', label:'Hot Chocolate', available:true },
    { id:'water',      icon:'💧', label:'Still Water',   available:true },
    { id:'oj',         icon:'🧃', label:'Orange Juice',  available:true },
  ],
  housekeepingStatus: {}
};
const CONFIG_PATH = path.join(__dirname, 'shared-config.json');
let   sharedConfig = loadSharedConfig();

const NTFY_TOPIC = process.env.NTFY_TOPIC || '';
const APP_URL    = process.env.RENDER_EXTERNAL_URL || '';

function normalizeConfig(raw) {
  const cfg = raw && typeof raw === 'object' ? raw : {};
  return {
    projectName: String(cfg.projectName || DEFAULT_CONFIG.projectName).trim() || DEFAULT_CONFIG.projectName,
    rooms: Array.isArray(cfg.rooms) ? cfg.rooms : DEFAULT_CONFIG.rooms,
    drinks: Array.isArray(cfg.drinks) ? cfg.drinks : DEFAULT_CONFIG.drinks,
    housekeepingStatus: cfg.housekeepingStatus && typeof cfg.housekeepingStatus === 'object'
      ? cfg.housekeepingStatus
      : {},
  };
}

function loadSharedConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return normalizeConfig(DEFAULT_CONFIG);
    return normalizeConfig(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')));
  } catch (error) {
    console.error('Failed to load shared config:', error.message);
    return normalizeConfig(DEFAULT_CONFIG);
  }
}

function saveSharedConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Failed to save shared config:', error.message);
  }
}

function notifyService(order) {
  if (!NTFY_TOPIC) return;
  const isHousekeeperRequest = order.kind === 'housekeeper_request';
  fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
    method: 'POST',
    headers: {
      'Title':   isHousekeeperRequest ? `Housekeeper - ${order.name}` : `Cafe - ${order.name}`,
      'Priority':'high',
      'Tags':    isHousekeeperRequest ? 'bell' : 'coffee',
      'Actions': `view, Ouvrir le dashboard, ${APP_URL}/service`,
    },
    body: isHousekeeperRequest ? 'A guest is requesting the housekeeper.' : order.drink,
  })
  .then(r => console.log('ntfy response:', r.status))
  .catch(e => console.error('ntfy error:', e.message));
}

wss.on('connection', (ws) => {
  ws.role = null;
  sockets.add(ws);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'register') {
      ws.role = msg.role;
      if (msg.role === 'service') {
        send(ws, { type: 'orders', orders: orders.filter(o => o.status === 'pending') });
      }
      if ((msg.role === 'client' || msg.role === 'service') && sharedConfig) {
        send(ws, { type: 'config', config: sharedConfig });
      }
      return;
    }

    if (msg.type === 'update_config') {
      if (ws.role !== 'service') return;
      sharedConfig = normalizeConfig({
        ...sharedConfig,
        ...msg.config,
        housekeepingStatus: msg.config?.housekeepingStatus ?? sharedConfig.housekeepingStatus,
      });
      saveSharedConfig(sharedConfig);
      broadcast('client', { type: 'config', config: sharedConfig });
      broadcast('service', { type: 'config', config: sharedConfig });
      console.log('Config updated and broadcast to clients');
      return;
    }

    if (msg.type === 'update_room_status') {
      if (ws.role !== 'client') return;
      const roomId = String(msg.roomId || '').trim();
      if (!roomId) return;

      const nextStatus = msg.status === 'make' || msg.status === 'skip' ? msg.status : '';
      const housekeepingStatus = { ...(sharedConfig?.housekeepingStatus || {}) };
      if (nextStatus) housekeepingStatus[roomId] = nextStatus;
      else delete housekeepingStatus[roomId];

      sharedConfig = normalizeConfig({
        ...sharedConfig,
        housekeepingStatus,
      });
      saveSharedConfig(sharedConfig);
      broadcast('client', { type: 'config', config: sharedConfig });
      broadcast('service', { type: 'config', config: sharedConfig });
      console.log('Room status updated and broadcast');
      return;
    }

    if (msg.type === 'order') {
      const name  = String(msg.name  || '').trim().slice(0, 50);
      const drink = String(msg.drink || '').trim().slice(0, 200);
      if (!name || !drink) return;
      const note  = String(msg.note  || '').trim().slice(0, 200);
      const order = { id: nextId++, name, drink, note, at: Date.now(), status: 'pending', kind: 'order' };
      orders.push(order);
      if (orders.length > 500) orders.splice(0, orders.length - 500);
      broadcast('service', { type: 'new_order', order });
      send(ws, { type: 'order_confirmed', orderId: order.id });
      notifyService(order);
      return;
    }

    if (msg.type === 'housekeeper_request') {
      const name = String(msg.name || '').trim().slice(0, 50);
      if (!name) return;
      const order = {
        id: nextId++,
        name,
        drink: 'Housekeeper request',
        note: 'The guest would like to see the housekeeper.',
        at: Date.now(),
        status: 'pending',
        kind: 'housekeeper_request',
      };
      orders.push(order);
      if (orders.length > 500) orders.splice(0, orders.length - 500);
      broadcast('service', { type: 'new_order', order });
      notifyService(order);
      return;
    }

    if (msg.type === 'ready') {
      const order = orders.find(o => o.id === msg.orderId && o.status === 'pending');
      if (!order) return;
      order.status = 'done';
      broadcast('client',  { type: 'order_ready',   orderId: order.id });
      broadcast('service', { type: 'order_removed', orderId: order.id });
    }
  });

  ws.on('close', () => sockets.delete(ws));
  ws.on('error', () => sockets.delete(ws));
});

function send(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(role, msg) {
  const data = JSON.stringify(msg);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN && ws.role === role) ws.send(data);
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Café server → http://localhost:${PORT}`));

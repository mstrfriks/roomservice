'use strict';

const express = require('express');
const fs      = require('fs');
const http    = require('http');
const WebSocket = require('ws');
const path    = require('path');
const { DEFAULT_CONFIG, normalizeConfig } = require(path.join(__dirname, 'public', 'app-config.js'));

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.get('/service', (req, res) => res.sendFile(path.join(__dirname, 'public', 'service.html')));

const RENDER_URL = process.env.RENDER_EXTERNAL_URL || '';
if (RENDER_URL) {
  setInterval(() => { fetch(RENDER_URL).catch(() => {}); }, 10 * 60 * 1000);
}

const ORDERS_PATH = path.join(__dirname, 'orders.json');
const orders  = loadOrders();
let   nextId  = orders.reduce((maxId, order) => Math.max(maxId, Number(order.id) || 0), 0) + 1;
const sockets = new Set();

const CONFIG_PATH = path.join(__dirname, 'shared-config.json');
let   sharedConfig = loadSharedConfig();

const NTFY_TOPIC = process.env.NTFY_TOPIC || '';
const APP_URL    = process.env.RENDER_EXTERNAL_URL || '';

function logInfo(message, details) {
  if (details === undefined) {
    console.log(`[roomservice] ${message}`);
    return;
  }
  console.log(`[roomservice] ${message}`, details);
}

function logError(message, error) {
  console.error(`[roomservice] ${message}`, error && error.message ? error.message : error);
}

function loadOrders() {
  try {
    if (!fs.existsSync(ORDERS_PATH)) return [];
    const raw = JSON.parse(fs.readFileSync(ORDERS_PATH, 'utf8'));
    return Array.isArray(raw) ? raw.filter(order => order && typeof order === 'object') : [];
  } catch (error) {
    logError('Failed to load orders', error);
    return [];
  }
}

function saveOrders() {
  try {
    fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2));
  } catch (error) {
    logError('Failed to save orders', error);
  }
}

function loadSharedConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return normalizeConfig(DEFAULT_CONFIG);
    return normalizeConfig(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')));
  } catch (error) {
    logError('Failed to load shared config', error);
    return normalizeConfig(DEFAULT_CONFIG);
  }
}

function saveSharedConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    logError('Failed to save shared config', error);
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
  .then(r => logInfo('ntfy response', r.status))
  .catch(e => logError('ntfy error', e));
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
      logInfo('Config updated and broadcast to clients');
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
      logInfo('Room status updated and broadcast');
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
      saveOrders();
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
      saveOrders();
      broadcast('service', { type: 'new_order', order });
      notifyService(order);
      return;
    }

    if (msg.type === 'ready') {
      const order = orders.find(o => o.id === msg.orderId && o.status === 'pending');
      if (!order) return;
      order.status = 'done';
      saveOrders();
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
server.listen(PORT, () => logInfo(`Cafe server -> http://localhost:${PORT}`));

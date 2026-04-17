'use strict';

const assert = require('assert');
const path = require('path');
const { DEFAULT_CONFIG, normalizeConfig } = require(path.join(__dirname, '..', 'public', 'app-config.js'));

const legacyConfig = normalizeConfig({
  projectName: 'Test',
  rooms: [{ id: 'legacy-room', icon: '🛏️', label: 'Legacy Room', available: true }],
  drinks: [{ id: 'legacy-drink', icon: '☕', label: 'Legacy Coffee', available: true }],
  housekeepingStatus: { 'legacy-room': 'make' }
});

assert.equal(legacyConfig.rooms[0].icon, 'bed');
assert.equal(legacyConfig.drinks[0].icon, 'coffee');
assert.equal(legacyConfig.housekeepingStatus['legacy-room'], 'make');
assert.ok(Array.isArray(DEFAULT_CONFIG.rooms));
assert.ok(Array.isArray(DEFAULT_CONFIG.drinks));

console.log('app-config tests passed');

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.RoomServiceConfig = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LEGACY_ICON_MAP = {
    '\u{1F451}': 'crown',
    '\u{1F6CF}\uFE0F': 'bed',
    '\u{1F5A5}\uFE0F': 'monitor',
    '\u{1F37D}\uFE0F': 'dining',
    '\u{1F6CB}\uFE0F': 'sofa',
    '\u{1F373}': 'kitchen',
    '\u{1F9D8}': 'wellness',
    '\u{1F3CB}\uFE0F': 'gym',
    '\u{1F3CA}': 'pool',
    '\u2615': 'coffee',
    '\u{1F95B}': 'milk',
    '\u{1F375}': 'tea',
    '\u{1F36B}': 'chocolate',
    '\u{1F4A7}': 'water',
    '\u{1F9C3}': 'juice'
  };

  const DEFAULT_CONFIG = {
    projectName: '18 Elysée',
    primaryActionLabel: 'Room service',
    rooms: [
      { id:'master',   icon:'crown',    label:'Master Suite',  available:true },
      { id:'chambre4', icon:'bed',      label:'Bedroom 4',     available:true },
      { id:'chambre3', icon:'bed',      label:'Bedroom 3',     available:true },
      { id:'chambre2', icon:'bed',      label:'Bedroom 2',     available:true },
      { id:'chambre1', icon:'bed',      label:'Bedroom 1',     available:true },
      { id:'office1',  icon:'monitor',  label:'Office 1',      available:true },
      { id:'office2',  icon:'monitor',  label:'Office 2',      available:true },
      { id:'dining',   icon:'dining',   label:'Dining Room',   available:true },
      { id:'salon',    icon:'sofa',     label:'Living Room',   available:true },
      { id:'kitchen',  icon:'kitchen',  label:'Kitchen',       available:true },
      { id:'wellness', icon:'wellness', label:'Wellness',      available:true },
      { id:'gym',      icon:'gym',      label:'Gym',           available:true },
      { id:'pool',     icon:'pool',     label:'Swimming Pool', available:true }
    ],
    drinks: [
      { id:'espresso',   icon:'coffee',    label:'Espresso',      available:true },
      { id:'flat-white', icon:'coffee',    label:'Flat White',    available:true },
      { id:'cappuccino', icon:'milk',      label:'Cappuccino',    available:true },
      { id:'black-tea',  icon:'tea',       label:'Black Tea',     available:true },
      { id:'green-tea',  icon:'tea',       label:'Green Tea',     available:true },
      { id:'hot-choc',   icon:'chocolate', label:'Hot Chocolate', available:true },
      { id:'water',      icon:'water',     label:'Still Water',   available:true },
      { id:'oj',         icon:'juice',     label:'Orange Juice',  available:true }
    ],
    housekeepingStatus: {}
  };

  function normalizeIconName(icon, fallback) {
    const value = String(icon || '').trim();
    return LEGACY_ICON_MAP[value] || value || fallback;
  }

  function normalizeItems(items, fallback) {
    return Array.isArray(items)
      ? items.map(function (item) {
          return { ...item, icon: normalizeIconName(item && item.icon, fallback) };
        })
      : [];
  }

  function normalizeConfig(rawConfig) {
    const cfg = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};
    return {
      projectName: String(cfg.projectName || DEFAULT_CONFIG.projectName).trim() || DEFAULT_CONFIG.projectName,
      primaryActionLabel: String(cfg.primaryActionLabel || DEFAULT_CONFIG.primaryActionLabel).trim() || DEFAULT_CONFIG.primaryActionLabel,
      rooms: Array.isArray(cfg.rooms) ? normalizeItems(cfg.rooms, 'bed') : DEFAULT_CONFIG.rooms.map(function (room) { return { ...room }; }),
      drinks: Array.isArray(cfg.drinks) ? normalizeItems(cfg.drinks, 'coffee') : DEFAULT_CONFIG.drinks.map(function (drink) { return { ...drink }; }),
      housekeepingStatus: cfg.housekeepingStatus && typeof cfg.housekeepingStatus === 'object'
        ? { ...cfg.housekeepingStatus }
        : {}
    };
  }

  return {
    DEFAULT_CONFIG: normalizeConfig(DEFAULT_CONFIG),
    normalizeConfig: normalizeConfig,
    normalizeIconName: normalizeIconName
  };
});

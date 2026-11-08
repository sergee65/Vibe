(function () {
  'use strict';

  var STORAGE_KEY = 'tihon.profile.v1';

  var ACHIEVEMENTS = [
    {
      id: 'explorer',
      group: 'general',
      icon: '🌍',
      title: 'Оба мира',
      desc: 'Заглянуть в аквариум и в кошачью комнату.',
      hat: 'straw'
    },
    {
      id: 'feeder',
      group: 'general',
      icon: '🍲',
      title: 'Кормилец',
      desc: 'Покормить рыбок или котов.',
      hat: 'beanie'
    },
    {
      id: 'petter',
      group: 'general',
      icon: '🐾',
      title: 'Ласковый',
      desc: 'Погладить любого кота.',
      hat: 'cap'
    },
    {
      id: 'player',
      group: 'general',
      icon: '🎮',
      title: 'Игрок',
      desc: 'Начать любую мини-игру.',
      hat: 'tophat'
    },
    {
      id: 'record',
      group: 'general',
      icon: '🏆',
      title: 'Рекордсмен',
      desc: 'Поставить личный рекорд в игре.',
      hat: 'crown'
    },
    {
      id: 'curious',
      group: 'general',
      icon: '🔎',
      title: 'Любопытный',
      desc: 'Открыть окно ачивок и гардероба.',
      hat: 'wizard'
    },

    {
      id: 'fish_10',
      group: 'game',
      icon: '🐟',
      title: 'Рыбный улов',
      desc: 'Поймать 10 рыбок за один раунд.',
      item: 'rug'
    },
    {
      id: 'yarn_10',
      group: 'game',
      icon: '🧶',
      title: 'Клубочный вихрь',
      desc: 'Собрать 10 клубков за один раунд.',
      item: 'toy-yarn'
    },
    {
      id: 'checkers_win',
      group: 'game',
      icon: '⚫',
      title: 'Шашист',
      desc: 'Победить мышку в шашках.',
      item: 'scratch'
    },
    {
      id: 'flappy_10',
      group: 'game',
      icon: '🐦',
      title: 'Летун',
      desc: 'Набрать 10 очков в «Полёте Тихона».',
      item: 'toy-mouse'
    },
    {
      id: 'memory_win',
      group: 'game',
      icon: '🃏',
      title: 'Всё в паре',
      desc: 'Найти все пары в «Парочках».',
      item: 'bed-patch'
    },
    {
      id: 'mice_15',
      group: 'game',
      icon: '🐭',
      title: 'Гроза мышей',
      desc: 'Поймать 15 мышек за один раунд.',
      item: 'lamp'
    },
    {
      id: 'arcade_all',
      group: 'game',
      icon: '🏡',
      title: 'Вся игротека',
      desc: 'Побывать во всех четырёх играх Игротеки.',
      item: 'plant'
    }
  ];

  var HATS = [
    { id: 'straw', name: 'Соломенная шляпа', emoji: '👒', achievement: 'explorer' },
    { id: 'beanie', name: 'Тёплая шапка', emoji: '🧶', achievement: 'feeder' },
    { id: 'cap', name: 'Кепка', emoji: '🧢', achievement: 'petter' },
    { id: 'tophat', name: 'Цилиндр', emoji: '🎩', achievement: 'player' },
    { id: 'crown', name: 'Корона', emoji: '👑', achievement: 'record' },
    { id: 'wizard', name: 'Шляпа волшебника', emoji: '🧙', achievement: 'curious' }
  ];

  var BEDS = [
    { id: 'cloud', name: 'Облачная лежанка', emoji: '☁️', achievement: null },
    { id: 'patch', name: 'Лоскутная лежанка', emoji: '🧵', achievement: 'memory_win' }
  ];

  var HOUSE_DETAILS = [
    { id: 'rug', name: 'Солнечный коврик', emoji: '☀️', achievement: 'fish_10' },
    { id: 'toy-yarn', name: 'Клубок', emoji: '🧶', achievement: 'yarn_10' },
    { id: 'scratch', name: 'Когтеточка', emoji: '🌳', achievement: 'checkers_win' },
    { id: 'toy-mouse', name: 'Мышка-игрушка', emoji: '🐭', achievement: 'flappy_10' },
    { id: 'lamp', name: 'Ночник', emoji: '💡', achievement: 'mice_15' },
    { id: 'plant', name: 'Монстера', emoji: '🌿', achievement: 'arcade_all' }
  ];

  var HAT_MARKUP = [
    '<g class="tihon-hat tihon-hat--straw">',
    '<ellipse cx="42" cy="28" rx="29" ry="6" fill="#d9a45e" stroke="#a9753d" stroke-width="1.1"/>',
    '<path d="M24 28c1-11 7-16 18-16s17 5 18 16Z" fill="#e8ba76"/>',
    '<path d="M24 26c10 3 26 3 36 0" fill="none" stroke="#7f5a36" stroke-width="2.6"/>',
    '</g>',

    '<g class="tihon-hat tihon-hat--beanie">',
    '<path d="M20 31c0-13 10-21 22-21s22 8 22 21c-11 4-33 4-44 0Z" fill="#6fa99a"/>',
    '<rect x="18" y="29" width="48" height="7" rx="3.5" fill="#567f75"/>',
    '<circle cx="42" cy="7" r="6" fill="#f4e2c9"/>',
    '<path d="M28 16c4-4 9-6 14-6s10 2 14 6" fill="none" stroke="#88b8a9" stroke-width="2" opacity="0.65"/>',
    '</g>',

    '<g class="tihon-hat tihon-hat--cap">',
    '<path d="M22 30c0-12 9-19 20-19s20 7 20 19Z" fill="#c9704b"/>',
    '<path d="M24 30h38c5 0 8 2 8 5H20c0-3 2-5 4-5Z" fill="#a95536"/>',
    '<circle cx="42" cy="7" r="4" fill="#ffd37f"/>',
    '<path d="M33 17c3-3 6-4 9-4" fill="none" stroke="#efb08b" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/>',
    '</g>',

    '<g class="tihon-hat tihon-hat--tophat">',
    '<ellipse cx="42" cy="28" rx="27" ry="6" fill="#2f2623"/>',
    '<rect x="24" y="2" width="36" height="26" rx="4" fill="#4b3a32"/>',
    '<rect x="24" y="18" width="36" height="6" fill="#c9704b"/>',
    '<ellipse cx="42" cy="28" rx="26" ry="4.5" fill="none" stroke="#211a17" stroke-width="1.2"/>',
    '</g>',

    '<g class="tihon-hat tihon-hat--crown">',
    '<path d="M19 27 23 9l9 7 10-12 9 12 9-7 4 18Z" fill="#f2c45c" stroke="#c0922f" stroke-width="1.4" stroke-linejoin="round"/>',
    '<circle cx="23" cy="9" r="2.4" fill="#ffefad"/>',
    '<circle cx="42" cy="4" r="2.6" fill="#ffefad"/>',
    '<circle cx="61" cy="9" r="2.4" fill="#ffefad"/>',
    '<path d="M20 27h44" stroke="#c0922f" stroke-width="1.4"/>',
    '</g>',

    '<g class="tihon-hat tihon-hat--wizard">',
    '<ellipse cx="42" cy="28" rx="28" ry="6" fill="#4d3f6b"/>',
    '<path d="M20 28 42 0l22 28Z" fill="#75609b"/>',
    '<path d="M47 9l1.2 2.7 2.8.4-2 2 .5 2.8-2.5-1.4-2.5 1.4.5-2.8-2-2 2.8-.4Z" fill="#ffe7a3"/>',
    '<path d="M20 28c11 3 33 3 44 0" fill="none" stroke="#3b304f" stroke-width="2"/>',
    '</g>'
  ].join('');

  function defaultState() {
    return {
      unlocked: {},
      visited: {},
      hat: 'none',
      arcadeSeen: {},
      house: { bed: 'cloud', items: {} }
    };
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      var fresh = defaultState();
      if (parsed && typeof parsed === 'object') {
        if (parsed.unlocked && typeof parsed.unlocked === 'object') fresh.unlocked = parsed.unlocked;
        if (parsed.visited && typeof parsed.visited === 'object') fresh.visited = parsed.visited;
        if (typeof parsed.hat === 'string') fresh.hat = parsed.hat;
        if (parsed.arcadeSeen && typeof parsed.arcadeSeen === 'object') fresh.arcadeSeen = parsed.arcadeSeen;
        if (parsed.house && typeof parsed.house === 'object') {
          if (typeof parsed.house.bed === 'string') fresh.house.bed = parsed.house.bed;
          if (parsed.house.items && typeof parsed.house.items === 'object') fresh.house.items = parsed.house.items;
        }
      }
      return fresh;
    } catch (err) {
      return defaultState();
    }
  }

  var state = load();
  var toastEl = null;
  var toastTimer = 0;

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {}
  }

  function achievement(id) {
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      if (ACHIEVEMENTS[i].id === id) return ACHIEVEMENTS[i];
    }
    return null;
  }

  function hat(id) {
    if (id === 'none') return { id: 'none', name: 'Без шляпы', emoji: '∅', achievement: null };
    for (var i = 0; i < HATS.length; i++) {
      if (HATS[i].id === id) return HATS[i];
    }
    return null;
  }

  function houseReward(id) {
    for (var i = 0; i < HOUSE_DETAILS.length; i++) {
      if (HOUSE_DETAILS[i].id === id) {
        return { id: id, name: HOUSE_DETAILS[i].name, emoji: HOUSE_DETAILS[i].emoji, achievement: HOUSE_DETAILS[i].achievement, type: 'detail' };
      }
    }
    for (var j = 0; j < BEDS.length; j++) {
      if (BEDS[j].id === id) {
        return { id: id, name: BEDS[j].name, emoji: BEDS[j].emoji, achievement: BEDS[j].achievement, type: 'bed' };
      }
    }
    return null;
  }

  function isUnlocked(id) {
    return !!state.unlocked[id];
  }

  function isHatUnlocked(id) {
    if (id === 'none') return true;
    var item = hat(id);
    return !!(item && isUnlocked(item.achievement));
  }

  function isDetailUnlocked(id) {
    for (var i = 0; i < HOUSE_DETAILS.length; i++) {
      if (HOUSE_DETAILS[i].id === id) return isUnlocked(HOUSE_DETAILS[i].achievement);
    }
    return false;
  }

  function isBedUnlocked(id) {
    if (id === 'cloud') return true;
    for (var i = 0; i < BEDS.length; i++) {
      if (BEDS[i].id === id) return isUnlocked(BEDS[i].achievement);
    }
    return false;
  }

  function injectHatLayer(wearer) {
    if (!wearer) return;
    var svg = wearer.querySelector ? wearer.querySelector('svg') : null;
    if (!svg || svg.querySelector('.tihon-hat-layer')) return;
    try {
      var layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      layer.setAttribute('class', 'tihon-hat-layer');
      layer.setAttribute('aria-hidden', 'true');
      layer.innerHTML = HAT_MARKUP;
      svg.appendChild(layer);
    } catch (err) {}
  }

  function applyTo(wearer) {
    if (!wearer) return;
    injectHatLayer(wearer);
    wearer.setAttribute('data-hat', state.hat);
  }

  function refreshHouse() {
    var nodes = document.querySelectorAll('[data-tihon-house]');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      node.setAttribute('data-bed', state.house.bed);
      for (var j = 0; j < HOUSE_DETAILS.length; j++) {
        var detail = HOUSE_DETAILS[j];
        var on = !!state.house.items[detail.id] && isDetailUnlocked(detail.id);
        node.setAttribute('data-house-' + detail.id, on ? 'on' : 'off');
      }
    }
  }

  function refresh() {
    var wearers = document.querySelectorAll('[data-tihon-wearer]');
    for (var i = 0; i < wearers.length; i++) applyTo(wearers[i]);
    refreshHouse();
  }

  function dispatch() {
    try {
      window.dispatchEvent(new CustomEvent('tihon:profile', {
        detail: { state: state, unlocked: Object.keys(state.unlocked) }
      }));
    } catch (err) {}
  }

  function showToast(item) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'tihon-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    var hatItem = item && item.hat ? hat(item.hat) : null;
    var houseItem = item && item.item ? houseReward(item.item) : null;
    var reward = '';
    if (hatItem) reward = 'шляпа «' + hatItem.name + '»';
    else if (houseItem) reward = houseItem.type === 'bed' ? 'лежанка «' + houseItem.name + '»' : 'для домика: ' + houseItem.name;
    toastEl.textContent = item
      ? 'Ачивка: ' + item.title + (reward ? ' · ' + reward : '')
      : '';
    toastEl.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove('is-visible');
    }, 3800);
  }

  function unlock(id) {
    var item = achievement(id);
    if (!item || isUnlocked(id)) return false;
    state.unlocked[id] = Date.now();

    if (item.item) {
      var reward = houseReward(item.item);
      if (reward && reward.type === 'detail') {
        state.house.items[item.item] = true;
      }
    }

    normalizeHouse();
    save();
    refresh();
    dispatch();
    showToast(item);
    return true;
  }

  function visit(world) {
    if (world !== 'aquarium' && world !== 'cats') return false;
    var changed = !state.visited[world];
    state.visited[world] = true;
    if (changed) save();
    if (state.visited.aquarium && state.visited.cats) unlock('explorer');
    dispatch();
    return changed;
  }

  function event(name, data) {
    var map = {
      feed: 'feeder',
      pet: 'petter',
      game: 'player',
      record: 'record'
    };
    if (map[name]) unlock(map[name]);

    if (name === 'arcade' && data) {
      var modes = ['checkers', 'flappy', 'memory', 'mice'];
      if (modes.indexOf(data) !== -1) {
        state.arcadeSeen[data] = true;
        save();
        var all = true;
        for (var i = 0; i < modes.length; i++) {
          if (!state.arcadeSeen[modes[i]]) all = false;
        }
        if (all) unlock('arcade_all');
      }
    }
  }

  function setHat(id) {
    if (!hat(id) || !isHatUnlocked(id)) return false;
    state.hat = id;
    save();
    refresh();
    dispatch();
    return true;
  }

  function setBed(id) {
    if (!houseReward(id) || !isBedUnlocked(id)) return false;
    state.house.bed = id;
    save();
    refreshHouse();
    dispatch();
    return true;
  }

  function toggleHouseItem(id) {
    if (!isDetailUnlocked(id)) return false;
    state.house.items[id] = !state.house.items[id];
    save();
    refreshHouse();
    dispatch();
    return true;
  }

  function normalizeHat() {
    if (state.hat !== 'none' && !isHatUnlocked(state.hat)) {
      state.hat = 'none';
      save();
    }
  }

  function normalizeHouse() {
    if (!houseReward(state.house.bed) || !isBedUnlocked(state.house.bed)) {
      state.house.bed = 'cloud';
    }
    if (!state.house.items || typeof state.house.items !== 'object') state.house.items = {};

    for (var i = 0; i < HOUSE_DETAILS.length; i++) {
      var detail = HOUSE_DETAILS[i];
      if (isDetailUnlocked(detail.id)) {
        if (typeof state.house.items[detail.id] !== 'boolean') state.house.items[detail.id] = true;
      } else {
        delete state.house.items[detail.id];
      }
    }
  }

  function getAchievements() {
    return ACHIEVEMENTS.map(function (item) {
      var hatItem = item.hat ? hat(item.hat) : null;
      var houseItem = item.item ? houseReward(item.item) : null;
      return {
        id: item.id,
        group: item.group || 'general',
        icon: item.icon,
        title: item.title,
        desc: item.desc,
        hat: item.hat || null,
        item: item.item || null,
        rewardType: hatItem ? 'hat' : houseItem ? houseItem.type : 'none',
        rewardName: hatItem ? hatItem.name : houseItem ? houseItem.name : '',
        rewardEmoji: hatItem ? hatItem.emoji : houseItem ? houseItem.emoji : '',
        unlocked: isUnlocked(item.id)
      };
    });
  }

  function getHats() {
    return HATS.map(function (item) {
      return {
        id: item.id,
        name: item.name,
        emoji: item.emoji,
        achievement: item.achievement,
        unlocked: isHatUnlocked(item.id),
        selected: state.hat === item.id
      };
    });
  }

  function getHouse() {
    return {
      bed: state.house.bed,
      beds: BEDS.map(function (item) {
        return {
          id: item.id,
          name: item.name,
          emoji: item.emoji,
          achievement: item.achievement,
          unlocked: isBedUnlocked(item.id),
          selected: state.house.bed === item.id
        };
      }),
      details: HOUSE_DETAILS.map(function (item) {
        return {
          id: item.id,
          name: item.name,
          emoji: item.emoji,
          achievement: item.achievement,
          unlocked: isDetailUnlocked(item.id),
          on: !!state.house.items[item.id] && isDetailUnlocked(item.id)
        };
      })
    };
  }

  function getCount() {
    return Object.keys(state.unlocked).length;
  }

  function getHouseCount() {
    var count = 0;
    for (var i = 0; i < HOUSE_DETAILS.length; i++) {
      if (isDetailUnlocked(HOUSE_DETAILS[i].id)) count++;
    }
    if (isBedUnlocked('patch')) count++;
    return count;
  }

  normalizeHat();
  normalizeHouse();
  refresh();

  window.addEventListener('storage', function (event) {
    if (event.key !== STORAGE_KEY) return;
    state = load();
    normalizeHat();
    normalizeHouse();
    refresh();
    dispatch();
  });

  window.TihonProfile = {
    achievements: getAchievements,
    hats: getHats,
    house: getHouse,
    state: state,
    visit: visit,
    event: event,
    unlock: unlock,
    setHat: setHat,
    setBed: setBed,
    toggleHouseItem: toggleHouseItem,
    isUnlocked: isUnlocked,
    isHatUnlocked: isHatUnlocked,
    isDetailUnlocked: isDetailUnlocked,
    isBedUnlocked: isBedUnlocked,
    getHat: function () { return state.hat; },
    getCount: getCount,
    getHouseCount: getHouseCount,
    refresh: refresh,
    refreshHouse: refreshHouse,
    applyTo: applyTo
  };
})();

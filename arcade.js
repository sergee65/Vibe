(function () {
  'use strict';

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.arcade-tab'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.game-panel'));
  var soundBtn = document.getElementById('soundBtn');
  var worldAudio = window.WorldAudio ? new window.WorldAudio('playroom') : null;
  var active = null;

  if (worldAudio && soundBtn) worldAudio.bindButton(soundBtn);
  else if (soundBtn) soundBtn.style.display = 'none';

  function bestGet(key, fallback) {
    try {
      var value = parseInt(window.localStorage.getItem('tihon.arcade.' + key), 10);
      return isNaN(value) ? (fallback || 0) : value;
    } catch (err) {
      return fallback || 0;
    }
  }

  function bestSet(key, value) {
    try {
      window.localStorage.setItem('tihon.arcade.' + key, String(value));
    } catch (err) {}
  }

  var api = {
    sound: function (name) {
      if (worldAudio) worldAudio.sfx(name);
    },
    bestGet: bestGet,
    bestSet: bestSet
  };

  var games = window.ArcadeGames || {};
  var initialized = {};

  function initGame(id) {
    if (!games[id] || initialized[id]) return;
    try {
      games[id].init(api);
      initialized[id] = true;
    } catch (err) {
      if (window.console && console.error) console.error('Game init failed:', id, err);
    }
  }

  function selectGame(id) {
    if (!games[id]) return;
    if (active === id) {
      initGame(id);
      if (games[id] && games[id].start) games[id].start();
      return;
    }

    if (active && games[active] && initialized[active] && games[active].stop) {
      try { games[active].stop(); } catch (err) {}
    }

    active = id;
    panels.forEach(function (panel) {
      var isActive = panel.dataset.panel === id;
      panel.classList.toggle('is-active', isActive);
      panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    tabs.forEach(function (tab) {
      var isActive = tab.dataset.game === id;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    initGame(id);
    if (games[id].start) {
      try { games[id].start(); } catch (err) {
        if (window.console && console.error) console.error('Game start failed:', id, err);
      }
    }
    if (window.TihonProfile) window.TihonProfile.event('arcade', id);
    if (api.sound) api.sound('click');
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      selectGame(tab.dataset.game);
    });
  });

  window.addEventListener('resize', function () {
    if (active && games[active] && games[active].resize) {
      try { games[active].resize(); } catch (err) {}
    }
  });

  window.addEventListener('blur', function () {
    if (active && games[active] && games[active].blur) {
      try { games[active].blur(); } catch (err) {}
    }
  });

  selectGame('checkers');
})();

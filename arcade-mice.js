(function () {
  'use strict';

  var API = null;
  var grid = document.getElementById('miceGrid');
  var scoreEl = document.getElementById('miceScore');
  var timeEl = document.getElementById('miceTime');
  var bestEl = document.getElementById('miceBest');
  var overlay = document.getElementById('miceOverlay');
  var titleEl = document.getElementById('miceTitle');
  var textEl = document.getElementById('miceText');
  var startBtn = document.getElementById('miceStart');
  var recordEl = document.getElementById('miceRecord');

  var DURATION = 30;
  var state = {
    running: false,
    over: false,
    score: 0,
    timeLeft: DURATION,
    best: 0,
    active: -1,
    spawnTimer: 0,
    life: 0,
    holes: [],
    raf: 0,
    last: 0
  };

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function updateHud() {
    if (scoreEl) scoreEl.textContent = String(state.score);
    if (timeEl) timeEl.textContent = String(Math.max(0, Math.ceil(state.timeLeft)));
    if (bestEl) bestEl.textContent = String(state.best);
  }

  function buildHoles() {
    if (!grid) return;
    grid.innerHTML = '';
    state.holes = [];
    for (var i = 0; i < 6; i++) {
      var hole = document.createElement('button');
      hole.type = 'button';
      hole.className = 'mouse-hole';
      hole.dataset.hole = String(i);
      hole.setAttribute('aria-label', 'Норка ' + (i + 1));
      hole.innerHTML =
        '<span class="mouse">' +
          '<span class="mouse-ear left"></span>' +
          '<span class="mouse-ear right"></span>' +
          '<span class="mouse-body"></span>' +
          '<span class="mouse-eye left"></span>' +
          '<span class="mouse-eye right"></span>' +
          '<span class="mouse-nose"></span>' +
        '</span>';
      grid.appendChild(hole);
      state.holes.push({ el: hole, mouse: hole.querySelector('.mouse') });
    }
  }

  function hideMouse(index) {
    if (index < 0 || !state.holes[index]) return;
    state.holes[index].mouse.classList.remove('is-up');
    state.holes[index].el.setAttribute('aria-label', 'Норка ' + (index + 1));
  }

  function hideActive() {
    if (state.active >= 0) hideMouse(state.active);
    state.active = -1;
  }

  function showMouse(index) {
    if (!state.holes[index]) return;
    hideActive();
    state.active = index;
    state.life = rand(0.68, 0.95);
    state.holes[index].mouse.classList.add('is-up');
    state.holes[index].el.setAttribute('aria-label', 'Мышка в норке ' + (index + 1) + ', нажмите');
  }

  function spawn() {
    var index = Math.floor(Math.random() * state.holes.length);
    if (index === state.active) index = (index + 1) % state.holes.length;
    showMouse(index);
  }

  function update(dt) {
    state.timeLeft -= dt;
    state.spawnTimer -= dt;

    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      updateHud();
      finish();
      return;
    }

    if (state.active >= 0) {
      state.life -= dt;
      if (state.life <= 0) {
        hideActive();
        state.spawnTimer = rand(0.35, 0.7);
      }
    } else if (state.spawnTimer <= 0) {
      spawn();
    }

    updateHud();
  }

  function begin() {
    hideActive();
    state.running = true;
    state.over = false;
    state.score = 0;
    state.timeLeft = DURATION;
    state.spawnTimer = 0.55;
    state.best = API ? API.bestGet('mice', 0) : 0;
    if (overlay) {
      overlay.classList.add('is-hidden');
      overlay.setAttribute('aria-hidden', 'true');
    }
    startBtn.blur();
    updateHud();
    state.last = performance.now();
    if (API) API.sound('start');
    if (window.TihonProfile) window.TihonProfile.event('game');
    state.raf = requestAnimationFrame(loop);
  }

  function finish() {
    if (!state.running) return;
    state.running = false;
    state.over = true;
    hideActive();
    if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    }

    var isRecord = state.score > state.best;
    if (isRecord) {
      state.best = state.score;
      if (API) API.bestSet('mice', state.best);
      if (window.TihonProfile) window.TihonProfile.event('record');
    }
    if (state.score >= 15 && window.TihonProfile) window.TihonProfile.unlock('mice_15');
    updateHud();

    titleEl.textContent = isRecord ? 'Новый рекорд!' : 'Время!';
    textEl.textContent = 'Тихон поймал ' + state.score + ' ' + plural(state.score, 'мышку', 'мышки', 'мышек') + '.';
    startBtn.textContent = 'Ещё раз';
    recordEl.textContent = 'Рекорд: ' + state.best;
    overlay.classList.remove('is-hidden');
    overlay.setAttribute('aria-hidden', 'false');
    if (API) API.sound(isRecord ? 'win' : 'end');
  }

  function loop(now) {
    if (!state.running) return;
    if (!state.last) state.last = now;
    var dt = Math.min(0.04, Math.max(0.001, (now - state.last) / 1000));
    state.last = now;
    update(dt);
    if (state.running) state.raf = requestAnimationFrame(loop);
  }

  function plural(n, one, few, many) {
    var mod10 = n % 10;
    var mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  function onHoleClick(event) {
    if (!state.running) return;
    var hole = event.target.closest ? event.target.closest('.mouse-hole') : null;
    if (!hole) return;
    var index = parseInt(hole.dataset.hole, 10);
    if (index !== state.active) return;
    var x = hole.querySelector('.mouse');
    if (!x || !x.classList.contains('is-up')) return;
    state.score += 1;
    updateHud();
    hideMouse(index);
    state.active = -1;
    state.spawnTimer = rand(0.28, 0.55);
    if (API) API.sound('catch');
  }

  function start() {
    if (!state.best) state.best = API ? API.bestGet('mice', 0) : 0;
    state.running = false;
    state.over = false;
    state.score = 0;
    state.timeLeft = DURATION;
    hideActive();
    updateHud();
    if (overlay) {
      overlay.classList.remove('is-hidden');
      overlay.setAttribute('aria-hidden', 'false');
    }
    if (titleEl) titleEl.textContent = 'Мышки';
    if (textEl) textEl.textContent = 'Мышки выглядывают из норок. Успейте нажать на каждую. У вас 30 секунд.';
    if (startBtn) startBtn.textContent = 'Играть';
    if (recordEl) recordEl.textContent = 'Рекорд: ' + state.best;
  }

  function stop() {
    state.running = false;
    hideActive();
    if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    }
  }

  function init(api) {
    API = api;
    buildHoles();
    state.best = API ? API.bestGet('mice', 0) : 0;
    updateHud();
    if (grid) grid.addEventListener('click', onHoleClick);
    if (startBtn) startBtn.addEventListener('click', begin);
  }

  window.ArcadeGames = window.ArcadeGames || {};
  window.ArcadeGames.mice = {
    init: init,
    start: start,
    stop: stop
  };
})();

(function () {
  'use strict';

  var API = null;
  var panel = document.querySelector('[data-panel="flappy"]');
  var canvas = document.getElementById('flappyCanvas');
  var ctx = canvas ? canvas.getContext('2d') : null;
  var scoreEl = document.getElementById('flappyScore');
  var bestEl = document.getElementById('flappyBest');
  var overlay = document.getElementById('flappyOverlay');
  var titleEl = document.getElementById('flappyTitle');
  var textEl = document.getElementById('flappyText');
  var startBtn = document.getElementById('flappyStart');
  var recordEl = document.getElementById('flappyRecord');

  var state = {
    running: false,
    over: false,
    started: false,
    score: 0,
    best: 0,
    time: 0,
    catY: 0,
    catVy: 0,
    catX: 0,
    pipes: [],
    spawnTimer: 0,
    lastCenter: null,
    raf: 0,
    last: 0,
    dpr: 1,
    w: 0,
    h: 0
  };

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function active() {
    return !!(panel && panel.classList.contains('is-active'));
  }

  function resize() {
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    state.w = Math.max(1, rect.width);
    state.h = Math.max(1, rect.height);
    state.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(state.w * state.dpr);
    canvas.height = Math.round(state.h * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    state.catX = state.w * 0.25;
    if (!state.catY) state.catY = state.h * 0.45;
    if (!state.running) draw();
  }

  function updateHud() {
    if (scoreEl) scoreEl.textContent = String(state.score);
    if (bestEl) bestEl.textContent = String(state.best);
  }

  function reset() {
    state.running = false;
    state.over = false;
    state.started = false;
    state.score = 0;
    state.time = 0;
    state.pipes = [];
    state.spawnTimer = 0.7;
    state.lastCenter = null;
    state.catY = state.h * 0.45;
    state.catVy = 0;
    state.catX = state.w * 0.25;
    if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    }
    updateHud();
  }

  function showOverlay(mode) {
    if (!overlay) return;
    overlay.classList.remove('is-hidden');
    if (mode === 'result') {
      var isRecord = state.score >= state.best && state.score > 0;
      titleEl.textContent = isRecord ? 'Новый рекорд!' : 'Ой!';
      textEl.textContent = 'Тихон пролетел ' + state.score + ' ' + plural(state.score, 'колонну', 'колонны', 'колонн') + '.';
      startBtn.textContent = 'Ещё раз';
      recordEl.textContent = 'Рекорд: ' + state.best;
    } else {
      titleEl.textContent = 'Полёт Тихона';
      textEl.textContent = 'Нажимайте в поле или пробел, чтобы Тихон взмахивал лапами и пролетал между колоннами.';
      startBtn.textContent = 'Играть';
      recordEl.textContent = 'Рекорд: ' + state.best;
    }
  }

  function hideOverlay() {
    if (overlay) overlay.classList.add('is-hidden');
  }

  function begin() {
    if (!state.w) resize();
    reset();
    hideOverlay();
    state.running = true;
    state.started = true;
    state.last = performance.now();
    if (API) API.sound('start');
    if (window.TihonProfile) window.TihonProfile.event('game');
    state.raf = requestAnimationFrame(loop);
  }

  function flap() {
    if (!state.running) return;
    state.catVy = -370;
    if (API) API.sound('click');
  }

  function gameOver() {
    if (!state.running) return;
    state.running = false;
    state.over = true;
    if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    }

    var isRecord = state.score > state.best;
    if (isRecord) {
      state.best = state.score;
      if (API) API.bestSet('flappy', state.best);
      if (window.TihonProfile) window.TihonProfile.event('record');
    }
    if (state.score >= 10 && window.TihonProfile) window.TihonProfile.unlock('flappy_10');
    updateHud();
    showOverlay('result');
    if (API) API.sound(isRecord ? 'win' : 'end');
  }

  function spawnPipe() {
    var gap = clamp(state.h * 0.36, 160, 220);
    var margin = 54;
    var minCenter = margin + gap * 0.5;
    var maxCenter = state.h - margin - gap * 0.5;
    var center;
    
    if (state.lastCenter === null) {
      center = rand(minCenter, maxCenter);
    } else {
      var maxShift = Math.min(80, state.h * 0.14);
      var pull = 0;
      if (state.catY < state.h * 0.28) pull = maxShift * 0.45;
      else if (state.catY > state.h * 0.72) pull = -maxShift * 0.45;
      
      center = clamp(state.lastCenter + rand(-maxShift, maxShift) + pull, minCenter, maxCenter);
    }
    state.lastCenter = center;
    var width = clamp(state.w * 0.075, 50, 66);
    state.pipes.push({
      x: state.w + 70,
      width: width,
      gap: gap,
      center: center,
      scored: false
    });
  }

  function update(dt) {
    state.time += dt;
    state.catVy += 1260 * dt;
    state.catY += state.catVy * dt;
    state.spawnTimer -= dt;
    var speed = clamp(state.w * 0.14, 118, 165);

    if (state.spawnTimer <= 0) {
      spawnPipe();
      state.spawnTimer = 2.0;
    }

    for (var i = state.pipes.length - 1; i >= 0; i--) {
      var pipe = state.pipes[i];
      pipe.x -= speed * dt;
      if (!pipe.scored && pipe.x + pipe.width < state.catX) {
        pipe.scored = true;
        state.score += 1;
        updateHud();
        if (API) API.sound('catch');
      }
      if (pipe.x + pipe.width < -20) state.pipes.splice(i, 1);
    }

    var r = Math.max(13, Math.min(19, state.w * 0.022));
    if (state.catY - r < 0 || state.catY + r > state.h - 12) {
      gameOver();
      return;
    }

    for (var j = 0; j < state.pipes.length; j++) {
      var p = state.pipes[j];
      var withinX = state.catX + r > p.x && state.catX - r < p.x + p.width;
      if (!withinX) continue;
      if (state.catY - r < p.center - p.gap * 0.5 || state.catY + r > p.center + p.gap * 0.5) {
        gameOver();
        return;
      }
    }
  }

  function cloud(x, y, scale, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff8eb';
    ctx.beginPath();
    ctx.ellipse(x, y, 60 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 34 * scale, y + 3 * scale, 32 * scale, 14 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 36 * scale, y + 2 * scale, 35 * scale, 13 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 9 * scale, y - 12 * scale, 28 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPipe(pipe) {
    var topEnd = pipe.center - pipe.gap * 0.5;
    var bottomStart = pipe.center + pipe.gap * 0.5;
    var x = pipe.x;
    var w = pipe.width;
    var ground = state.h - 12;

    function column(y, h) {
      var grad = ctx.createLinearGradient(x, 0, x + w, 0);
      grad.addColorStop(0, '#5c8d80');
      grad.addColorStop(0.32, '#84b7a6');
      grad.addColorStop(0.72, '#6f9e91');
      grad.addColorStop(1, '#4c786d');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 9);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 238, 207, 0.12)';
      for (var line = 1; line < 5; line++) {
        ctx.fillRect(x + 7, y + (h / 5) * line, w - 14, 2);
      }

      ctx.fillStyle = '#e8cda7';
      ctx.beginPath();
      ctx.roundRect(x - 6, y + (y === 0 ? h - 18 : 0), w + 12, 18, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(96, 62, 38, 0.18)';
      ctx.fillRect(x - 6, y + (y === 0 ? h - 8 : 8), w + 12, 2);
    }

    column(0, topEnd);
    column(bottomStart, ground - bottomStart);
  }

  function drawCat(x, y, tilt) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#2c221c';
    ctx.beginPath();
    ctx.ellipse(0, 34, 25, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // cape / scarf
    ctx.fillStyle = '#7fdbe2';
    ctx.beginPath();
    ctx.moveTo(-11, 4);
    ctx.quadraticCurveTo(-38, 8, -31, 23);
    ctx.quadraticCurveTo(-16, 16, -2, 12);
    ctx.closePath();
    ctx.fill();

    // tail
    ctx.strokeStyle = '#b86d43';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-17, 13);
    ctx.quadraticCurveTo(-33, 18, -28, 30);
    ctx.stroke();

    // body
    ctx.fillStyle = '#d78a5b';
    ctx.beginPath();
    ctx.ellipse(0, 11, 24, 21, -0.12, 0, Math.PI * 2);
    ctx.fill();

    // chest
    ctx.fillStyle = '#f8e8cf';
    ctx.beginPath();
    ctx.ellipse(-3, 17, 11, 13, -0.08, 0, Math.PI * 2);
    ctx.fill();

    // paws
    ctx.fillStyle = '#f8e8cf';
    ctx.beginPath();
    ctx.ellipse(-12, 30, 7, 4, -0.2, 0, Math.PI * 2);
    ctx.ellipse(8, 31, 7, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // head
    ctx.fillStyle = '#d78a5b';
    ctx.beginPath();
    ctx.arc(12, -10, 18, 0, Math.PI * 2);
    ctx.fill();

    // ears
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(-4, -38);
    ctx.lineTo(10, -28);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(20, -24);
    ctx.lineTo(28, -38);
    ctx.lineTo(28, -20);
    ctx.closePath();
    ctx.fill();

    // inner ears
    ctx.fillStyle = '#e9a58c';
    ctx.beginPath();
    ctx.moveTo(2, -25);
    ctx.lineTo(0, -34);
    ctx.lineTo(8, -28);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(22, -26);
    ctx.lineTo(26, -34);
    ctx.lineTo(26, -22);
    ctx.closePath();
    ctx.fill();

    // eyes and muzzle (ГЛАЗА СДВИНУТЫ МАКСИМАЛЬНО БЛИЗКО ДРУГ К ДРУГУ)
    ctx.fillStyle = '#f7e7c8';
    ctx.beginPath();
    ctx.ellipse(24, -12, 5, 5.6, 0, 0, Math.PI * 2); // Правый глаз
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(17, -13, 4.4, 5, 0, 0, Math.PI * 2); // Левый глаз
    ctx.fill();
    
    ctx.fillStyle = '#243733';
    ctx.beginPath();
    ctx.arc(25, -12, 2.3, 0, Math.PI * 2); // Зрачок правый
    ctx.fill();
    ctx.beginPath();
    ctx.arc(18, -13, 2.1, 0, Math.PI * 2); // Зрачок левый
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(25.7, -12.8, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(18.7, -13.8, 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8e8cf';
    ctx.beginPath();
    ctx.ellipse(21, 0, 8, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c97568';
    ctx.beginPath();
    ctx.moveTo(21, -1);
    ctx.lineTo(25, 0.5);
    ctx.lineTo(21, 2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#f8e8cf';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(15, -1); ctx.lineTo(4, -4);
    ctx.moveTo(15, 2); ctx.lineTo(3, 4);
    ctx.stroke();

    drawFlappyHat();
    ctx.restore();
  }

  function drawFlappyHat() {
    var hat = window.TihonProfile ? window.TihonProfile.getHat() : 'none';
    if (!hat || hat === 'none') return;

    ctx.save();
    ctx.translate(12, -27);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (hat === 'straw') {
      ctx.fillStyle = '#d9a45e';
      ctx.beginPath();
      ctx.ellipse(0, 2, 17, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8ba76';
      ctx.beginPath();
      ctx.moveTo(-9, 2);
      ctx.quadraticCurveTo(-8, -9, 0, -9);
      ctx.quadraticCurveTo(8, -9, 9, 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8a5d38';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, 1);
      ctx.quadraticCurveTo(0, 4, 8, 1);
      ctx.stroke();
    } else if (hat === 'beanie') {
      ctx.fillStyle = '#6fa99a';
      ctx.beginPath();
      ctx.moveTo(-13, 2);
      ctx.quadraticCurveTo(-13, -13, 0, -13);
      ctx.quadraticCurveTo(13, -13, 13, 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#567f75';
      ctx.fillRect(-14, 0, 28, 5);
      ctx.fillStyle = '#f4e2c9';
      ctx.beginPath();
      ctx.arc(0, -15, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (hat === 'cap') {
      ctx.fillStyle = '#c9704b';
      ctx.beginPath();
      ctx.arc(0, -3, 13, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#a95536';
      ctx.beginPath();
      ctx.ellipse(7, 1, 14, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd37f';
      ctx.beginPath();
      ctx.arc(0, -15, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (hat === 'tophat') {
      ctx.fillStyle = '#2f2623';
      ctx.beginPath();
      ctx.ellipse(0, 2, 16, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4b3a32';
      ctx.fillRect(-10, -16, 20, 18);
      ctx.fillStyle = '#c9704b';
      ctx.fillRect(-10, -5, 20, 4);
    } else if (hat === 'crown') {
      ctx.fillStyle = '#f2c45c';
      ctx.strokeStyle = '#c0922f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-14, 2);
      ctx.lineTo(-12, -12);
      ctx.lineTo(-4, -5);
      ctx.lineTo(0, -16);
      ctx.lineTo(4, -5);
      ctx.lineTo(12, -12);
      ctx.lineTo(14, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (hat === 'wizard') {
      ctx.fillStyle = '#4d3f6b';
      ctx.beginPath();
      ctx.ellipse(0, 2, 16, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#75609b';
      ctx.beginPath();
      ctx.moveTo(-11, 2);
      ctx.lineTo(2, -24);
      ctx.lineTo(13, 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffe7a3';
      ctx.beginPath();
      ctx.arc(4, -11, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function draw() {
    if (!ctx || !state.w || !state.h) return;
    var W = state.w;
    var H = state.h;

    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#f3d3b8');
    sky.addColorStop(0.55, '#d9e3db');
    sky.addColorStop(1, '#aed8da');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var sun = ctx.createRadialGradient(W * 0.78, H * 0.2, 2, W * 0.78, H * 0.2, 72);
    sun.addColorStop(0, 'rgba(255, 243, 195, 0.75)');
    sun.addColorStop(0.35, 'rgba(255, 212, 142, 0.18)');
    sun.addColorStop(1, 'rgba(255, 212, 142, 0)');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(W * 0.78, H * 0.2, 72, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    cloud(W * 0.18 - (state.time * 8) % (W * 0.5), H * 0.18, 0.9, 0.65);
    cloud(W * 0.55 - (state.time * 5) % (W * 0.6), H * 0.3, 0.7, 0.5);
    cloud(W * 0.9 - (state.time * 6) % (W * 0.7), H * 0.12, 0.55, 0.45);

    ctx.fillStyle = 'rgba(102, 137, 126, 0.24)';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.78);
    ctx.quadraticCurveTo(W * 0.2, H * 0.65, W * 0.42, H * 0.8);
    ctx.quadraticCurveTo(W * 0.58, H * 0.7, W * 0.75, H * 0.82);
    ctx.quadraticCurveTo(W * 0.9, H * 0.72, W, H * 0.8);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    for (var i = 0; i < state.pipes.length; i++) drawPipe(state.pipes[i]);

    ctx.fillStyle = '#c59b70';
    ctx.fillRect(0, H - 12, W, 12);
    ctx.fillStyle = 'rgba(255, 243, 217, 0.22)';
    ctx.fillRect(0, H - 12, W, 2);

    var tilt = clamp(state.catVy / 900, -0.32, 0.5);
    drawCat(state.catX, state.catY, tilt);

    if (!state.running && state.started && state.over) {
      // final frame stays visible under the result overlay
    }
  }

  function loop(now) {
    if (!state.running) return;
    if (!state.last) state.last = now;
    var dt = Math.min(0.034, Math.max(0.001, (now - state.last) / 1000));
    state.last = now;
    update(dt);
    draw();
    if (state.running) state.raf = requestAnimationFrame(loop);
  }

  function plural(n, one, few, many) {
    var mod10 = n % 10;
    var mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  function start() {
    if (!API) return;
    state.best = API.bestGet('flappy', 0);
    reset();
    resize();
    updateHud();
    showOverlay('intro');
    draw();
  }

  function stop() {
    state.running = false;
    if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    }
  }

  function init(api) {
    API = api;
    if (!canvas || !ctx) return;

    state.best = API.bestGet('flappy', 0);
    startBtn.addEventListener('click', begin);
    canvas.addEventListener('pointerdown', function (event) {
      if (!state.running) return;
      event.preventDefault();
      flap();
    }, { passive: false });

    window.addEventListener('keydown', function (event) {
      if (!active()) return;
      var tag = event.target && event.target.tagName ? event.target.tagName : '';
      if (event.code === 'Space' || event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W' || event.key === 'ц' || event.key === 'Ц') {
        if (tag === 'BUTTON' && event.code === 'Space') return;
        event.preventDefault();
        if (state.running) flap();
        else if (!state.over) begin();
      }
    });

    window.addEventListener('resize', function () {
      if (active()) resize();
    });

    reset();
    resize();
    updateHud();
    showOverlay('intro');
    draw();
  }

  window.ArcadeGames = window.ArcadeGames || {};
  window.ArcadeGames.flappy = {
    init: init,
    start: start,
    stop: stop,
    resize: resize,
    blur: function () { state.catVy = Math.max(state.catVy, 0); }
  };
})();
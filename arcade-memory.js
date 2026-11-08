(function () {
  'use strict';

  var API = null;
  var grid = document.getElementById('memoryGrid');
  var movesEl = document.getElementById('memoryMoves');
  var pairsEl = document.getElementById('memoryPairs');
  var bestEl = document.getElementById('memoryBest');
  var statusEl = document.getElementById('memoryStatus');
  var overlay = document.getElementById('memoryOverlay');
  var resultEl = document.getElementById('memoryResult');
  var recordEl = document.getElementById('memoryRecord');
  var againBtn = document.getElementById('memoryAgain');
  var restartBtn = document.getElementById('memoryRestart');

  var TYPES = [
    {
      id: 'fish',
      color: '#4d9da7',
      svg: '<svg viewBox="0 0 64 64" fill="none"><path d="M10 32c7-11 16-15 25-11 5 2 9 6 12 11-3 5-7 9-12 11-9 4-18 0-25-11Z" fill="currentColor"/><path d="M10 32 2 22v20l8-10Z" fill="currentColor" opacity=".7"/><circle cx="26" cy="29" r="2.5" fill="#fff8ec"/><path d="M36 23c4-4 9-5 12-2" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".55"/></svg>'
    },
    {
      id: 'paw',
      color: '#c9704b',
      svg: '<svg viewBox="0 0 64 64" fill="currentColor"><ellipse cx="19" cy="22" rx="6" ry="8" transform="rotate(-18 19 22)"/><ellipse cx="32" cy="17" rx="6" ry="8"/><ellipse cx="45" cy="22" rx="6" ry="8" transform="rotate(18 45 22)"/><path d="M32 31c9 0 17 7 17 14 0 5-4 8-8 8-3 0-6-1-9-1s-6 1-9 1c-4 0-8-3-8-8 0-7 8-14 17-14Z"/></svg>'
    },
    {
      id: 'yarn',
      color: '#5d8f99',
      svg: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor"><circle cx="32" cy="33" r="20" fill="currentColor" opacity=".22"/><circle cx="32" cy="33" r="20" stroke-width="4"/><path d="M15 28c12-5 25-2 34 8M17 39c9-8 21-9 30-2M24 16c-2 13 5 25 18 31" stroke-width="3.5" stroke-linecap="round"/></svg>'
    },
    {
      id: 'moon',
      color: '#8e79ad',
      svg: '<svg viewBox="0 0 64 64" fill="currentColor"><path d="M44 50A22 22 0 0 1 24 13a22 22 0 1 0 20 37Z"/><path d="m47 13 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" opacity=".65"/></svg>'
    },
    {
      id: 'mouse',
      color: '#7b8a86',
      svg: '<svg viewBox="0 0 64 64" fill="currentColor"><circle cx="18" cy="23" r="10" opacity=".55"/><circle cx="46" cy="23" r="10" opacity=".55"/><path d="M32 51c-12 0-21-8-21-19 0-10 9-16 21-16s21 6 21 16c0 11-9 19-21 19Z"/><circle cx="25" cy="33" r="2.5" fill="#fff8ec"/><circle cx="39" cy="33" r="2.5" fill="#fff8ec"/><circle cx="32" cy="41" r="3" fill="#d78f88"/></svg>'
    },
    {
      id: 'star',
      color: '#d8a64d',
      svg: '<svg viewBox="0 0 64 64" fill="currentColor"><path d="m32 6 7.5 16.5L57 25l-13 12 3.5 18L32 46 16.5 55 20 37 7 25l17.5-2.5L32 6Z"/><circle cx="26" cy="25" r="2" fill="#fff8ec" opacity=".8"/></svg>'
    }
  ];

  var state = {
    cards: [],
    first: null,
    second: null,
    locked: false,
    moves: 0,
    pairs: 0,
    best: 0,
    timer: 0,
    over: false
  };

  function shuffle(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  function typeFor(id) {
    for (var i = 0; i < TYPES.length; i++) if (TYPES[i].id === id) return TYPES[i];
    return TYPES[0];
  }

  function updateHud() {
    if (movesEl) movesEl.textContent = String(state.moves);
    if (pairsEl) pairsEl.textContent = state.pairs + '/6';
    if (bestEl) bestEl.textContent = state.best ? String(state.best) : '—';
    if (recordEl) recordEl.textContent = 'Рекорд: ' + (state.best ? state.best + ' ходов' : '—');
  }

  function updateStatus() {
    if (statusEl) {
      statusEl.textContent = state.pairs === 6
        ? 'Все пары найдены!'
        : 'Найдено ' + state.pairs + ' из 6 пар.';
    }
  }

  function setCardOpen(cardEl, open) {
    cardEl.classList.toggle('is-open', open);
  }

  function cardIndexFromElement(el) {
    var card = el.closest ? el.closest('.memory-card') : null;
    if (!card) return -1;
    return parseInt(card.dataset.index, 10);
  }

  function onCardClick(event) {
    if (state.locked || state.over) return;
    var index = cardIndexFromElement(event.target);
    if (index < 0) return;
    var card = state.cards[index];
    if (!card || card.matched) return;
    var el = grid.querySelector('.memory-card[data-index="' + index + '"]');
    if (!el || el.classList.contains('is-open')) return;

    setCardOpen(el, true);
    if (API) API.sound('click');

    if (state.first === null) {
      state.first = index;
      return;
    }

    var firstIndex = state.first;
    state.first = null;
    state.second = index;
    state.moves += 1;
    updateHud();

    var firstCard = state.cards[firstIndex];
    if (firstCard.type === card.type) {
      firstCard.matched = true;
      card.matched = true;
      state.pairs += 1;
      var firstEl = grid.querySelector('.memory-card[data-index="' + firstIndex + '"]');
      if (firstEl) firstEl.classList.add('is-matched');
      el.classList.add('is-matched');
      updateHud();
      updateStatus();
      if (API) API.sound('catch');
      if (state.pairs === 6) finishGame();
      return;
    }

    state.locked = true;
    var self = this;
    state.timer = window.setTimeout(function () {
      var a = grid.querySelector('.memory-card[data-index="' + firstIndex + '"]');
      var b = grid.querySelector('.memory-card[data-index="' + index + '"]');
      if (a) setCardOpen(a, false);
      if (b) setCardOpen(b, false);
      state.locked = false;
      state.timer = 0;
    }, 760);
  }

  function finishGame() {
    state.over = true;
    var isRecord = !state.best || state.moves < state.best;
    if (isRecord) {
      state.best = state.moves;
      if (API) API.bestSet('memory', state.best);
      if (window.TihonProfile) window.TihonProfile.event('record');
    }
    if (window.TihonProfile) window.TihonProfile.unlock('memory_win');
    updateHud();
    resultEl.textContent = 'Тихон нашёл все пары за ' + state.moves + ' ' + plural(state.moves, 'ход', 'хода', 'ходов') + '.';
    if (isRecord) resultEl.textContent += ' Новый рекорд!';
    if (recordEl) recordEl.textContent = 'Рекорд: ' + (state.best ? state.best + ' ходов' : '—');
    overlay.classList.remove('is-hidden');
    overlay.setAttribute('aria-hidden', 'false');
    if (API) API.sound('win');
  }

  function plural(n, one, few, many) {
    var mod10 = n % 10;
    var mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  function buildDeck() {
    var deck = [];
    TYPES.forEach(function (type) {
      deck.push({ type: type.id, matched: false });
      deck.push({ type: type.id, matched: false });
    });
    return shuffle(deck);
  }

  function render() {
    grid.innerHTML = '';
    state.cards.forEach(function (card, index) {
      var type = typeFor(card.type);
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'memory-card';
      button.dataset.index = String(index);
      button.dataset.type = card.type;
      button.setAttribute('aria-label', 'Карточка ' + (index + 1));
      button.innerHTML =
        '<span class="memory-card-inner">' +
          '<span class="memory-face memory-back" aria-hidden="true"></span>' +
          '<span class="memory-face memory-front">' +
            '<span class="memory-icon" style="color:' + type.color + '" aria-hidden="true">' + type.svg + '</span>' +
          '</span>' +
        '</span>';
      if (card.matched) button.classList.add('is-matched', 'is-open');
      grid.appendChild(button);
    });
    updateHud();
    updateStatus();
  }

  function newGame() {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = 0;
    }
    state.cards = buildDeck();
    state.first = null;
    state.second = null;
    state.locked = false;
    state.moves = 0;
    state.pairs = 0;
    state.over = false;
    state.best = API ? API.bestGet('memory', 0) : 0;
    overlay.classList.add('is-hidden');
    overlay.setAttribute('aria-hidden', 'true');
    render();
  }

  function init(api) {
    API = api;
    if (!grid) return;
    grid.addEventListener('click', onCardClick);
    againBtn.addEventListener('click', newGame);
    restartBtn.addEventListener('click', newGame);
    newGame();
  }

  function start() {
    newGame();
    if (window.TihonProfile) window.TihonProfile.event('game');
  }

  function stop() {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = 0;
    }
    state.locked = false;
  }

  window.ArcadeGames = window.ArcadeGames || {};
  window.ArcadeGames.memory = {
    init: init,
    start: start,
    stop: stop
  };
})();

(function () {
  'use strict';

  var API = null;
  var boardEl = document.getElementById('checkersBoard');
  var statusEl = document.getElementById('checkersStatus');
  var lightCountEl = document.getElementById('lightCount');
  var darkCountEl = document.getElementById('darkCount');
  var resultEl = document.getElementById('checkersResult');
  var resultTitleEl = document.getElementById('checkersResultTitle');
  var resultTextEl = document.getElementById('checkersResultText');
  var restartBtn = document.getElementById('checkersRestart');
  var againBtn = document.getElementById('checkersAgain');

  var cells = [];
  var state = {
    board: [],
    turn: 'light',
    selected: null,
    legal: [],
    busy: false,
    over: false,
    chain: false,
    timer: 0
  };

  function initialBoard() {
    var board = [];
    for (var r = 0; r < 8; r++) {
      var row = [];
      for (var c = 0; c < 8; c++) row.push(null);
      board.push(row);
    }
    for (var rr = 0; rr < 3; rr++) {
      for (var cc = 0; cc < 8; cc++) {
        if ((rr + cc) % 2 === 1) board[rr][cc] = { color: 'dark', king: false };
      }
    }
    for (var r2 = 5; r2 < 8; r2++) {
      for (var c2 = 0; c2 < 8; c2++) {
        if ((r2 + c2) % 2 === 1) board[r2][c2] = { color: 'light', king: false };
      }
    }
    return board;
  }

  function inside(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  function pieceMoves(board, r, c) {
    var piece = board[r][c];
    if (!piece) return [];
    var dirs = [];
    if (piece.king) dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    else if (piece.color === 'light') dirs = [[-1, -1], [-1, 1]];
    else dirs = [[1, -1], [1, 1]];

    var moves = [];
    for (var i = 0; i < dirs.length; i++) {
      var dr = dirs[i][0];
      var dc = dirs[i][1];
      var r1 = r + dr;
      var c1 = c + dc;
      if (!inside(r1, c1)) continue;

      var target = board[r1][c1];
      if (!target) {
        moves.push({ from: { r: r, c: c }, to: { r: r1, c: c1 }, capture: null });
      } else if (target.color !== piece.color) {
        var r2 = r + dr * 2;
        var c2 = c + dc * 2;
        if (inside(r2, c2) && !board[r2][c2]) {
          moves.push({
            from: { r: r, c: c },
            to: { r: r2, c: c2 },
            capture: { r: r1, c: c1 }
          });
        }
      }
    }
    return moves;
  }

  function allMoves(board, color) {
    var moves = [];
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var piece = board[r][c];
        if (piece && piece.color === color) {
          moves = moves.concat(pieceMoves(board, r, c));
        }
      }
    }
    var captures = moves.filter(function (m) { return !!m.capture; });
    return captures.length ? captures : moves;
  }

  function countPieces(color) {
    var count = 0;
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        if (state.board[r][c] && state.board[r][c].color === color) count++;
      }
    }
    return count;
  }

  function applyMove(move) {
    var piece = state.board[move.from.r][move.from.c];
    if (!piece) return;
    state.board[move.from.r][move.from.c] = null;
    state.board[move.to.r][move.to.c] = piece;
    if (move.capture) state.board[move.capture.r][move.capture.c] = null;

    if (piece.color === 'light' && move.to.r === 0) piece.king = true;
    if (piece.color === 'dark' && move.to.r === 7) piece.king = true;
  }

  function hasPieces(color) {
    return countPieces(color) > 0;
  }

  function finishIfDone(nextTurn) {
    if (!hasPieces(nextTurn) || allMoves(state.board, nextTurn).length === 0) {
      state.over = true;
      state.busy = false;
      state.selected = null;
      state.legal = [];
      var winner = nextTurn === 'light' ? 'dark' : 'light';
      showResult(winner);
      render();
      return true;
    }
    return false;
  }

  function showResult(winner) {
    var isTihon = winner === 'light';
    if (isTihon) {
      resultTitleEl.textContent = 'Тихон победил!';
      resultTextEl.textContent = 'Мышка осталась без шашек. Отличная партия!';
      statusEl.textContent = 'Тихон победил!';
      if (window.TihonProfile) window.TihonProfile.unlock('checkers_win');
      if (API) API.sound('win');
    } else {
      resultTitleEl.textContent = 'Мышка победила';
      resultTextEl.textContent = 'У Тихона не осталось ходов. В следующий раз получится!';
      statusEl.textContent = 'Мышка победила.';
      if (API) API.sound('end');
    }
    resultEl.classList.remove('is-hidden');
    resultEl.setAttribute('aria-hidden', 'false');
  }

  function hideResult() {
    resultEl.classList.add('is-hidden');
    resultEl.setAttribute('aria-hidden', 'true');
  }

  function updateCounts() {
    lightCountEl.textContent = String(countPieces('light'));
    darkCountEl.textContent = String(countPieces('dark'));
  }

  function render() {
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var cell = cells[r][c];
        var piece = state.board[r][c];
        cell.className = 'checkers-cell ' + ((r + c) % 2 === 1 ? 'dark' : 'light');
        cell.innerHTML = '';
        cell.setAttribute('aria-label', 'Клетка ' + (r + 1) + '-' + (c + 1) + (piece ? (piece.color === 'light' ? ', шашка Тихона' : ', шашка мышки') : ', пусто'));

        if (state.selected && state.selected.r === r && state.selected.c === c) {
          cell.classList.add('is-selected');
        }

        for (var i = 0; i < state.legal.length; i++) {
          if (state.legal[i].to.r === r && state.legal[i].to.c === c) {
            cell.classList.add(state.legal[i].capture ? 'is-capture' : 'is-target');
            break;
          }
        }

        if (piece) {
          var span = document.createElement('span');
          span.className = 'checkers-piece ' + piece.color + (piece.king ? ' king' : '');
          cell.appendChild(span);
        }
      }
    }
    updateCounts();
  }

  function clearSelection() {
    state.selected = null;
    state.legal = [];
  }

  function selectPiece(r, c) {
    var piece = state.board[r][c];
    if (!piece || piece.color !== 'light') return false;
    if (state.chain && state.selected && (state.selected.r !== r || state.selected.c !== c)) {
      statusEl.textContent = 'Сначала завершите взятие.';
      return false;
    }

    var moves = allMoves(state.board, 'light').filter(function (m) {
      return m.from.r === r && m.from.c === c;
    });
    if (!moves.length) {
      statusEl.textContent = 'Этой шашкой сейчас нельзя ходить.';
      return false;
    }

    state.selected = { r: r, c: c };
    state.legal = moves;
    statusEl.textContent = 'Выберите клетку.';
    render();
    if (API) API.sound('click');
    return true;
  }

  function playerMove(r, c) {
    var legal = state.legal.filter(function (m) { return m.to.r === r && m.to.c === c; });
    if (!legal.length) return false;

    var move = legal[0];
    var wasCapture = !!move.capture;
    applyMove(move);
    clearSelection();

    if (wasCapture) {
      var further = pieceMoves(state.board, move.to.r, move.to.c).filter(function (m) {
        return !!m.capture;
      });
      if (further.length) {
        state.chain = true;
        state.selected = { r: move.to.r, c: move.to.c };
        state.legal = further;
        statusEl.textContent = 'Продолжите взятие.';
        render();
        if (API) API.sound('hit');
        return true;
      }
    }

    state.chain = false;
    state.turn = 'dark';
    state.busy = true;
    statusEl.textContent = 'Мышка думает…';
    render();
    if (API) API.sound(wasCapture ? 'hit' : 'click');

    if (finishIfDone('dark')) return true;
    state.timer = window.setTimeout(aiTurn, 520);
    return true;
  }

  function chooseAIMove(moves) {
    var captures = moves.filter(function (m) { return !!m.capture; });
    if (captures.length) return captures[Math.floor(Math.random() * captures.length)];

    var scored = moves.map(function (move) {
      var score = move.to.r * 2;
      score += (3.5 - Math.abs(3.5 - move.to.c)) * 0.7;
      if (move.to.r === 7) score += 10;
      return { move: move, score: score };
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    var top = scored.slice(0, Math.min(3, scored.length));
    return top[Math.floor(Math.random() * top.length)].move;
  }

  function aiTurn() {
    state.timer = 0;
    if (state.over || !state.busy) return;

    var moves = allMoves(state.board, 'dark');
    if (!moves.length) {
      state.turn = 'dark';
      state.busy = false;
      finishIfDone('dark');
      return;
    }

    var move = chooseAIMove(moves);
    var wasCapture = !!move.capture;
    applyMove(move);

    while (move.capture) {
      var nextCaptures = pieceMoves(state.board, move.to.r, move.to.c).filter(function (m) {
        return !!m.capture;
      });
      if (!nextCaptures.length) break;
      move = nextCaptures[Math.floor(Math.random() * nextCaptures.length)];
      applyMove(move);
    }

    state.chain = false;
    state.turn = 'light';
    state.busy = false;
    render();
    if (API) API.sound(wasCapture ? 'hit' : 'click');

    if (finishIfDone('light')) return;
    statusEl.textContent = 'Ваш ход. Выберите шашку.';
  }

  function onCellClick(event) {
    var cell = event.target.closest ? event.target.closest('.checkers-cell') : null;
    if (!cell || state.over || state.busy) return;
    var r = parseInt(cell.dataset.r, 10);
    var c = parseInt(cell.dataset.c, 10);

    if (state.selected) {
      if (state.board[r][c] && state.board[r][c].color === 'light') {
        selectPiece(r, c);
        return;
      }
      if (playerMove(r, c)) return;
    }

    selectPiece(r, c);
  }

  function newGame() {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = 0;
    }
    state.board = initialBoard();
    state.turn = 'light';
    state.selected = null;
    state.legal = [];
    state.busy = false;
    state.over = false;
    state.chain = false;
    hideResult();
    statusEl.textContent = 'Ваш ход. Выберите шашку.';
    render();
  }

  function init(api) {
    API = api;
    if (!boardEl) return;

    for (var r = 0; r < 8; r++) {
      cells[r] = [];
      for (var c = 0; c < 8; c++) {
        var cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'checkers-cell ' + ((r + c) % 2 === 1 ? 'dark' : 'light');
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        cell.setAttribute('role', 'gridcell');
        cell.tabIndex = -1;
        boardEl.appendChild(cell);
        cells[r][c] = cell;
      }
    }

    boardEl.addEventListener('click', onCellClick);
    restartBtn.addEventListener('click', newGame);
    againBtn.addEventListener('click', newGame);
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
  }

  window.ArcadeGames = window.ArcadeGames || {};
  window.ArcadeGames.checkers = {
    init: init,
    start: start,
    stop: stop
  };
})();

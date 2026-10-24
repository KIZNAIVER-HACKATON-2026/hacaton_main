/* «Топ смен»: отдельное окно, доступное и гостю, и игроку. */
(function () {
  'use strict';

  var modal = document.getElementById('top');
  var openers = document.querySelectorAll('[data-leaderboard-open]');
  if (!modal || typeof modal.showModal !== 'function' || !openers.length) return;

  var list = modal.querySelector('.board__list');
  var empty = modal.querySelector('.board__empty');
  var previousFocus = null;
  var refreshTimer = null;
  var request = null;
  var backdropPressed = false;

  function setExpanded(expanded) {
    Array.prototype.forEach.call(openers, function (button) {
      button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
  }

  function span(className, text) {
    var element = document.createElement('span');
    element.className = className;
    element.textContent = text;
    return element;
  }

  function shiftDate(value) {
    var match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(value || ''));
    return match ? match[3] + '.' + match[2] + ' · ' + match[4] + ':' + match[5] : '—';
  }

  function renderBoard(players) {
    if (!list || !empty) return;
    var fragment = document.createDocumentFragment();
    players.slice(0, 5).forEach(function (player, index) {
      var rank = Math.max(1, Math.round(Number(player.rank) || index + 1));
      var row = document.createElement('li');
      row.className = 'rank' + (rank <= 3 ? ' rank--' + rank : '');
      var medal = span('rank__medal', String(rank).padStart(2, '0'));
      medal.setAttribute('aria-hidden', 'true');
      var who = span('rank__who', '');
      who.appendChild(span('rank__nick', String(player.nickname || '')));
      who.appendChild(span('rank__when', shiftDate(player.finished_at)));
      var points = String(Math.max(0, Math.round(Number(player.score) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      var score = span('rank__score', points);
      var unit = document.createElement('small');
      unit.textContent = 'очк';
      score.appendChild(unit);
      row.appendChild(medal);
      row.appendChild(who);
      row.appendChild(score);
      fragment.appendChild(row);
    });
    list.replaceChildren(fragment);
    list.hidden = players.length === 0;
    empty.hidden = players.length > 0;
  }

  // Обновляем при открытии и раз в минуту, только пока окно видно.
  // При ошибке сети оставляем результат, отрисованный PHP или прошлым запросом.
  function refreshBoard() {
    if (!modal.open || document.hidden || document.body.dataset.db !== '1' || request) return;
    var controller = new AbortController();
    request = controller;
    fetch('api/top.php?limit=5', {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    }).then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        if (request === controller && modal.open && data && data.ok && Array.isArray(data.players)) renderBoard(data.players);
      }).catch(function () {})
      .then(function () { if (request === controller) request = null; });
  }

  function openModal(opener) {
    if (modal.open) return;
    previousFocus = opener || document.activeElement;
    modal.showModal();
    document.body.classList.add('leaderboard-open');
    setExpanded(true);
    refreshBoard();
    refreshTimer = window.setInterval(refreshBoard, 60000);
  }

  Array.prototype.forEach.call(openers, function (button) {
    button.addEventListener('click', function () {
      if (modal.open) modal.close();
      else openModal(button);
    });
  });
  Array.prototype.forEach.call(modal.querySelectorAll('[data-leaderboard-close]'), function (button) {
    button.addEventListener('click', function () { modal.close(); });
  });

  function outsideWindow(event) {
    var bounds = modal.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  }
  modal.addEventListener('pointerdown', function (event) {
    backdropPressed = event.button === 0 && event.target === modal && outsideWindow(event);
  });
  modal.addEventListener('click', function (event) {
    if (backdropPressed && event.target === modal && outsideWindow(event)) modal.close();
    backdropPressed = false;
  });

  // Не выпускаем Tab на фон или в интерфейс браузера при обходе окна.
  modal.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab' || event.ctrlKey || event.altKey || event.metaKey) return;
    var focusable = modal.querySelectorAll('button:not(:disabled), [tabindex="0"]');
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Escape и недоступность фона обеспечивает нативный dialog.
  modal.addEventListener('close', function () {
    if (modal.open) return;
    document.body.classList.remove('leaderboard-open');
    setExpanded(false);
    window.clearInterval(refreshTimer);
    refreshTimer = null;
    if (request) request.abort();
    request = null;
    backdropPressed = false;
    if (window.location.hash === '#top') {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }
    if (previousFocus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
  });

  // Сохраняем совместимость со старыми ссылками index.php#top.
  function openFromHash() {
    if (window.location.hash === '#top') openModal(openers[0]);
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();
})();

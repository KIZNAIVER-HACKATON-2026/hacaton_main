/* ==========================================================================
   Смена 03 — главное меню.
   Отвечает за модалку ника, проверку сохранения через /api и переход в игру.
   Данные на самой странице уже отрисованы PHP из MySQL — этот файл
   только оживляет интерфейс.
   ========================================================================== */

(function () {
  'use strict';

  var API = {
    playerStatus: 'api/player.php?action=status&nickname=',
    start: 'api/player.php?action=start'
  };

  var els = {
    play:      document.getElementById('btn-play'),
    modal:     document.getElementById('start-modal'),
    close:     document.getElementById('modal-close'),
    form:      document.getElementById('nick-form'),
    input:     document.getElementById('nick-input'),
    count:     document.getElementById('nick-count'),
    error:     document.getElementById('nick-error'),
    start:     document.getElementById('btn-start'),
    startLbl:  document.getElementById('btn-start-label'),
    cancel:    document.getElementById('btn-cancel'),
    resume:    document.getElementById('resume-panel'),
    rScore:    document.getElementById('resume-score'),
    rRep:      document.getElementById('resume-rep'),
    rTime:     document.getElementById('resume-time')
  };

  var NICK_KEY = 'shift03.nickname';
  var state = {
    lastChecked: '',
    requestId: 0,
    foundSave: false
  };

  if (!els.modal) return;

  /* ---------- утилиты ---------- */

  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }

  function setError(msg) {
    if (!els.error) return;
    if (msg) {
      els.error.textContent = msg;
      els.error.hidden = false;
      els.input && els.input.setAttribute('aria-invalid', 'true');
    } else {
      els.error.hidden = true;
      els.error.textContent = '';
      els.input && els.input.removeAttribute('aria-invalid');
    }
  }

  function validate(nick) {
    var clean = String(nick || '').trim().replace(/\s+/g, ' ');
    if (clean.length === 0) return { ok: false, msg: 'Введите ник — без него смена не сохранится.' };
    if (clean.length < 3) return { ok: false, msg: 'Ник короче 3 символов.' };
    if (clean.length > 16) return { ok: false, msg: 'Ник длиннее 16 символов.' };
    if (!/^[\p{L}\p{N} _-]+$/u.test(clean)) {
      return { ok: false, msg: 'Только буквы, цифры, пробел, дефис и подчёркивание.' };
    }
    return { ok: true, value: clean };
  }

  function fmtSeconds(total) {
    var s = Math.max(0, Math.floor(Number(total) || 0));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }

  function fmtNum(n) {
    return String(Math.max(0, Math.floor(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /* ---------- модалка ---------- */

  function openModal() {
    var saved = '';
    try { saved = localStorage.getItem(NICK_KEY) || ''; } catch (e) {}

    els.modal.hidden = false;
    document.body.style.overflow = 'hidden';

    if (saved && els.input && !els.input.value) {
      els.input.value = saved;
      els.input.dispatchEvent(new Event('input'));
      checkSaved(saved);
    }

    setTimeout(function () { els.input && els.input.focus(); }, 60);
  }

  function closeModal() {
    els.modal.hidden = true;
    document.body.style.overflow = '';
    setError('');
  }

  /* ---------- проверка сохранения ---------- */

  function checkSaved(nick) {
    if (!nick || nick === state.lastChecked) return;
    state.lastChecked = nick;

    var rid = ++state.requestId;

    fetch(API.playerStatus + encodeURIComponent(nick), {
      headers: { 'Accept': 'application/json' }
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (rid !== state.requestId) return; // устаревший ответ
        if (!data || !data.ok) { hideResume(); return; }

        if (data.save) {
          showResume(data.save, data.best);
        } else {
          hideResume();
        }
      })
      .catch(function () { /* база недоступна — просто прячем блок */ hideResume(); });
  }

  function showResume(save, best) {
    state.foundSave = true;
    if (els.rScore) els.rScore.textContent = fmtNum(save.score);
    if (els.rRep) els.rRep.textContent = String(save.reputation != null ? save.reputation : 100);
    if (els.rTime) els.rTime.textContent = fmtSeconds(save.remaining_seconds);

    if (els.startLbl) {
      els.startLbl.textContent = 'Продолжить смену';
    }
    // место в топе показываем в подсказке, не ломая минимализм
    if (best && best.rank && els.resume) {
      els.resume.title = 'Лучшая смена: ' + fmtNum(best.best) + ' очков · место в топе: ' + best.rank;
    }
    show(els.resume);
  }

  function hideResume() {
    state.foundSave = false;
    hide(els.resume);
    if (els.startLbl) els.startLbl.textContent = 'Начать смену';
  }

  /* ---------- отправка формы ---------- */

  function submit(e) {
    if (e) e.preventDefault();

    var res = validate(els.input ? els.input.value : '');
    if (!res.ok) {
      setError(res.msg);
      els.input && els.input.focus();
      return;
    }
    setError('');

    var nick = res.value;
    setBusy(true);

    fetch(API.start, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ nickname: nick })
    })
      .then(function (r) { return r.json().catch(function () { return null; }); })
      .then(function (data) {
        setBusy(false);

        if (!data || !data.ok) {
          if (data && data.error === 'db_unavailable') {
            // база легла — не блокируем вход, ник запомним локально
            enterGame(nick);
            return;
          }
          if (data && data.error === 'bad_nickname') {
            setError('Ник не подошёл: 3–16 букв, цифр, пробела, дефиса или подчёркивания.');
            return;
          }
          enterGame(nick);
          return;
        }

        enterGame(data.nickname || nick);
      })
      .catch(function () {
        setBusy(false);
        // сеть/сервер недоступны — игра всё равно открывается
        enterGame(nick);
      });
  }

  function setBusy(on) {
    if (!els.start) return;
    els.start.disabled = on;
    if (els.input) els.input.disabled = on;
  }

  function enterGame(nick) {
    try { localStorage.setItem(NICK_KEY, nick); } catch (e) {}

    // Продолжение или новая смена: game.php сам поднимет сохранение из БД
    window.location.href = 'game.php?nick=' + encodeURIComponent(nick);
  }

  /* ---------- события ---------- */

  els.play && els.play.addEventListener('click', openModal);
  els.close && els.close.addEventListener('click', closeModal);
  els.cancel && els.cancel.addEventListener('click', closeModal);
  els.form && els.form.addEventListener('submit', submit);

  els.modal.addEventListener('click', function (e) {
    if (e.target === els.modal) closeModal();
  });

  els.input && els.input.addEventListener('input', function () {
    var v = els.input.value;
    if (els.count) els.count.textContent = v.length + '/16';
    setError('');
    hideResume();
    state.lastChecked = '';

    var res = validate(v);
    if (res.ok) checkSaved(res.value);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !els.modal.hidden) {
      closeModal();
      return;
    }
    // Enter на главной открывает меню входа
    if (e.key === 'Enter' && els.modal.hidden) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return;
      openModal();
    }
  });

  /* ---------- фоновое обновление табло ----------
     Каждые 60 с подтягиваем свежий топ из БД, чтобы на проекторе
     рекорды обновлялись без перезагрузки страницы. */

  var boardList = document.querySelector('.board__list');
  if (boardList && document.body.dataset.db === '1') {
    setInterval(function () {
      if (document.body.style.overflow === 'hidden') return; // модалка открыта
      fetch('api/top.php?limit=5', { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data || !data.ok || !Array.isArray(data.players)) return;
          syncBoard(data.players);
        })
        .catch(function () {});
    }, 60000);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function syncBoard(players) {
    if (!players.length) return;

    var html = players.map(function (p) {
      var rank = String(p.rank);
      var pad = rank.length < 2 ? '0' + rank : rank;
      var date = (p.finished_at || '').slice(0, 16).replace(/-/g, '.').replace(' ', ' · ');
      var rankCls = 'rank';
      if (Number(p.rank) === 1) rankCls += ' rank--1';
      else if (Number(p.rank) === 2) rankCls += ' rank--2';
      else if (Number(p.rank) === 3) rankCls += ' rank--3';

      return '<li class="' + rankCls + '">' +
        '<span class="rank__medal" aria-hidden="true">' + pad + '</span>' +
        '<span class="rank__who">' +
          '<span class="rank__nick">' + esc(p.nickname) + '</span>' +
          '<span class="rank__when">' + esc(date || '—') + '</span>' +
        '</span>' +
        '<span class="rank__score">' + fmtNum(p.score) + '<small>очк</small></span>' +
      '</li>';
    }).join('');

    boardList.innerHTML = html;
  }
})();

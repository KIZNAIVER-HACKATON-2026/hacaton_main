/* ==========================================================================
   Смена 03 — движок смены.
   Состояния: осмотр → диагноз → лечение → (звонок) → следующий пациент → финал.
   Данные приходят из window.SHIFT (patient_data.php), сохранение и рекорд —
   через api/save.php и api/score.php.
   ========================================================================== */

(function () {
  'use strict';

  var DATA = window.SHIFT || {};
  if (!DATA.patients || !DATA.patients.length) return;

  var CFG = DATA.config || {};
  var PATIENTS = DATA.patients;
  var CALLS = DATA.dispatches || [];
  var NICK = DATA.nick || null;
  var ENDPOINTS = DATA.endpoints || {};

  var el = {};
  var S = {
    phase: 'diag',          // diag | treat | call | over
    index: 0,               // текущий пациент
    score: 0,
    reputation: CFG.startReputation != null ? CFG.startReputation : 100,
    remaining: CFG.shiftSeconds || 300,
    saved: 0,               // пациентов доведено до конца
    mistakes: 0,            // всего ошибок
    diagnoses: 0,           // верных диагнозов
    treatSeq: [],           // выбранные шаги лечения
    treatBusy: false,
    callQueue: CALLS.slice(),
    paused: false,
    finished: false,
    timerId: null,
    token: uuid()
  };

  /* ---------------- утилиты ---------------- */

  function $(id) { return document.getElementById(id); }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function fmtTime(sec) {
    var s = Math.max(0, Math.floor(sec));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }

  function num(n) {
    return String(Math.max(0, Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------------- HUD ---------------- */

  function renderHud() {
    el.timer.textContent = fmtTime(S.remaining);
    el.score.textContent = num(S.score);
    el.rep.textContent = Math.max(0, S.reputation);
    el.progress.textContent = Math.min(S.index + 1, PATIENTS.length) + '/' + PATIENTS.length;
    el.repFill.style.width = Math.max(0, Math.min(100, S.reputation)) + '%';

    el.timer.classList.toggle('is-warn', S.remaining <= 60 && S.remaining > 20);
    el.timer.classList.toggle('is-crit', S.remaining <= 20);
    el.repFill.classList.toggle('is-low', S.reputation <= 35);
  }

  function toast(text, kind) {
    el.toast.textContent = text;
    el.toast.className = 'toast is-on' + (kind ? ' toast--' + kind : '');
    el.toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      el.toast.classList.remove('is-on');
      setTimeout(function () { el.toast.hidden = true; }, 220);
    }, 1900);
  }

  /* ---------------- таймер ---------------- */

  function startTimer() {
    stopTimer();
    S.timerId = setInterval(function () {
      if (S.paused || S.finished) return;

      S.remaining -= 1;
      if (S.remaining <= 0) {
        S.remaining = 0;
        renderHud();
        finish('time');
        return;
      }
      renderHud();
    }, 1000);
  }

  function stopTimer() {
    if (S.timerId) clearInterval(S.timerId);
    S.timerId = null;
  }

  /* ---------------- пациент ---------------- */

  function fmtAgeRu(n) {
    var a = Math.abs(Number(n) || 0) % 100;
    var a1 = a % 10;
    if (a > 10 && a < 20) return n + ' лет';
    if (a1 > 1 && a1 < 5) return n + ' года';
    if (a1 === 1) return n + ' год';
    return n + ' лет';
  }

  function currentPatient() { return PATIENTS[S.index]; }

  function renderPatient() {
    var p = currentPatient();
    if (!p) return;

    if (el.caseNo) el.caseNo.textContent = 'Приём ' + String(S.index + 1).padStart(2, '0');

    // Пиксельный аватар персонажа вместо эмодзи
    var portraits = window.PIXEL_PORTRAITS || {};
    var portraitSvg = (p && (portraits[p.id] || portraits[String(p.id)] || p.svg)) || '';
    if (el.avatar) {
      if (portraitSvg) {
        el.avatar.innerHTML = portraitSvg;
      } else {
        el.avatar.textContent = p.emoji || '🧑';
      }
    }

    var avatarWrap = $('p-avatar-wrap');
    if (avatarWrap) {
      avatarWrap.style.background = p.avatarBg || 'rgba(127,214,176,.15)';
    }

    if (el.name) el.name.textContent = p.fio;
    if (el.age) el.age.textContent = 'Возраст: ' + fmtAgeRu(p.age);

    var statusEl = $('p-status');
    if (statusEl) {
      statusEl.textContent = S.phase === 'treat' ? 'Лечение' : 'Осмотр';
    }

    if (el.symptoms) {
      el.symptoms.innerHTML = (p.symptoms || []).map(function (s) {
        return '<div class="pixel-ruled-row"><span class="pixel-bullet">▪</span> <span class="pixel-symptom-text">' + esc(s) + '</span></div>';
      }).join('');
    }

    if (el.vitals) {
      var v = p.vitals || {};
      el.vitals.innerHTML = 
        '<div class="pixel-ruled-row">' +
          '<div class="pixel-vitals-row">' +
            '<span class="pixel-vital-cell"><span class="pixel-vital-label">АД:</span> <span class="pixel-vital-value">' + esc(v.ad || '—') + '</span></span>' +
            '<span class="pixel-vital-cell"><span class="pixel-vital-label">Пульс:</span> <span class="pixel-vital-value">' + esc(v.pulse || '—') + '</span></span>' +
          '</div>' +
        '</div>' +
        '<div class="pixel-ruled-row">' +
          '<div class="pixel-vitals-row">' +
            '<span class="pixel-vital-cell"><span class="pixel-vital-label">Темп.:</span> <span class="pixel-vital-value">' + esc(v.temp ? v.temp + '°' : '—') + '</span></span>' +
            '<span class="pixel-vital-cell"><span class="pixel-vital-label">SpO₂:</span> <span class="pixel-vital-value">' + esc(v.spo2 || '—') + '</span></span>' +
          '</div>' +
        '</div>';
    }

    renderHud();
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------------- шаг 1: диагноз ---------------- */

  function renderDiagnoses() {
    var p = currentPatient();

    el.stepDiag.classList.remove('hidden');
    el.stepTreat.classList.add('hidden');
    el.diagHint.textContent = '';
    el.diagHint.className = 'hint';

    var diagIcons = window.PIXEL_DIAGNOSES || {};

    el.diagGrid.innerHTML = shuffle(p.options).map(function (opt) {
      var iconHtml = diagIcons[opt.id] || ('<span style="font-size:22px">' + esc(opt.icon) + '</span>');
      return '<button class="diag-btn" type="button" data-id="' + opt.id + '">' +
               '<span class="diag-icon diag-icon--pixel">' + iconHtml + '</span>' +
               '<span class="diag-label">' + esc(opt.label) + '</span>' +
               '<span class="diag-mark" aria-hidden="true"></span>' +
             '</button>';
    }).join('');

    Array.prototype.forEach.call(el.diagGrid.querySelectorAll('.diag-btn'), function (btn) {
      btn.addEventListener('click', function () { pickDiagnosis(btn); });
    });
  }

  function pickDiagnosis(btn) {
    if (S.phase !== 'diag' || S.paused) return;

    var p = currentPatient();
    var id = Number(btn.dataset.id);
    var isCorrect = id === p.correct;

    if (isCorrect) {
      btn.classList.add('is-correct');
      Array.prototype.forEach.call(el.diagGrid.querySelectorAll('.diag-btn'), function (b) {
        b.disabled = true;
      });

      var totalAdded = CFG.pointsCorrect || 50;

      S.score += totalAdded;
      S.diagnoses += 1;

      renderHud();
      toast('Верно: ' + p.correctTitle + '. Прогресс будет начислен после завершения смены.', 'ok');

      setTimeout(function () {
        S.phase = 'treat';
        S.treatSeq = [];
        renderTreatment();
      }, 700);
    } else {
      btn.classList.add('is-wrong');

      S.reputation = Math.max(0, S.reputation - (CFG.penaltyDiagnosis || 10));
      S.score = Math.max(0, S.score - (CFG.penaltyDiagnosis || 10));
      S.mistakes += 1;
      renderHud();

      el.diagHint.textContent = 'Неверно. −' + (CFG.penaltyDiagnosis || 10) + ' очков и репутации. Посмотри на показатели ещё раз.';
      el.diagHint.className = 'hint hint--bad';

      setTimeout(function () { btn.classList.remove('is-wrong'); }, 900);

      if (S.reputation <= 0) {
        setTimeout(function () { finish('reputation'); }, 500);
      }
    }
  }

  /* ---------------- шаг 2: лечение ---------------- */

  function renderTreatment() {
    var p = currentPatient();

    el.stepDiag.classList.add('hidden');
    el.stepTreat.classList.remove('hidden');
    el.treatHint.textContent = '';
    el.treatHint.className = 'hint';

    var statusEl = $('p-status');
    if (statusEl) statusEl.textContent = 'Лечение';

    S.treatSeq = [];
    paintTreatment(p);
  }

  function paintTreatment(p) {
    var seq = S.treatSeq;

    el.treatPool.innerHTML = p.treatment.map(function (action, i) {
      var used = seq.indexOf(i) !== -1;
      return '<button class="treat-btn' + (used ? ' is-used' : '') + '" type="button" data-i="' + i + '"' +
             (used ? ' disabled' : '') + '>' + esc(action) + '</button>';
    }).join('');

    el.treatSeq.innerHTML = p.treatment.map(function (_, i) {
      var filled = seq[i] != null;
      return '<span class="treat-slot' + (filled ? ' is-filled' : '') + '">' +
               (filled ? esc(p.treatment[seq[i]]) : (i + 1)) +
             '</span>';
    }).join('');

    Array.prototype.forEach.call(el.treatPool.querySelectorAll('.treat-btn'), function (btn) {
      btn.addEventListener('click', function () {
        pickTreatment(Number(btn.dataset.i));
      });
    });
  }

  function pickTreatment(actionIndex) {
    if (S.phase !== 'treat' || S.paused || S.treatBusy) return;

    var p = currentPatient();
    var step = S.treatSeq.length;

    // правильный порядок — это treatment[step]
    if (actionIndex === step) {
      S.treatSeq.push(actionIndex);
      paintTreatment(p);

      if (S.treatSeq.length === p.treatment.length) {
        S.treatBusy = true;

        var earnedPoints = CFG.pointsTreatment || 70;

        S.score += earnedPoints;
        S.saved += 1;

        renderHud();
        toast('Пациент спасён! +' + earnedPoints + ' очков. Награда кабинета — после финала.', 'ok');

        setTimeout(function () {
          S.treatBusy = false;
          afterPatient();
        }, 800);
      }
      return;
    }

    // ошибочный шаг
    S.reputation = Math.max(0, S.reputation - (CFG.penaltyTreatment || 10));
    S.mistakes += 1;
    renderHud();
    el.treatHint.textContent = 'Не тот порядок. −' + (CFG.penaltyTreatment || 10) + ' репутации.';
    el.treatHint.className = 'hint hint--bad';

    if (S.reputation <= 0) {
      setTimeout(function () { finish('reputation'); }, 500);
    }
  }

  /* ---------------- звонки диспетчера ---------------- */

  function maybeDispatch() {
    if (!S.callQueue.length) return false;

    var next = S.callQueue[0];
    // «afterIndex» — сколько пациентов уже закрыто
    if (S.index < next.afterIndex) return false;

    S.callQueue.shift();
    showCall(next);
    return true;
  }

  function showCall(call) {
    S.phase = 'call';
    el.screenPatient.classList.add('hidden');
    el.screenCall.classList.remove('hidden');

    el.callTitle.textContent = call.title || 'Звонок диспетчера';
    el.callText.textContent = call.text || '';

    el.callOptions.innerHTML = (call.options || []).map(function (o, i) {
      return '<button class="call-opt" type="button" data-i="' + i + '">' +
               '<span class="call-opt__label">' + esc(o.label) + '</span>' +
               '<span class="call-opt__meta">' + metaLine(o) + '</span>' +
             '</button>';
    }).join('');

    Array.prototype.forEach.call(el.callOptions.querySelectorAll('.call-opt'), function (btn) {
      btn.addEventListener('click', function () {
        chooseCall(call, Number(btn.dataset.i), btn);
      });
    });
  }

  function metaLine(o) {
    var parts = [];
    if (o.score) parts.push((o.score > 0 ? '+' : '') + o.score + ' очк');
    if (o.reputation) parts.push((o.reputation > 0 ? '+' : '') + o.reputation + ' реп');
    if (o.seconds) parts.push((o.seconds > 0 ? '+' : '') + o.seconds + ' сек');
    return parts.length ? parts.join(' · ') : 'без последствий';
  }

  function chooseCall(call, i, btn) {
    var opt = (call.options || [])[i];
    if (!opt) return;

    Array.prototype.forEach.call(el.callOptions.querySelectorAll('.call-opt'), function (b) {
      b.disabled = true;
      b.classList.toggle('is-picked', b === btn);
    });

    S.score = Math.max(0, S.score + (opt.score || 0));
    S.reputation = Math.max(0, Math.min(100, S.reputation + (opt.reputation || 0)));
    S.remaining = Math.max(5, S.remaining + (opt.seconds || 0));
    renderHud();

    toast(opt.result || 'Принято', (opt.reputation || 0) < 0 ? 'bad' : 'ok');

    setTimeout(function () {
      el.screenCall.classList.add('hidden');
      el.screenPatient.classList.remove('hidden');

      if (S.reputation <= 0) { finish('reputation'); return; }

      // S.index уже указывает на следующего пациента: его увеличил afterPatient()
      // перед показом звонка. Здесь индекс НЕ трогаем, иначе пациент пропускается.
      S.phase = 'diag';
      beginPatient();
    }, 1100);
  }

  /* ---------------- переходы ---------------- */

  function beginPatient() {
    if (S.index >= PATIENTS.length) { finish('all'); return; }

    S.phase = 'diag';
    renderPatient();
    renderDiagnoses();
    autosave();
  }

  function afterPatient() {
    S.index += 1;

    if (S.index >= PATIENTS.length) {
      finish('all');
      return;
    }

    if (maybeDispatch()) return;

    S.phase = 'diag';
    renderPatient();
    renderDiagnoses();
    autosave();
  }

  /* ---------------- автосейв ---------------- */

  function autosave() {
    if (!NICK || !ENDPOINTS.save) return Promise.resolve();

    var body = {
      nickname: NICK,
      state: {
        version: 1,
        score: S.score,
        reputation: S.reputation,
        remainingSeconds: S.remaining,
        patientIndex: S.index
      }
    };

    return fetch(ENDPOINTS.save, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (r) { return r.json().catch(function () { return null; }); })
      .catch(function () { return null; });
  }

  /* ---------------- пауза ---------------- */

  function pause() {
    if (S.finished || S.paused) return;
    S.paused = true;
    el.modalPause.hidden = false;

    el.pauseStats.innerHTML =
      cell('Счёт', num(S.score)) +
      cell('Репутация', S.reputation) +
      cell('Пациенты', (S.index + 1) + '/' + PATIENTS.length) +
      cell('Осталось', fmtTime(S.remaining));

    autosave().then(function (res) {
      el.pauseSave.textContent = (res && res.ok && NICK)
        ? 'Сохранено в базе в ' + (res.saved_at || '').slice(11, 16)
        : (NICK ? 'База недоступна — продолжаем без сохранения' : 'Гостевой режим: результат не попадёт в топ');
    });
  }

  function cell(label, value) {
    return '<div class="modal__cell"><span>' + label + '</span><b>' + value + '</b></div>';
  }

  function resume() {
    S.paused = false;
    el.modalPause.hidden = true;
  }

  /* ---------------- финал ---------------- */

  function finish(reason) {
    if (S.finished) return;
    S.finished = true;
    S.paused = false;
    stopTimer();

    var total = PATIENTS.length;
    var accuracy = (S.diagnoses + S.mistakes) > 0
      ? Math.round(S.diagnoses / (S.diagnoses + S.mistakes) * 100)
      : 0;

    var title, sub, badge;
    if (reason === 'reputation') {
      badge = 'Смена провалена';
      title = 'Репутация на нуле';
      sub = 'Пациенты перестали доверять бригаде. Смена снята с дежурства.';
    } else if (reason === 'time') {
      badge = 'Конец смены';
      title = 'Смена закончилась';
      sub = 'Время вышло. Принято пациентов: ' + S.index + ' из ' + total + '. Награда зависит от спасённых пациентов.';
    } else {
      badge = 'Смена сдана';
      title = 'Все пациенты приняты';
      sub = 'Ночь прошла без потерь. Прогресс кабинета начисляется после записи результата.';
    }

    el.finalBadge.textContent = badge;
    el.finalBadge.className = 'final__badge' + (reason === 'reputation' ? ' is-fail' : (reason === 'time' ? ' is-time' : ''));
    el.finalTitle.textContent = title;
    el.finalSub.textContent = sub;
    el.finalScore.textContent = num(S.score);
    el.finalSaved.textContent = S.saved + '/' + total;
    el.finalAcc.textContent = accuracy + '%';
    el.finalRep.textContent = Math.max(0, S.reputation);

    el.finalRank.textContent = '—';
    el.finalSave.textContent = NICK ? 'Отправляем результат в базу…' : 'Гостевой режим: результат не сохраняется в топ.';

    el.modalFinal.hidden = false;

    submitScore();
  }

  function submitScore() {
    if (!NICK || !ENDPOINTS.score) return;

    // нулевая смена топ не засоряет: в таблицу идут только результативные смены
    if (S.score <= 0) {
      el.finalRank.textContent = '—';
      el.finalSave.textContent = 'Смена без результата — в топ она не попадает.';
      return;
    }

    fetch(ENDPOINTS.score, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ nickname: NICK, score: S.score, token: S.token, mode: 'shift', saved: S.saved, success: S.saved >= PATIENTS.length })
    })
      .then(function (r) { return r.json().catch(function () { return null; }); })
      .then(function (res) {
        if (res && res.ok) {
          el.finalRank.textContent = res.rank ? '#' + res.rank : '—';
          el.finalSave.textContent = res.best > res.score
            ? 'В топе остаётся ваш личный рекорд: ' + num(res.best) + ' очков.'
            : 'Результат записан в базу — это ваш лучший счёт.';
        } else {
          el.finalSave.textContent = 'Не удалось отправить результат: база недоступна.';
        }
      })
      .catch(function () {
        el.finalSave.textContent = 'Не удалось отправить результат: нет связи.';
      });
  }

  /* ---------------- восстановление сохранения ---------------- */

  function restoreFromSave() {
    var saved = DATA.save;
    if (!NICK || !saved || !saved.state) return false;

    var st = saved.state;
    var idx = Number(st.patientIndex);
    if (!isFinite(idx) || idx < 0 || idx >= PATIENTS.length) return false;

    S.index = idx;
    S.score = Math.max(0, Number(st.score) || 0);
    S.reputation = Math.max(1, Math.min(100, Number(st.reputation) || 100));
    S.remaining = Math.max(30, Number(st.remainingSeconds) || CFG.shiftSeconds || 300);

    toast('Продолжаем смену: ' + num(S.score) + ' очков', 'ok');
    return true;
  }

  /* ---------------- запуск ---------------- */

  function bind() {
    el = {
      timer: $('hud-timer'),
      score: $('hud-score'),
      rep: $('hud-rep'),
      progress: $('hud-progress'),
      repFill: $('rep-fill'),
      nick: $('hud-nick'),

      caseNo: $('p-case'),
      avatar: $('p-avatar'),
      name: $('p-name'),
      age: $('p-age'),
      symptoms: $('p-symptoms'),
      vitals: $('p-vitals'),

      stepDiag: $('step-diag'),
      stepTreat: $('step-treat'),
      diagGrid: $('diag-grid'),
      diagHint: $('diag-hint'),
      treatPool: $('treat-pool'),
      treatSeq: $('treat-seq'),
      treatHint: $('treat-hint'),

      screenPatient: $('screen-patient'),
      screenCall: $('screen-call'),
      callTitle: $('call-title'),
      callText: $('call-text'),
      callOptions: $('call-options'),

      toast: $('toast'),
      modalPause: $('modal-pause'),
      pauseStats: $('pause-stats'),
      pauseSave: $('pause-save'),

      modalFinal: $('modal-final'),
      finalBadge: $('final-badge'),
      finalTitle: $('final-title'),
      finalSub: $('final-sub'),
      finalScore: $('final-score'),
      finalSaved: $('final-saved'),
      finalAcc: $('final-acc'),
      finalRep: $('final-rep'),
      finalRank: $('final-rank'),
      finalSave: $('final-save')
    };

    el.nick.textContent = NICK || 'Гость';

    $('btn-pause').addEventListener('click', pause);
    $('btn-resume').addEventListener('click', resume);
    $('btn-quit').addEventListener('click', function () {
      el.modalPause.hidden = true;
      S.paused = false;
      finish('time');
    });

    document.addEventListener('keydown', function (e) {
      var isPauseKey = e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З' || e.key === 'Escape';
      if (!isPauseKey || S.finished) return;

      if (S.paused) {
        resume();
      } else {
        pause();
      }
    });

    // автосейв раз в 20 секунд, как в ТЗ
    setInterval(function () {
      if (!S.paused && !S.finished) autosave();
    }, 20000);

    // не теряем смену при закрытии вкладки: сохраняем фоном, без диалогов
    window.addEventListener('beforeunload', function () {
      if (S.finished || !NICK) return;
      var payload = JSON.stringify({
        nickname: NICK,
        state: { version: 1, score: S.score, reputation: S.reputation,
                 remainingSeconds: S.remaining, patientIndex: S.index }
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINTS.save, new Blob([payload], { type: 'application/json' }));
      }
    });
  }

  function initPaletteSwitcher() {
    var dossier = $('patient-dossier');
    if (!dossier) return;

    var buttons = document.querySelectorAll('[data-set-theme]');

    function applyTheme(t) {
      dossier.className = 'pcard pixel-dossier theme-' + t;
      dossier.setAttribute('data-theme', t);
      if (buttons && buttons.length) {
        for (var i = 0; i < buttons.length; i++) {
          var b = buttons[i];
          b.classList.toggle('is-active', b.getAttribute('data-set-theme') === t);
        }
      }
    }

    var savedTheme = 'night';
    try {
      savedTheme = localStorage.getItem('shift_dossier_theme') || 'night';
    } catch (e) {}
    applyTheme(savedTheme);

    if (buttons && buttons.length) {
      for (var j = 0; j < buttons.length; j++) {
        (function (btn) {
          btn.addEventListener('click', function () {
            var t = btn.getAttribute('data-set-theme');
            applyTheme(t);
            try {
              localStorage.setItem('shift_dossier_theme', t);
            } catch (e) {}
          });
        })(buttons[j]);
      }
    }
  }

  function init() {
    bind();
    initPaletteSwitcher();

    if (restoreFromSave()) {
      // продолжаем с сохранённого пациента
      renderPatient();
      renderDiagnoses();
    } else {
      beginPatient();
    }

    renderHud();
    startTimer();
    autosave();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

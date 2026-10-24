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
  var stopCallTyping = null;
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
    treatOrder: [],         // случайное расположение вариантов лечения для текущего пациента
    treatBusy: false,
    callQueue: CALLS.slice(),
    paused: false,
    finished: false,
    timerId: null,
    token: uuid()
  };

  /* ---------------- сюжет «Вернуться на линию» ---------------- */

  var STORY = (window.StoryLine && DATA.story) ? window.StoryLine.init(DATA.story, { nick: NICK, endpoint: ENDPOINTS.story }) : null;
  var EPISODE = STORY ? STORY.currentEpisode() : null;
  var storyChoice = null;      // индекс варианта сюжетного звонка
  var storyFlagsShift = [];    // флаги, выбранные в этой смене

  if (EPISODE) {
    // Сюжетный пациент (финал) подменяет обычного по индексу.
    if (EPISODE.patient && EPISODE.patient.data && EPISODE.patient.index < PATIENTS.length) {
      PATIENTS[EPISODE.patient.index] = EPISODE.patient.data;
    }
    // Сюжетный звонок встаёт в общую очередь по afterIndex.
    if (EPISODE.call) {
      var storyCall = {};
      Object.keys(EPISODE.call).forEach(function (k) { storyCall[k] = EPISODE.call[k]; });
      storyCall.story = true;
      storyCall.text = STORY.text(EPISODE.call.text);
      S.callQueue.push(storyCall);
      S.callQueue.sort(function (a, b) { return (a.afterIndex || 0) - (b.afterIndex || 0) || (b.story ? 1 : 0) - (a.story ? 1 : 0); });
    }
  }

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

  function randomTreatmentOrder(length) {
    var natural = [];
    for (var i = 0; i < length; i++) natural.push(i);
    var order = natural;
    for (var attempt = 0; attempt < 12; attempt++) {
      order = shuffle(natural);
      if (length < 2 || !order.every(function (value, index) { return value === index; })) return order;
    }
    // Даже при крайне маловероятном повторении исходной очереди не показываем её игроку.
    var offset = 1 + Math.floor(Math.random() * (length - 1));
    return natural.slice(offset).concat(natural.slice(0, offset));
  }

  /* ---------------- HUD ---------------- */

  function renderHud() {
    el.timer.textContent = fmtTime(S.remaining);
    el.score.textContent = num(S.score);
    el.rep.textContent = Math.max(0, S.reputation);
    el.progress.textContent = Math.min(S.index + 1, PATIENTS.length) + '/' + PATIENTS.length;
    el.repFill.style.width = Math.max(0, Math.min(100, S.reputation)) + '%';

    if (window.SFX) {
      // Чем меньше времени, тем быстрее и плотнее музыка смены.
      var progress = PATIENTS.length ? S.index / PATIENTS.length : 0;
      window.SFX.intensity(S.remaining <= 20 ? 1 : (S.remaining <= 60 ? 0.7 : 0.15 + 0.35 * progress));
    }

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
      if (window.SFX) {
        if (S.remaining === 60) window.SFX.play('warn');
        else if (S.remaining <= 10) window.SFX.play('tick', { crit: S.remaining <= 5 });
      }
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

  /* Телефон: карточка и шаги идут друг под другом — подкручиваем экран к нужному блоку. */
  function mobileScroll(node) {
    if (!window.matchMedia || !window.matchMedia('(max-width: 900px)').matches) return;
    var hud = document.getElementById('hud');
    var offset = hud ? hud.offsetHeight + 8 : 0;
    var top = node ? node.getBoundingClientRect().top + window.pageYOffset - offset : 0;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
  }

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

    if (window.SFX) window.SFX.play(isCorrect ? 'correct' : 'wrong');

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
    S.treatOrder = randomTreatmentOrder(p.treatment.length);
    paintTreatment(p);
    mobileScroll(el.stepTreat);
  }

  function paintTreatment(p) {
    var seq = S.treatSeq;
    var choices = S.treatOrder.length === p.treatment.length
      ? S.treatOrder
      : p.treatment.map(function (_, index) { return index; });

    el.treatPool.innerHTML = choices.map(function (i) {
      var action = p.treatment[i];
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
      if (window.SFX) window.SFX.play('step', { index: step });

      if (S.treatSeq.length === p.treatment.length) {
        S.treatBusy = true;

        var earnedPoints = CFG.pointsTreatment || 70;

        S.score += earnedPoints;
        S.saved += 1;

        renderHud();
        if (window.SFX) setTimeout(function () { window.SFX.play('saved'); }, 120);
        toast('Пациент спасён! +' + earnedPoints + ' очков. Награда кабинета — после финала.', 'ok');

        setTimeout(function () {
          S.treatBusy = false;
          afterPatient();
        }, 800);
      }
      return;
    }

    // ошибочный шаг
    if (window.SFX) window.SFX.play('wrong');
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
    mobileScroll(null);

    el.callTitle.textContent = (call.story ? 'Сюжет · ' : '') + (call.title || 'Звонок диспетчера');
    el.screenCall.classList.toggle('is-story', !!call.story);
    el.screenCall.classList.toggle('is-static', call.effect === 'static');
    var speakerId = call.speaker || 'vera';
    if (window.SFX) {
      if (call.story) window.SFX.play('radio', { static: call.effect === 'static' });
      else window.SFX.play('ring');
    }
    if (el.callSpeaker) {
      el.callSpeaker.textContent = call.speakerName || (window.StoryDialogue ? window.StoryDialogue.characterName(speakerId) : 'Вера · диспетчер');
    }
    if (el.callAvatar && window.StoryDialogue) el.callAvatar.innerHTML = window.StoryDialogue.avatarMarkup(speakerId);
    if (stopCallTyping) stopCallTyping();
    if (window.StoryDialogue && window.StoryDialogue.typeInto) {
      stopCallTyping = window.StoryDialogue.typeInto(el.callText, call.text || '', 15, speakerId);
    } else {
      el.callText.textContent = call.text || '';
    }

    el.callOptions.innerHTML = (call.options || []).map(function (o, i) {
      return '<button class="call-opt" type="button" data-i="' + i + '">' +
               '<span class="call-opt__label">' + esc(o.label) + '</span>' +
               '<span class="call-opt__meta">' + metaLine(o, call.story) + '</span>' +
             '</button>';
    }).join('');

    Array.prototype.forEach.call(el.callOptions.querySelectorAll('.call-opt'), function (btn) {
      btn.addEventListener('click', function () {
        chooseCall(call, Number(btn.dataset.i), btn);
      });
    });
  }

  function metaLine(o, isStory) {
    var parts = [];
    if (isStory) parts.push('влияет на историю');
    if (o.score) parts.push((o.score > 0 ? '+' : '') + o.score + ' очк');
    if (o.reputation) parts.push((o.reputation > 0 ? '+' : '') + o.reputation + ' реп');
    if (o.seconds) parts.push((o.seconds > 0 ? '+' : '') + o.seconds + ' сек');
    return parts.length ? parts.join(' · ') : 'без последствий';
  }

  function chooseCall(call, i, btn) {
    if (stopCallTyping) { stopCallTyping(); stopCallTyping = null; }
    var opt = (call.options || [])[i];
    if (!opt) return;
    if (window.SFX) window.SFX.play(call.story ? 'choice' : 'confirm');

    Array.prototype.forEach.call(el.callOptions.querySelectorAll('.call-opt'), function (b) {
      b.disabled = true;
      b.classList.toggle('is-picked', b === btn);
    });

    if (call.story) {
      storyChoice = i;
      storyFlagsShift = (opt.story && opt.story.flags) ? opt.story.flags.slice() : [];
      el.screenCall.classList.remove('is-static');
    }

    S.score = Math.max(0, S.score + (opt.score || 0));
    S.reputation = Math.max(0, Math.min(100, S.reputation + (opt.reputation || 0)));
    S.remaining = Math.max(5, S.remaining + (opt.seconds || 0));
    renderHud();

    toast(opt.result || 'Принято', (opt.reputation || 0) < 0 ? 'bad' : 'ok');

    setTimeout(function () {
      el.screenCall.classList.remove('is-story', 'is-static');
      el.screenCall.classList.add('hidden');
      el.screenPatient.classList.remove('hidden');

      if (S.reputation <= 0) { finish('reputation'); return; }

      // S.index уже указывает на следующего пациента: его увеличил afterPatient()
      // перед показом звонка. Здесь индекс НЕ трогаем, иначе пациент пропускается.
      S.phase = 'diag';
      beginPatient();
    }, call.story ? 2200 : 1100);
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
    mobileScroll(null);
  }

  /* ---------------- автосейв ---------------- */

  function saveState(finished) {
    return {
      version: 1,
      score: S.score,
      reputation: S.reputation,
      remainingSeconds: S.remaining,
      patientIndex: finished ? PATIENTS.length : S.index,
      storyEpisode: EPISODE && !STORY.isDemo() ? EPISODE.number : 0,
      storyChoice: storyChoice,
      finished: !!finished
    };
  }

  function autosave(finished) {
    if (!NICK || !ENDPOINTS.save) return Promise.resolve();
    if (STORY && STORY.isDemo()) return Promise.resolve(null); // демо-эпизод не трогает сохранение

    var body = { nickname: NICK, state: saveState(finished) };

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
    if (window.SFX) { window.SFX.play('pause'); window.SFX.duck('pause', 0.3); }

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
    if (window.SFX) { window.SFX.play('resume'); window.SFX.unduck('pause'); }
  }

  /* ---------------- финал ---------------- */

  function finish(reason) {
    if (S.finished) return;
    S.finished = true;
    S.paused = false;
    stopTimer();
    if (window.SFX) {
      // Музыка смены обрывается, звучит итог; после — спокойная тема для сцены после смены.
      window.SFX.unduck('pause');
      window.SFX.music(null);
      window.SFX.play(reason === 'reputation' ? 'finishBad' : 'finishGood');
      setTimeout(function () { if (window.SFX.current() === null) window.SFX.music('menu'); }, 2600);
    }

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

    autosave(true); // смена сдана: при следующем входе начнётся новая, а не продолжится эта
    submitScore();
    finishStory(reason);
  }

  /* ---------------- сюжет после смены ---------------- */

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function finishStory(reason) {
    var box = $('final-story');
    if (!EPISODE || !STORY) {
      if (box) box.hidden = true;
      return;
    }
    var success = reason !== 'reputation' && S.saved >= Math.ceil(PATIENTS.length / 2);
    var ep = EPISODE;
    if (box) {
      box.hidden = false;
      box.innerHTML = '<p class="final-story__kicker">Сюжет · эпизод ' + ep.number + ' из ' + STORY.total() + '</p><p class="final-story__title">«' + esc(ep.title) + '»</p><p class="final-story__text">История продолжается…</p>';
    }

    var outcome = null;
    STORY.complete(ep.number, storyChoice)
      .then(function (res) {
        outcome = res;
        return wait(650);
      })
      .then(function () {
        return STORY.play(ep.after && ep.after[success ? 'success' : 'fail'], {
          title: 'Эпизод ' + ep.number + ' · после смены',
          flags: STORY.flags(storyFlagsShift)
        });
      })
      .then(function () {
        return ep.phone ? STORY.phone(ep.phone, { state: outcome.state }) : null;
      })
      .then(function () {
        if (!ep.finale) return null;
        var ending = outcome.ending || STORY.pickEnding(outcome.state.team, outcome.state.self);
        outcome.ending = ending;
        return STORY.play(ending && ending.lines, { title: 'Финал · «' + (ending ? ending.title : '') + '»', flags: STORY.flags(storyFlagsShift) })
          .then(function () { return STORY.endingCard(ending); });
      })
      .then(function () { renderFinalStory(ep, outcome, success); })
      .catch(function () { renderFinalStory(ep, outcome, success); });
  }

  function renderFinalStory(ep, outcome, success) {
    var box = $('final-story');
    if (!box) return;
    var next = !ep.finale ? STORY.episodeByNumber(ep.number + 1) : null;
    var modeNote = outcome && outcome.mode === 'demo'
      ? 'Демо-режим: прогресс истории не записан.'
      : (outcome && outcome.mode === 'local' ? 'База недоступна — прогресс истории сохранён в браузере.' : '');
    var html = '<p class="final-story__kicker">Сюжет · эпизод ' + ep.number + ' из ' + STORY.total() + (success ? ' пройден' : ' пройден с трудом') + '</p>' +
      '<p class="final-story__title">«' + esc(ep.title) + '»</p>';
    if (ep.clue) {
      if (window.SFX) window.SFX.play('clue');
      html += '<div class="final-story__clue">' + STORY.clueIcon(ep.clue.icon) + '<span><small>Новая улика</small><b>' + esc(ep.clue.title) + '</b></span></div>';
    }
    if (ep.finale && outcome && outcome.ending) {
      html += '<p class="final-story__next">Концовка: <b>«' + esc(outcome.ending.title) + '»</b></p>';
    } else if (next) {
      html += '<p class="final-story__next">Следующая смена: <b>«' + esc(next.title) + '»</b></p>';
    }
    if (modeNote) html += '<p class="final-story__note">' + esc(modeNote) + '</p>';
    html += '<div class="final-story__actions"><button type="button" class="btn btn-ghost btn-sm" id="final-story-replay">Пересмотреть сцену</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="final-story-locker">Шкафчик №12 →</button></div>';
    box.innerHTML = html;

    var replay = $('final-story-replay');
    if (replay) replay.addEventListener('click', function () {
      STORY.play(ep.after && ep.after[success ? 'success' : 'fail'], { title: 'Эпизод ' + ep.number + ' · после смены', flags: STORY.flags(storyFlagsShift) });
    });

    var locker = $('final-story-locker');
    if (locker) locker.addEventListener('click', function () { STORY.journal({ section: 'clues' }); });
    updateStoryHud();

    var nextBtn = $('btn-next-shift');
    if (nextBtn && next && !STORY.isDemo()) nextBtn.textContent = 'Следующая смена →';
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
    if (st.finished) return false;
    var idx = Number(st.patientIndex);
    if (!isFinite(idx) || idx < 0 || idx >= PATIENTS.length) return false;

    S.index = idx;
    S.score = Math.max(0, Number(st.score) || 0);
    S.reputation = Math.max(1, Math.min(100, Number(st.reputation) || 100));
    S.remaining = Math.max(30, Number(st.remainingSeconds) || CFG.shiftSeconds || 300);
    S.resumedStory = !!(EPISODE && Number(st.storyEpisode) === Number(EPISODE.number));
    if (S.resumedStory && st.storyChoice != null && st.storyChoice !== '') {
      storyChoice = Number(st.storyChoice);
      var picked = EPISODE.call && EPISODE.call.options && EPISODE.call.options[storyChoice];
      storyFlagsShift = picked && picked.story && picked.story.flags ? picked.story.flags.slice() : [];
      S.callQueue = S.callQueue.filter(function (c) { return !c.story; });
    }

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
      callAvatar: $('call-avatar'),
      callSpeaker: $('call-speaker'),
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
      if (!isPauseKey || S.finished || document.body.classList.contains('story-dialogue-open') || (window.StoryDialogue && window.StoryDialogue.isOpen())) return;

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
      if (STORY && STORY.isDemo()) return;
      var payload = JSON.stringify({ nickname: NICK, state: saveState(false) });
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

  /** Кнопка истории в HUD: текущий эпизод + «Шкафчик №12» (журнал, улики, телефон). */
  function updateStoryHud() {
    var btn = $('btn-story');
    if (!btn || !STORY) return;
    btn.hidden = false;
    var epEl = $('hud-story-ep');
    var titleEl = $('hud-story-title');
    if (EPISODE) {
      epEl.textContent = 'Эп. ' + EPISODE.number + '/' + STORY.total();
      titleEl.textContent = EPISODE.title;
    } else {
      epEl.textContent = 'Сезон 1';
      titleEl.textContent = 'Шкафчик №12';
    }
  }

  function bindStoryHud() {
    var btn = $('btn-story');
    if (!btn || !STORY) return;
    updateStoryHud();
    btn.addEventListener('click', function () {
      if (document.body.classList.contains('story-line-open')) return;
      // Пока открыт шкафчик, время смены стоит.
      var wasPaused = S.paused;
      if (!S.finished) S.paused = true;
      STORY.journal({ section: 'journal' }).then(function () {
        if (!S.finished && !wasPaused) S.paused = false;
      });
    });
  }

  /** Вступление эпизода: пролог (только эпизод 1), карточка эпизода, диалог. */
  function storyIntro() {
    if (!EPISODE || !STORY) {
      // Сезон пройден — короткая реплика один раз, дальше обычные смены.
      if (STORY && STORY.state().episode >= STORY.total() && window.StoryDialogue) {
        return window.StoryDialogue.showOnce('season1-after', STORY.prepareLines([
          { speaker: 'vera', text: 'Смена 03, проверка связи. {nick}, ты на линии — как и обещал.' },
          { speaker: 'ilya', text: 'Сезон историй закрыт, но вызовы не заканчиваются. Работаем по протоколу.' }
        ]), { nickname: NICK, title: 'Подстанция 03' });
      }
      return Promise.resolve();
    }
    var data = STORY.data() || {};
    var chain = Promise.resolve();
    // Пролог обычно уже показан на главной; если игрок пришёл по прямой ссылке — показываем здесь.
    if (Number(EPISODE.number) === 1 && data.prologue && (!STORY.prologueSeen() || STORY.isDemo())) {
      chain = chain.then(function () { return STORY.playPrologue(); });
    }
    return chain
      .then(function () { return STORY.episodeCard(EPISODE); })
      .then(function () { return STORY.play(EPISODE.before, { title: 'Эпизод ' + EPISODE.number + ' · «' + EPISODE.title + '»' }); });
  }

  function beginShiftWithStory() {
    storyIntro().then(function () {
      if (S.finished) return;
      if (window.SFX) window.SFX.music('shift');
      beginPatient();
      startTimer();
    });
  }

  function init() {
    // Пока идёт вступление эпизода — тема подстанции, со стартом смены — музыка смены.
    if (window.SFX) window.SFX.music(EPISODE && STORY ? 'menu' : 'shift');
    bind();
    bindStoryHud();
    initPaletteSwitcher();

    if (restoreFromSave()) {
      // Продолжаем сохранённую смену. Вступление эпизода показываем, только если
      // сохранение было сделано до начала текущего эпизода.
      renderHud();
      (S.resumedStory ? Promise.resolve() : storyIntro()).then(function () {
        if (S.finished) return;
        if (window.SFX) window.SFX.music('shift');
        renderPatient();
        renderDiagnoses();
        startTimer();
        autosave();
      });
      return;
    }

    renderHud();
    beginShiftWithStory();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

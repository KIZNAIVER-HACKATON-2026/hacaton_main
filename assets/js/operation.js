/* Случайно назначенный учебный сценарий операции, схемы и запись результата. */
(function () {
  'use strict';
  var DATA = window.OPERATION || {};
  if (!DATA.nick) return;

  var scenario = DATA.scenario || {};
  var steps = Array.isArray(scenario.steps) ? scenario.steps : [];

  var state = { index: 0, score: 0, rep: 100, mistakes: 0, remaining: 180, finished: false, timer: null, token: uuid() };
  var el = {
    time: document.getElementById('op-time'), score: document.getElementById('op-score'), rep: document.getElementById('op-rep'),
    stepNumber: document.getElementById('op-step-number'), question: document.getElementById('op-question'), description: document.getElementById('op-description'),
    actions: document.getElementById('op-actions'), feedback: document.getElementById('op-feedback'), checklist: document.getElementById('op-checklist'),
    scene: document.getElementById('arm-scene'), note: document.getElementById('visual-note'),
    final: document.getElementById('op-final'), finalLabel: document.getElementById('op-final-label'), finalTitle: document.getElementById('op-final-title'), finalText: document.getElementById('op-final-text'), finalScore: document.getElementById('op-final-score'), finalAccuracy: document.getElementById('op-final-accuracy'), finalReward: document.getElementById('op-final-reward'), finalSave: document.getElementById('op-final-save')
  };

  var sceneTemplates = {
    appendectomy: '<svg class="op-scene__svg" viewBox="0 0 320 200" role="img" aria-label="Схема лапароскопического тренажёра"><rect width="320" height="200" rx="14" fill="#102126"/><rect x="112" y="27" width="96" height="145" rx="38" fill="#d8c1b0" stroke="#8c786b" stroke-width="4"/><path d="M129 54h62v74h-62z" fill="#c5b2a3"/><circle cx="145" cy="91" r="10" fill="#78c7a0"/><circle cx="175" cy="91" r="10" fill="#78c7a0"/><circle cx="160" cy="119" r="10" fill="#78c7a0"/><path d="M48 58h42v52H48z" fill="#254b50" stroke="#7fd6b0" stroke-width="3"/><path d="M58 74h22m-22 11h22m-22 11h14" stroke="#d6efe4" stroke-width="4"/></svg>',
    osteosynthesis: '<svg class="op-scene__svg" viewBox="0 0 320 200" role="img" aria-label="Схема внешней фиксации на манекене"><rect width="320" height="200" rx="14" fill="#102126"/><rect x="36" y="83" width="246" height="48" rx="24" fill="#d8c1b0" stroke="#8c786b" stroke-width="4"/><rect x="90" y="70" width="151" height="75" rx="19" fill="#81969a" stroke="#dce6e3" stroke-width="4"/><path d="M112 107h106" stroke="#d7e5e2" stroke-width="10" stroke-linecap="round"/><circle cx="126" cy="91" r="5" fill="#f0a95c"/><circle cx="205" cy="91" r="5" fill="#f0a95c"/><circle cx="126" cy="124" r="5" fill="#f0a95c"/><circle cx="205" cy="124" r="5" fill="#f0a95c"/><rect x="251" y="88" width="38" height="36" rx="13" fill="#d8c1b0" stroke="#8c786b" stroke-width="4"/></svg>',
    cholecystectomy: '<svg class="op-scene__svg" viewBox="0 0 320 200" role="img" aria-label="Абстрактная схема лапароскопической операционной"><rect width="320" height="200" rx="14" fill="#102126"/><rect x="113" y="27" width="94" height="145" rx="37" fill="#d8c1b0" stroke="#8c786b" stroke-width="4"/><rect x="126" y="60" width="68" height="76" rx="18" fill="#96b8ae"/><circle cx="139" cy="80" r="8" fill="#f0a95c"/><circle cx="181" cy="80" r="8" fill="#f0a95c"/><circle cx="160" cy="116" r="8" fill="#f0a95c"/><path d="M45 58h47v56H45z" fill="#254b50" stroke="#7fd6b0" stroke-width="3"/><path d="M54 72h29m-29 12h29m-29 12h21" stroke="#d6efe4" stroke-width="4"/><path d="M92 85h25m90 0h24" stroke="#7fd6b0" stroke-width="3" stroke-dasharray="5 5"/></svg>',
    cesarean: '<svg class="op-scene__svg" viewBox="0 0 320 200" role="img" aria-label="Схема операционной и пеленального места"><rect width="320" height="200" rx="14" fill="#102126"/><rect x="55" y="45" width="174" height="108" rx="19" fill="#d8c1b0" stroke="#8c786b" stroke-width="4"/><path d="M65 91h154v52H65z" fill="#6e9eaa"/><path d="M81 105h122v30H81z" fill="#8bb8c0"/><rect x="235" y="87" width="53" height="55" rx="8" fill="#d5e7e3" stroke="#7fd6b0" stroke-width="3"/><rect x="243" y="99" width="37" height="29" rx="11" fill="#f0e3d5"/><path d="M251 113h20m-10-10v20" stroke="#7fd6b0" stroke-width="3"/><circle cx="75" cy="59" r="7" fill="#f0a95c"/><circle cx="208" cy="59" r="7" fill="#f0a95c"/></svg>'
  };

  function setupScene() {
    var visual = sceneTemplates[scenario.visual] ? scenario.visual : 'appendectomy';
    el.scene.className = 'arm-scene op-scene op-scene--' + visual;
    el.scene.innerHTML = sceneTemplates[visual] + '<div class="op-scene__progress" aria-hidden="true">' +
      steps.map(function () { return '<i></i>'; }).join('') + '</div>';
    el.note.textContent = scenario.note || 'Неграфическая схема учебного тренажёра.';
    updateSceneProgress();
  }

  function updateSceneProgress() {
    if (!el.scene) return;
    el.scene.setAttribute('data-step', String(state.index));
    Array.prototype.forEach.call(el.scene.querySelectorAll('.op-scene__progress i'), function (tick, index) {
      tick.classList.toggle('is-done', index < state.index);
      tick.classList.toggle('is-current', index === state.index && !state.finished);
    });
  }

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  }
  function shuffle(list) { var a = list.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function formatTime(sec) { var m = Math.floor(Math.max(0, sec) / 60); var s = Math.max(0, sec) % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }

  function renderHud() { el.time.textContent = formatTime(state.remaining); el.score.textContent = state.score; el.rep.textContent = state.rep; el.time.classList.toggle('is-warning', state.remaining <= 45); }
  function renderChecklist() {
    el.checklist.innerHTML = steps.map(function (step, index) {
      var done = index < state.index, current = index === state.index;
      return '<div class="op-check ' + (done ? 'is-done' : '') + (current ? ' is-current' : '') + '"><i>' + (done ? '✓' : String(index + 1).padStart(2, '0')) + '</i><span>' + step.title + '</span></div>';
    }).join('');
  }
  function renderStep() {
    if (state.index >= steps.length) { finish(true); return; }
    var step = steps[state.index];
    el.stepNumber.textContent = 'Шаг ' + (state.index + 1) + ' из ' + steps.length;
    el.question.textContent = step.title;
    el.description.textContent = step.description;
    el.feedback.textContent = '';
    el.feedback.className = 'op-feedback';
    el.actions.innerHTML = shuffle([step.correct].concat(step.wrong)).map(function (answer) { return '<button class="op-action" type="button" data-correct="' + (answer === step.correct ? '1' : '0') + '">' + answer + '</button>'; }).join('');
    Array.prototype.forEach.call(el.actions.querySelectorAll('.op-action'), function (button) { button.addEventListener('click', choose); });
    renderChecklist(); renderHud();
  }
  function choose(event) {
    if (state.finished) return;
    var button = event.currentTarget;
    if (button.dataset.correct === '1') {
      Array.prototype.forEach.call(el.actions.querySelectorAll('.op-action'), function (b) { b.disabled = true; });
      button.classList.add('is-correct');
      state.score += 80;
      el.feedback.textContent = 'Верно. ' + steps[state.index].note;
      el.feedback.className = 'op-feedback is-good';
      el.note.textContent = steps[state.index].note;
      state.index += 1;
      updateSceneProgress();
      renderChecklist(); renderHud();
      setTimeout(renderStep, 750);
    } else {
      button.classList.add('is-wrong');
      button.disabled = true;
      state.mistakes += 1;
      state.score = Math.max(0, state.score - 20);
      state.rep = Math.max(0, state.rep - 15);
      state.remaining = Math.max(0, state.remaining - 8);
      el.feedback.textContent = 'Не для этого этапа. В учебном сценарии попробуйте безопасную альтернативу. −20 очков, −15 точности, −8 сек.';
      el.feedback.className = 'op-feedback is-bad';
      renderHud();
      if (state.rep <= 0 || state.remaining <= 0) setTimeout(function () { finish(false); }, 350);
    }
  }
  function tick() { if (state.finished) return; state.remaining -= 1; renderHud(); if (state.remaining <= 0) finish(false); }
  function finish(success) {
    if (state.finished) return;
    state.finished = true; clearInterval(state.timer);
    var accuracy = Math.round(steps.length / (steps.length + state.mistakes) * 100);
    el.finalLabel.textContent = success ? 'Сценарий завершён' : 'Сценарий остановлен';
    el.finalTitle.textContent = success ? 'Сценарий завершён' : 'Нужна дополнительная тренировка';
    el.finalText.textContent = success ? 'Все ' + steps.length + ' этапов сценария «' + scenario.title + '» выполнены. Это неграфический учебный тренажёр, а не медицинская инструкция.' : 'Таймер или точность закончились раньше. Повтори случайно назначенный сценарий и следуй чек-листу команды.';
    el.finalScore.textContent = state.score;
    el.finalAccuracy.textContent = accuracy + '%';
    el.finalReward.textContent = success ? '+90 ₽ · +50 XP' : '+20 ₽ · +10 XP';
    el.finalSave.textContent = 'Записываем результат и прогресс кабинета…';
    submit(success);

    var debrief = success ? [
      { speaker: 'ilya', text: 'Отлично, все этапы выполнены в нужной последовательности. Это тренировка на манекене: спокойно закрепили навык без риска для пациента.' },
      { speaker: 'vera', text: 'Результат записан. Следующий шаг — продолжать смены и постепенно готовить подстанцию к большему потоку.' }
    ] : [
      { speaker: 'ilya', text: 'Ничего страшного: это учебный сценарий. Ошибки здесь помогают заметить этап, который стоит повторить.' },
      { speaker: 'ilya', text: 'Когда будешь готов, повтори тренировку. На подстанции я помогу разобраться.' }
    ];
    var storyKey = success ? 'operation-debrief-success' : 'operation-debrief-retry';
    function revealFinal() {
      el.final.hidden = false;
      var firstAction = document.getElementById('op-again');
      if (firstAction) firstAction.focus();
    }
    if (window.StoryDialogue) {
      window.StoryDialogue.showOnce(storyKey, debrief, { nickname: DATA.nick, title: success ? 'Сюжет · разбор тренировки' : 'Сюжет · поддержка наставника' })
        .then(revealFinal);
    } else {
      revealFinal();
    }
  }
  function submit(success) {
    if (!DATA.endpoint || state.score <= 0) { el.finalSave.textContent = 'Результат без очков не отправлен в таблицу.'; return; }
    fetch(DATA.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ nickname: DATA.nick, score: state.score, token: state.token, mode: 'operation', success: success }) })
      .then(function (response) { return response.json().catch(function () { return null; }); })
      .then(function (data) { el.finalSave.textContent = data && data.ok ? 'Результат сохранён. Место в топе: #' + (data.rank || '—') + '. Прогресс обновлён в личном кабинете.' : 'Не удалось сохранить результат: база недоступна.'; })
      .catch(function () { el.finalSave.textContent = 'Нет связи: результат не сохранён.'; });
  }
  function startScenario() {
    renderStep();
    state.timer = setInterval(tick, 1000);
  }

  function showTrainingBriefing() {
    var progress = DATA.storyProgress || {};
    if (!window.StoryDialogue || Number(progress.operations_finished) > 0) {
      startScenario();
      return;
    }
    window.StoryDialogue.showOnce('operation-training-briefing', [
      { speaker: 'ilya', text: 'Добро пожаловать в учебную зону. Здесь работает манекен, а не пациент: сначала читаем условие, затем выбираем действия по порядку.' },
      { speaker: 'ilya', text: 'Таймер начнётся после брифинга. Если понадобится, можно сразу показать текст полностью или пропустить диалог.' }
    ], { nickname: DATA.nick, title: 'Сюжет · тренировка с наставником' }).then(startScenario);
  }

  setupScene();
  showTrainingBriefing();
})();

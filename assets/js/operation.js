/* Учебный режим иммобилизации: схемы, порядок действий и запись результата. */
(function () {
  'use strict';
  var DATA = window.OPERATION || {};
  if (!DATA.nick) return;

  var steps = [
    {
      title: 'Первичная проверка',
      description: 'До фиксации в учебном сценарии оцениваем состояние кисти и уточняем жалобы.',
      correct: 'Проверить цвет, чувствительность и движение пальцев',
      wrong: ['Сразу затянуть повязку', 'Попросить продолжить нагрузку'],
      note: 'Первичный контроль выполнен: кисть можно безопасно фиксировать на схеме.'
    },
    {
      title: 'Защита ткани',
      description: 'Следующим шагом создаём мягкий защитный слой на схеме.',
      correct: 'Аккуратно добавить мягкую подкладку',
      wrong: ['Пропустить подкладку', 'Плотно прижать твёрдую шину к коже'],
      note: 'Подкладка добавлена: на схеме появилась защитная прослойка.'
    },
    {
      title: 'Положение для фиксации',
      description: 'Выбираем нейтральное, удобное положение и размещаем учебную шину.',
      correct: 'Уложить шину и сохранить удобное положение руки',
      wrong: ['Резко выпрямить руку', 'Менять положение до ощущения боли'],
      note: 'Шина размещена: рука остаётся в нейтральном положении.'
    },
    {
      title: 'Закрепление',
      description: 'Фиксируем конструкцию равномерно и без чрезмерного давления.',
      correct: 'Закрепить бинтом без перетягивания',
      wrong: ['Затянуть бинт максимально туго', 'Оставить шину незакреплённой'],
      note: 'Фиксация закреплена: на схеме видна мягкая бинтовая повязка.'
    },
    {
      title: 'Контроль после фиксации',
      description: 'Финальный шаг — убедиться, что кисть остаётся тёплой и чувствительной.',
      correct: 'Повторно проверить пальцы и комфорт фиксации',
      wrong: ['Сразу закончить сценарий', 'Скрыть кисть полностью под повязкой'],
      note: 'Контроль завершён. Учебная фиксация готова к передаче следующей команде.'
    }
  ];

  var state = { index: 0, score: 0, rep: 100, mistakes: 0, remaining: 180, finished: false, timer: null, token: uuid() };
  var el = {
    time: document.getElementById('op-time'), score: document.getElementById('op-score'), rep: document.getElementById('op-rep'),
    stepNumber: document.getElementById('op-step-number'), question: document.getElementById('op-question'), description: document.getElementById('op-description'),
    actions: document.getElementById('op-actions'), feedback: document.getElementById('op-feedback'), checklist: document.getElementById('op-checklist'),
    scene: document.getElementById('arm-scene'), note: document.getElementById('visual-note'),
    final: document.getElementById('op-final'), finalLabel: document.getElementById('op-final-label'), finalTitle: document.getElementById('op-final-title'), finalText: document.getElementById('op-final-text'), finalScore: document.getElementById('op-final-score'), finalAccuracy: document.getElementById('op-final-accuracy'), finalReward: document.getElementById('op-final-reward'), finalSave: document.getElementById('op-final-save')
  };

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
      el.scene.className = 'arm-scene cast-step-' + (state.index + 1);
      el.note.textContent = steps[state.index].note;
      state.index += 1;
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
    el.finalTitle.textContent = success ? 'Фиксация выполнена' : 'Нужна дополнительная тренировка';
    el.finalText.textContent = success ? 'Все пять этапов выполнены в правильной последовательности. Это учебный тренажёр, а не медицинская инструкция.' : 'Таймер или точность закончились раньше. Повтори сценарий и сохрани спокойный порядок действий.';
    el.finalScore.textContent = state.score;
    el.finalAccuracy.textContent = accuracy + '%';
    el.finalReward.textContent = success ? '+90 ₽ · +50 XP' : '+20 ₽ · +10 XP';
    el.finalSave.textContent = 'Записываем результат и прогресс кабинета…';
    el.final.hidden = false;
    submit(success);
  }
  function submit(success) {
    if (!DATA.endpoint || state.score <= 0) { el.finalSave.textContent = 'Результат без очков не отправлен в таблицу.'; return; }
    fetch(DATA.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ nickname: DATA.nick, score: state.score, token: state.token, mode: 'operation', success: success }) })
      .then(function (response) { return response.json().catch(function () { return null; }); })
      .then(function (data) { el.finalSave.textContent = data && data.ok ? 'Результат сохранён. Место в топе: #' + (data.rank || '—') + '. Прогресс обновлён в личном кабинете.' : 'Не удалось сохранить результат: база недоступна.'; })
      .catch(function () { el.finalSave.textContent = 'Нет связи: результат не сохранён.'; });
  }
  renderStep();
  state.timer = setInterval(tick, 1000);
})();

/**
 * upgrades.js — Система прокачки подстанции и наложения оборудования на фон.
 * Сохраняет прогресс, опыт, бюджет и открытое оборудование в localStorage.
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'shift_station_upgrades_v2';

  // Каталог доступного оснащения подстанции
  var CATALOG = [
    {
      id: 'table',
      name: 'Манипуляционный столик',
      cost: 150,
      reqXp: 0,
      reqSaved: 0,
      desc: 'Столик из нержавеющей стали с лотком для стерильных инструментов.',
      bonus: '+5 стартовой репутации в каждой смене',
      type: 'table'
    },
    {
      id: 'defibrillator',
      name: 'Дефибриллятор «Аксион»',
      cost: 300,
      reqXp: 50,
      reqSaved: 1,
      desc: 'Бифазный переносной дефибриллятор для экстренной реанимации.',
      bonus: 'Шанс реанимации: первая ошибка не снижает репутацию',
      type: 'defibrillator'
    },
    {
      id: 'monitor',
      name: 'Монитор витальных функций',
      cost: 450,
      reqXp: 120,
      reqSaved: 3,
      desc: 'Прикроватный монитор с непрерывным отслеживанием ЭКГ и SpO₂.',
      bonus: '+25 секунд к общему таймеру смены',
      type: 'monitor'
    },
    {
      id: 'fridge',
      name: 'Фарм-холодильник POZIS',
      cost: 650,
      reqXp: 200,
      reqSaved: 5,
      desc: 'Специализированный холодильник для хранения термолабильных ампул.',
      bonus: '+15% бонусных очков за правильное лечение',
      type: 'fridge'
    },
    {
      id: 'lamp',
      name: 'Хирургический светильник',
      cost: 900,
      reqXp: 350,
      reqSaved: 8,
      desc: 'Бестеневой светодиодный плафон с мощным сфокусированным лучом.',
      bonus: '+25 очков за каждый верный диагноз',
      type: 'lamp'
    },
    {
      id: 'radio',
      name: 'Радиостанция «Волна-03»',
      cost: 1200,
      reqXp: 500,
      reqSaved: 12,
      desc: 'Стационарная диспетчерская радиостанция прямой связи с базой.',
      bonus: 'Приоритет вызовов: удвоенные награды за звонки',
      type: 'radio'
    }
  ];

  // Состояние игрока
  var State = {
    budget: 200,       // стартовый бюджет для первой пробы
    xp: 50,            // стартовый опыт
    totalSaved: 0,     // всего вылечено пациентов
    shiftsFinished: 0, // завершено смен
    installed: ['table'] // столик уже установлен на старте как базовый!
  };

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        State.budget = typeof parsed.budget === 'number' ? parsed.budget : State.budget;
        State.xp = typeof parsed.xp === 'number' ? parsed.xp : State.xp;
        State.totalSaved = typeof parsed.totalSaved === 'number' ? parsed.totalSaved : State.totalSaved;
        State.shiftsFinished = typeof parsed.shiftsFinished === 'number' ? parsed.shiftsFinished : State.shiftsFinished;
        State.installed = Array.isArray(parsed.installed) ? parsed.installed : State.installed;
      }
    } catch (e) {}
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(State));
    } catch (e) {}
  }

  function hasUpgrade(id) {
    return State.installed.indexOf(id) !== -1;
  }

  // Начисление наград за пациента / смену
  function addReward(coins, xp, isSaved) {
    State.budget += coins || 0;
    State.xp += xp || 0;
    if (isSaved) State.totalSaved += 1;
    saveState();
    updateHudButton();
    renderBackgroundItems();
  }

  // Обновление кнопки в HUD
  function updateHudButton() {
    var btn = document.getElementById('btn-upgrades-hud');
    if (!btn) return;
    var valEl = btn.querySelector('.hud__coin-val');
    if (valEl) valEl.textContent = State.budget + ' ₽';
  }

  // Отрисовка оборудования на заднем плане (комната подстанции)
  function renderBackgroundItems() {
    var layer = document.getElementById('station-equipment-layer');
    if (!layer) return;

    var sprites = window.STATION_EQUIPMENT || {};

    layer.innerHTML = CATALOG.map(function (item) {
      var isInstalled = hasUpgrade(item.id);
      var svg = sprites[item.id] || '';
      return '<div class="station-item station-item--' + item.id +
             (isInstalled ? ' is-installed' : ' is-locked') +
             '" title="' + item.name + ': ' + item.bonus + '">' +
             svg +
             '</div>';
    }).join('');
  }

  // Отрисовка карточек в модальном окне
  function renderModalContent() {
    var modal = document.getElementById('modal-upgrades');
    if (!modal) return;

    var budgetEl = document.getElementById('upgrades-budget-val');
    var xpEl = document.getElementById('upgrades-xp-val');
    var savedEl = document.getElementById('upgrades-saved-val');
    var levelEl = document.getElementById('upgrades-level-val');

    if (budgetEl) budgetEl.textContent = State.budget + ' ₽';
    if (xpEl) xpEl.textContent = State.xp + ' XP';
    if (savedEl) savedEl.textContent = State.totalSaved;
    if (levelEl) levelEl.textContent = State.installed.length + ' / ' + CATALOG.length;

    var grid = document.getElementById('upgrades-grid');
    if (!grid) return;

    var sprites = window.STATION_EQUIPMENT || {};

    grid.innerHTML = CATALOG.map(function (item) {
      var installed = hasUpgrade(item.id);
      var canAfford = State.budget >= item.cost;
      var canUnlock = State.xp >= item.reqXp && State.totalSaved >= item.reqSaved;
      var previewSvg = sprites[item.id] || '<span style="font-size:32px">📦</span>';

      var btnHtml = '';
      if (installed) {
        btnHtml = '<button class="upgrade-btn is-active" type="button" disabled>✓ Установлено</button>';
      } else if (!canUnlock) {
        btnHtml = '<button class="upgrade-btn" type="button" disabled>🔒 Требуется ' +
                  item.reqSaved + ' пац. / ' + item.reqXp + ' XP</button>';
      } else if (!canAfford) {
        btnHtml = '<button class="upgrade-btn" type="button" disabled>Не хватает ' +
                  (item.cost - State.budget) + ' ₽</button>';
      } else {
        btnHtml = '<button class="upgrade-btn btn-buy-upgrade" type="button" data-id="' + item.id + '">' +
                  'Установить за ' + item.cost + ' ₽</button>';
      }

      return '<div class="upgrade-card' + (installed ? ' is-installed' : '') + '">' +
               '<div class="upgrade-card__preview">' + previewSvg + '</div>' +
               '<div class="upgrade-card__info">' +
                 '<h3 class="upgrade-card__title">' + item.name + '</h3>' +
                 '<p class="upgrade-card__desc">' + item.desc + '</p>' +
                 '<div class="upgrade-card__bonus">⚡ ' + item.bonus + '</div>' +
               '</div>' +
               '<div class="upgrade-card__action">' + btnHtml + '</div>' +
             '</div>';
    }).join('');

    // Навешиваем клик на кнопки покупки
    var buyButtons = grid.querySelectorAll('.btn-buy-upgrade');
    Array.prototype.forEach.call(buyButtons, function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        buyUpgrade(id);
      });
    });
  }

  function buyUpgrade(id) {
    var item = null;
    for (var i = 0; i < CATALOG.length; i++) {
      if (CATALOG[i].id === id) { item = CATALOG[i]; break; }
    }
    if (!item) return;
    if (State.budget < item.cost) return;

    State.budget -= item.cost;
    State.installed.push(id);
    saveState();

    updateHudButton();
    renderBackgroundItems();
    renderModalContent();

    // Всплывающее уведомление
    if (window.toast) {
      window.toast('Установлено: ' + item.name + '! ' + item.bonus, 'ok');
    }
  }

  function openModal() {
    var modal = document.getElementById('modal-upgrades');
    if (!modal) return;
    renderModalContent();
    modal.hidden = false;
  }

  function closeModal() {
    var modal = document.getElementById('modal-upgrades');
    if (!modal) return;
    modal.hidden = true;
  }

  // Экспорт для игры
  window.STATION_SYSTEM = {
    has: hasUpgrade,
    addReward: addReward,
    openModal: openModal,
    closeModal: closeModal,
    getState: function () { return State; },
    getBonusDefibrillator: function () { return hasUpgrade('defibrillator'); },
    getBonusTime: function () { return hasUpgrade('monitor') ? 25 : 0; },
    getBonusRep: function () { return hasUpgrade('table') ? 5 : 0; },
    getBonusTreatMultiplier: function () { return hasUpgrade('fridge') ? 1.15 : 1.0; },
    getBonusDiagPoints: function () { return hasUpgrade('lamp') ? 25 : 0; }
  };

  // Инициализация
  function init() {
    loadState();
    updateHudButton();
    renderBackgroundItems();

    var openBtn = document.getElementById('btn-upgrades-hud');
    if (openBtn) openBtn.addEventListener('click', openModal);

    var closeBtn = document.getElementById('btn-close-upgrades');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    var modal = document.getElementById('modal-upgrades');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

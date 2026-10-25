/* Личный кабинет: вход, статистика, две игры и серверные покупки. */
(function () {
  'use strict';

  var DATA = window.CABINET || {};
  var nick = DATA.nick || null;
  var dashboard = DATA.dashboard || null;
  var equipment = Array.isArray(DATA.equipment) ? DATA.equipment : [];
  var hospitalLevels = DATA.hospitalLevels || {};
  var content = document.getElementById('cabinet-content');
  var STORY = (window.StoryLine && DATA.story) ? window.StoryLine.init(DATA.story, { nick: nick, endpoint: 'api/story.php' }) : null;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function num(value) {
    return String(Math.max(0, Math.round(Number(value) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function validNickname(value) {
    var cleaned = String(value || '').trim().replace(/\s+/g, ' ');
    if (cleaned.length < 3 || cleaned.length > 16) return null;
    return /^[\p{L}\p{N} _-]+$/u.test(cleaned) ? cleaned : null;
  }
  function requirementText(item) {
    return num(item.cost) + ' ₽ · ' + num(item.xp) + ' XP · ' + num(item.saved) + ' спас. · ' + num(item.shifts) + ' смен';
  }
  function pixelIcon(type) {
    var art = {
      ambulance: '<rect x="3" y="12" width="21" height="12" fill="#071014"/><rect x="20" y="15" width="9" height="9" fill="#071014"/><rect x="5" y="14" width="14" height="8" fill="#7fd6b0"/><rect x="21" y="17" width="6" height="5" fill="#a9d9d0"/><rect x="8" y="9" width="8" height="4" fill="#071014"/><rect x="10" y="10" width="5" height="3" fill="#e8f0ea"/><rect x="9" y="15" width="4" height="2" fill="#e2685a"/><rect x="10" y="14" width="2" height="4" fill="#e2685a"/><rect x="7" y="23" width="6" height="6" fill="#071014"/><rect x="22" y="23" width="6" height="6" fill="#071014"/><rect x="9" y="25" width="2" height="2" fill="#f0a95c"/><rect x="24" y="25" width="2" height="2" fill="#f0a95c"/>',
      bandage: '<g transform="rotate(-35 16 16)"><rect x="5" y="11" width="22" height="10" fill="#071014"/><rect x="7" y="13" width="18" height="6" fill="#f0a95c"/><rect x="10" y="13" width="3" height="6" fill="#e8f0ea"/><rect x="19" y="13" width="3" height="6" fill="#e8f0ea"/><rect x="15" y="15" width="2" height="2" fill="#7fd6b0"/></g>',
      cart: '<rect x="7" y="7" width="18" height="3" fill="#071014"/><rect x="9" y="10" width="16" height="13" fill="#071014"/><rect x="11" y="12" width="12" height="9" fill="#7fd6b0"/><rect x="4" y="8" width="3" height="3" fill="#f0a95c"/><rect x="13" y="14" width="3" height="3" fill="#e2685a"/><rect x="14" y="13" width="2" height="5" fill="#e2685a"/><rect x="8" y="23" width="5" height="5" fill="#071014"/><rect x="21" y="23" width="5" height="5" fill="#071014"/><rect x="9" y="24" width="2" height="2" fill="#f0a95c"/><rect x="22" y="24" width="2" height="2" fill="#f0a95c"/>',
      defibrillator: '<rect x="7" y="4" width="18" height="24" fill="#071014"/><rect x="9" y="6" width="14" height="20" fill="#7fd6b0"/><rect x="11" y="9" width="10" height="7" fill="#0b2021"/><path d="M16 10h2l-2 3h2l-4 4 1-3h-2z" fill="#f0a95c"/><rect x="12" y="19" width="8" height="2" fill="#e8f0ea"/><rect x="13" y="23" width="6" height="2" fill="#e2685a"/>',
      monitor: '<rect x="4" y="5" width="24" height="18" fill="#071014"/><rect x="7" y="8" width="18" height="12" fill="#7fd6b0"/><rect x="9" y="10" width="14" height="8" fill="#0b2021"/><path d="M10 15h3l2-3 2 5 2-3h3" fill="none" stroke="#f0a95c" stroke-width="2" stroke-linejoin="miter"/><rect x="14" y="23" width="4" height="4" fill="#071014"/><rect x="10" y="27" width="12" height="2" fill="#071014"/>',
      fridge: '<rect x="8" y="3" width="17" height="26" fill="#071014"/><rect x="10" y="5" width="13" height="22" fill="#a9d9d0"/><rect x="10" y="15" width="13" height="2" fill="#071014"/><rect x="20" y="9" width="2" height="4" fill="#f0a95c"/><rect x="15" y="8" width="3" height="2" fill="#e2685a"/><rect x="16" y="7" width="2" height="5" fill="#e2685a"/><rect x="13" y="28" width="3" height="2" fill="#071014"/><rect x="19" y="28" width="3" height="2" fill="#071014"/>',
      radio: '<rect x="9" y="7" width="15" height="22" fill="#071014"/><rect x="12" y="4" width="2" height="5" fill="#071014"/><rect x="11" y="9" width="11" height="17" fill="#7fd6b0"/><rect x="13" y="12" width="7" height="6" fill="#0b2021"/><rect x="14" y="14" width="2" height="2" fill="#f0a95c"/><rect x="13" y="21" width="2" height="2" fill="#e8f0ea"/><rect x="17" y="20" width="3" height="4" fill="#f0a95c"/><rect x="14" y="26" width="5" height="2" fill="#071014"/>',
      hospital: '<rect x="6" y="9" width="20" height="20" fill="#071014"/><rect x="9" y="12" width="14" height="15" fill="#7fd6b0"/><rect x="14" y="5" width="6" height="7" fill="#071014"/><rect x="16" y="6" width="2" height="5" fill="#e2685a"/><rect x="14" y="8" width="6" height="2" fill="#e2685a"/><rect x="11" y="15" width="2" height="3" fill="#0b2021"/><rect x="19" y="15" width="2" height="3" fill="#0b2021"/><rect x="15" y="21" width="4" height="6" fill="#f0a95c"/>'
    };
    return '<svg class="cabinet-pixel-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false" shape-rendering="crispEdges">' + (art[type] || art.hospital) + '</svg>';
  }
  function hasRequirements(profile, item) {
    return profile.budget >= item.cost && profile.xp >= item.xp && profile.total_saved >= item.saved && profile.shifts_finished >= item.shifts;
  }
  function badgeList(d) {
    var p = d.profile || {};
    var badges = [];
    if (p.shifts_finished >= 1) badges.push('Первая смена');
    if (p.operations_success >= 1) badges.push('Точная фиксация');
    if ((p.equipment || []).length >= 3) badges.push('Оснащённый пост');
    if (p.hospital_level >= 2) badges.push('Организатор');
    return badges.length ? badges.map(function (name) { return '<span class="badge-chip">' + esc(name) + '</span>'; }).join('') : '<span class="cabinet-empty">Значки появятся после первой завершённой игры.</span>';
  }

  var activeTab = 'overview';
  var cabinetTabs = [
    { id: 'overview', label: 'Обзор' },
    { id: 'games', label: 'Игры' },
    { id: 'achievements', label: 'Достижения' },
    { id: 'development', label: 'Развитие' }
  ];

  function render() {
    if (!content || !dashboard) return;
    var p = dashboard.profile || {};
    var rank = dashboard.rank ? '#' + dashboard.rank : '—';
    var modeGoal = p.operations_success > 0 ? 'Операция дня выполнена' : 'Пройди учебную фиксацию перелома';
    var progress = p.operations_success > 0 ? 'is-complete' : '';
    if (!cabinetTabs.some(function (tab) { return tab.id === activeTab; })) activeTab = 'overview';

    var tabButtons = cabinetTabs.map(function (tab) {
      var selected = tab.id === activeTab;
      return '<button class="cabinet-tab' + (selected ? ' is-active' : '') + '" id="cabinet-tab-' + tab.id + '" type="button" role="tab" aria-controls="cabinet-panel-' + tab.id + '" aria-selected="' + selected + '" tabindex="' + (selected ? '0' : '-1') + '" data-cabinet-tab="' + tab.id + '">' + tab.label + '</button>';
    }).join('');

    content.innerHTML =
      '<div class="cabinet-tabs" role="tablist" aria-label="Разделы личного кабинета">' + tabButtons + '</div>' +
      '<section class="cabinet-tab-panel' + (activeTab === 'overview' ? ' is-active' : '') + '" id="cabinet-panel-overview" role="tabpanel" aria-labelledby="cabinet-tab-overview" data-cabinet-panel="overview"' + (activeTab === 'overview' ? '' : ' hidden') + '>' +
        '<div class="cabinet-overview">' +
          '<article class="cabinet-stat"><span>Место в топе</span><b>' + rank + '</b><small>по личному рекорду</small></article>' +
          '<article class="cabinet-stat"><span>Личный рекорд</span><b>' + num(dashboard.best) + '</b><small>очков</small></article>' +
          '<article class="cabinet-stat"><span>Спасено пациентов</span><b>' + num(p.total_saved) + '</b><small>за все смены</small></article>' +
          '<article class="cabinet-stat"><span>Серия</span><b>' + num(p.streak) + '</b><small>дней активности</small></article>' +
        '</div>' +
        '<p class="cabinet-tab-hint">Подробности о режимах, наградах и улучшениях — в соответствующих вкладках.</p>' +
      '</section>' +
      '<section class="cabinet-tab-panel' + (activeTab === 'games' ? ' is-active' : '') + '" id="cabinet-panel-games" role="tabpanel" aria-labelledby="cabinet-tab-games" data-cabinet-panel="games"' + (activeTab === 'games' ? '' : ' hidden') + '>' +
        '<div class="cabinet-panel cabinet-games"><div class="cabinet-panel__head"><div><p>Игровые режимы</p><h3>Выбери задание</h3></div></div>' +
          '<div class="game-mode-grid">' +
            '<a class="game-mode" href="game.php?nick=' + encodeURIComponent(nick) + '"><span class="game-mode__icon">' + pixelIcon('ambulance') + '</span><span><b>Ночная смена</b><small>8 пациентов · диагноз и порядок лечения' + (STORY && STORY.currentEpisode() ? ' · эпизод ' + STORY.currentEpisode().number + ' истории' : '') + '</small></span><i>Играть →</i></a>' +
            '<a class="game-mode game-mode--operation" href="operation.php?nick=' + encodeURIComponent(nick) + '"><span class="game-mode__icon">' + pixelIcon('bandage') + '</span><span><b>Учебная операция</b><small>4 операции · подай инструменты в нужном порядке</small></span><i>Оперировать →</i></a>' +
          '</div>' +
          '<div class="daily-mission ' + progress + '"><span>Миссия дня</span><b>' + esc(modeGoal) + '</b><small>' + (p.operations_success > 0 ? 'Выполнено: опыт и бюджет уже начислены.' : 'Успех даст +90 ₽ и +50 XP. Ошибки не сбрасывают прогресс.') + '</small></div>' +
        '</div>' +
      '</section>' +
      '<section class="cabinet-tab-panel' + (activeTab === 'achievements' ? ' is-active' : '') + '" id="cabinet-panel-achievements" role="tabpanel" aria-labelledby="cabinet-tab-achievements" data-cabinet-panel="achievements"' + (activeTab === 'achievements' ? '' : ' hidden') + '>' +
        '<section class="cabinet-panel cabinet-awards"><div class="cabinet-panel__head"><div><p>Профиль</p><h3>Достижения и результаты</h3></div><span class="cabinet-count">' + num(dashboard.records) + ' результатов</span></div><div class="badge-list">' + badgeList(dashboard) + '</div><div class="profile-details"><span>Средний счёт <b>' + num(dashboard.average) + '</b></span><span>Успешных операций <b>' + num(p.operations_success) + '/' + num(p.operations_finished) + '</b></span><span>Закрыто смен <b>' + num(p.shifts_finished) + '</b></span></div></section>' +
      '</section>' +
      '<section class="cabinet-tab-panel' + (activeTab === 'development' ? ' is-active' : '') + '" id="cabinet-panel-development" role="tabpanel" aria-labelledby="cabinet-tab-development" data-cabinet-panel="development"' + (activeTab === 'development' ? '' : ' hidden') + '>' +
        '<section class="progression"><div class="progression__head"><div><p class="cabinet__eyebrow">Долгая прогрессия</p><h3>Развитие больницы и оснащение</h3><p>Требования покупок проверяются на сервере. Награды начисляются после завершения игры.</p></div><div class="progression__summary"><div class="progression__level"><span>Уровень больницы</span><b>' + num(p.hospital_level) + '/' + Object.keys(hospitalLevels).length + '</b></div><div class="cabinet-resources"><span>Баланс</span><b>' + num(p.budget) + ' ₽</b><span>Опыт</span><b>' + num(p.xp) + ' XP</b></div></div></div>' +
          '<div class="progression__cols"><div><h4>Больница</h4><div class="upgrade-list" id="hospital-upgrades">' + hospitalHtml(p) + '</div></div><div><h4>Оборудование</h4><div class="upgrade-list" id="equipment-upgrades">' + equipmentHtml(p) + '</div></div></div></section>' +
      '</section>';

    bindTabs();
    bindPurchases();
  }

  function activateTab(tabId, moveFocus) {
    if (!cabinetTabs.some(function (tab) { return tab.id === tabId; })) return;
    activeTab = tabId;
    var tabs = content.querySelectorAll('[data-cabinet-tab]');
    var panels = content.querySelectorAll('[data-cabinet-panel]');
    Array.prototype.forEach.call(tabs, function (tab) {
      var selected = tab.getAttribute('data-cabinet-tab') === tabId;
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle('is-active', selected);
      if (selected && moveFocus) tab.focus();
    });
    Array.prototype.forEach.call(panels, function (panel) {
      var selected = panel.getAttribute('data-cabinet-panel') === tabId;
      panel.hidden = !selected;
      panel.classList.toggle('is-active', selected);
    });
  }

  function bindTabs() {
    var tabs = content.querySelectorAll('[data-cabinet-tab]');
    Array.prototype.forEach.call(tabs, function (tab) {
      tab.addEventListener('click', function () {
        activateTab(tab.getAttribute('data-cabinet-tab'), false);
      });
      tab.addEventListener('keydown', function (event) {
        var index = cabinetTabs.findIndex(function (item) { return item.id === tab.getAttribute('data-cabinet-tab'); });
        if (event.key === 'ArrowRight') index = (index + 1) % cabinetTabs.length;
        else if (event.key === 'ArrowLeft') index = (index + cabinetTabs.length - 1) % cabinetTabs.length;
        else if (event.key === 'Home') index = 0;
        else if (event.key === 'End') index = cabinetTabs.length - 1;
        else return;
        event.preventDefault();
        activateTab(cabinetTabs[index].id, true);
      });
    });
  }

  function hospitalHtml(profile) {
    return Object.keys(hospitalLevels).sort(function (a, b) { return Number(a) - Number(b); }).map(function (key) {
      var item = hospitalLevels[key];
      var level = Number(key);
      var purchased = profile.hospital_level >= level;
      var current = profile.hospital_level + 1 === level;
      var ready = current && hasRequirements(profile, item);
      return upgradeCard('hospital', key, item, purchased, ready, current, profile);
    }).join('');
  }

  function equipmentHtml(profile) {
    var owned = profile.equipment || [];
    return equipment.map(function (item) {
      var purchased = owned.indexOf(item.id) !== -1;
      return upgradeCard('equipment', item.id, item, purchased, hasRequirements(profile, item), true, profile);
    }).join('');
  }

  function upgradeCard(kind, id, item, purchased, ready, available, profile) {
    var state;
    var action;
    if (purchased) {
      state = 'is-owned'; action = '<span class="upgrade-state">✓ Установлено</span>';
    } else if (!available) {
      state = 'is-locked'; action = '<span class="upgrade-state">Сначала предыдущий уровень</span>';
    } else if (ready) {
      state = 'is-ready'; action = '<button class="upgrade-buy" type="button" data-kind="' + kind + '" data-id="' + esc(id) + '">Купить за ' + num(item.cost) + ' ₽</button>';
    } else {
      state = 'is-locked'; action = '<span class="upgrade-state">Не хватает прогресса</span>';
    }
    return '<article class="upgrade-row ' + state + '"><span class="upgrade-row__icon">' + pixelIcon(kind === 'hospital' ? 'hospital' : id) + '</span><div><b>' + esc(item.name) + '</b><p>' + esc(item.desc) + '</p><small>' + requirementText(item) + '</small></div><div class="upgrade-row__action">' + action + '</div></article>';
  }

  function bindPurchases() {
    var buttons = content.querySelectorAll('.upgrade-buy');
    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener('click', function () {
        purchase(button.getAttribute('data-kind'), button.getAttribute('data-id'), button);
      });
    });
  }

  function purchase(kind, id, button) {
    if (!nick) return;
    button.disabled = true;
    button.textContent = 'Проверяем…';
    fetch('api/profile.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ action: 'purchase', nickname: nick, kind: kind, id: id })
    }).then(function (response) { return response.json().catch(function () { return null; }); })
      .then(function (data) {
        if (data && data.dashboard) dashboard = data.dashboard;
        if (data && data.ok) storyReaction(kind, id);
        if (window.SFX) window.SFX.play(data && data.ok ? 'coin' : 'error');
        if (!data || !data.ok) {
          window.alert(data && data.error === 'requirements_not_met' ? 'Пока не выполнены требования улучшения.' : 'Покупку не удалось выполнить. Обновите страницу и проверьте базу данных.');
        }
        render();
      }).catch(function () {
        if (window.SFX) window.SFX.play('error');
        window.alert('Нет связи с сервером. Покупка не выполнена.');
        render();
      });
  }

  /* Сюжет реагирует на развитие подстанции: короткие реплики после покупок. */
  function storyReaction(kind, id) {
    if (!window.StoryDialogue) return;
    var lines = null, key = null;
    if (kind === 'equipment' && id === 'radio') {
      key = 'story-buy-radio';
      lines = [
        { speaker: 'vera', text: 'Новая радиостанция? Два года я ждала, что кто-нибудь её купит.' },
        { speaker: 'vera', text: 'Теперь, если в шторм ты позовёшь, я услышу. Сразу, а не через четыре минуты.' }
      ];
    } else if (kind === 'hospital') {
      key = 'story-buy-hospital-' + id;
      lines = [{ speaker: 'ilya', text: 'Подстанция растёт. Чем лучше оснащение, тем меньше бригада остаётся одна со сложным вызовом.' }];
    } else if (kind === 'equipment') {
      key = 'story-buy-equipment-first';
      lines = [{ speaker: 'sonya', text: 'Ого, новое оборудование! Можно я потом попробую? Я буду аккуратно.' }];
    }
    if (lines) window.StoryDialogue.showOnce(key, STORY ? STORY.prepareLines(lines) : lines, { nickname: nick, title: 'Подстанция 03' });
  }

  function loadDashboard() {
    if (!nick || !content) return;
    fetch('api/profile.php?nickname=' + encodeURIComponent(nick), { headers: { 'Accept': 'application/json' } })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        if (data && data.ok && data.dashboard) dashboard = data.dashboard;
        render();
      }).catch(render);
  }

  function encyclopediaIcon(kind, index) {
    var palette = ['#7fd6b0', '#f0a95c', '#a9d9d0', '#e2685a', '#9fb9ed', '#d7b7e8'];
    var color = palette[Math.abs(Number(index) || 0) % palette.length];
    var art = kind === 'diagnoses'
      ? '<rect x="4" y="4" width="24" height="24" fill="#071014"/><rect x="13" y="8" width="6" height="16" fill="' + color + '"/><rect x="8" y="13" width="16" height="6" fill="' + color + '"/><rect x="14" y="14" width="4" height="4" fill="#e8f0ea"/>'
      : '<rect x="6" y="5" width="20" height="24" fill="#071014"/><rect x="9" y="8" width="14" height="18" fill="#15302d"/><rect x="12" y="4" width="8" height="5" fill="' + color + '"/><rect x="12" y="13" width="8" height="2" fill="#e8f0ea"/><rect x="12" y="18" width="8" height="2" fill="#7fd6b0"/><rect x="12" y="23" width="5" height="2" fill="#f0a95c"/>';
    return '<svg class="encyclopedia-pixel-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false" shape-rendering="crispEdges">' + art + '</svg>';
  }

  function bindEncyclopedia() {
    var modal = document.getElementById('encyclopedia-modal');
    var opener = document.getElementById('encyclopedia-open');
    var closer = document.getElementById('encyclopedia-close');
    var grid = document.getElementById('encyclopedia-grid');
    var empty = document.getElementById('encyclopedia-empty');
    var search = document.getElementById('encyclopedia-search');
    var resultLabel = document.getElementById('encyclopedia-results');
    var progressLabel = document.getElementById('encyclopedia-progress-label');
    var progressBar = document.getElementById('encyclopedia-progress-bar');
    var tabs = document.querySelectorAll('[data-encyclopedia-tab]');
    var articles = DATA.encyclopedia || { diagnoses: [], operations: [] };
    if (!modal || !opener || !grid) return;

    var currentSection = 'diagnoses';
    var previousFocus = null;
    var readKey = 'shift03-encyclopedia-v1:' + encodeURIComponent(nick || 'guest');
    var readState = {};
    try {
      var stored = window.localStorage.getItem(readKey);
      if (stored) {
        var parsedState = JSON.parse(stored);
        if (parsedState && typeof parsedState === 'object' && !Array.isArray(parsedState)) readState = parsedState;
      }
    } catch (ignore) { readState = {}; }

    function articleList(section) {
      return Array.isArray(articles[section]) ? articles[section] : [];
    }
    function isRead(id) { return readState[id] === true; }
    function updateProgress() {
      var all = articleList('diagnoses').map(function (item) { return 'diagnosis:' + item.id; })
        .concat(articleList('operations').map(function (item) { return 'operation:' + item.id; }));
      var read = all.filter(isRead).length;
      if (progressLabel) progressLabel.textContent = 'Просмотрено: ' + read + ' из ' + all.length;
      if (progressBar) progressBar.style.width = (all.length ? Math.round(read / all.length * 100) : 0) + '%';
    }
    function markRead(id) {
      if (isRead(id)) return;
      readState[id] = true;
      try { window.localStorage.setItem(readKey, JSON.stringify(readState)); } catch (ignore) {}
      updateProgress();
      var card = grid.querySelector('[data-article-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id.replace(/[^a-zA-Z0-9:_-]/g, '')) + '"]');
      if (card) {
        card.classList.add('is-read');
        var state = card.querySelector('.encyclopedia-entry__state');
        if (state) state.textContent = 'Просмотрено';
      }
    }
    function setSection(section, focusTab) {
      if (section !== 'diagnoses' && section !== 'operations') return;
      currentSection = section;
      Array.prototype.forEach.call(tabs, function (tab) {
        var selected = tab.getAttribute('data-encyclopedia-tab') === section;
        tab.classList.toggle('is-active', selected);
        tab.setAttribute('aria-selected', selected ? 'true' : 'false');
        tab.tabIndex = selected ? 0 : -1;
        if (selected && focusTab) tab.focus();
      });
      var activeTab = document.getElementById('encyclopedia-tab-' + section);
      if (grid && activeTab) grid.setAttribute('aria-labelledby', activeTab.id);
      renderArticles();
    }
    function renderArticles() {
      var list = articleList(currentSection);
      var query = String(search && search.value || '').trim().toLocaleLowerCase('ru');
      var type = currentSection === 'diagnoses' ? 'diagnosis' : 'operation';
      var filtered = list.filter(function (item) {
        if (!query) return true;
        var searchable = [item.title, item.category, item.summary, item.signs, item.focus, (item.steps || []).join(' ')].join(' ').toLocaleLowerCase('ru');
        return searchable.indexOf(query) !== -1;
      });
      grid.innerHTML = filtered.map(function (item, index) {
        var id = type + ':' + item.id;
        var viewed = isRead(id);
        var detailBody;
        if (type === 'diagnosis') {
          detailBody = '<div class="encyclopedia-entry__section"><h4>Типичные проявления</h4><p>' + esc(item.signs) + '</p></div>' +
            '<div class="encyclopedia-entry__section"><h4>Учебный акцент</h4><p>' + esc(item.focus) + '</p></div>';
        } else {
          var steps = Array.isArray(item.steps) ? item.steps : [];
          detailBody = '<div class="encyclopedia-entry__section"><h4>Учебный акцент</h4><p>' + esc(item.focus) + '</p></div>' +
            '<div class="encyclopedia-entry__section"><h4>Этапы командной работы</h4><ol class="encyclopedia-steps">' + steps.map(function (step) { return '<li>' + esc(step) + '</li>'; }).join('') + '</ol><p class="encyclopedia-note">Это обзор командных этапов тренажёра, а не инструкция по проведению операции.</p></div>';
        }
        var iconIndex = type === 'diagnosis' ? item.id : index + 1;
        return '<article class="encyclopedia-entry' + (viewed ? ' is-read' : '') + '" data-article-id="' + esc(id) + '">' +
          '<header class="encyclopedia-entry__head"><span class="encyclopedia-entry__icon">' + encyclopediaIcon(currentSection, iconIndex) + '</span><div class="encyclopedia-entry__title"><p>' + esc(item.category) + ' · ' + (type === 'diagnosis' ? 'ДИАГНОЗ' : 'ОПЕРАЦИЯ') + '</p><h3>' + esc(item.title) + '</h3></div><span class="encyclopedia-entry__state">' + (viewed ? 'Просмотрено' : 'Не просмотрено') + '</span></header>' +
          '<p class="encyclopedia-entry__summary">' + esc(item.summary) + '</p>' +
          '<details class="encyclopedia-entry__details" data-read-id="' + esc(id) + '"><summary>Открыть справку</summary><div class="encyclopedia-entry__body">' + detailBody + '</div></details>' +
          '</article>';
      }).join('');
      Array.prototype.forEach.call(grid.querySelectorAll('[data-read-id]'), function (details) {
        details.addEventListener('toggle', function () {
          if (details.open) markRead(details.getAttribute('data-read-id'));
        });
      });
      if (resultLabel) resultLabel.textContent = query ? 'Найдено: ' + filtered.length + ' из ' + list.length : list.length + (currentSection === 'diagnoses' ? ' статей' : ' операций');
      if (empty) empty.hidden = filtered.length > 0;
      grid.hidden = filtered.length === 0;
      updateProgress();
    }
    function openModal() {
      if (!modal.hidden) return;
      previousFocus = document.activeElement;
      modal.hidden = false;
      document.body.classList.add('encyclopedia-open');
      renderArticles();
      window.setTimeout(function () { if (search) search.focus(); else if (closer) closer.focus(); }, 0);
    }
    function closeModal() {
      if (modal.hidden) return;
      modal.hidden = true;
      document.body.classList.remove('encyclopedia-open');
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    }

    opener.addEventListener('click', openModal);
    if (closer) closer.addEventListener('click', closeModal);
    modal.addEventListener('click', function (event) { if (event.target === modal) closeModal(); });
    if (search) search.addEventListener('input', renderArticles);
    Array.prototype.forEach.call(tabs, function (tab) {
      tab.addEventListener('click', function () { setSection(tab.getAttribute('data-encyclopedia-tab'), false); });
      tab.addEventListener('keydown', function (event) {
        var order = ['diagnoses', 'operations'];
        var index = order.indexOf(currentSection);
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') index = (index + 1) % order.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') index = (index + order.length - 1) % order.length;
        else if (event.key === 'Home') index = 0;
        else if (event.key === 'End') index = order.length - 1;
        else return;
        event.preventDefault();
        setSection(order[index], true);
      });
    });
    modal.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
      if (event.key !== 'Tab') return;
      var focusable = Array.prototype.slice.call(modal.querySelectorAll('button:not(:disabled):not([tabindex="-1"]), input:not(:disabled), summary, a[href], [tabindex="0"]'))
        .filter(function (element) { return !element.hidden && element.getClientRects().length > 0; });
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    Array.prototype.forEach.call(tabs, function (tab) {
      var count = articleList(tab.getAttribute('data-encyclopedia-tab')).length;
      var badge = tab.querySelector('span');
      if (badge) badge.textContent = String(count);
    });
    updateProgress();
  }

  function bindLogin() {
    var form = document.getElementById('cabinet-login-form');
    if (!form) return;
    var input = document.getElementById('cabinet-nick');
    var error = document.getElementById('cabinet-login-error');
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var value = validNickname(input && input.value);
      if (!value) {
        error.textContent = 'Введите ник от 3 до 16 символов: буквы, цифры, пробел, дефис или подчёркивание.';
        error.hidden = false;
        return;
      }
      error.hidden = true;
      var submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.textContent = 'Открываем…';
      fetch('api/player.php?action=start', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ nickname: value }) })
        .then(function (response) { return response.json().catch(function () { return null; }); })
        .then(function (data) {
          // Новый игрок сразу попадает в первую смену истории, вернувшийся — на главную.
          if (data && data.ok) window.location.href = data.created
            ? 'game.php?nick=' + encodeURIComponent(data.nickname || value)
            : 'index.php?nick=' + encodeURIComponent(data.nickname || value);
          else {
            error.textContent = 'Не удалось открыть кабинет. Проверьте подключение к базе.';
            error.hidden = false; submit.disabled = false; submit.textContent = 'Вернуться на линию';
          }
        }).catch(function () { error.textContent = 'Нет связи с сервером.'; error.hidden = false; submit.disabled = false; submit.textContent = 'Вернуться на линию'; });
    });
  }

  bindLogin();
  bindEncyclopedia();
  if (nick) loadDashboard();

})();

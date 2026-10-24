/* Личный кабинет: вход, статистика, две игры и серверные покупки. */
(function () {
  'use strict';

  var DATA = window.CABINET || {};
  var nick = DATA.nick || null;
  var dashboard = DATA.dashboard || null;
  var equipment = Array.isArray(DATA.equipment) ? DATA.equipment : [];
  var hospitalLevels = DATA.hospitalLevels || {};
  var content = document.getElementById('cabinet-content');

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

  function render() {
    if (!content || !dashboard) return;
    var p = dashboard.profile || {};
    var rank = dashboard.rank ? '#' + dashboard.rank : '—';
    var modeGoal = p.operations_success > 0 ? 'Операция дня выполнена' : 'Пройди учебную фиксацию перелома';
    var progress = p.operations_success > 0 ? 'is-complete' : '';

    content.innerHTML =
      '<div class="cabinet-overview">' +
        '<article class="cabinet-stat"><span>Место в топе</span><b>' + rank + '</b><small>по личному рекорду</small></article>' +
        '<article class="cabinet-stat"><span>Личный рекорд</span><b>' + num(dashboard.best) + '</b><small>очков</small></article>' +
        '<article class="cabinet-stat"><span>Спасено пациентов</span><b>' + num(p.total_saved) + '</b><small>за все смены</small></article>' +
        '<article class="cabinet-stat"><span>Серия</span><b>' + num(p.streak) + '</b><small>дней активности</small></article>' +
      '</div>' +
      '<div class="cabinet-layout">' +
        '<section class="cabinet-panel cabinet-games"><div class="cabinet-panel__head"><div><p>Игровые режимы</p><h3>Выбери задание</h3></div><span class="cabinet-budget">' + num(p.budget) + ' ₽ · ' + num(p.xp) + ' XP</span></div>' +
          '<div class="game-mode-grid">' +
            '<a class="game-mode" href="game.php?nick=' + encodeURIComponent(nick) + '"><span class="game-mode__icon">🚑</span><span><b>Ночная смена</b><small>8 пациентов · диагноз и порядок лечения</small></span><i>Играть →</i></a>' +
            '<a class="game-mode game-mode--operation" href="operation.php?nick=' + encodeURIComponent(nick) + '"><span class="game-mode__icon">🩹</span><span><b>Учебная операция</b><small>Иммобилизация перелома · без графических сцен</small></span><i>Оперировать →</i></a>' +
          '</div>' +
          '<div class="daily-mission ' + progress + '"><span>Миссия дня</span><b>' + esc(modeGoal) + '</b><small>' + (p.operations_success > 0 ? 'Выполнено: опыт и бюджет уже начислены.' : 'Успех даст +90 ₽ и +50 XP. Ошибки не сбрасывают прогресс.') + '</small></div>' +
        '</section>' +
        '<section class="cabinet-panel cabinet-awards"><div class="cabinet-panel__head"><div><p>Профиль</p><h3>Достижения</h3></div><span class="cabinet-count">' + num(dashboard.records) + ' результатов</span></div><div class="badge-list">' + badgeList(dashboard) + '</div><div class="profile-details"><span>Средний счёт <b>' + num(dashboard.average) + '</b></span><span>Успешных операций <b>' + num(p.operations_success) + '/' + num(p.operations_finished) + '</b></span><span>Закрыто смен <b>' + num(p.shifts_finished) + '</b></span></div></section>' +
      '</div>' +
      '<section class="progression"><div class="progression__head"><div><p class="cabinet__eyebrow">Долгая прогрессия</p><h3>Развитие больницы и оснащение</h3><p>Требования проверяются на сервере. Награды выдаются только после завершения игры, поэтому быстро купить всё не получится.</p></div><div class="progression__level"><span>Уровень больницы</span><b>' + num(p.hospital_level) + '/' + Object.keys(hospitalLevels).length + '</b></div></div>' +
      '<div class="progression__cols"><div><h4>Больница</h4><div class="upgrade-list" id="hospital-upgrades">' + hospitalHtml(p) + '</div></div><div><h4>Оборудование</h4><div class="upgrade-list" id="equipment-upgrades">' + equipmentHtml(p) + '</div></div></div></section>';

    bindPurchases();
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
    return '<article class="upgrade-row ' + state + '"><span class="upgrade-row__icon">' + esc(item.icon || '🏥') + '</span><div><b>' + esc(item.name) + '</b><p>' + esc(item.desc) + '</p><small>' + requirementText(item) + '</small></div><div class="upgrade-row__action">' + action + '</div></article>';
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
        if (!data || !data.ok) {
          window.alert(data && data.error === 'requirements_not_met' ? 'Пока не выполнены требования улучшения.' : 'Покупку не удалось выполнить. Обновите страницу и проверьте базу данных.');
        }
        render();
      }).catch(function () {
        window.alert('Нет связи с сервером. Покупка не выполнена.');
        render();
      });
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
          if (data && data.ok) window.location.href = 'index.php?nick=' + encodeURIComponent(data.nickname || value) + '#cabinet';
          else {
            error.textContent = 'Не удалось открыть кабинет. Проверьте подключение к базе.';
            error.hidden = false; submit.disabled = false; submit.textContent = 'Войти в кабинет';
          }
        }).catch(function () { error.textContent = 'Нет связи с сервером.'; error.hidden = false; submit.disabled = false; submit.textContent = 'Войти в кабинет'; });
    });
  }

  bindLogin();
  if (nick) loadDashboard();
})();

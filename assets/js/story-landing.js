/* Главная страница как начало истории «Вернуться на линию».
 *
 * Гость при первом визите сразу видит пролог (шторм, вызов №17), затем Вера
 * спрашивает имя — и новый игрок попадает прямо в первую смену.
 * Вернувшийся игрок открывает «Шкафчик №12» (журнал, улики, телефон) с главного экрана.
 */
(function () {
  'use strict';

  var DATA = window.CABINET || {};
  if (!window.StoryLine || !DATA.story) return;
  var STORY = window.StoryLine.init(DATA.story, { nick: DATA.nick || null, endpoint: 'api/story.php' });
  var nick = DATA.nick || null;
  var SFX = window.SFX || null;

  // Главный экран звучит темой «Вернуться на линию» (стартует с первого клика — так требуют браузеры).
  if (SFX) SFX.music('menu');

  function validNickname(value) {
    var cleaned = String(value || '').trim().replace(/\s+/g, ' ');
    if (cleaned.length < 3 || cleaned.length > 16) return null;
    return /^[\p{L}\p{N} _-]+$/u.test(cleaned) ? cleaned : null;
  }

  /** «Смена 03, кто на линии?» — вход по нику внутри сцены. */
  function signInCard() {
    var avatar = window.StoryDialogue ? window.StoryDialogue.avatarMarkup('vera') : '';
    var node = document.createElement('div');
    node.className = 'sl-overlay sl-card-wrap sl-signin-wrap';
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-modal', 'true');
    node.setAttribute('aria-label', 'Вход в смену');
    node.innerHTML =
      '<section class="sl-card sl-signin">' +
        '<p class="sl-card__season">Подстанция 03 · сегодня</p>' +
        '<div class="sl-signin__row"><div class="sl-signin__face">' + avatar + '</div>' +
        '<div><p class="sl-signin__name">Вера · диспетчер</p><p class="sl-signin__text" id="sl-signin-text"></p></div></div>' +
        '<form class="sl-signin__form" novalidate autocomplete="off">' +
          '<label for="sl-signin-nick">Как тебя записать в график?</label>' +
          '<input id="sl-signin-nick" type="text" minlength="3" maxlength="16" placeholder="Твой ник, например Фельдшер03" autocomplete="nickname">' +
          '<small>3–16 символов: буквы, цифры, пробел, дефис, подчёркивание.</small>' +
          '<p class="sl-signin__error" hidden></p>' +
          '<div class="sl-signin__actions"><button class="sl-btn sl-btn--main" type="submit">Вернуться на линию</button>' +
          '<button class="sl-btn sl-btn--ghost" type="button" data-later>Позже</button></div>' +
        '</form>' +
      '</section>';
    document.body.appendChild(node);
    document.body.classList.add('story-dialogue-open');

    var textEl = node.querySelector('#sl-signin-text');
    var line = 'Смена 03, проверка связи… Кто на линии? Назови себя — я внесу тебя в график.';
    if (window.StoryDialogue && window.StoryDialogue.typeInto) window.StoryDialogue.typeInto(textEl, line, 22, 'vera');
    else textEl.textContent = line;

    var form = node.querySelector('form');
    var input = node.querySelector('input');
    var error = node.querySelector('.sl-signin__error');
    var submit = form.querySelector('button[type="submit"]');

    function close() {
      document.removeEventListener('keydown', onKey, true);
      document.body.classList.remove('story-dialogue-open');
      if (node.parentNode) node.parentNode.removeChild(node);
      var fallback = document.getElementById('cabinet-nick');
      if (fallback) { document.getElementById('cabinet').scrollIntoView({ behavior: 'smooth' }); }
    }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }
    document.addEventListener('keydown', onKey, true);
    node.querySelector('[data-later]').addEventListener('click', close);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var value = validNickname(input.value);
      if (!value) {
        error.textContent = 'Вера не расслышала. Нужен ник от 3 до 16 символов: буквы, цифры, пробел, дефис или подчёркивание.';
        error.hidden = false;
        input.focus();
        return;
      }
      error.hidden = true;
      submit.disabled = true;
      submit.textContent = 'Вносим в график…';
      fetch('api/player.php?action=start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ nickname: value })
      }).then(function (r) { return r.json().catch(function () { return null; }); })
        .then(function (data) {
          if (data && data.ok) {
            var name = data.nickname || value;
            // Новый игрок — сразу в первую смену, вернувшийся — на свою подстанцию.
            window.location.href = data.created ? 'game.php?nick=' + encodeURIComponent(name) : 'index.php?nick=' + encodeURIComponent(name);
            return;
          }
          error.textContent = 'Связь с подстанцией пропала: база недоступна. Попробуй ещё раз.';
          error.hidden = false;
          submit.disabled = false;
          submit.textContent = 'Вернуться на линию';
        })
        .catch(function () {
          error.textContent = 'Нет связи с сервером.';
          error.hidden = false;
          submit.disabled = false;
          submit.textContent = 'Вернуться на линию';
        });
    });
    window.setTimeout(function () { input.focus(); }, 50);
  }

  function startStory() {
    STORY.playPrologue().then(signInCard);
  }

  /**
   * Заставка перед первым прологом. Браузер не даёт включить звук без действия
   * пользователя, а пролог без шторма теряет половину атмосферы — поэтому
   * первый экран просит нажать «Начать» (и заодно предлагает играть без звука).
   */
  function splash() {
    var node = document.createElement('div');
    node.className = 'sl-overlay sl-card-wrap sl-splash-wrap';
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-modal', 'true');
    node.setAttribute('aria-label', 'Смена 03');
    node.innerHTML =
      '<section class="sl-card sl-splash">' +
        '<p class="sl-card__season">Сезон 1 · ' + ((DATA.story.season && DATA.story.season.title) || 'Вернуться на линию') + '</p>' +
        '<h2 class="sl-card__title">Смена 03</h2>' +
        '<p class="sl-splash__sub">Два года назад, в шторм, ты не закрыл вызов №17. Сегодня подстанция снова выходит на связь.</p>' +
        '<p class="sl-splash__phones"><svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" d="M4 2h8v1h1v1h1v5h-2V5h-1V4H5v1H4v4H2V4h1V3h1zM1 9h4v6H1zM11 9h4v6h-4z"/></svg>Лучше в наушниках</p>' +
        '<div class="sl-splash__actions"><button type="button" class="sl-btn sl-btn--main" data-sound-on>▶ Начать со звуком</button>' +
        '<button type="button" class="sl-btn sl-btn--ghost" data-sound-off>Без звука</button></div>' +
      '</section>';
    document.body.appendChild(node);
    document.body.classList.add('story-dialogue-open');
    function go(withSound) {
      document.removeEventListener('keydown', onKey, true);
      if (SFX) {
        SFX.setMuted(!withSound);
        if (withSound) SFX.unlock();
      }
      document.body.classList.remove('story-dialogue-open');
      if (node.parentNode) node.parentNode.removeChild(node);
      startStory();
    }
    function onKey(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(true); }
      else if (e.key === 'Escape') { e.preventDefault(); go(false); }
    }
    document.addEventListener('keydown', onKey, true);
    node.querySelector('[data-sound-on]').addEventListener('click', function () { go(true); });
    node.querySelector('[data-sound-off]').addEventListener('click', function () { go(false); });
    node.querySelector('[data-sound-on]').focus();
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-story-start]'), function (btn) {
    btn.addEventListener('click', function (event) { event.preventDefault(); startStory(); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-story-journal]'), function (btn) {
    btn.addEventListener('click', function (event) {
      event.preventDefault();
      STORY.journal({ section: btn.getAttribute('data-story-journal') || 'journal', onReset: function () { window.location.reload(); } });
    });
  });

  // История начинается с первого экрана: новый гость сразу попадает в пролог.
  if (!nick && !STORY.prologueSeen()) {
    window.setTimeout(function () {
      // Звук уже разрешён (или браузер его не поддерживает) — сразу пролог, иначе — заставка.
      if (SFX && SFX.needsGesture() && !SFX.isMuted()) splash();
      else startStory();
    }, 450);
  }
  if (nick && window.location.hash === '#story') {
    window.setTimeout(function () { STORY.journal({ onReset: function () { window.location.reload(); } }); }, 300);
  }
})();

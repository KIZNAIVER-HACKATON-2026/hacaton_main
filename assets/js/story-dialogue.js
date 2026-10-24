/* Reusable pixel portrait dialogue with a typewriter effect for story beats. */
(function () {
  'use strict';

  var characters = {
    vera: {
      name: 'Вера · диспетчер',
      svg: '<svg viewBox="0 0 64 64" role="img" aria-label="Пиксельный портрет Веры" shape-rendering="crispEdges"><rect width="64" height="64" fill="#10201f"/><rect x="8" y="42" width="48" height="22" fill="#173e38"/><rect x="16" y="36" width="32" height="19" fill="#7fd6b0"/><rect x="23" y="30" width="18" height="12" fill="#d99775"/><rect x="18" y="14" width="28" height="21" fill="#38251e"/><rect x="21" y="17" width="22" height="18" fill="#e7b291"/><rect x="18" y="12" width="28" height="9" fill="#38251e"/><rect x="15" y="19" width="7" height="15" fill="#38251e"/><rect x="42" y="18" width="6" height="17" fill="#38251e"/><rect x="25" y="25" width="3" height="3" fill="#17201e"/><rect x="37" y="25" width="3" height="3" fill="#17201e"/><rect x="28" y="32" width="9" height="2" fill="#a4554a"/><rect x="11" y="19" width="3" height="17" fill="#f0a95c"/><rect x="8" y="31" width="7" height="7" fill="#f0a95c"/><rect x="29" y="44" width="7" height="5" fill="#e8f0ea"/></svg>'
    },
    ilya: {
      name: 'Илья · наставник',
      svg: '<svg viewBox="0 0 64 64" role="img" aria-label="Пиксельный портрет Ильи" shape-rendering="crispEdges"><rect width="64" height="64" fill="#10201f"/><rect x="7" y="43" width="50" height="21" fill="#173e38"/><rect x="16" y="37" width="32" height="20" fill="#4c8272"/><rect x="24" y="31" width="16" height="12" fill="#c88969"/><rect x="17" y="13" width="30" height="23" fill="#4d3428"/><rect x="21" y="17" width="22" height="19" fill="#d9a07e"/><rect x="18" y="12" width="29" height="8" fill="#4d3428"/><rect x="18" y="18" width="6" height="11" fill="#4d3428"/><rect x="41" y="18" width="6" height="12" fill="#4d3428"/><rect x="24" y="25" width="3" height="3" fill="#17201e"/><rect x="37" y="25" width="3" height="3" fill="#17201e"/><rect x="29" y="32" width="7" height="2" fill="#75463a"/><rect x="28" y="46" width="9" height="4" fill="#f0a95c"/><rect x="12" y="45" width="7" height="12" fill="#315e55"/><rect x="45" y="45" width="7" height="12" fill="#315e55"/></svg>'
    },
    relative: {
      name: 'Родственник пациента',
      svg: '<svg viewBox="0 0 64 64" role="img" aria-label="Пиксельный портрет родственника пациента" shape-rendering="crispEdges"><rect width="64" height="64" fill="#10201f"/><rect x="7" y="43" width="50" height="21" fill="#172c39"/><rect x="16" y="37" width="32" height="20" fill="#5d7890"/><rect x="24" y="31" width="16" height="12" fill="#d29a78"/><rect x="17" y="14" width="30" height="23" fill="#344451"/><rect x="21" y="18" width="22" height="19" fill="#e0ad8a"/><rect x="18" y="13" width="29" height="9" fill="#344451"/><rect x="18" y="19" width="6" height="12" fill="#344451"/><rect x="41" y="19" width="6" height="12" fill="#344451"/><rect x="24" y="25" width="3" height="3" fill="#17201e"/><rect x="37" y="25" width="3" height="3" fill="#17201e"/><rect x="29" y="32" width="7" height="2" fill="#965d51"/><rect x="12" y="45" width="7" height="12" fill="#40596a"/><rect x="45" y="45" width="7" height="12" fill="#40596a"/><rect x="28" y="45" width="9" height="4" fill="#d9e4e8"/>'
    }
  };

  var overlay = null;
  var pending = null;
  var uid = 0;

  function makeOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'story-overlay';
    overlay.hidden = true;
    overlay.innerHTML = '<section class="story-dialogue" role="dialog" aria-modal="true" aria-labelledby="story-title">' +
      '<div class="story-dialogue__top"><span class="story-dialogue__signal" aria-hidden="true"></span><h2 id="story-title">Сюжет · брифинг</h2><span class="story-dialogue__progress"></span></div>' +
      '<div class="story-dialogue__body"><div class="story-dialogue__portrait"></div><div class="story-dialogue__copy"><p class="story-dialogue__speaker"></p><p class="story-dialogue__text"></p></div></div>' +
      '<div class="story-dialogue__actions"><button class="story-dialogue__next" type="button">Далее</button><button class="story-dialogue__skip" type="button">Пропустить диалог</button></div>' +
      '<p class="story-dialogue__hint">Нажмите «Далее», чтобы показать текст сразу</p></section>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function getStoryOwner(options) {
    if (options && options.nickname) return options.nickname;
    if (window.SHIFT && window.SHIFT.nick) return window.SHIFT.nick;
    if (window.OPERATION && window.OPERATION.nick) return window.OPERATION.nick;
    return 'guest';
  }

  function storageKey(key, options) {
    return 'shift03-story:' + encodeURIComponent(getStoryOwner(options)) + ':' + String(key);
  }

  function hasSeen(key, options) {
    try { return window.localStorage.getItem(storageKey(key, options)) === '1'; }
    catch (e) { return false; }
  }

  function markSeen(key, options) {
    try { window.localStorage.setItem(storageKey(key, options), '1'); }
    catch (e) {}
  }

  function avatarMarkup(speakerId) {
    return (characters[speakerId] || characters.vera).svg;
  }

  function characterName(speakerId) {
    return (characters[speakerId] || characters.vera).name;
  }

  function typeInto(element, value, speed) {
    if (!element) return function () {};
    var fullText = String(value == null ? '' : value);
    var chars = Array.from(fullText);
    var index = 0;
    var timer = null;
    element.textContent = '';
    element.setAttribute('aria-label', fullText);
    element.classList.add('is-typing');
    function finish() {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      element.textContent = fullText;
      element.classList.remove('is-typing');
    }
    if (!chars.length || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      finish();
      return finish;
    }
    timer = window.setInterval(function () {
      if (index >= chars.length) { finish(); return; }
      element.textContent += chars[index++];
    }, Math.max(10, Number(speed) || 18));
    return finish;
  }

  function showOnce(key, lines, options) {
    if (hasSeen(key, options)) return Promise.resolve(false);
    return show(lines, options).then(function (shown) {
      if (shown) markSeen(key, options);
      return shown;
    });
  }

  function show(lines, options) {
    options = options || {};
    lines = Array.isArray(lines) ? lines.filter(function (line) { return line && line.text; }) : [];
    if (!lines.length) return Promise.resolve(false);
    if (pending) return pending.promise;

    var node = makeOverlay();
    var title = node.querySelector('#story-title');
    var progress = node.querySelector('.story-dialogue__progress');
    var portrait = node.querySelector('.story-dialogue__portrait');
    var speaker = node.querySelector('.story-dialogue__speaker');
    var text = node.querySelector('.story-dialogue__text');
    var next = node.querySelector('.story-dialogue__next');
    var skip = node.querySelector('.story-dialogue__skip');
    var index = 0;
    var timer = null;
    var characterIndex = 0;
    var charactersInLine = [];
    var typing = false;
    var previousFocus = document.activeElement;
    var promiseResolve;
    var currentUid = ++uid;
    var promise = new Promise(function (resolve) { promiseResolve = resolve; });
    pending = { promise: promise, uid: currentUid };

    title.textContent = options.title || 'Сюжет · брифинг';
    node.hidden = false;
    document.body.classList.add('story-dialogue-open');

    function stopTyping() {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      typing = false;
      text.textContent = charactersInLine.join('');
      text.classList.remove('is-typing');
      next.textContent = index === lines.length - 1 ? 'Закрыть' : 'Далее';
    }

    function renderLine() {
      var line = lines[index];
      var character = characters[line.speaker] || characters.vera;
      portrait.innerHTML = character.svg;
      speaker.textContent = character.name;
      progress.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(lines.length).padStart(2, '0');
      charactersInLine = Array.from(String(line.text));
      characterIndex = 0;
      text.textContent = '';
      text.setAttribute('aria-label', String(line.text));
      text.classList.add('is-typing');
      typing = true;
      next.textContent = 'Показать текст';
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        stopTyping();
        return;
      }
      timer = window.setInterval(function () {
        if (characterIndex >= charactersInLine.length) { stopTyping(); return; }
        text.textContent += charactersInLine[characterIndex++];
      }, Math.max(12, Number(options.speed) || 24));
    }

    function close(shown) {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      document.removeEventListener('keydown', onKeydown);
      next.removeEventListener('click', onNext);
      skip.removeEventListener('click', onSkip);
      node.hidden = true;
      document.body.classList.remove('story-dialogue-open');
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
      if (pending && pending.uid === currentUid) pending = null;
      promiseResolve(shown);
    }

    function onNext() {
      if (typing) { stopTyping(); return; }
      if (index + 1 < lines.length) { index += 1; renderLine(); return; }
      close(true);
    }

    function onSkip() { close(true); }

    function onKeydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
      else if (event.key === 'Enter' || event.key === ' ') {
        if (event.target && /^(BUTTON|A)$/.test(event.target.tagName)) return;
        event.preventDefault(); onNext();
      }
    }

    next.addEventListener('click', onNext);
    skip.addEventListener('click', onSkip);
    document.addEventListener('keydown', onKeydown, true);
    renderLine();
    next.focus();
    return promise;
  }

  window.StoryDialogue = {
    show: show,
    showOnce: showOnce,
    hasSeen: hasSeen,
    avatarMarkup: avatarMarkup,
    characterName: characterName,
    typeInto: typeInto,
    isOpen: function () { return !!pending; }
  };
})();

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
    },
    sonya: {
      name: 'Соня · стажёр',
      svg: '<svg viewBox="0 0 64 64" role="img" aria-label="Пиксельный портрет Сони" shape-rendering="crispEdges"><rect width="64" height="64" fill="#10201f"/><rect x="8" y="43" width="48" height="21" fill="#173e38"/><rect x="16" y="37" width="32" height="20" fill="#9fd8c4"/><rect x="24" y="31" width="16" height="11" fill="#e3a885"/><rect x="19" y="12" width="26" height="22" fill="#c98f3e"/><rect x="22" y="17" width="20" height="18" fill="#f0c3a0"/><rect x="19" y="10" width="26" height="8" fill="#c98f3e"/><rect x="44" y="15" width="7" height="6" fill="#c98f3e"/><rect x="47" y="20" width="5" height="13" fill="#c98f3e"/><rect x="45" y="14" width="4" height="3" fill="#e2685a"/><rect x="25" y="24" width="3" height="3" fill="#17201e"/><rect x="36" y="24" width="3" height="3" fill="#17201e"/><rect x="23" y="28" width="3" height="2" fill="#e8907a"/><rect x="38" y="28" width="3" height="2" fill="#e8907a"/><rect x="29" y="31" width="7" height="2" fill="#a4554a"/><rect x="28" y="30" width="1" height="1" fill="#a4554a"/><rect x="36" y="30" width="1" height="1" fill="#a4554a"/><rect x="30" y="45" width="11" height="5" fill="#f0a95c"/><rect x="31" y="46" width="9" height="1" fill="#071014"/><rect x="18" y="40" width="3" height="14" fill="#e8f0ea"/><rect x="17" y="52" width="5" height="3" fill="#e8f0ea"/></svg>'
    },
    gromov: {
      name: 'Громов · старый напарник',
      svg: '<svg viewBox="0 0 64 64" role="img" aria-label="Пиксельный портрет Громова" shape-rendering="crispEdges"><rect width="64" height="64" fill="#10201f"/><rect x="8" y="43" width="48" height="21" fill="#173e38"/><rect x="14" y="37" width="36" height="20" fill="#2f4d6b"/><rect x="14" y="47" width="36" height="3" fill="#d9e6ee"/><rect x="24" y="31" width="16" height="10" fill="#c08566"/><rect x="17" y="12" width="30" height="14" fill="#8d9592"/><rect x="20" y="16" width="24" height="20" fill="#d29a7a"/><rect x="18" y="10" width="28" height="7" fill="#8d9592"/><rect x="20" y="30" width="24" height="8" fill="#a7adaa"/><rect x="23" y="36" width="18" height="3" fill="#a7adaa"/><rect x="28" y="32" width="8" height="2" fill="#6b4a3e"/><rect x="23" y="21" width="6" height="2" fill="#5b625f"/><rect x="35" y="21" width="6" height="2" fill="#5b625f"/><rect x="24" y="24" width="3" height="3" fill="#17201e"/><rect x="37" y="24" width="3" height="3" fill="#17201e"/><rect x="30" y="26" width="4" height="4" fill="#bf8869"/><rect x="16" y="38" width="6" height="8" fill="#24405a"/><rect x="42" y="38" width="6" height="8" fill="#24405a"/></svg>'
    },
    petr: {
      name: 'Пётр Андреевич',
      svg: '<svg viewBox="0 0 64 64" role="img" aria-label="Пиксельный портрет Петра Андреевича" shape-rendering="crispEdges"><rect width="64" height="64" fill="#10201f"/><rect x="8" y="44" width="48" height="20" fill="#173e38"/><rect x="14" y="38" width="36" height="20" fill="#7a5a3f"/><rect x="27" y="38" width="10" height="8" fill="#e8f0ea"/><rect x="30" y="40" width="4" height="8" fill="#3a5f8a"/><rect x="25" y="32" width="14" height="8" fill="#d7a284"/><rect x="20" y="13" width="24" height="22" fill="#e2b090"/><rect x="18" y="19" width="4" height="10" fill="#cfd6d3"/><rect x="42" y="19" width="4" height="10" fill="#cfd6d3"/><rect x="22" y="13" width="20" height="3" fill="#ecc3a3"/><rect x="22" y="22" width="9" height="6" fill="#2b3a3a"/><rect x="23" y="23" width="7" height="4" fill="#cfe8f0"/><rect x="33" y="22" width="9" height="6" fill="#2b3a3a"/><rect x="34" y="23" width="7" height="4" fill="#cfe8f0"/><rect x="31" y="24" width="2" height="1" fill="#2b3a3a"/><rect x="26" y="24" width="2" height="2" fill="#17201e"/><rect x="37" y="24" width="2" height="2" fill="#17201e"/><rect x="28" y="31" width="8" height="2" fill="#a4554a"/><rect x="26" y="30" width="2" height="1" fill="#a4554a"/><rect x="36" y="30" width="2" height="1" fill="#a4554a"/><rect x="18" y="48" width="6" height="8" fill="#5e4430"/><rect x="40" y="48" width="6" height="8" fill="#5e4430"/></svg>'
    },
    hero: {
      name: 'Ты · фельдшер',
      svg: '<svg viewBox="0 0 64 64" role="img" aria-label="Пиксельный портрет фельдшера" shape-rendering="crispEdges"><rect width="64" height="64" fill="#10201f"/><rect x="8" y="43" width="48" height="21" fill="#173e38"/><rect x="14" y="37" width="36" height="20" fill="#2c6c8f"/><rect x="14" y="48" width="36" height="3" fill="#f0a95c"/><rect x="18" y="40" width="6" height="6" fill="#e8f0ea"/><rect x="20" y="41" width="2" height="4" fill="#e2685a"/><rect x="19" y="42" width="4" height="2" fill="#e2685a"/><rect x="24" y="31" width="16" height="10" fill="#c88a6b"/><rect x="18" y="11" width="28" height="9" fill="#1f1a18"/><rect x="18" y="16" width="4" height="9" fill="#1f1a18"/><rect x="42" y="16" width="4" height="9" fill="#1f1a18"/><rect x="21" y="16" width="22" height="19" fill="#dca283"/><rect x="21" y="15" width="14" height="3" fill="#1f1a18"/><rect x="24" y="24" width="3" height="3" fill="#17201e"/><rect x="37" y="24" width="3" height="3" fill="#17201e"/><rect x="24" y="28" width="4" height="1" fill="#b07b62"/><rect x="36" y="28" width="4" height="1" fill="#b07b62"/><rect x="29" y="32" width="7" height="2" fill="#7a4a3c"/><rect x="36" y="40" width="9" height="4" fill="#e8f0ea"/><rect x="37" y="41" width="7" height="1" fill="#2c6c8f"/></svg>'
    },
    unknown: {
      name: 'Неизвестный номер',
      svg: '<svg viewBox="0 0 64 64" role="img" aria-label="Неизвестный номер" shape-rendering="crispEdges"><rect width="64" height="64" fill="#10201f"/><rect x="20" y="7" width="24" height="50" fill="#050b0d"/><rect x="23" y="12" width="18" height="34" fill="#1f3b36"/><rect x="29" y="9" width="6" height="1" fill="#234d42"/><rect x="28" y="18" width="8" height="3" fill="#f0a95c"/><rect x="35" y="20" width="3" height="6" fill="#f0a95c"/><rect x="31" y="25" width="5" height="3" fill="#f0a95c"/><rect x="30" y="27" width="3" height="5" fill="#f0a95c"/><rect x="30" y="35" width="3" height="3" fill="#f0a95c"/><rect x="29" y="50" width="6" height="3" fill="#234d42"/><rect x="12" y="20" width="3" height="3" fill="#7fd6b0"/><rect x="9" y="26" width="3" height="3" fill="#7fd6b0"/><rect x="49" y="20" width="3" height="3" fill="#7fd6b0"/><rect x="52" y="26" width="3" height="3" fill="#7fd6b0"/></svg>'
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

  /** Печать текста по буквам. voice — id «голоса» для звука (персонаж, 'narrator', 'sms'). */
  function typeInto(element, value, speed, voice) {
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
      if (voice && window.SFX) window.SFX.voice(voice, chars[index]);
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
    if (window.SFX) window.SFX.play('open');
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
      speaker.textContent = line.name || character.name;
      node.setAttribute('data-speaker', line.speaker || 'vera');
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
        if (window.SFX) window.SFX.voice(line.speaker || 'vera', charactersInLine[characterIndex]);
        text.textContent += charactersInLine[characterIndex++];
      }, Math.max(12, Number(options.speed) || 24));
    }

    function close(shown) {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      document.removeEventListener('keydown', onKeydown, true);
      next.removeEventListener('click', onNext);
      skip.removeEventListener('click', onSkip);
      node.hidden = true;
      if (window.SFX) window.SFX.play('close');
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
    hasCharacter: function (id) { return !!characters[id]; },
    typeInto: typeInto,
    isOpen: function () { return !!pending; }
  };
})();

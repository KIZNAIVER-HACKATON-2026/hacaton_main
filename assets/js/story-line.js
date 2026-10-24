/* Сюжет «Вернуться на линию»: общий модуль для смены, кабинета и операции.
 *
 * Отвечает за:
 *  — выбор текущего эпизода по прогрессу игрока (сервер или localStorage, если БД нет);
 *  — фильтрацию реплик по флагам выбора ('if' / 'unless') и подстановку {nick};
 *  — отправку завершённого эпизода в api/story.php;
 *  — визуальные элементы: пролог-синематик, карточка эпизода, SMS на телефоне,
 *    карточка концовки.
 * Диалоги показывает StoryDialogue (story-dialogue.js).
 */
(function () {
  'use strict';

  var data = null;
  var nick = null;
  var endpoint = 'api/story.php';
  var LOCAL_PREFIX = 'shift03-storyline-v1:';

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ---------------- состояние ---------------- */

  function defaultState() {
    return { episode: 0, team: 0, self: 0, flags: [], choices: {}, ending: null };
  }
  function normalize(st) {
    st = st && typeof st === 'object' ? st : {};
    return {
      episode: Math.max(0, Number(st.episode) || 0),
      team: Number(st.team) || 0,
      self: Number(st.self) || 0,
      flags: Array.isArray(st.flags) ? st.flags.slice() : [],
      choices: st.choices && typeof st.choices === 'object' && !Array.isArray(st.choices) ? st.choices : {},
      ending: st.ending || null
    };
  }
  function localKey() { return LOCAL_PREFIX + encodeURIComponent(nick || 'guest'); }
  function readLocal() {
    try { var raw = window.localStorage.getItem(localKey()); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function writeLocal(st) {
    try { window.localStorage.setItem(localKey(), JSON.stringify(st)); } catch (e) {}
  }

  function init(payload, options) {
    options = options || {};
    data = payload || null;
    nick = options.nick || nick;
    if (options.endpoint) endpoint = options.endpoint;
    if (data && data.state) writeLocal(normalize(data.state)); // зеркало на случай, если БД отвалится
    return api;
  }

  function state() {
    if (!data) return defaultState();
    if (data.state) return normalize(data.state);
    return normalize(readLocal() || defaultState());
  }
  function episodes() { return data && Array.isArray(data.episodes) ? data.episodes : []; }
  function total() { return episodes().length; }
  function episodeByNumber(n) {
    n = Number(n);
    return episodes().filter(function (ep) { return Number(ep.number) === n; })[0] || null;
  }
  function isDemo() { return !!(data && data.demoEpisode); }
  function currentEpisode() {
    if (!data) return null;
    if (data.demoEpisode) return episodeByNumber(data.demoEpisode);
    var st = state();
    return st.episode < total() ? episodeByNumber(st.episode + 1) : null;
  }
  function flags(extra) {
    var list = state().flags.concat((data && data.envFlags) || []);
    if (Array.isArray(extra)) list = list.concat(extra);
    return list;
  }

  /* ---------------- тексты ---------------- */

  function text(value) {
    return String(value == null ? '' : value).replace(/\{nick\}/g, nick || 'фельдшер');
  }
  function heroName() { return nick ? nick + ' · фельдшер' : 'Ты · фельдшер'; }

  function prepareLines(lines, flagList) {
    flagList = flagList || flags();
    return (Array.isArray(lines) ? lines : []).filter(function (line) {
      if (!line || !line.text) return false;
      if (line['if'] && flagList.indexOf(line['if']) === -1) return false;
      if (line.unless && flagList.indexOf(line.unless) !== -1) return false;
      return true;
    }).map(function (line) {
      var out = { speaker: line.speaker || 'vera', text: text(line.text) };
      if (out.speaker === 'hero') out.name = heroName();
      return out;
    });
  }

  function play(lines, options) {
    options = options || {};
    var prepared = prepareLines(lines, options.flags);
    if (!prepared.length || !window.StoryDialogue) return Promise.resolve(false);
    return window.StoryDialogue.show(prepared, { title: options.title || 'Сюжет', nickname: nick });
  }

  function endings() { return data && Array.isArray(data.endings) ? data.endings : []; }
  function pickEnding(team, self) {
    var list = endings();
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.min_team != null && team < e.min_team) continue;
      if (e.min_self != null && self < e.min_self) continue;
      return e;
    }
    return list[list.length - 1] || null;
  }
  function endingById(id) {
    return endings().filter(function (e) { return e.id === id; })[0] || null;
  }

  var SENDERS = { gromov: 'Громов', sonya: 'Соня', vera: 'Вера', ilya: 'Илья', petr: 'Пётр Андреевич' };
  /** Имя отправителя SMS: «неизвестный номер» раскрывается после 5-го эпизода. */
  function senderName(from, st) {
    st = st || state();
    if (from === 'unknown') return st.episode >= 5 ? 'Громов' : 'Неизвестный номер';
    return SENDERS[from] || 'Подстанция 03';
  }

  /* ---------------- прогресс ---------------- */

  function applyLocal(st, ep, choice) {
    st = normalize(JSON.parse(JSON.stringify(st)));
    if (!ep || st.episode !== Number(ep.number) - 1) return st;
    var opts = (ep.call && ep.call.options) || [];
    if (choice != null && opts[choice]) {
      var eff = opts[choice].story || {};
      st.team = Math.max(-10, Math.min(20, st.team + (Number(eff.team) || 0)));
      st.self = Math.max(-10, Math.min(20, st.self + (Number(eff.self) || 0)));
      (eff.flags || []).forEach(function (f) { if (st.flags.indexOf(f) === -1) st.flags.push(f); });
      st.choices[ep.id] = choice;
    }
    st.episode = Number(ep.number);
    if (st.episode >= total()) {
      var ending = pickEnding(st.team, st.self);
      st.ending = ending ? ending.id : null;
    }
    return st;
  }

  /**
   * Завершить эпизод. Возвращает Promise<{state, ending, applied, mode}>,
   * mode: 'server' | 'local' | 'demo'.
   */
  function complete(epNumber, choice) {
    var ep = episodeByNumber(epNumber);
    var before = state();
    function result(st, mode, applied) {
      var ending = st.ending ? endingById(st.ending) : null;
      return { state: st, ending: ending, applied: applied, mode: mode };
    }

    if (isDemo()) {
      // Демо: показываем последствия выбора, но ничего не записываем.
      var demoBase = normalize(before);
      if (demoBase.episode < Number(epNumber) - 1) {
        // Игрок ещё не дошёл до этого эпизода: берём «среднее» прохождение,
        // чтобы в демо финала выбор в звонке решал, какая будет концовка.
        demoBase.team = Math.max(demoBase.team, 3);
        demoBase.self = Math.max(demoBase.self, 1);
      }
      demoBase.episode = Number(epNumber) - 1;
      return Promise.resolve(result(applyLocal(demoBase, ep, choice), 'demo', false));
    }

    function local() {
      var st = applyLocal(before, ep, choice);
      writeLocal(st);
      if (data) data.state = data.dbOk ? st : null;
      return result(st, 'local', st.episode !== before.episode);
    }

    if (!data || !data.dbOk || !nick || !window.fetch) return Promise.resolve(local());

    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ action: 'complete', nickname: nick, episode: Number(epNumber), choice: choice == null ? null : choice })
    }).then(function (r) { return r.json().catch(function () { return null; }); })
      .then(function (res) {
        if (!res || !res.ok || !res.state) return local();
        data.state = normalize(res.state);
        writeLocal(data.state);
        return result(data.state, 'server', !!res.applied);
      })
      .catch(local);
  }

  function reset() {
    var fresh = defaultState();
    writeLocal(fresh);
    if (!data || !data.dbOk || !nick || !window.fetch) {
      if (data) data.state = data.dbOk ? fresh : null;
      return Promise.resolve(fresh);
    }
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ action: 'reset', nickname: nick })
    }).then(function (r) { return r.json().catch(function () { return null; }); })
      .then(function (res) {
        data.state = normalize(res && res.ok && res.state ? res.state : fresh);
        return data.state;
      })
      .catch(function () { data.state = fresh; return fresh; });
  }

  /* ---------------- пиксельные иконки ---------------- */

  function clueIcon(type) {
    var art = {
      phone: '<rect x="10" y="4" width="12" height="24" fill="#050b0d"/><rect x="12" y="7" width="8" height="15" fill="#1f3b36"/><rect x="14" y="10" width="4" height="2" fill="#f0a95c"/><rect x="17" y="12" width="2" height="3" fill="#f0a95c"/><rect x="15" y="15" width="2" height="2" fill="#f0a95c"/><rect x="15" y="19" width="2" height="2" fill="#f0a95c"/><rect x="14" y="24" width="4" height="2" fill="#234d42"/>',
      journal: '<rect x="7" y="5" width="18" height="23" fill="#050b0d"/><rect x="9" y="7" width="14" height="19" fill="#c9b48a"/><rect x="9" y="7" width="3" height="19" fill="#8a5a3a"/><rect x="14" y="10" width="7" height="2" fill="#5a4a3a"/><rect x="14" y="14" width="7" height="2" fill="#5a4a3a"/><path d="M15 18h6v2l-2 1 2 1v2h-6z" fill="#e2685a"/>',
      radio: '<rect x="8" y="9" width="16" height="19" fill="#050b0d"/><rect x="11" y="4" width="2" height="6" fill="#050b0d"/><rect x="10" y="11" width="12" height="15" fill="#7fd6b0"/><rect x="12" y="13" width="8" height="5" fill="#0b2021"/><rect x="13" y="15" width="6" height="1" fill="#f0a95c"/><rect x="12" y="21" width="2" height="2" fill="#e8f0ea"/><rect x="16" y="20" width="4" height="4" fill="#f0a95c"/>',
      note: '<rect x="7" y="6" width="18" height="21" fill="#050b0d"/><rect x="9" y="8" width="14" height="17" fill="#e8f0ea"/><rect x="11" y="11" width="10" height="1" fill="#5f736d"/><rect x="11" y="14" width="10" height="1" fill="#5f736d"/><rect x="11" y="17" width="7" height="1" fill="#5f736d"/><rect x="17" y="20" width="4" height="3" fill="#e2685a"/><rect x="18" y="19" width="2" height="1" fill="#e2685a"/>',
      person: '<rect x="11" y="5" width="10" height="10" fill="#050b0d"/><rect x="12" y="6" width="8" height="8" fill="#d29a7a"/><rect x="12" y="5" width="8" height="2" fill="#8d9592"/><rect x="12" y="11" width="8" height="3" fill="#a7adaa"/><rect x="7" y="17" width="18" height="11" fill="#050b0d"/><rect x="8" y="18" width="16" height="10" fill="#2f4d6b"/><rect x="8" y="23" width="16" height="2" fill="#d9e6ee"/>',
      heart: '<rect x="6" y="8" width="8" height="4" fill="#050b0d"/><rect x="18" y="8" width="8" height="4" fill="#050b0d"/><rect x="5" y="11" width="22" height="7" fill="#050b0d"/><rect x="8" y="18" width="16" height="4" fill="#050b0d"/><rect x="12" y="22" width="8" height="3" fill="#050b0d"/><rect x="7" y="10" width="6" height="3" fill="#e2685a"/><rect x="19" y="10" width="6" height="3" fill="#e2685a"/><rect x="6" y="12" width="20" height="5" fill="#e2685a"/><rect x="9" y="17" width="14" height="4" fill="#e2685a"/><rect x="13" y="21" width="6" height="2" fill="#e2685a"/><rect x="8" y="12" width="3" height="2" fill="#f6b3a8"/>',
      lock: '<rect x="10" y="5" width="12" height="10" fill="#050b0d"/><rect x="12" y="7" width="8" height="8" fill="#10201f"/><rect x="7" y="13" width="18" height="15" fill="#050b0d"/><rect x="9" y="15" width="14" height="11" fill="#5f736d"/><rect x="15" y="18" width="2" height="5" fill="#050b0d"/>',
      storm: '<rect x="6" y="8" width="20" height="9" fill="#5f736d"/><rect x="9" y="5" width="12" height="4" fill="#5f736d"/><rect x="14" y="17" width="4" height="3" fill="#f3c860"/><rect x="12" y="20" width="4" height="3" fill="#f3c860"/><rect x="14" y="23" width="3" height="4" fill="#f3c860"/><rect x="8" y="20" width="1" height="4" fill="#7fb0d6"/><rect x="21" y="19" width="1" height="4" fill="#7fb0d6"/><rect x="24" y="21" width="1" height="4" fill="#7fb0d6"/>'
    };
    return '<svg class="sl-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false" shape-rendering="crispEdges">' + (art[type] || art.note) + '</svg>';
  }

  /* ---------------- оверлеи ---------------- */

  function rainLayer() {
    if (reducedMotion()) return '<div class="sl-rain" aria-hidden="true"></div>';
    var drops = '';
    for (var i = 0; i < 46; i++) {
      drops += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;animation-delay:-' + (Math.random() * 1.2).toFixed(2) +
        's;animation-duration:' + (0.55 + Math.random() * 0.5).toFixed(2) + 's"></i>';
    }
    return '<div class="sl-rain" aria-hidden="true">' + drops + '</div><div class="sl-flash" aria-hidden="true"></div>';
  }

  function mount(className, html, label) {
    var node = document.createElement('div');
    node.className = 'sl-overlay ' + className;
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-modal', 'true');
    if (label) node.setAttribute('aria-label', label);
    node.innerHTML = html;
    document.body.appendChild(node);
    openCount += 1;
    document.body.classList.add('story-dialogue-open', 'story-line-open');
    return node;
  }
  var openCount = 0;
  function unmount(node) {
    if (!node || node.classList.contains('is-leaving')) return;
    node.classList.add('is-leaving');
    openCount = Math.max(0, openCount - 1);
    if (!openCount) document.body.classList.remove('story-line-open');
    if (!openCount && !(window.StoryDialogue && window.StoryDialogue.isOpen())) document.body.classList.remove('story-dialogue-open');
    window.setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 220);
  }
  function onceKeys(node, handler) {
    function onKey(e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        if (e.target && /^(BUTTON|A)$/.test(e.target.tagName) && e.key !== 'Escape') return;
        e.preventDefault(); e.stopPropagation();
        handler(e.key);
      }
    }
    document.addEventListener('keydown', onKey, true);
    return function () { document.removeEventListener('keydown', onKey, true); };
  }

  /** Пролог: тёмный экран, дождь, текст по кадрам. */
  function cinematic(frames, options) {
    options = options || {};
    frames = (frames || []).filter(function (f) { return f && f.text; });
    if (!frames.length) return Promise.resolve(false);
    return new Promise(function (resolve) {
      var node = mount('sl-cine', rainLayer() +
        '<div class="sl-cine__box"><p class="sl-cine__kicker">' + esc(options.kicker || 'Пролог') + '</p>' +
        '<p class="sl-cine__text" aria-live="polite"></p>' +
        '<div class="sl-cine__actions"><button type="button" class="sl-btn sl-btn--main" data-next>Далее</button><button type="button" class="sl-btn sl-btn--ghost" data-skip>Пропустить</button></div>' +
        '<p class="sl-cine__dots"></p></div>', options.kicker || 'Пролог');
      if (window.SFX) { window.SFX.pushMusic('prologue'); window.SFX.storm(node); }
      var textEl = node.querySelector('.sl-cine__text');
      var dots = node.querySelector('.sl-cine__dots');
      var next = node.querySelector('[data-next]');
      var index = 0;
      var stop = null;
      var typing = false;
      function render() {
        dots.innerHTML = frames.map(function (_, i) { return '<i class="' + (i === index ? 'is-on' : '') + '"></i>'; }).join('');
        typing = true;
        next.textContent = 'Показать';
        if (window.StoryDialogue && window.StoryDialogue.typeInto && !reducedMotion()) {
          var finishType = window.StoryDialogue.typeInto(textEl, text(frames[index].text), 32, 'narrator');
          stop = function () { finishType(); typing = false; next.textContent = index === frames.length - 1 ? 'Начать' : 'Далее'; };
          var len = Array.from(text(frames[index].text)).length;
          window.setTimeout(function () { if (typing) stop(); }, len * 32 + 60);
        } else {
          textEl.textContent = text(frames[index].text);
          typing = false;
          next.textContent = index === frames.length - 1 ? 'Начать' : 'Далее';
        }
      }
      function advance() {
        if (typing && stop) { stop(); return; }
        if (index + 1 < frames.length) { index += 1; render(); return; }
        done();
      }
      var release = onceKeys(node, function (key) { if (key === 'Escape') done(); else advance(); });
      function done() { release(); if (stop) stop(); unmount(node); if (window.SFX) window.SFX.popMusic(); resolve(true); }
      next.addEventListener('click', advance);
      node.querySelector('[data-skip]').addEventListener('click', done);
      render();
      next.focus();
    });
  }

  /** Карточка эпизода перед сменой. */
  function episodeCard(ep, options) {
    options = options || {};
    if (!ep) return Promise.resolve(false);
    return new Promise(function (resolve) {
      var n = total();
      var node = mount('sl-card-wrap', rainLayer() +
        '<section class="sl-card' + (ep.finale ? ' is-finale' : '') + '">' +
          '<p class="sl-card__season">' + esc((data && data.season && data.season.title) ? 'Сезон 1 · ' + data.season.title : 'Сюжет') + (isDemo() ? ' · демо' : '') + '</p>' +
          '<p class="sl-card__num">' + (ep.finale ? 'Финал · ' : '') + 'Эпизод ' + pad2(ep.number) + ' / ' + pad2(n) + '</p>' +
          '<h2 class="sl-card__title">' + esc(ep.title) + '</h2>' +
          '<div class="sl-card__lesson"><span>Принцип смены</span><b>' + esc(ep.lesson) + '</b><p>' + esc(ep.lesson_text) + '</p></div>' +
          '<div class="sl-card__progress" aria-hidden="true">' + episodes().map(function (e) {
            return '<i class="' + (Number(e.number) < Number(ep.number) ? 'is-done' : (Number(e.number) === Number(ep.number) ? 'is-now' : '')) + '"></i>';
          }).join('') + '</div>' +
          '<button type="button" class="sl-btn sl-btn--main" data-go>' + esc(options.button || 'Начать смену') + '</button>' +
        '</section>', 'Эпизод ' + ep.number + ': ' + ep.title);
      if (window.SFX) window.SFX.play('episode');
      var release = onceKeys(node, done);
      function done() { release(); unmount(node); resolve(true); }
      node.querySelector('[data-go]').addEventListener('click', done);
      node.querySelector('[data-go]').focus();
    });
  }

  /** Входящее SMS на пиксельном телефоне. */
  function phone(message, options) {
    options = options || {};
    if (!message || !message.text) return Promise.resolve(false);
    return new Promise(function (resolve) {
      var from = senderName(message.from, options.state);
      var node = mount('sl-phone-wrap',
        '<section class="sl-phone' + (message.from === 'unknown' && from !== 'Громов' ? ' is-unknown' : '') + '">' +
          '<div class="sl-phone__top"><span>03:12</span><span class="sl-phone__bars" aria-hidden="true"><i></i><i></i><i></i></span></div>' +
          '<p class="sl-phone__label">Новое сообщение</p>' +
          '<div class="sl-phone__from">' + clueIcon(message.from === 'unknown' && from !== 'Громов' ? 'phone' : 'person') + '<b>' + esc(from) + '</b></div>' +
          '<p class="sl-phone__bubble"></p>' +
          '<button type="button" class="sl-btn sl-btn--main" data-read>Прочитано</button>' +
        '</section>', 'Сообщение от: ' + from);
      var bubble = node.querySelector('.sl-phone__bubble');
      if (window.SFX) window.SFX.play('phone');
      if (window.StoryDialogue && window.StoryDialogue.typeInto) window.StoryDialogue.typeInto(bubble, text(message.text), 22, 'sms');
      else bubble.textContent = text(message.text);
      var release = onceKeys(node, done);
      function done() { release(); unmount(node); resolve(true); }
      node.querySelector('[data-read]').addEventListener('click', done);
      node.querySelector('[data-read]').focus();
    });
  }

  /** Карточка концовки сезона. */
  function endingCard(ending, options) {
    options = options || {};
    if (!ending) return Promise.resolve(false);
    return new Promise(function (resolve) {
      var node = mount('sl-card-wrap sl-ending-wrap',
        '<section class="sl-card sl-card--ending">' +
          '<p class="sl-card__season">Сезон 1 · концовка</p>' +
          '<h2 class="sl-card__title">«' + esc(ending.title) + '»</h2>' +
          '<p class="sl-card__summary">' + esc(ending.summary) + '</p>' +
          '<p class="sl-card__epilogue">' + esc((data && data.epilogue) || '') + '</p>' +
          '<p class="sl-card__hint">Другие концовки зависят от решений в сюжетных звонках. Историю можно начать заново: главная → «Шкафчик №12».</p>' +
          '<button type="button" class="sl-btn sl-btn--main" data-go>' + esc(options.button || 'К итогам смены') + '</button>' +
        '</section>', 'Концовка: ' + ending.title);
      if (window.SFX) { window.SFX.music('ending'); window.SFX.play('clue'); }
      var release = onceKeys(node, done);
      function done() { release(); unmount(node); resolve(true); }
      node.querySelector('[data-go]').addEventListener('click', done);
      node.querySelector('[data-go]').focus();
    });
  }

  /* ---------------- пролог: показан ли уже ---------------- */

  var PROLOGUE_KEY = 'shift03-prologue-seen-v1';
  function prologueSeen() {
    try { return window.localStorage.getItem(PROLOGUE_KEY) === '1'; } catch (e) { return false; }
  }
  function markPrologue() {
    try { window.localStorage.setItem(PROLOGUE_KEY, '1'); } catch (e) {}
  }
  function playPrologue(options) {
    options = options || {};
    var frames = (data && data.prologue) || [];
    return cinematic(frames, { kicker: options.kicker || 'Пролог · два года назад' }).then(function (shown) {
      markPrologue();
      return shown;
    });
  }

  /** Последнее полученное SMS: {episode, from, name, text} или null. */
  function latestMessage(st) {
    st = st || state();
    var list = episodes().filter(function (ep) { return ep.phone && Number(ep.number) <= st.episode; });
    var ep = list[list.length - 1];
    if (!ep) return null;
    return { episode: ep.number, from: ep.phone.from, name: senderName(ep.phone.from, st), text: text(ep.phone.text) };
  }

  /* ---------------- «Шкафчик №12»: журнал истории внутри игры ---------------- */

  function meter(value, max) {
    var out = '';
    for (var i = 0; i < max; i++) out += '<i class="' + (i < value ? 'is-on' : '') + '"></i>';
    return out;
  }

  function journalSections(st) {
    var eps = episodes();
    var next = currentEpisode();
    var ending = st.ending ? endingById(st.ending) : null;

    var list = '<ol class="story-episodes">' + eps.map(function (ep) {
      var n = Number(ep.number);
      var done = n <= st.episode;
      var now = !done && next && n === Number(next.number);
      var cls = done ? 'is-done' : (now ? 'is-now' : 'is-locked');
      var title = done || now ? esc(ep.title) : '???';
      var sub = done ? esc(ep.lesson) + ' — ' + esc(ep.lesson_text) : (now ? 'Следующая смена · ' + esc(ep.lesson) : 'Страница ещё не написана');
      var action = done
        ? '<button class="story-ep__btn" type="button" data-story-replay="' + n + '">Вспомнить</button>'
        : (now ? '<span class="story-ep__tag">▶ дальше</span>' : '');
      return '<li class="story-ep ' + cls + '"><span class="story-ep__num">' + n + '</span><span><b>' + title + '</b><small>' + sub + '</small></span>' + action + '</li>';
    }).join('') + '</ol>';
    if (ending) {
      var others = endings().filter(function (e) { return e.id !== ending.id; }).map(function (e) { return '«' + esc(e.title) + '»'; }).join(', ');
      list += '<div class="story-ending"><p>Концовка сезона</p><h4>«' + esc(ending.title) + '»</h4><p>' + esc(ending.summary) + '</p>' +
        '<p class="story-ending__others">Другие концовки: ' + others + '. Они зависят от решений в сюжетных звонках.</p>' +
        '<div class="story-ending__actions"><button class="story-link-btn story-link-btn--ghost" type="button" data-story-ending>Пересмотреть финал</button>' +
        (data && data.dbOk !== undefined ? '<button class="story-link-btn story-link-btn--ghost" type="button" data-story-reset>Начать сезон заново</button>' : '') + '</div></div>';
    }

    var clues = '<div class="story-clues">' + eps.filter(function (ep) { return ep.clue; }).map(function (ep) {
      var open = Number(ep.number) <= st.episode;
      if (!open) return '<article class="story-clue is-locked">' + clueIcon('lock') + '<b>???</b><p>Улика эпизода ' + ep.number + '</p></article>';
      return '<article class="story-clue">' + clueIcon(ep.clue.icon) + '<b>' + esc(ep.clue.title) + '</b><p>' + esc(ep.clue.text) + '</p></article>';
    }).join('') + '</div>';

    var sms = eps.filter(function (ep) { return ep.phone && Number(ep.number) <= st.episode; }).map(function (ep) {
      var from = senderName(ep.phone.from, st);
      var wasUnknown = ep.phone.from === 'unknown' && from === 'Громов';
      return '<div class="story-sms"><small><b>' + esc(from) + (wasUnknown ? ' (скрытый номер)' : '') + '</b><span>после смены ' + ep.number + '</span></small><p>' + esc(text(ep.phone.text)) + '</p></div>';
    }).reverse().join('');
    var phoneHtml = sms ? '<div class="story-phone">' + sms + '</div>' : '<p class="story-empty">Сообщений пока нет. Они приходят после смен.</p>';

    return { journal: list, clues: clues, phone: phoneHtml };
  }

  /** Оверлей «Шкафчик №12»: журнал вызовов, улики, телефон. section: journal | clues | phone. */
  function journal(options) {
    options = options || {};
    if (!data) return Promise.resolve(false);
    return new Promise(function (resolve) {
      var current = options.section || 'journal';
      var tabs = [{ id: 'journal', label: 'Журнал' }, { id: 'clues', label: 'Улики' }, { id: 'phone', label: 'Телефон' }];
      var node = mount('sl-journal-wrap', '<section class="sl-journal"><header class="sl-journal__head"><div><p class="sl-card__season">Сезон 1 · ' + esc((data.season && data.season.title) || 'Вернуться на линию') + '</p><h2>Шкафчик №12</h2></div><button type="button" class="sl-journal__close" data-close aria-label="Закрыть">×</button></header><div class="sl-journal__meta"></div><div class="sl-journal__tabs" role="tablist"></div><div class="sl-journal__body"></div></section>', 'Шкафчик №12');
      if (window.SFX) window.SFX.play('locker');
      var body = node.querySelector('.sl-journal__body');
      var tabBox = node.querySelector('.sl-journal__tabs');
      var meta = node.querySelector('.sl-journal__meta');

      function render() {
        var st = state();
        var sections = journalSections(st);
        var bar = episodes().map(function (ep) {
          var n = Number(ep.number);
          var nx = currentEpisode();
          return '<i class="' + (n <= st.episode ? 'is-done' : (nx && n === Number(nx.number) ? 'is-now' : '')) + '"></i>';
        }).join('');
        meta.innerHTML = '<div class="story-hero__bar" aria-hidden="true">' + bar + '</div>' +
          (st.episode > 0 ? '<div class="story-meters"><span>Доверие команде ' + meter(Math.max(0, st.team), 7) + '</span><span class="is-self">Доверие себе ' + meter(Math.max(0, st.self), 3) + '</span></div>' : '') +
          (data && !data.dbOk ? '<p class="story-empty">База недоступна — история хранится в этом браузере.</p>' : '');
        tabBox.innerHTML = tabs.map(function (t) {
          return '<button type="button" role="tab" class="sl-journal__tab' + (t.id === current ? ' is-active' : '') + '" aria-selected="' + (t.id === current) + '" data-tab="' + t.id + '">' + t.label + '</button>';
        }).join('') + '<button type="button" class="sl-journal__tab sl-journal__tab--ghost" data-prologue>Пролог</button>';
        body.innerHTML = sections[current];
        Array.prototype.forEach.call(tabBox.querySelectorAll('[data-tab]'), function (b) {
          b.addEventListener('click', function () { current = b.getAttribute('data-tab'); render(); });
        });
        tabBox.querySelector('[data-prologue]').addEventListener('click', function () { playPrologue(); });
        Array.prototype.forEach.call(body.querySelectorAll('[data-story-replay]'), function (btn) {
          btn.addEventListener('click', function () {
            var ep = episodeByNumber(btn.getAttribute('data-story-replay'));
            if (!ep) return;
            play((ep.before || []).concat(ep.after && ep.after.success ? ep.after.success : []), { title: 'Воспоминание · эпизод ' + ep.number + ' «' + ep.title + '»' });
          });
        });
        var endBtn = body.querySelector('[data-story-ending]');
        if (endBtn) endBtn.addEventListener('click', function () {
          var e = endingById(state().ending);
          if (e) play(e.lines, { title: 'Финал · «' + e.title + '»' }).then(function () { return endingCard(e, { button: 'Закрыть' }); });
        });
        var resetBtn = body.querySelector('[data-story-reset]');
        if (resetBtn) resetBtn.addEventListener('click', function () {
          if (!window.confirm('Начать сезон «Вернуться на линию» заново? Улики и выборы сбросятся, очки и покупки останутся.')) return;
          resetBtn.disabled = true;
          reset().then(function () {
            render();
            if (typeof options.onReset === 'function') options.onReset();
          });
        });
      }

      function onKey(e) {
        if (e.key !== 'Escape') return;
        if ((window.StoryDialogue && window.StoryDialogue.isOpen()) || openCount > 1) return; // сначала закрывается верхнее окно
        e.preventDefault(); e.stopPropagation();
        done();
      }
      document.addEventListener('keydown', onKey, true);
      function done() { document.removeEventListener('keydown', onKey); document.removeEventListener('keydown', onKey, true); unmount(node); resolve(true); }
      node.querySelector('[data-close]').addEventListener('click', done);
      node.addEventListener('click', function (e) { if (e.target === node) done(); });
      render();
      node.querySelector('[data-close]').focus();
    });
  }

  var api = {
    init: init,
    journal: journal,
    latestMessage: latestMessage,
    prologueSeen: prologueSeen,
    markPrologue: markPrologue,
    playPrologue: playPrologue,
    data: function () { return data; },
    state: state,
    episodes: episodes,
    total: total,
    episodeByNumber: episodeByNumber,
    currentEpisode: currentEpisode,
    isDemo: isDemo,
    flags: flags,
    text: text,
    prepareLines: prepareLines,
    play: play,
    complete: complete,
    reset: reset,
    pickEnding: pickEnding,
    endingById: endingById,
    senderName: senderName,
    clueIcon: clueIcon,
    cinematic: cinematic,
    episodeCard: episodeCard,
    phone: phone,
    endingCard: endingCard
  };
  window.StoryLine = api;
})();

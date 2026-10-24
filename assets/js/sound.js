/* Звук «Смены 03»: музыка и эффекты, синтезированные прямо в браузере (Web Audio API).
 *
 * Никаких аудиофайлов: всё собирается из осцилляторов и шума, поэтому весит ~30 КБ,
 * работает офлайн и не требует лицензий. Стиль — тёмный эмбиент (пэды, дождь, гром,
 * пульс монитора) с 8-битной мелодией сверху и ретро-эффектами интерфейса.
 *
 *   SFX.play('click' | 'confirm' | 'correct' | ...)   — эффект
 *   SFX.voice(speaker, char)                           — «голос» персонажа при печати текста
 *   SFX.music('menu' | 'shift' | 'operation' | 'prologue' | 'ending' | null)
 *   SFX.pushMusic(name) / SFX.popMusic()               — временная смена темы (пролог, концовка)
 *   SFX.intensity(0..1)                                — напряжение в теме смены
 *   SFX.duck(reason, level) / SFX.unduck(reason)       — приглушить музыку (диалог, пауза)
 *   SFX.storm(node)                                    — гром в такт вспышкам молний на оверлее
 *
 * Браузеры разрешают звук только после первого действия пользователя: до него
 * запрошенная тема запоминается и стартует с первым кликом/нажатием.
 */
(function () {
  'use strict';

  var STORE = 'shift03-sound-v1';
  var AC = window.AudioContext || window.webkitAudioContext;
  var settings = loadSettings();

  function loadSettings() {
    var s = { music: 0.6, sfx: 0.8, muted: false };
    try {
      var raw = JSON.parse(window.localStorage.getItem(STORE) || 'null');
      if (raw && typeof raw === 'object') {
        if (typeof raw.music === 'number') s.music = clamp(raw.music, 0, 1);
        if (typeof raw.sfx === 'number') s.sfx = clamp(raw.sfx, 0, 1);
        s.muted = !!raw.muted;
      }
    } catch (e) {}
    return s;
  }
  function saveSettings() {
    try { window.localStorage.setItem(STORE, JSON.stringify(settings)); } catch (e) {}
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ================================================================
     Граф: инструменты → шины (музыка / эмбиент / эффекты / голоса) → компрессор
     ================================================================ */
  var ctx = null, unlocked = false;
  var master, comp, musicBus, duckNode, ambBus, sfxBus, voiceBus;
  var musicRev, musicDly, sfxRev;
  var noiseBuf = null, waves = {};

  function ensure() {
    if (ctx || !AC) return ctx;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { ctx = new AC(); } catch (e2) { ctx = null; return null; } }

    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3.5;
    comp.attack.value = 0.004; comp.release.value = 0.25;
    comp.connect(ctx.destination);

    master = ctx.createGain(); master.connect(comp);
    duckNode = ctx.createGain(); duckNode.connect(master);
    musicBus = ctx.createGain(); musicBus.connect(duckNode);
    ambBus = ctx.createGain(); ambBus.connect(duckNode);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    voiceBus = ctx.createGain(); voiceBus.connect(master);

    var impulse = makeImpulse(2.8, 2.6);
    musicRev = ctx.createConvolver(); musicRev.buffer = impulse;
    var musicRevOut = ctx.createGain(); musicRevOut.gain.value = 0.9;
    musicRev.connect(musicRevOut); musicRevOut.connect(musicBus);

    // эхо 3/8 с затуханием и мягким фильтром в петле
    musicDly = ctx.createDelay(2);
    musicDly.delayTime.value = 0.48;
    var fb = ctx.createGain(); fb.gain.value = 0.34;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    musicDly.connect(lp); lp.connect(fb); fb.connect(musicDly);
    var dlyOut = ctx.createGain(); dlyOut.gain.value = 0.55;
    lp.connect(dlyOut); dlyOut.connect(musicBus); dlyOut.connect(musicRev);

    sfxRev = ctx.createConvolver(); sfxRev.buffer = makeImpulse(1.8, 3);
    var sfxRevOut = ctx.createGain(); sfxRevOut.gain.value = 0.7;
    sfxRev.connect(sfxRevOut); sfxRevOut.connect(sfxBus);

    noiseBuf = makeNoise(3);
    waves.p12 = pulseWave(0.125);
    waves.p25 = pulseWave(0.25);
    waves.p50 = pulseWave(0.5);
    applyVolumes(true);
    return ctx;
  }

  function makeImpulse(seconds, decay) {
    var rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    var buf = ctx.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  function makeNoise(seconds) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  /** «Пульсовая» волна NES-типа с заданной скважностью. */
  function pulseWave(duty) {
    var n = 40, real = new Float32Array(n), imag = new Float32Array(n);
    for (var k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.pow(0.97, k);
    return ctx.createPeriodicWave(real, imag);
  }

  function applyVolumes(instant) {
    if (!ctx) return;
    var t = ctx.currentTime, tc = instant ? 0.001 : 0.08;
    master.gain.setTargetAtTime(settings.muted ? 0 : 1, t, tc);
    musicBus.gain.setTargetAtTime(Math.pow(settings.music, 1.5) * 1.15, t, tc);
    ambBus.gain.setTargetAtTime(Math.pow(settings.music, 1.5) * 1.2, t, tc);
    sfxBus.gain.setTargetAtTime(Math.pow(settings.sfx, 1.5) * 1.1, t, tc);
    voiceBus.gain.setTargetAtTime(Math.pow(settings.sfx, 1.5) * 0.85, t, tc);
  }

  /* ---------------- ноты ---------------- */
  var SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function hz(n) {
    if (typeof n === 'number') return n;
    var m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
    if (!m) return 440;
    var midi = 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : (m[2] === 'b' ? -1 : 0));
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  function up(freq, semis) { return freq * Math.pow(2, semis / 12); }

  /* ---------------- универсальные «голоса» ---------------- */
  /**
   * Тон: o = {f, t, dur, vol, wave|type, a, d, s, r, slide, slideT, filter:{type,f,q,to}, vib:{rate,depth,delay},
   *          detune, out, rev, dly, revNode, dlyNode}
   */
  function tone(o) {
    var t = Math.max(o.t || ctx.currentTime, ctx.currentTime);
    var dur = o.dur || 0.1, a = o.a || 0.004, r = o.r || 0.06, vol = o.vol || 0.1;
    var osc = ctx.createOscillator();
    if (o.wave && waves[o.wave]) osc.setPeriodicWave(waves[o.wave]);
    else osc.type = o.type || 'square';
    var f = hz(o.f);
    osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, hz(o.slide)), t + (o.slideT || dur));
    if (o.detune) osc.detune.setValueAtTime(o.detune, t);
    var node = osc;
    if (o.filter) {
      var fl = ctx.createBiquadFilter();
      fl.type = o.filter.type || 'lowpass';
      fl.frequency.setValueAtTime(o.filter.f, t);
      if (o.filter.to) fl.frequency.exponentialRampToValueAtTime(o.filter.to, t + (o.filter.time || dur));
      fl.Q.value = o.filter.q || 0.7;
      node.connect(fl); node = fl;
    }
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    if (o.d) g.gain.setTargetAtTime(vol * (o.s == null ? 0.5 : o.s), t + a, o.d);
    g.gain.setTargetAtTime(0, t + Math.max(a, dur), r / 4);
    node.connect(g);
    route(g, o);
    if (o.vib) {
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = o.vib.rate || 5.5;
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(f * (o.vib.depth || 0.008), t + (o.vib.delay || 0.18));
      lfo.connect(lg); lg.connect(osc.frequency);
      lfo.start(t); lfo.stop(t + dur + r + 0.1);
    }
    osc.start(t);
    osc.stop(t + dur + r + 0.1);
    return g;
  }
  /** Шум: o = {t, dur, vol, a, r, filter:{type,f,to,q,time}, rate, out, rev} */
  function noise(o) {
    var t = Math.max(o.t || ctx.currentTime, ctx.currentTime);
    var dur = o.dur || 0.1, a = o.a || 0.003, r = o.r || 0.05;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    if (o.rate) src.playbackRate.value = o.rate;
    var node = src;
    if (o.filter) {
      var fl = ctx.createBiquadFilter();
      fl.type = o.filter.type || 'bandpass';
      fl.frequency.setValueAtTime(o.filter.f, t);
      if (o.filter.to) fl.frequency.exponentialRampToValueAtTime(o.filter.to, t + (o.filter.time || dur));
      fl.Q.value = o.filter.q || 1;
      node.connect(fl); node = fl;
    }
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.vol || 0.1, t + a);
    if (o.d) g.gain.setTargetAtTime((o.vol || 0.1) * (o.s == null ? 0.3 : o.s), t + a, o.d);
    g.gain.setTargetAtTime(0, t + Math.max(a, dur), r / 4);
    node.connect(g);
    route(g, o);
    src.start(t, Math.random() * 2);
    src.stop(t + dur + r + 0.1);
    return g;
  }
  function route(g, o) {
    g.connect(o.out || sfxBus);
    if (o.rev) { var rs = ctx.createGain(); rs.gain.value = o.rev; g.connect(rs); rs.connect(o.revNode || (o.out && o.out !== sfxBus && o.out !== voiceBus ? musicRev : sfxRev)); }
    if (o.dly) { var ds = ctx.createGain(); ds.gain.value = o.dly; g.connect(ds); ds.connect(o.dlyNode || musicDly); }
  }

  /* ================================================================
     Эффекты интерфейса и игры
     ================================================================ */
  function now(offset) { return ctx.currentTime + (offset || 0); }
  function seq(notes, step, base, fn) {
    notes.forEach(function (n, i) { if (n) fn(n, base + i * step, i); });
  }

  var FX = {
    click: function () {
      tone({ f: 1250, slide: 820, dur: 0.035, vol: 0.07, wave: 'p25', r: 0.03 });
      noise({ dur: 0.012, vol: 0.03, filter: { type: 'highpass', f: 4000 } });
    },
    hover: function () {
      tone({ f: 2400, dur: 0.012, vol: 0.022, type: 'sine', r: 0.02 });
    },
    confirm: function () {
      tone({ f: 'E6', dur: 0.045, vol: 0.09, wave: 'p25' });
      tone({ f: 'B6', t: now(0.055), dur: 0.08, vol: 0.08, wave: 'p25', r: 0.12, rev: 0.25 });
    },
    back: function () {
      tone({ f: 'B5', dur: 0.04, vol: 0.08, wave: 'p25' });
      tone({ f: 'E5', t: now(0.05), dur: 0.06, vol: 0.07, wave: 'p25', r: 0.08 });
    },
    tab: function () {
      tone({ f: 900, dur: 0.025, vol: 0.08, wave: 'p12' });
      tone({ f: 1350, t: now(0.03), dur: 0.03, vol: 0.06, wave: 'p12' });
    },
    key: function () {
      noise({ dur: 0.014, vol: 0.04, filter: { type: 'highpass', f: 2600 } });
      tone({ f: 170 + Math.random() * 40, dur: 0.02, vol: 0.03, type: 'triangle' });
    },
    open: function () {
      noise({ dur: 0.22, vol: 0.06, a: 0.08, r: 0.15, filter: { type: 'bandpass', f: 350, to: 2400, q: 1.4 } });
      tone({ f: 'A5', t: now(0.12), dur: 0.08, vol: 0.05, wave: 'p25', r: 0.3, rev: 0.4 });
      tone({ f: 'E6', t: now(0.18), dur: 0.1, vol: 0.04, wave: 'p25', r: 0.4, rev: 0.5 });
    },
    close: function () {
      noise({ dur: 0.18, vol: 0.045, a: 0.02, r: 0.12, filter: { type: 'bandpass', f: 2000, to: 300, q: 1.4 } });
    },
    pause: function () {
      tone({ f: 'E5', dur: 0.06, vol: 0.08, wave: 'p50', filter: { f: 1800 } });
      tone({ f: 'A4', t: now(0.08), dur: 0.12, vol: 0.08, wave: 'p50', filter: { f: 1400 } });
    },
    resume: function () {
      tone({ f: 'A4', dur: 0.06, vol: 0.08, wave: 'p50', filter: { f: 1800 } });
      tone({ f: 'E5', t: now(0.08), dur: 0.12, vol: 0.08, wave: 'p50', filter: { f: 2200 } });
    },
    /** Правильный диагноз — восходящее арпеджио. */
    correct: function () {
      seq(['C6', 'E6', 'G6', 'C7'], 0.06, now(), function (n, t, i) {
        tone({ f: n, t: t, dur: i === 3 ? 0.18 : 0.05, vol: 0.085, wave: 'p25', r: i === 3 ? 0.3 : 0.05, rev: 0.25 });
      });
    },
    /** Ошибка — нисходящий «зуммер». */
    wrong: function () {
      tone({ f: 220, slide: 150, dur: 0.22, vol: 0.12, wave: 'p50', filter: { f: 1400 } });
      tone({ f: 233, slide: 155, dur: 0.22, vol: 0.06, wave: 'p50', filter: { f: 1200 } });
      noise({ dur: 0.08, vol: 0.05, filter: { type: 'lowpass', f: 900 } });
    },
    /** Верный шаг лечения: каждая следующая нота выше. */
    step: function (o) {
      var scale = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'];
      var n = scale[Math.min(scale.length - 1, (o && o.index) || 0)];
      tone({ f: n, dur: 0.07, vol: 0.09, wave: 'p12', r: 0.12, rev: 0.2 });
      tone({ f: up(hz(n), 12), t: now(0.03), dur: 0.05, vol: 0.03, type: 'sine', r: 0.2 });
    },
    /** Пациент спасён — короткий фанфарный мотив. */
    saved: function () {
      var t = now();
      seq(['G5', 'C6', 'E6'], 0.075, t, function (n, tt) { tone({ f: n, t: tt, dur: 0.06, vol: 0.08, wave: 'p25' }); });
      ['C6', 'E6', 'G6'].forEach(function (n) { tone({ f: n, t: t + 0.24, dur: 0.35, vol: 0.05, wave: 'p25', r: 0.4, rev: 0.35, vib: { rate: 6, depth: 0.006 } }); });
      tone({ f: 'C4', t: t + 0.24, dur: 0.35, vol: 0.12, type: 'triangle', r: 0.3 });
    },
    coin: function () {
      tone({ f: 'B5', dur: 0.07, vol: 0.09, wave: 'p25' });
      tone({ f: 'E6', t: now(0.07), dur: 0.28, vol: 0.09, wave: 'p25', d: 0.12, s: 0.3, r: 0.2, rev: 0.25 });
    },
    error: function () {
      tone({ f: 140, dur: 0.09, vol: 0.12, wave: 'p50', filter: { f: 900 } });
      tone({ f: 140, t: now(0.13), dur: 0.12, vol: 0.12, wave: 'p50', filter: { f: 900 } });
    },
    /** Тик последних секунд смены. */
    tick: function (o) {
      var crit = o && o.crit;
      tone({ f: crit ? 1500 : 1100, slide: crit ? 900 : 700, dur: 0.03, vol: crit ? 0.1 : 0.06, type: 'sine', r: 0.03 });
      if (crit) tone({ f: 60, slide: 40, dur: 0.08, vol: 0.12, type: 'sine', r: 0.06 });
    },
    warn: function () {
      [0, 0.22].forEach(function (d) {
        tone({ f: 'A5', t: now(d), dur: 0.1, vol: 0.08, wave: 'p50', filter: { f: 2500 } });
        tone({ f: 'E5', t: now(d + 0.1), dur: 0.1, vol: 0.08, wave: 'p50', filter: { f: 2500 } });
      });
    },
    /** Входящий вызов диспетчера: щелчок рации и двойной сигнал. */
    ring: function () {
      noise({ dur: 0.07, vol: 0.09, filter: { type: 'bandpass', f: 1800, q: 0.8 } });
      [0.1, 0.42].forEach(function (d) {
        for (var i = 0; i < 4; i++) tone({ f: i % 2 ? 1100 : 880, t: now(d + i * 0.06), dur: 0.05, vol: 0.07, wave: 'p25' });
      });
    },
    /** Сюжетный вызов: эфир с помехами. */
    radio: function (o) {
      var long = o && o.static;
      noise({ dur: long ? 1.1 : 0.45, vol: 0.09, a: 0.02, r: 0.2, filter: { type: 'bandpass', f: 1600, q: 0.7 }, d: 0.2, s: 0.35 });
      for (var i = 0; i < (long ? 9 : 4); i++) {
        noise({ t: now(0.05 + Math.random() * (long ? 1 : 0.4)), dur: 0.015, vol: 0.12, filter: { type: 'highpass', f: 3000 } });
      }
      tone({ f: 'D5', t: now(long ? 1.05 : 0.45), dur: 0.12, vol: 0.06, wave: 'p25' });
      tone({ f: 'A5', t: now(long ? 1.18 : 0.58), dur: 0.2, vol: 0.06, wave: 'p25', r: 0.3, rev: 0.4 });
    },
    /** Решение, которое влияет на историю: глухой удар и колокол. */
    choice: function () {
      tone({ f: 90, slide: 45, dur: 0.4, vol: 0.25, type: 'sine', r: 0.3 });
      ['D5', 'A5', 'D6'].forEach(function (n, i) { bell(n, now(0.05 + i * 0.02), 0.05 - i * 0.01, 2.2); });
    },
    /** Карточка эпизода. */
    episode: function () {
      var t = now();
      tone({ f: 72, slide: 38, dur: 1.2, vol: 0.28, type: 'sine', a: 0.01, r: 0.8 });
      noise({ t: t, dur: 1.2, vol: 0.05, a: 0.5, r: 0.8, filter: { type: 'lowpass', f: 300, to: 1800, q: 0.6 } });
      bell('A4', t + 0.15, 0.06, 3); bell('E5', t + 0.35, 0.045, 3); bell('C6', t + 0.6, 0.035, 3.2);
    },
    /** SMS на телефоне: вибрация и сигнал. */
    phone: function () {
      for (var i = 0; i < 3; i++) {
        tone({ f: 118, t: now(i * 0.28), dur: 0.17, vol: 0.13, wave: 'p50', filter: { f: 380 } });
        noise({ t: now(i * 0.28), dur: 0.17, vol: 0.03, filter: { type: 'lowpass', f: 500 } });
      }
      tone({ f: 'E6', t: now(0.95), dur: 0.07, vol: 0.08, wave: 'p25' });
      tone({ f: 'B6', t: now(1.04), dur: 0.16, vol: 0.07, wave: 'p25', r: 0.25, rev: 0.3 });
    },
    /** «Шкафчик №12»: скрип металлической дверцы и щелчок замка. */
    locker: function () {
      tone({ f: 120, dur: 0.05, vol: 0.12, wave: 'p50', filter: { f: 700 } });
      noise({ dur: 0.04, vol: 0.1, filter: { type: 'bandpass', f: 2600, q: 3 } });
      noise({ t: now(0.06), dur: 0.38, vol: 0.06, a: 0.08, r: 0.1, filter: { type: 'bandpass', f: 900, to: 1500, q: 14, time: 0.38 } });
      tone({ f: 640, slide: 820, t: now(0.06), dur: 0.36, vol: 0.02, type: 'sawtooth', filter: { type: 'bandpass', f: 900, q: 6 } });
      tone({ f: 85, t: now(0.46), dur: 0.08, vol: 0.12, type: 'triangle' });
    },
    /** Новая улика. */
    clue: function () {
      var t = now();
      ['D5', 'F5', 'A5', 'C#6'].forEach(function (n, i) { bell(n, t + i * 0.11, 0.045, 2.4); });
    },
    /** Конец смены: успех / провал. */
    finishGood: function () {
      var t = now();
      seq(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.07, t, function (n, tt) { tone({ f: n, t: tt, dur: 0.06, vol: 0.075, wave: 'p25' }); });
      ['C5', 'E5', 'G5', 'C6'].forEach(function (n) { tone({ f: n, t: t + 0.45, dur: 0.9, vol: 0.045, wave: 'p25', r: 0.8, rev: 0.4, vib: { rate: 5.5, depth: 0.006, delay: 0.3 } }); });
      tone({ f: 'C3', t: t + 0.45, dur: 0.9, vol: 0.16, type: 'triangle', r: 0.6 });
    },
    finishBad: function () {
      var t = now();
      seq(['E5', 'D#5', 'D5', 'C#5'], 0.2, t, function (n, tt, i) { tone({ f: n, t: tt, dur: i === 3 ? 0.7 : 0.17, vol: 0.08, wave: 'p50', filter: { f: 1600 }, r: i === 3 ? 0.6 : 0.05, vib: i === 3 ? { rate: 5, depth: 0.012, delay: 0.2 } : null }); });
      tone({ f: 'A2', t: t + 0.6, dur: 0.9, vol: 0.2, type: 'triangle', r: 0.6 });
    },
    /** Операция: взять инструмент / приложить к пациенту / вернуть на стол. */
    pick: function () {
      tone({ f: 520, slide: 880, dur: 0.06, vol: 0.08, wave: 'p12', r: 0.04 });
    },
    apply: function () {
      bell(2400, now(), 0.04, 0.5);
      bell(3600, now(0.01), 0.025, 0.4);
      tone({ f: 'G5', t: now(0.06), dur: 0.05, vol: 0.07, wave: 'p25' });
      tone({ f: 'D6', t: now(0.12), dur: 0.12, vol: 0.07, wave: 'p25', r: 0.2, rev: 0.25 });
    },
    reject: function () {
      tone({ f: 110, slide: 70, dur: 0.12, vol: 0.2, type: 'sine' });
      noise({ dur: 0.07, vol: 0.08, filter: { type: 'lowpass', f: 700 } });
      tone({ f: 196, slide: 140, t: now(0.04), dur: 0.16, vol: 0.08, wave: 'p50', filter: { f: 1200 } });
    },
    drop: function () {
      noise({ dur: 0.12, vol: 0.035, a: 0.01, filter: { type: 'bandpass', f: 1800, to: 600, q: 1.2 } });
      tone({ f: 340, slide: 260, t: now(0.1), dur: 0.03, vol: 0.05, type: 'triangle' });
    },
    thunder: function (o) { thunder(o && o.near ? 1 : 0.55); }
  };

  /** Колокол: основной тон + неравномерные обертоны, длинное затухание. */
  function bell(n, t, vol, decay) {
    var f = hz(n);
    tone({ f: f, t: t, dur: 0.02, vol: vol, type: 'sine', a: 0.002, r: decay, rev: 0.45 });
    tone({ f: f * 2.76, t: t, dur: 0.01, vol: vol * 0.35, type: 'sine', a: 0.002, r: decay * 0.45, rev: 0.4 });
    tone({ f: f * 5.4, t: t, dur: 0.01, vol: vol * 0.12, type: 'sine', a: 0.002, r: decay * 0.25 });
  }

  /** Гром: треск + долгий низкий раскат. level 0..1 — насколько близко. */
  function thunder(level, out) {
    var t = now();
    out = out || ambBus;
    if (level > 0.7) noise({ t: t, dur: 0.25, vol: 0.12 * level, a: 0.005, r: 0.4, filter: { type: 'highpass', f: 1200 }, out: out });
    noise({ t: t + 0.05, dur: 1.2 + level, vol: 0.32 * level, a: 0.06, d: 0.9, s: 0.45, r: 2.2, filter: { type: 'lowpass', f: 300 + 600 * level, to: 90, q: 0.5, time: 2.6 }, out: out, rate: 0.6 });
    noise({ t: t + 0.6 + Math.random() * 0.5, dur: 1.6, vol: 0.18 * level, a: 0.3, r: 2, filter: { type: 'lowpass', f: 220, to: 70, q: 0.4, time: 2.5 }, out: out, rate: 0.5 });
  }

  /* ---------------- голоса персонажей при печати текста ---------------- */
  var VOICES = {
    vera:     { wave: 'p25', f: 640, len: 0.042, vol: 0.075, steps: [0, 2, 3, 5, 7] },
    ilya:     { type: 'triangle', f: 210, len: 0.06, vol: 0.13, steps: [0, 2, 3, 5, 7] },
    sonya:    { wave: 'p12', f: 900, len: 0.032, vol: 0.06, steps: [0, 2, 4, 7, 9] },
    gromov:   { wave: 'p50', f: 150, len: 0.07, vol: 0.075, steps: [0, 2, 3, 5], lp: 700 },
    petr:     { type: 'triangle', f: 280, len: 0.07, vol: 0.12, steps: [0, 2, 4, 5], vib: true },
    hero:     { wave: 'p25', f: 420, len: 0.045, vol: 0.07, steps: [0, 2, 3, 5, 7] },
    relative: { type: 'triangle', f: 360, len: 0.05, vol: 0.11, steps: [0, 1, 3, 5] },
    unknown:  { wave: 'p50', f: 300, len: 0.05, vol: 0.06, steps: [0, 1, 6, 7, 11], lp: 1100, noise: true },
    sms:      { wave: 'p12', f: 1320, len: 0.018, vol: 0.04, steps: [0, 5, 7] },
    narrator: { typewriter: true }
  };
  var voiceCount = 0, lastVoiceAt = 0;
  function voice(speaker, ch) {
    if (!ready() || settings.muted || settings.sfx <= 0) return;
    ch = String(ch || '');
    if (!ch || /[\s.,!?…:;—–\-«»"'()]/.test(ch)) return;
    var p = VOICES[speaker] || VOICES.vera;
    var t = ctx.currentTime;
    voiceCount += 1;
    if (p.typewriter) {
      if (t - lastVoiceAt < 0.045) return;
      lastVoiceAt = t;
      noise({ dur: 0.012, vol: 0.06, filter: { type: 'highpass', f: 2200 }, out: voiceBus });
      tone({ f: 120 + Math.random() * 30, dur: 0.02, vol: 0.06, type: 'triangle', out: voiceBus });
      return;
    }
    if (voiceCount % 2 || t - lastVoiceAt < 0.05) return; // каждый второй символ — как в ретро-RPG
    lastVoiceAt = t;
    var code = ch.toLowerCase().charCodeAt(0);
    var f = up(p.f, p.steps[code % p.steps.length] + (Math.random() * 0.4 - 0.2));
    tone({ f: f, dur: p.len, vol: p.vol, wave: p.wave, type: p.type, r: 0.03, out: voiceBus,
      filter: p.lp ? { type: 'lowpass', f: p.lp } : null, vib: p.vib ? { rate: 7, depth: 0.02, delay: 0.01 } : null });
    if (p.noise) noise({ dur: p.len, vol: 0.035, filter: { type: 'bandpass', f: 1800, q: 0.8 }, out: voiceBus });
  }

  /* ================================================================
     Музыка: пошаговый секвенсор (16 шагов на такт) + эмбиент-слои
     ================================================================ */
  function Instruments(track) {
    var out = track.out, rv = track.rev, dl = track.dly;
    function o(extra) { extra.out = out; extra.revNode = rv; extra.dlyNode = dl; return extra; }
    return {
      pad: function (notes, t, dur, vol, cutoff) {
        notes.forEach(function (n) {
          [-7, 7].forEach(function (cents) {
            tone(o({ f: n, t: t, dur: dur, vol: (vol || 0.022), type: 'sawtooth', detune: cents, a: dur * 0.35, r: dur * 0.6,
              filter: { type: 'lowpass', f: (cutoff || 700) * 0.6, to: cutoff || 700, time: dur * 0.5, q: 0.4 }, rev: 0.6 }));
          });
        });
      },
      bass: function (n, t, dur, vol) {
        tone(o({ f: n, t: t, dur: dur, vol: vol || 0.16, type: 'triangle', a: 0.01, d: dur * 0.6, s: 0.6, r: 0.12 }));
      },
      pulseBass: function (n, t, dur, vol) {
        tone(o({ f: n, t: t, dur: dur, vol: vol || 0.07, wave: 'p25', a: 0.004, d: 0.08, s: 0.4, r: 0.05, filter: { type: 'lowpass', f: 900 } }));
      },
      arp: function (n, t, dur, vol) {
        tone(o({ f: n, t: t, dur: dur, vol: vol || 0.03, wave: 'p12', a: 0.003, d: 0.06, s: 0.3, r: 0.08, rev: 0.35, dly: 0.25, filter: { type: 'lowpass', f: 3200 } }));
      },
      lead: function (n, t, dur, vol) {
        tone(o({ f: n, t: t, dur: dur, vol: vol || 0.05, wave: 'p25', a: 0.01, d: 0.3, s: 0.65, r: 0.18, rev: 0.4, dly: 0.35,
          vib: { rate: 5.2, depth: 0.007, delay: Math.min(0.25, dur * 0.5) }, filter: { type: 'lowpass', f: 2600 } }));
      },
      bell: function (n, t, vol, decay) {
        var f = hz(n);
        tone(o({ f: f, t: t, dur: 0.02, vol: vol || 0.05, type: 'sine', a: 0.002, r: decay || 2.4, rev: 0.7, dly: 0.2 }));
        tone(o({ f: f * 2.76, t: t, dur: 0.01, vol: (vol || 0.05) * 0.3, type: 'sine', a: 0.002, r: (decay || 2.4) * 0.4, rev: 0.6 }));
      },
      hat: function (t, vol, open) {
        noise(o({ t: t, dur: open ? 0.08 : 0.018, vol: vol || 0.03, a: 0.001, r: open ? 0.12 : 0.03, filter: { type: 'highpass', f: 7000 } }));
      },
      kick: function (t, vol) {
        tone(o({ f: 120, slide: 42, slideT: 0.18, t: t, dur: 0.18, vol: vol || 0.25, type: 'sine', a: 0.002, r: 0.12 }));
      },
      /** «Тук-тук» сердца: два мягких низких удара. */
      heart: function (t, vol) {
        tone(o({ f: 70, slide: 42, slideT: 0.12, t: t, dur: 0.12, vol: vol || 0.18, type: 'sine', r: 0.1 }));
        tone(o({ f: 62, slide: 40, slideT: 0.1, t: t + 0.2, dur: 0.1, vol: (vol || 0.18) * 0.7, type: 'sine', r: 0.1 }));
      },
      /** Сигнал кардиомонитора. */
      ecg: function (t, vol) {
        tone(o({ f: 988, t: t, dur: 0.08, vol: vol || 0.03, type: 'sine', a: 0.003, r: 0.04, rev: 0.25 }));
      },
      staticBurst: function (t, vol, dur) {
        noise(o({ t: t, dur: dur || 0.4, vol: vol || 0.03, a: 0.02, r: 0.1, filter: { type: 'bandpass', f: 1500 + Math.random() * 800, q: 0.9 } }));
      }
    };
  }

  /** Постоянный слой дождя (два фильтрованных шума) с плавной громкостью. */
  function RainLayer(out, level) {
    var nodes = [];
    var g = ctx.createGain(); g.gain.value = 0; g.connect(out);
    // мягкий «тёмный» дождь: низкий шелест + немного середины, верх срезан, чтобы не шипел поверх музыки
    var tone2 = ctx.createBiquadFilter(); tone2.type = 'lowpass'; tone2.frequency.value = 4200; tone2.Q.value = 0.3;
    tone2.connect(g);
    [{ type: 'lowpass', f: 520, vol: 0.6, rate: 0.7 }, { type: 'bandpass', f: 1700, q: 0.6, vol: 0.13, rate: 1 }, { type: 'highpass', f: 5200, vol: 0.02, rate: 1 }].forEach(function (cfg) {
      var src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true; src.playbackRate.value = cfg.rate;
      var fl = ctx.createBiquadFilter(); fl.type = cfg.type; fl.frequency.value = cfg.f; fl.Q.value = cfg.q || 0.7;
      var vg = ctx.createGain(); vg.gain.value = cfg.vol;
      src.connect(fl); fl.connect(vg); vg.connect(tone2);
      src.start(ctx.currentTime, Math.random() * 2);
      nodes.push(src);
    });
    g.gain.setTargetAtTime(level, ctx.currentTime, 1.2);
    return {
      level: function (v) { g.gain.setTargetAtTime(v, ctx.currentTime, 0.8); },
      stop: function (fade) {
        g.gain.setTargetAtTime(0, ctx.currentTime, (fade || 1.5) / 3);
        var end = ctx.currentTime + (fade || 1.5) + 0.2;
        nodes.forEach(function (n) { try { n.stop(end); } catch (e) {} });
      }
    };
  }

  /** Гудящий дрон (пролог): две синусоиды с медленным «дыханием» фильтра. */
  function DroneLayer(out, notes, vol) {
    var oscs = [];
    var g = ctx.createGain(); g.gain.value = 0; g.connect(out);
    var fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 420; fl.Q.value = 2; fl.connect(g);
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    var lg = ctx.createGain(); lg.gain.value = 260; lfo.connect(lg); lg.connect(fl.frequency); lfo.start();
    oscs.push(lfo);
    notes.forEach(function (n, i) {
      var osc = ctx.createOscillator(); osc.type = i ? 'sawtooth' : 'triangle'; osc.frequency.value = hz(n); osc.detune.value = i * 4;
      var og = ctx.createGain(); og.gain.value = i ? 0.25 : 1;
      osc.connect(og); og.connect(fl); osc.start(); oscs.push(osc);
    });
    g.gain.setTargetAtTime(vol, ctx.currentTime, 1.5);
    return {
      stop: function (fade) {
        g.gain.setTargetAtTime(0, ctx.currentTime, (fade || 1.5) / 3);
        var end = ctx.currentTime + (fade || 1.5) + 0.3;
        oscs.forEach(function (n) { try { n.stop(end); } catch (e) {} });
      }
    };
  }

  /* ---------------- партитуры ---------------- */
  function ch(bass, pad) { return { bass: bass, pad: pad }; }
  function mel(list) { return list; }

  var TRACKS = {
    /** Главное меню «Вернуться на линию»: ля минор, дождь, сердцебиение, 8-битная мелодия. */
    menu: {
      bpm: 70, bars: 8,
      chords: [ch('A2', ['A3', 'C4', 'E4']), ch('F2', ['F3', 'A3', 'C4']), ch('C3', ['G3', 'C4', 'E4']), ch('G2', ['G3', 'B3', 'D4']),
               ch('A2', ['A3', 'C4', 'E4']), ch('F2', ['F3', 'A3', 'C4']), ch('D3', ['F3', 'A3', 'D4']), ch('E2', ['E3', 'G#3', 'B3'])],
      melody: [
        mel([[0, 'E5', 6], [6, 'D5', 2], [8, 'C5', 4], [12, 'B4', 4]]),
        mel([[0, 'A4', 8], [8, 'C5', 4], [12, 'F5', 4]]),
        mel([[0, 'E5', 6], [6, 'G5', 2], [8, 'E5', 4], [12, 'D5', 4]]),
        mel([[0, 'D5', 12], [12, 'B4', 4]]),
        mel([[0, 'C5', 4], [4, 'B4', 2], [6, 'A4', 2], [8, 'E5', 8]]),
        mel([[0, 'F5', 6], [6, 'E5', 2], [8, 'D5', 4], [12, 'C5', 4]]),
        mel([[0, 'D5', 4], [4, 'F5', 4], [8, 'A5', 4], [12, 'G5', 4]]),
        mel([[0, 'E5', 8], [8, 'B4', 4], [12, 'G#4', 4]])
      ],
      setup: function (tr) {
        tr.layers.push(RainLayer(tr.amb, 0.11));
        tr.thunderEvery = [26, 48];
      },
      step: function (I, tr, s, bar, t, sd, cycle) {
        var c = this.chords[bar];
        if (s === 0) { I.pad(c.pad, t, sd * 16, 0.018, 760); I.bass(c.bass, t, sd * 12, 0.12); I.heart(t, 0.12); }
        if (s === 8) I.bass(c.bass, t, sd * 6, 0.07);
        // арпеджио восьмыми: тихое, вступает со второго круга
        if (cycle > 0 && s % 2 === 0) {
          var arpIdx = [0, 1, 2, 1, 0, 2, 1, 2][(s / 2) | 0];
          I.arp(up(hz(c.pad[arpIdx]), 12), t, sd * 1.5, 0.018);
        }
        // мелодия: круги 0 и 1, на 2-м — передышка с колокольчиками
        if (cycle % 3 !== 2) {
          this.melody[bar].forEach(function (m) { if (m[0] === s) I.lead(m[1], t, sd * m[2] * 0.92, cycle % 3 === 1 ? 0.04 : 0.034); });
        } else if (s === 4 || s === 12) {
          I.bell(up(hz(c.pad[(bar + s) % 3]), 12), t, 0.035, 2.5);
        }
      }
    },

    /** Смена: ре минор, пульсирующий бас, монитор; ускоряется, когда время кончается. */
    shift: {
      bpm: 94, bars: 4,
      chords: [ch('D2', ['D3', 'F3', 'A3']), ch('A#1', ['D3', 'F3', 'A#3']), ch('G1', ['D3', 'G3', 'A#3']), ch('A1', ['C#3', 'E3', 'A3'])],
      melody: [
        mel([[0, 'D5', 3], [3, 'E5', 1], [4, 'F5', 4], [8, 'A5', 4], [12, 'G5', 4]]),
        mel([[0, 'F5', 6], [6, 'D5', 2], [8, 'F5', 4], [12, 'A#5', 4]]),
        mel([[0, 'G5', 4], [4, 'F5', 4], [8, 'D5', 4], [12, 'A#4', 4]]),
        mel([[0, 'C#5', 8], [8, 'E5', 4], [12, 'A4', 4]])
      ],
      setup: function (tr) { tr.bpmRange = [94, 126]; },
      step: function (I, tr, s, bar, t, sd, cycle) {
        var c = this.chords[bar], x = tr.intensity;
        if (s === 0) I.pad(c.pad, t, sd * 16, 0.012 + x * 0.006, 600 + x * 900);
        if (s % 2 === 0) I.pulseBass(s % 4 === 0 ? c.bass : up(hz(c.bass), 12), t, sd * 1.4, 0.05 + x * 0.03);
        if (s === 0 || s === 8 || (x > 0.6 && (s === 6 || s === 14))) I.kick(t, 0.14 + x * 0.1);
        if (s % 4 === 2) I.hat(t, 0.018 + x * 0.02, x > 0.75);
        if (x > 0.45 && s % 2 === 1) I.hat(t, 0.01 + x * 0.01);
        // монитор: раз в два удара, при спешке — каждый удар
        if (s % (x > 0.6 ? 4 : 8) === 0) I.ecg(t, 0.022 + x * 0.015);
        if (x > 0.3) {
          var pat = [0, 1, 2, 1];
          I.arp(up(hz(c.pad[pat[s % 4]]), 12), t, sd * 0.8, 0.012 + x * 0.012);
        }
        if (cycle % 2 === 1) this.melody[bar].forEach(function (m) { if (m[0] === s) I.lead(m[1], t, sd * m[2] * 0.85, 0.03 + x * 0.012); });
      }
    },

    /** Учебная операция: ми минор, сосредоточенно, ровный монитор. */
    operation: {
      bpm: 84, bars: 4,
      chords: [ch('E2', ['E3', 'G3', 'B3']), ch('C2', ['E3', 'G3', 'C4']), ch('G2', ['D3', 'G3', 'B3']), ch('D2', ['D3', 'F#3', 'A3'])],
      step: function (I, tr, s, bar, t, sd, cycle) {
        var c = this.chords[bar];
        if (s === 0) { I.pad(c.pad, t, sd * 16, 0.016, 700); I.bass(c.bass, t, sd * 14, 0.1); }
        if (s % 2 === 0) { var p = [0, 1, 2, 1, 0, 2, 1, 2][(s / 2) | 0]; I.arp(up(hz(c.pad[p]), 12), t, sd * 1.2, 0.02); }
        if (s % 4 === 0) I.ecg(t, 0.022);
        if (s % 4 === 2) I.hat(t, 0.012);
        if (cycle > 0 && s === 10 && bar % 2 === 1) I.bell(up(hz(c.pad[2]), 12), t, 0.03, 2.4);
      }
    },

    /** Пролог: шторм, гул, редкие ноты музыкальной шкатулки, помехи в эфире. */
    prologue: {
      bpm: 60, bars: 4,
      box: [[[0, 'D5'], [6, 'A4'], [8, 'F5'], [14, 'E5']], [[0, 'D5'], [8, 'C5'], [12, 'A4']], [[0, 'A#4'], [6, 'D5'], [8, 'F5'], [12, 'E5']], [[0, 'C#5'], [8, 'E5'], [12, 'A4']]],
      setup: function (tr) {
        tr.layers.push(RainLayer(tr.amb, 0.3));
        tr.layers.push(DroneLayer(tr.out, ['D2', 'A2'], 0.08));
      },
      step: function (I, tr, s, bar, t, sd, cycle) {
        this.box[bar].forEach(function (m) { if (m[0] === s) I.bell(m[1], t, 0.045, 3); });
        if (s === 0 && bar % 2 === 0) I.heart(t, 0.1);
        if (Math.random() < 0.02) I.staticBurst(t, 0.03, 0.2 + Math.random() * 0.4);
      }
    },

    /** Концовка: до мажор, рассвет после шторма — та же тема, но светлая. */
    ending: {
      bpm: 76, bars: 8,
      chords: [ch('C3', ['G3', 'C4', 'E4']), ch('G2', ['G3', 'B3', 'D4']), ch('A2', ['A3', 'C4', 'E4']), ch('F2', ['F3', 'A3', 'C4']),
               ch('C3', ['G3', 'C4', 'E4']), ch('G2', ['G3', 'B3', 'D4']), ch('F2', ['F3', 'A3', 'C4']), ch('C3', ['G3', 'C4', 'E4'])],
      melody: [
        mel([[0, 'E5', 6], [6, 'D5', 2], [8, 'C5', 4], [12, 'G4', 4]]),
        mel([[0, 'B4', 8], [8, 'D5', 4], [12, 'G5', 4]]),
        mel([[0, 'E5', 6], [6, 'G5', 2], [8, 'A5', 4], [12, 'E5', 4]]),
        mel([[0, 'F5', 12], [12, 'A4', 4]]),
        mel([[0, 'C5', 4], [4, 'D5', 2], [6, 'E5', 2], [8, 'G5', 8]]),
        mel([[0, 'G5', 6], [6, 'A5', 2], [8, 'B5', 4], [12, 'D6', 4]]),
        mel([[0, 'C6', 4], [4, 'A5', 4], [8, 'F5', 4], [12, 'A5', 4]]),
        mel([[0, 'G5', 8], [8, 'C6', 8]])
      ],
      step: function (I, tr, s, bar, t, sd, cycle) {
        var c = this.chords[bar];
        if (s === 0) { I.pad(c.pad, t, sd * 16, 0.02, 1100); I.bass(c.bass, t, sd * 8, 0.12); I.heart(t, 0.1); }
        if (s === 8) I.bass(up(hz(c.bass), 7), t, sd * 6, 0.08);
        if (s % 2 === 0) { var p = [0, 1, 2, 1, 2, 1, 0, 1][(s / 2) | 0]; I.arp(up(hz(c.pad[p]), 12), t, sd * 1.5, 0.02); }
        this.melody[bar].forEach(function (m) { if (m[0] === s) I.lead(m[1], t, sd * m[2] * 0.92, 0.042); });
      }
    }
  };

  /* ---------------- проигрыватель ---------------- */
  var tracks = [];          // активные (включая затухающие)
  var current = null;       // текущий трек
  var wanted = null;        // какую тему просили (до разблокировки звука)
  var stack = [];
  var intensityValue = 0;
  var schedTimer = null;

  function startTrack(name) {
    var def = TRACKS[name];
    if (!def) return null;
    var tr = { name: name, def: def, layers: [], intensity: intensityValue, step: 0, cycle: 0, alive: true, nextThunder: 0 };
    tr.out = ctx.createGain(); tr.out.gain.value = 0; tr.out.connect(musicBus);
    tr.amb = ctx.createGain(); tr.amb.gain.value = 0; tr.amb.connect(ambBus);
    tr.rev = ctx.createGain(); tr.rev.connect(musicRev);
    tr.dly = ctx.createGain(); tr.dly.connect(musicDly);
    tr.rev.gain.value = 0; tr.dly.gain.value = 0; // посылы в ревёрб/эхо затухают вместе с треком
    tr.I = Instruments(tr);
    if (def.setup) def.setup(tr);
    var t = ctx.currentTime;
    [tr.out, tr.amb, tr.rev, tr.dly].forEach(function (g) { g.gain.setTargetAtTime(1, t, 0.7); });
    tr.nextTime = t + 0.12;
    if (tr.thunderEvery) tr.nextThunder = t + 8 + Math.random() * 10;
    tracks.push(tr);
    if (!schedTimer) schedTimer = window.setInterval(schedule, 30);
    return tr;
  }
  function stopTrack(tr, fade) {
    if (!tr || !tr.alive) return;
    tr.alive = false;
    fade = fade || 1.6;
    var t = ctx.currentTime;
    [tr.out, tr.amb, tr.rev, tr.dly].forEach(function (g) { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, fade / 4); });
    tr.layers.forEach(function (l) { l.stop(fade); });
    window.setTimeout(function () {
      [tr.out, tr.amb, tr.rev, tr.dly].forEach(function (g) { try { g.disconnect(); } catch (e) {} });
      tracks = tracks.filter(function (x) { return x !== tr; });
    }, (fade + 4) * 1000);
  }
  function stepDur(tr) {
    var bpm = tr.def.bpm;
    if (tr.bpmRange) bpm = tr.bpmRange[0] + (tr.bpmRange[1] - tr.bpmRange[0]) * tr.intensity;
    return 60 / bpm / 4;
  }
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    var horizon = ctx.currentTime + 0.16;
    tracks.forEach(function (tr) {
      if (!tr.alive) return;
      if (tr.nextTime < ctx.currentTime - 0.3) tr.nextTime = ctx.currentTime + 0.05; // вкладка спала — не догоняем
      var total = tr.def.bars * 16;
      while (tr.nextTime < horizon) {
        var sd = stepDur(tr);
        var s = tr.step % 16, bar = Math.floor(tr.step / 16);
        try { tr.def.step(tr.I, tr, s, bar, tr.nextTime, sd, tr.cycle); } catch (e) {}
        tr.step += 1;
        if (tr.step >= total) { tr.step = 0; tr.cycle += 1; }
        tr.nextTime += sd;
      }
      if (tr.thunderEvery && ctx.currentTime > tr.nextThunder) {
        thunder(0.3 + Math.random() * 0.25, tr.amb);
        tr.nextThunder = ctx.currentTime + tr.thunderEvery[0] + Math.random() * (tr.thunderEvery[1] - tr.thunderEvery[0]);
      }
    });
    if (!tracks.length && schedTimer) { window.clearInterval(schedTimer); schedTimer = null; }
  }
  function switchTo(name) {
    wanted = name || null;
    if (!ready()) return;
    if (current && current.name === name && current.alive) return;
    if (current) stopTrack(current, name === 'ending' || name === 'prologue' ? 1.2 : 2);
    current = name ? startTrack(name) : null;
  }

  /* ---------------- приглушение ---------------- */
  var ducks = {};
  function applyDuck() {
    if (!ctx) return;
    var level = 1;
    Object.keys(ducks).forEach(function (k) { level = Math.min(level, ducks[k]); });
    duckNode.gain.setTargetAtTime(level, ctx.currentTime, 0.25);
  }

  /* ---------------- разблокировка ---------------- */
  var unlockCallbacks = [];
  function ready() { return !!(ctx && unlocked); }
  function unlock() {
    if (!ensure()) return Promise.resolve(false);
    var p = ctx.state === 'running' ? Promise.resolve() : ctx.resume();
    return Promise.resolve(p).then(function () {
      if (ctx.state !== 'running') return false;
      if (!unlocked) {
        unlocked = true;
        applyVolumes(true);
        applyDuck();
        if (wanted) { var w = wanted; wanted = null; switchTo(w); }
        unlockCallbacks.splice(0).forEach(function (cb) { try { cb(); } catch (e) {} });
      }
      return true;
    }).catch(function () { return false; });
  }
  function onGesture() {
    unlock().then(function (ok) {
      if (ok) {
        ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { document.removeEventListener(ev, onGesture, true); });
      }
    });
  }
  ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { document.addEventListener(ev, onGesture, true); });

  document.addEventListener('visibilitychange', function () {
    if (!ctx || !unlocked) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  /* ================================================================
     Автоматические звуки интерфейса: клики, наведение, ввод
     ================================================================ */
  var SKIP = '.diag-btn, .treat-btn, .call-opt, .tool, [data-sfx="none"], .snd-btn, .snd-panel *';
  var CONFIRM = '.btn-play, .sl-btn--main, .story-dialogue__next, [data-go], [type="submit"], .op-button:not(.op-button--flat), .btn-primary, #btn-next-shift, #btn-restart, .upgrade-buy';
  var BACK = '.sl-btn--ghost, .story-dialogue__skip, .sl-journal__close, [data-later], [data-skip], .op-back, .op-button--flat, #btn-quit, .modal__close';
  var TAB = '[data-tab], .sl-journal__tab, [role="tab"], .cabinet-tab, .pal-btn, .palette button';
  var CLICKABLE = 'button, a[href], [role="button"], summary, input[type="checkbox"], input[type="radio"], select';

  function closest(el, sel) { return el && el.closest ? el.closest(sel) : null; }

  document.addEventListener('click', function (e) {
    if (!ready()) return;
    var el = closest(e.target, CLICKABLE);
    if (!el || el.disabled) return;
    if (el.getAttribute('data-sfx') && el.getAttribute('data-sfx') !== 'none') { play(el.getAttribute('data-sfx')); return; }
    if (closest(el, SKIP)) return;
    if (closest(el, CONFIRM)) play('confirm');
    else if (closest(el, BACK)) play('back');
    else if (closest(el, TAB)) play('tab');
    else play('click');
  }, true);

  var lastHover = null, lastHoverAt = 0;
  var finePointer = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)').matches : true;
  document.addEventListener('pointerover', function (e) {
    if (!finePointer || !ready() || e.pointerType === 'touch') return;
    var el = closest(e.target, 'button:not(:disabled), a[href], [role="button"], .tool');
    if (!el || el === lastHover || closest(el, '.snd-panel')) { if (!el) lastHover = null; return; }
    lastHover = el;
    var t = Date.now();
    if (t - lastHoverAt < 70) return;
    lastHoverAt = t;
    play('hover');
  }, true);

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'INPUT' && /^(text|search|email|password|number|)$/.test(t.type || '') || t.tagName === 'TEXTAREA')) {
      if (e.key.length === 1 || e.key === 'Backspace') play('key');
      return;
    }
    if ((e.key === 'm' || e.key === 'M' || e.key === 'ь' || e.key === 'Ь') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      setMuted(!settings.muted);
    }
  }, true);

  // Диалоги и сюжетные оверлеи приглушают музыку, чтобы был слышен «голос».
  function watchBody() {
    if (!window.MutationObserver || !document.body) return;
    var was = null;
    new MutationObserver(function () {
      var open = document.body.classList.contains('story-dialogue-open');
      if (open === was) return;
      was = open;
      if (open) ducks.dialogue = 0.55; else delete ducks.dialogue;
      applyDuck();
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  /* ================================================================
     Панель громкости
     ================================================================ */
  var ICON_ON = '<svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" d="M1 6h3l4-4h1v12H8l-4-4H1z"/><path fill="currentColor" d="M11 5h1v1h1v4h-1v1h-1v-1h1V6h-1zM13 3h1v1h1v8h-1v1h-1v-1h1V4h-1z"/></svg>';
  var ICON_OFF = '<svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" d="M1 6h3l4-4h1v12H8l-4-4H1z"/><path fill="currentColor" d="M10 5h1v1h1v1h1V6h1V5h1v1h-1v1h-1v2h1v1h1v1h-1v-1h-1V9h-1v1h-1v1h-1v-1h1V9h1V7h-1V6h-1z"/></svg>';
  var ui = null;

  function mountUi() {
    if (ui || !AC) return;
    var slot = document.querySelector('[data-sound-slot]');
    var wrap = document.createElement('div');
    wrap.className = 'snd' + (slot ? '' : ' snd--floating');
    wrap.innerHTML =
      '<button type="button" class="snd-btn" aria-haspopup="true" aria-expanded="false" title="Звук (M)"></button>' +
      '<div class="snd-panel" role="dialog" aria-label="Настройки звука" hidden>' +
        '<p class="snd-panel__title">Звук</p>' +
        '<label class="snd-panel__row"><span>Музыка</span><input type="range" min="0" max="100" step="5" data-snd="music"><b></b></label>' +
        '<label class="snd-panel__row"><span>Эффекты</span><input type="range" min="0" max="100" step="5" data-snd="sfx"><b></b></label>' +
        '<button type="button" class="snd-panel__mute" data-snd-mute></button>' +
        '<p class="snd-panel__hint">Клавиша M — включить / выключить</p>' +
      '</div>';
    (slot || document.body).appendChild(wrap);
    ui = {
      wrap: wrap,
      btn: wrap.querySelector('.snd-btn'),
      panel: wrap.querySelector('.snd-panel'),
      music: wrap.querySelector('[data-snd="music"]'),
      sfx: wrap.querySelector('[data-snd="sfx"]'),
      mute: wrap.querySelector('[data-snd-mute]')
    };
    ui.btn.addEventListener('click', function () {
      unlock();
      var open = ui.panel.hidden;
      ui.panel.hidden = !open;
      ui.btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (ready()) play(open ? 'tab' : 'back');
    });
    [['music', ui.music], ['sfx', ui.sfx]].forEach(function (pair) {
      pair[1].addEventListener('input', function () {
        settings[pair[0]] = Number(pair[1].value) / 100;
        if (settings.muted && settings[pair[0]] > 0) settings.muted = false;
        saveSettings(); applyVolumes(); renderUi();
      });
      pair[1].addEventListener('change', function () { if (pair[0] === 'sfx') play('confirm'); });
    });
    ui.mute.addEventListener('click', function () { setMuted(!settings.muted); });
    document.addEventListener('pointerdown', function (e) {
      if (!ui.panel.hidden && !wrap.contains(e.target)) { ui.panel.hidden = true; ui.btn.setAttribute('aria-expanded', 'false'); }
    }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !ui.panel.hidden) { ui.panel.hidden = true; ui.btn.setAttribute('aria-expanded', 'false'); ui.btn.focus(); e.stopPropagation(); }
    }, true);
    renderUi();
  }
  function renderUi() {
    if (!ui) return;
    var off = settings.muted || (settings.music <= 0 && settings.sfx <= 0);
    ui.btn.innerHTML = off ? ICON_OFF : ICON_ON;
    ui.btn.classList.toggle('is-off', off);
    ui.btn.setAttribute('aria-label', off ? 'Звук выключен' : 'Звук включён');
    ui.music.value = Math.round(settings.music * 100);
    ui.sfx.value = Math.round(settings.sfx * 100);
    ui.music.nextElementSibling.textContent = ui.music.value;
    ui.sfx.nextElementSibling.textContent = ui.sfx.value;
    ui.mute.textContent = settings.muted ? 'Включить звук' : 'Выключить звук';
  }
  function setMuted(v) {
    settings.muted = !!v;
    saveSettings(); applyVolumes(); renderUi();
    if (!v) unlock();
  }

  /* ================================================================
     Публичный API
     ================================================================ */
  function play(name, opts) {
    if (!ready() || settings.muted || settings.sfx <= 0) return;
    var fn = FX[name];
    if (fn) { try { fn(opts); } catch (e) {} }
  }

  /** Гром в такт вспышкам молнии на оверлее (CSS: задержка 1.2 с, цикл 7 с, вспышка на 60%). */
  function storm(node) {
    if (!node) return;
    var first = 1200 + 7000 * 0.6 + 250;
    function boom() {
      if (!document.body.contains(node) || node.classList.contains('is-leaving')) return;
      if (ready() && !settings.muted) thunder(0.7 + Math.random() * 0.3, current && current.amb ? current.amb : ambBus);
      window.setTimeout(boom, 7000);
    }
    window.setTimeout(boom, first);
  }

  window.SFX = {
    play: play,
    voice: voice,
    music: function (name) { stack = name ? [name] : []; switchTo(name); },
    pushMusic: function (name) { stack.push(name); switchTo(name); },
    popMusic: function () { stack.pop(); switchTo(stack.length ? stack[stack.length - 1] : null); },
    current: function () { return current ? current.name : wanted; },
    intensity: function (x) {
      intensityValue = clamp(Number(x) || 0, 0, 1);
      tracks.forEach(function (tr) { tr.intensity = intensityValue; });
    },
    duck: function (reason, level) { ducks[reason || 'manual'] = level == null ? 0.3 : level; applyDuck(); },
    unduck: function (reason) { delete ducks[reason || 'manual']; applyDuck(); },
    storm: storm,
    unlock: unlock,
    isUnlocked: function () { return ready(); },
    needsGesture: function () { return !!AC && !ready(); },
    onUnlock: function (cb) { if (ready()) cb(); else unlockCallbacks.push(cb); },
    isMuted: function () { return settings.muted; },
    setMuted: setMuted,
    supported: !!AC,
    /** Для отладки и тестов: контекст и выходной узел. */
    _debug: function () { return { ctx: ctx, out: comp, tracks: tracks.length }; }
  };

  // Если браузер уже разрешает звук (пользователь недавно был на сайте) — стартуем сразу,
  // иначе тема запустится с первым кликом или нажатием клавиши.
  if (AC) unlock();

  function boot() { mountUi(); watchBody(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

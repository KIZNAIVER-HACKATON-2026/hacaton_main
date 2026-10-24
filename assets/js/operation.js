/* Учебная операция: перетаскивание инструментов со стола к пациенту в правильном порядке.
 *
 * Механика:
 *  - справа инструментальный стол: 8 подписанных предметов на своих местах (слотах);
 *  - слева пациент (схематично, укрыт простынёй) — зона сброса;
 *  - нужно 5 правильных инструментов строго по порядку этапов;
 *  - отпустил предмет мимо пациента / просто кликнул — предмет плавно возвращается на место;
 *  - неверный инструмент или не тот порядок — штраф, предмет возвращается на место;
 *  - верный — предмет «уходит» к пациенту, слот на столе помечается как использованный.
 * Работает мышью, пальцем (Pointer Events), касанием «выбрал → нажал на пациента» и с клавиатуры (Tab + Enter).
 * Подсказок нет: игрок видит только задачу текущего этапа.
 */
(function () {
  'use strict';
  var DATA = window.OPERATION || {};
  if (!DATA.nick) return;

  var scenario = DATA.scenario || {};
  var steps = Array.isArray(scenario.steps) ? scenario.steps : [];
  var tools = Array.isArray(scenario.tools) ? scenario.tools : [];
  var requiredIds = steps.map(function (s) { return s.tool; });

  var RULES = {
    time: 180,
    correct: 100, cleanBonus: 20,          // +очки за верный шаг и бонус, если без ошибок на этом шаге
    wrongTool: { score: 30, rep: 15, time: 8 },  // инструмент, которого нет в операции
    wrongOrder: { score: 10, rep: 5, time: 3 },  // нужный инструмент, но не сейчас
    dragThreshold: 4                       // px — меньше считается кликом
  };

  var state = {
    index: 0, score: 0, rep: 100, mistakes: 0, stepMistakes: 0, attempts: 0,
    remaining: RULES.time, finished: false, started: false, busy: false, timer: null, token: uuid(),
    used: {}, selected: null
  };

  var el = {
    time: byId('op-time'), score: byId('op-score'), rep: byId('op-rep'),
    stepNumber: byId('op-step-number'), question: byId('op-question'), description: byId('op-description'),
    feedback: byId('op-feedback'), progress: byId('op-progress'),
    scene: byId('arm-scene'), drop: byId('op-dropzone'), dropHint: byId('op-drop-hint'), tray: byId('op-tray'),
    final: byId('op-final'), finalLabel: byId('op-final-label'), finalTitle: byId('op-final-title'), finalText: byId('op-final-text'),
    finalScore: byId('op-final-score'), finalAccuracy: byId('op-final-accuracy'), finalReward: byId('op-final-reward'), finalSave: byId('op-final-save')
  };

  function byId(id) { return document.getElementById(id); }
  function esc(v) { return String(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- Пиксельные иконки инструментов (viewBox 64x40) ---------- */
  var O = 'stroke="#050b0d" stroke-width="2"';
  var TOOL_ICONS = {
    antiseptic: '<rect x="27" y="3" width="10" height="7" fill="#e8f0ea" ' + O + '/><rect x="24" y="10" width="16" height="4" fill="#cfd9dc" ' + O + '/><rect x="21" y="14" width="22" height="23" fill="#b8612f" ' + O + '/><rect x="24" y="19" width="16" height="11" fill="#e8f0ea"/><rect x="30" y="20" width="4" height="9" fill="#e2685a"/><rect x="27" y="23" width="10" height="3" fill="#e2685a"/>',
    scalpel: '<rect x="3" y="18" width="32" height="6" fill="#8fa3a8" ' + O + '/><rect x="7" y="20" width="22" height="2" fill="#b9c9cd"/><polygon points="35,15 50,14 61,20 35,25" fill="#e6eef0" ' + O + '/><rect x="37" y="18" width="16" height="2" fill="#ffffff"/>',
    trocar: '<rect x="4" y="11" width="16" height="18" fill="#3d7f9c" ' + O + '/><rect x="8" y="5" width="6" height="6" fill="#f0a95c" ' + O + '/><rect x="20" y="16" width="32" height="8" fill="#c9d6da" ' + O + '/><polygon points="52,16 62,20 52,24" fill="#e6eef0" ' + O + '/><rect x="23" y="18" width="26" height="2" fill="#ffffff"/>',
    laparoscope: '<rect x="2" y="17" width="6" height="6" fill="#1d2a30"/><rect x="7" y="11" width="14" height="18" fill="#2f4650" ' + O + '/><rect x="10" y="14" width="4" height="4" fill="#7fd6b0"/><rect x="21" y="17" width="36" height="6" fill="#c9d6da" ' + O + '/><rect x="57" y="16" width="5" height="8" fill="#7fd6b0" ' + O + '/><rect x="24" y="19" width="30" height="1" fill="#ffffff"/>',
    clip_applier: '<rect x="3" y="5" width="11" height="11" fill="none" ' + O.replace('2"', '3"') + '/><rect x="3" y="24" width="11" height="11" fill="none" ' + O.replace('2"', '3"') + '/><rect x="4" y="6" width="9" height="9" fill="none" stroke="#c9d6da" stroke-width="2"/><rect x="4" y="25" width="9" height="9" fill="none" stroke="#c9d6da" stroke-width="2"/><rect x="13" y="14" width="8" height="12" fill="#9fb3b8" ' + O + '/><rect x="21" y="17" width="34" height="6" fill="#c9d6da" ' + O + '/><polygon points="55,15 62,17 62,23 55,25" fill="#9fb3b8" ' + O + '/><rect x="58" y="19" width="5" height="2" fill="#f0c94a"/>',
    needle_holder: '<rect x="3" y="5" width="11" height="11" fill="none" stroke="#c9d6da" stroke-width="3"/><rect x="3" y="24" width="11" height="11" fill="none" stroke="#c9d6da" stroke-width="3"/><polygon points="13,13 40,19 40,21 13,16" fill="#b9c9cd" ' + O + '/><polygon points="13,27 40,21 40,19 13,24" fill="#9fb3b8" ' + O + '/><rect x="40" y="18" width="10" height="4" fill="#c9d6da" ' + O + '/><path d="M50 20 q7 -12 12 -2" fill="none" stroke="#e6eef0" stroke-width="2"/><path d="M62 18 q-4 14 -18 14 q-8 0 -10 4" fill="none" stroke="#5aa0e0" stroke-width="2"/>',
    endobag: '<rect x="3" y="18" width="24" height="4" fill="#c9d6da" ' + O + '/><path d="M27 12 h10 l14 2 q10 6 0 12 l-14 2 h-10 z" fill="#8fd8c0" fill-opacity=".75" ' + O + '/><rect x="29" y="14" width="3" height="12" fill="#e8f0ea"/><rect x="36" y="17" width="12" height="2" fill="#e8f0ea" fill-opacity=".7"/>',
    retractor: '<path d="M8 6 h8 v22 h32 v-22 h8" fill="none" stroke="#050b0d" stroke-width="8"/><path d="M8 6 h8 v22 h32 v-22 h8" fill="none" stroke="#c9d6da" stroke-width="4"/><rect x="28" y="28" width="8" height="10" fill="#8fa3a8" ' + O + '/>',
    cord_clamp: '<rect x="8" y="12" width="40" height="7" fill="#f0a95c" ' + O + '/><rect x="8" y="21" width="40" height="7" fill="#e0913f" ' + O + '/><rect x="48" y="12" width="8" height="16" fill="#f0a95c" ' + O + '/><rect x="12" y="18" width="3" height="4" fill="#fff4dc"/><rect x="19" y="18" width="3" height="4" fill="#fff4dc"/><rect x="26" y="18" width="3" height="4" fill="#fff4dc"/><rect x="33" y="18" width="3" height="4" fill="#fff4dc"/><rect x="4" y="15" width="5" height="10" fill="#e0913f" ' + O + '/>',
    plate: '<rect x="4" y="13" width="56" height="14" fill="#aab8bd" ' + O + '/><rect x="6" y="15" width="52" height="2" fill="#d6e1e4"/><rect x="10" y="17" width="6" height="6" fill="#33454c"/><rect x="22" y="17" width="6" height="6" fill="#33454c"/><rect x="36" y="17" width="6" height="6" fill="#33454c"/><rect x="48" y="17" width="6" height="6" fill="#33454c"/><rect x="8" y="31" width="4" height="7" fill="#d6e1e4" ' + O + '/><rect x="16" y="31" width="4" height="7" fill="#d6e1e4" ' + O + '/>',
    drill: '<rect x="8" y="8" width="30" height="13" fill="#4f8a7a" ' + O + '/><rect x="16" y="21" width="11" height="16" fill="#3a6a5d" ' + O + '/><rect x="27" y="22" width="4" height="6" fill="#f0a95c"/><rect x="38" y="11" width="7" height="7" fill="#8fa3a8" ' + O + '/><rect x="45" y="13" width="16" height="3" fill="#d6e1e4" ' + O + '/><rect x="11" y="11" width="10" height="3" fill="#7fd6b0"/>',
    saw: '<rect x="3" y="14" width="24" height="12" fill="#6a6f8a" ' + O + '/><rect x="6" y="17" width="10" height="3" fill="#a3a8c4"/><rect x="27" y="16" width="10" height="8" fill="#8fa3a8" ' + O + '/><polygon points="37,13 61,13 61,27 37,27" fill="#d6e1e4" ' + O + '/><path d="M37 27 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4" fill="#d6e1e4" stroke="#050b0d" stroke-width="1.5"/>',
    mallet: '<rect x="4" y="17" width="34" height="6" fill="#a07850" ' + O + '/><rect x="8" y="19" width="22" height="1" fill="#c79a6c"/><rect x="38" y="7" width="20" height="26" fill="#8a9ba0" ' + O + '/><rect x="41" y="10" width="4" height="20" fill="#c3d0d4"/>'
  };
  function toolSvg(icon, extraClass) {
    return '<svg class="tool-svg ' + (extraClass || '') + '" viewBox="0 0 64 40" aria-hidden="true">' + (TOOL_ICONS[icon] || TOOL_ICONS.scalpel) + '</svg>';
  }
  function toolById(id) { for (var i = 0; i < tools.length; i++) if (tools[i].id === id) return tools[i]; return null; }

  /* ---------- Схема пациента (неграфическая, сверху) ---------- */
  var FIELDS = {
    appendectomy:    { x: 84,  y: 172, w: 56, h: 40 },
    cholecystectomy: { x: 82,  y: 118, w: 62, h: 42 },
    cesarean:        { x: 90,  y: 190, w: 60, h: 32 },
    osteosynthesis:  { x: 190, y: 100, w: 42, h: 20, arm: true }
  };
  var visual = FIELDS[scenario.visual] ? scenario.visual : 'appendectomy';
  var F = FIELDS[visual];

  function r(x, y, w, h, fill, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '" ' + (extra || '') + '/>'; }

  function layerMarkup() {
    var cx = F.x + F.w / 2, cy = F.y + F.h / 2, L = {};
    // Антисептик — лёгкий йодный оттенок зоны.
    L.antiseptic = r(F.x, F.y, F.w, F.h, '#c0743f', 'opacity=".55"');
    // Троакары — три аккуратных порта.
    var ports = [[F.x + F.w * 0.25, F.y + F.h * 0.3], [F.x + F.w * 0.75, F.y + F.h * 0.3], [cx, F.y + F.h * 0.75]];
    L.trocar = ports.map(function (p) { return r(p[0] - 4, p[1] - 4, 8, 8, '#33454c', 'stroke="#c9d6da" stroke-width="2"'); }).join('');
    // Лапароскоп — монитор включается.
    L.laparoscope = r(197, 233, 38, 26, '#123b3a') + r(201, 237, 30, 18, '#1f6b5c') + r(214, 242, 4, 8, '#7fd6b0') + r(212, 244, 8, 4, '#7fd6b0') + r(201, 237, 8, 3, '#e2685a');
    // Клипсы — отметки на мониторе.
    L.clip_applier = r(204, 249, 3, 5, '#f0c94a') + r(209, 249, 3, 5, '#f0c94a') + r(224, 249, 3, 5, '#f0c94a');
    // Эндоконтейнер — мешочек на столике рядом.
    L.endobag = r(14, 176, 26, 20, '#2f4650', 'stroke="#050b0d" stroke-width="2"') + r(19, 180, 16, 12, '#8fd8c0', 'opacity=".8"');
    // Скальпель — тонкая линия разреза (без крови).
    L.scalpel = F.arm ? r(F.x + 6, cy - 1, F.w - 12, 2, '#8a4a3e') : r(F.x + 8, cy - 1, F.w - 16, 2, '#8a4a3e');
    // Ранорасширитель — металлические скобы по краям.
    L.retractor = r(F.x + 10, cy - 7, F.w - 20, 3, '#c9d6da', 'stroke="#050b0d" stroke-width="1"') + r(F.x + 10, cy + 4, F.w - 20, 3, '#c9d6da', 'stroke="#050b0d" stroke-width="1"');
    // Зажим пуповины — малыш в кювезе.
    L.cord_clamp = r(6, 236, 50, 36, '#d5e7e3', 'stroke="#050b0d" stroke-width="2"') + r(10, 240, 42, 28, '#a9d4e6') +
      r(18, 246, 26, 16, '#f6f1e8', 'stroke="#050b0d" stroke-width="1"') + r(20, 248, 10, 10, '#f0c8a8') + r(22, 251, 2, 2, '#17201e') + r(26, 251, 2, 2, '#17201e') + r(38, 250, 4, 4, '#f0a95c');
    // Пластина и винты.
    L.plate = r(F.x + 4, cy - 3, F.w - 8, 6, '#aab8bd', 'stroke="#050b0d" stroke-width="1"');
    L.drill = [0.2, 0.4, 0.6, 0.8].map(function (k) { return r(F.x + 4 + (F.w - 8) * k - 1, cy - 1, 3, 3, '#33454c'); }).join('');
    // Шов — стежки + пластыри на порты.
    var stitches = '';
    var hasLine = requiredIds.indexOf('scalpel') !== -1;
    if (hasLine) {
      for (var sx = F.x + 10; sx <= F.x + F.w - 10; sx += 6) stitches += r(sx, cy - 4, 2, 8, '#2d63a8');
    } else {
      stitches = ports.map(function (p) { return r(p[0] - 5, p[1] - 5, 10, 10, '#f6f8f8', 'stroke="#9fb3b8" stroke-width="1"'); }).join('');
    }
    L.needle_holder = stitches;
    return L;
  }

  function patientSvg() {
    var L = layerMarkup();
    var s = '<svg class="patient-svg" viewBox="0 0 240 300" shape-rendering="crispEdges" role="img" aria-label="Пациент на операционном столе, укрыт стерильной простынёй">';
    // пол
    s += r(0, 0, 240, 300, '#0e1d21');
    for (var gx = 0; gx < 240; gx += 30) s += r(gx, 0, 1, 300, '#132a2e');
    for (var gy = 0; gy < 300; gy += 30) s += r(0, gy, 240, 1, '#132a2e');
    // стол и подлокотники
    s += r(64, 8, 112, 286, '#5d6f74', 'stroke="#050b0d" stroke-width="3"');
    s += r(8, 96, 58, 28, '#5d6f74', 'stroke="#050b0d" stroke-width="3"') + r(174, 96, 60, 28, '#5d6f74', 'stroke="#050b0d" stroke-width="3"');
    // голова: шапочка, лицо, маска наркоза
    s += r(98, 18, 44, 46, '#4f8fb5', 'stroke="#050b0d" stroke-width="2"');
    s += r(102, 34, 36, 28, '#e3b393');
    s += r(108, 40, 7, 2, '#5b3a2e') + r(125, 40, 7, 2, '#5b3a2e');
    s += r(104, 48, 32, 14, '#8fc7d8', 'stroke="#050b0d" stroke-width="1"') + r(116, 62, 8, 10, '#6aa8bb');
    // ширма анестезиолога
    s += r(54, 76, 132, 8, '#2f7a5a', 'stroke="#050b0d" stroke-width="2"');
    // простыня: тело и руки
    s += r(68, 86, 104, 204, '#3f8f6a', 'stroke="#050b0d" stroke-width="2"');
    s += r(12, 100, 56, 20, '#3f8f6a', 'stroke="#050b0d" stroke-width="2"');
    s += r(172, 100, 58, 20, '#3f8f6a', 'stroke="#050b0d" stroke-width="2"');
    for (var fy = 96; fy < 284; fy += 22) s += r(74, fy, 92, 2, '#357a5a');
    s += r(118, 90, 2, 196, '#357a5a');
    // монитор лапароскопа (выключен по умолчанию)
    s += r(194, 230, 44, 32, '#1d2a30', 'stroke="#050b0d" stroke-width="2"') + r(213, 262, 6, 18, '#33454c') + r(203, 280, 26, 5, '#33454c');
    s += r(197, 233, 38, 26, '#0a1416');
    // операционное окно в простыне
    s += r(F.x - 3, F.y - 3, F.w + 6, F.h + 6, '#2b5d48');
    s += r(F.x, F.y, F.w, F.h, '#e6c2a5');
    s += '<rect class="patient-target" x="' + (F.x - 6) + '" y="' + (F.y - 6) + '" width="' + (F.w + 12) + '" height="' + (F.h + 12) + '" fill="none" stroke="#f0a95c" stroke-width="2" stroke-dasharray="4 3"/>';
    // слои прогресса — появляются по мере использования инструментов
    ['antiseptic', 'scalpel', 'retractor', 'trocar', 'plate', 'drill', 'laparoscope', 'clip_applier', 'endobag', 'cord_clamp', 'needle_holder'].forEach(function (key) {
      if (requiredIds.indexOf(key) !== -1 && L[key]) s += '<g class="patient-layer" data-layer="' + key + '">' + L[key] + '</g>';
    });
    s += '</svg>';
    return s;
  }

  function setupScene() {
    el.scene.innerHTML = patientSvg();
    el.progress.innerHTML = steps.map(function () { return '<i></i>'; }).join('');
  }
  function showLayer(toolId) {
    var g = el.scene.querySelector('[data-layer="' + toolId + '"]');
    if (g) g.classList.add('is-on');
    // после ранорасширителя линия разреза уже под скобами — после шва скрываем расширитель
    if (toolId === 'needle_holder') {
      ['retractor', 'trocar'].forEach(function (k) { var x = el.scene.querySelector('[data-layer="' + k + '"]'); if (x) x.classList.remove('is-on'); });
    }
  }

  /* ---------- Стол с инструментами ---------- */
  function renderTray() {
    el.tray.innerHTML = tools.map(function (tool, i) {
      return '<div class="tray-slot" data-slot="' + i + '" data-tool="' + esc(tool.id) + '">' +
        '<div class="tray-slot__place">' + toolSvg(tool.icon, 'tray-slot__ghost') +
          '<button type="button" class="tool" data-tool="' + esc(tool.id) + '" aria-label="' + esc(tool.name) + ': перетащите к пациенту или нажмите Enter">' + toolSvg(tool.icon) + '</button>' +
        '</div>' +
        '<span class="tray-slot__label">' + esc(tool.name) + '</span>' +
      '</div>';
    }).join('');
    Array.prototype.forEach.call(el.tray.querySelectorAll('.tool'), bindTool);
  }

  /* ---------- Drag & drop на Pointer Events ---------- */
  var drag = null;

  function bindTool(btn) {
    btn.addEventListener('pointerdown', onDown);
    btn.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && canInteract()) { e.preventDefault(); applyTool(btn, null); }
    });
    btn.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }
  function canInteract() { return state.started && !state.finished && !state.busy; }

  function onDown(e) {
    if (!canInteract() || drag || (e.button !== undefined && e.button !== 0)) return;
    var btn = e.currentTarget;
    if (btn.classList.contains('is-returning')) return;
    e.preventDefault();
    try { btn.setPointerCapture(e.pointerId); } catch (err) {}
    drag = { btn: btn, id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, moved: false };
    btn.classList.add('is-grabbed');
    btn.closest('.tray-slot').classList.add('is-lifted');
    document.body.classList.add('is-dragging-tool');
    btn.addEventListener('pointermove', onMove);
    btn.addEventListener('pointerup', onUp);
    btn.addEventListener('pointercancel', onCancel);
    btn.addEventListener('lostpointercapture', onCancel);
    setTransform(btn, 0, 0, true);
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x0; drag.dy = e.clientY - drag.y0;
    if (!drag.moved && Math.abs(drag.dx) + Math.abs(drag.dy) > RULES.dragThreshold) drag.moved = true;
    setTransform(drag.btn, drag.dx, drag.dy, true);
    el.drop.classList.toggle('is-over', isOverDrop(e.clientX, e.clientY));
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = endDrag();
    if (d.moved && isOverDrop(e.clientX, e.clientY)) { clearSelection(); applyTool(d.btn, d); return; }
    returnHome(d.btn); // кликнули или отпустили мимо — предмет возвращается на место
    if (!d.moved) toggleSelection(d.btn); // короткое касание — выбрать предмет (удобно на телефоне)
    else clearSelection();
  }
  function onCancel(e) {
    if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.id)) return;
    var d = endDrag();
    returnHome(d.btn);
  }
  function endDrag() {
    var d = drag; drag = null;
    var btn = d.btn;
    btn.removeEventListener('pointermove', onMove);
    btn.removeEventListener('pointerup', onUp);
    btn.removeEventListener('pointercancel', onCancel);
    btn.removeEventListener('lostpointercapture', onCancel);
    try { btn.releasePointerCapture(d.id); } catch (err) {}
    document.body.classList.remove('is-dragging-tool');
    el.drop.classList.remove('is-over');
    return d;
  }
  /* Касание без перетаскивания: выбрать предмет, затем нажать на пациента. */
  function toggleSelection(btn) {
    if (state.selected === btn) { clearSelection(); return; }
    clearSelection();
    state.selected = btn;
    btn.closest('.tray-slot').classList.add('is-selected');
    el.drop.classList.add('is-armed');
    el.dropHint.textContent = 'Нажмите на пациента';
  }
  function clearSelection() {
    if (state.selected) state.selected.closest('.tray-slot').classList.remove('is-selected');
    state.selected = null;
    el.drop.classList.remove('is-armed');
    if (!state.finished) el.dropHint.textContent = 'Перетащите инструмент сюда';
  }
  el.drop.addEventListener('click', function () {
    if (!state.selected || !canInteract()) return;
    var btn = state.selected;
    clearSelection();
    applyTool(btn, null);
  });

  function setTransform(btn, dx, dy, lifted) {
    btn.style.transform = 'translate(' + dx + 'px,' + dy + 'px)' + (lifted ? ' scale(1.12) rotate(-6deg)' : '');
  }
  function isOverDrop(x, y) {
    var b = el.drop.getBoundingClientRect();
    return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
  }

  function returnHome(btn, shake) {
    btn.classList.remove('is-grabbed');
    btn.classList.add('is-returning');
    if (shake) btn.classList.add('is-rejected');
    // форсируем reflow, чтобы transition сработал от текущей позиции
    void btn.offsetWidth;
    btn.style.transform = '';
    var done = false;
    function finish() {
      if (done) return; done = true;
      btn.classList.remove('is-returning', 'is-rejected');
      var slot = btn.closest('.tray-slot'); if (slot) slot.classList.remove('is-lifted');
    }
    btn.addEventListener('transitionend', function handler(ev) { if (ev.propertyName === 'transform') { btn.removeEventListener('transitionend', handler); finish(); } });
    setTimeout(finish, 600);
  }

  /** Летим к операционному окну — для клавиатуры (или после броска) */
  function flyToPatient(btn, d) {
    var target = el.scene.querySelector('.patient-target');
    var tb = (target || el.drop).getBoundingClientRect();
    var slot = btn.closest('.tray-slot__place').getBoundingClientRect();
    var dx = tb.left + tb.width / 2 - (slot.left + slot.width / 2);
    var dy = tb.top + tb.height / 2 - (slot.top + slot.height / 2);
    btn.classList.remove('is-grabbed');
    btn.classList.add('is-applied');
    if (!d) { void btn.offsetWidth; }
    btn.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.35)';
  }

  /* ---------- Логика шага ---------- */
  function applyTool(btn, d) {
    if (!canInteract()) { returnHome(btn); return; }
    var id = btn.getAttribute('data-tool');
    var tool = toolById(id) || { name: id };
    var step = steps[state.index];
    state.attempts += 1;

    if (id === step.tool) {
      state.busy = true;
      var gained = RULES.correct + (state.stepMistakes === 0 ? RULES.cleanBonus : 0);
      state.score += gained;
      state.used[id] = true;
      flyToPatient(btn, d);
      el.drop.classList.add('is-accepted');
      setFeedback('good', '✓ Верно! ' + step.note + ' +' + gained);
      setTimeout(function () {
        var slot = btn.closest('.tray-slot');
        slot.classList.remove('is-lifted', 'is-selected');
        slot.classList.add('is-used');
        btn.disabled = true;
        btn.tabIndex = -1;
        el.drop.classList.remove('is-accepted');
        showLayer(id);
        state.index += 1;
        state.stepMistakes = 0;
        state.busy = false;
        renderHud();
        renderProgress();
        if (state.index >= steps.length) finish(true); else renderStep(true);
      }, 520);
      renderHud();
      return;
    }

    // Ошибка: предмет возвращается на своё место со «встряской»
    var laterIndex = requiredIds.indexOf(id);
    var p = laterIndex > state.index ? RULES.wrongOrder : RULES.wrongTool;
    state.mistakes += 1;
    state.stepMistakes += 1;
    state.score = Math.max(0, state.score - p.score);
    state.rep = Math.max(0, state.rep - p.rep);
    state.remaining = Math.max(0, state.remaining - p.time);
    if (laterIndex > state.index) {
      setFeedback('warn', '«' + tool.name + '» понадобится, но позже. −' + p.score + ' очков, −' + p.time + ' сек.');
    } else {
      setFeedback('bad', '«' + tool.name + '» не нужен в этой операции. −' + p.score + ' очков, −' + p.time + ' сек.');
    }
    el.drop.classList.add('is-rejected');
    setTimeout(function () { el.drop.classList.remove('is-rejected'); }, 450);
    returnHome(btn, true);
    renderHud();
    if (state.rep <= 0 || state.remaining <= 0) setTimeout(function () { finish(false); }, 400);
  }

  function setFeedback(kind, text) {
    el.feedback.textContent = text;
    el.feedback.className = 'op-feedback is-' + kind;
  }

  /* ---------- Рендер ---------- */
  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var n = Math.random() * 16 | 0; return (c === 'x' ? n : (n & 3 | 8)).toString(16); });
  }
  function formatTime(sec) { sec = Math.max(0, sec); var m = Math.floor(sec / 60), s = sec % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }

  function renderHud() {
    el.time.textContent = formatTime(state.remaining);
    el.score.textContent = state.score;
    el.rep.textContent = state.rep;
    el.time.classList.toggle('is-warning', state.remaining <= 45);
  }
  function renderProgress() {
    Array.prototype.forEach.call(el.progress.querySelectorAll('i'), function (tick, i) {
      tick.classList.toggle('is-done', i < state.index);
      tick.classList.toggle('is-current', i === state.index && !state.finished);
    });
  }
  function renderStep(keepFeedback) {
    var step = steps[state.index];
    el.stepNumber.textContent = 'Шаг ' + (state.index + 1) + ' из ' + steps.length;
    el.question.textContent = step.title;
    el.description.textContent = step.description;
    if (!keepFeedback) setFeedback('info', 'Перетащите нужный инструмент к пациенту.');
    renderProgress();
    renderHud();
  }

  function tick() {
    if (state.finished) return;
    state.remaining -= 1;
    renderHud();
    if (state.remaining <= 0) finish(false);
  }

  function finish(success) {
    if (state.finished) return;
    state.finished = true;
    clearInterval(state.timer);
    if (drag) returnHome(endDrag().btn);
    clearSelection();
    renderProgress();
    el.drop.classList.add(success ? 'is-complete' : 'is-stopped');
    el.dropHint.textContent = success ? 'Операция завершена' : 'Операция остановлена';
    if (success) state.score += Math.max(0, state.remaining); // бонус за оставшееся время
    renderHud();

    var accuracy = state.attempts ? Math.round(steps.length / Math.max(state.attempts, steps.length) * 100) : 0;
    if (!success) accuracy = state.attempts ? Math.round(state.index / state.attempts * 100) : 0;
    el.finalLabel.textContent = success ? 'Операция завершена' : 'Операция остановлена';
    el.finalTitle.textContent = success ? 'Отличная работа, ассистент!' : 'Нужна дополнительная тренировка';
    el.finalText.textContent = success
      ? 'Все ' + steps.length + ' этапов операции «' + scenario.title + '» выполнены в правильном порядке. Ошибок: ' + state.mistakes + '. Бонус за оставшееся время включён в счёт.'
      : 'Время или точность закончились раньше: выполнено ' + state.index + ' из ' + steps.length + ' этапов. Попробуйте ещё раз — порядок инструментов запоминается быстро.';
    el.finalScore.textContent = state.score;
    el.finalAccuracy.textContent = accuracy + '%';
    el.finalReward.textContent = success ? '+90 ₽ · +50 XP' : '+20 ₽ · +10 XP';
    el.finalSave.textContent = 'Записываем результат и прогресс кабинета…';
    submit(success);

    var debrief = success ? [
      { speaker: 'ilya', text: 'Отлично! Ты подавал инструменты в правильном порядке и не взял лишнего. Именно так работает операционная сестра — хирург протягивает руку, а нужный инструмент уже в ней.' },
      { speaker: 'vera', text: 'Результат записан. Продолжай смены и тренировки — подстанция растёт вместе с тобой.' }
    ] : [
      { speaker: 'ilya', text: 'Ничего страшного: это тренажёр. Запомни логику — сначала обработка поля, потом доступ, основная работа и только в конце швы.' },
      { speaker: 'vera', text: 'Результат записан. Попробуй ещё раз — с каждым повтором порядок запоминается лучше.' }
    ];
    var storyKey = success ? 'operation-debrief-success' : 'operation-debrief-retry';
    function revealFinal() {
      el.final.hidden = false;
      var firstAction = byId('op-again');
      if (firstAction) firstAction.focus();
    }
    setTimeout(function () {
      if (window.StoryDialogue) {
        window.StoryDialogue.showOnce(storyKey, debrief, { nickname: DATA.nick, title: success ? 'Сюжет · разбор операции' : 'Сюжет · поддержка наставника' }).then(revealFinal);
      } else {
        revealFinal();
      }
    }, 900);
  }

  function submit(success) {
    if (!DATA.endpoint || state.score <= 0) { el.finalSave.textContent = 'Результат без очков не отправлен в таблицу.'; return; }
    fetch(DATA.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ nickname: DATA.nick, score: state.score, token: state.token, mode: 'operation', success: success }) })
      .then(function (response) { return response.json().catch(function () { return null; }); })
      .then(function (data) { el.finalSave.textContent = data && data.ok ? 'Результат сохранён. Место в топе: #' + (data.rank || '—') + '. Прогресс обновлён в личном кабинете.' : 'Не удалось сохранить результат: база недоступна.'; })
      .catch(function () { el.finalSave.textContent = 'Нет связи: результат не сохранён.'; });
  }

  function startScenario() {
    state.started = true;
    renderStep();
    state.timer = setInterval(tick, 1000);
  }

  function showTrainingBriefing() {
    var progress = DATA.storyProgress || {};
    if (!window.StoryDialogue || Number(progress.operations_finished) > 0) { startScenario(); return; }
    window.StoryDialogue.showOnce('operation-dnd-briefing', [
      { speaker: 'ilya', text: 'Сегодня ты ассистируешь хирургу. Слева — пациент под стерильной простынёй, справа — инструментальный стол.' },
      { speaker: 'ilya', text: 'Перетаскивай нужный инструмент к пациенту. На столе восемь предметов, а нужны только пять — и строго по порядку. Передумал — просто отпусти предмет, он вернётся на место. На телефоне можно проще: нажми на предмет, потом на пациента.' }
    ], { nickname: DATA.nick, title: 'Сюжет · тренировка с наставником' }).then(startScenario);
  }

  setupScene();
  renderTray();
  renderProgress();
  renderHud();
  showTrainingBriefing();
})();

// assets/app.js — движок «Смена 03» (одна сложность)

const CONFIG = window.CONFIG || {
  penalty: 10,
  pointsPerDiagnosis: 50,
};

const Game = {
  score: 0,
  reputation: 100,
  selectedCorrect: false,

  $(sel) { return document.querySelector(sel); },
  show(el) { el?.classList.remove('hidden'); },
  hide(el) { el?.classList.add('hidden'); },

  init() {
    // --- Лендинг: «Играть» → модалка ника ---
    this.$('#btn-play')?.addEventListener('click', () => this.openNick());
    this.$('#btn-cancel')?.addEventListener('click', () => this.hide(this.$('#nick-screen')));
    this.$('#btn-start')?.addEventListener('click', () => this.startFromLanding());
    this.$('#nick-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.startFromLanding();
    });

    // --- Страница пациента ---
    if (window.PATIENT) this.initPatientPage();
  },

  // ---------- Лендинг ----------
  openNick() {
    this.show(this.$('#nick-screen'));
    this.$('#nick-input')?.focus();
  },

  validateNick(nick) {
    const err = this.$('#nick-error');
    const clean = (nick || '').trim();
    if (clean.length < 3) { this.showError(err, 'Ник должен быть от 3 до 16 символов.'); return null; }
    if (clean.length > 16) { this.showError(err, 'Ник слишком длинный (макс. 16).'); return null; }
    this.hide(err);
    return clean;
  },

  showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  },

  startFromLanding() {
    const nick = this.validateNick(this.$('#nick-input')?.value);
    if (!nick) return;
    // сохраняем ник и уходим на страницу пациента
    try { localStorage.setItem('nick', nick); } catch (e) {}
    window.location.href = 'patient.php?nick=' + encodeURIComponent(nick);
  },

  // ---------- Страница пациента ----------
  initPatientPage() {
    const p = window.PATIENT;
    this.score = Number(localStorage.getItem('score_' + (window.NICK || 'guest')) || 0);
    this.reputation = Number(localStorage.getItem('rep_' + (window.NICK || 'guest')) || 100);

    const grid = this.$('#diag-grid');
    if (grid) {
      grid.querySelectorAll('.diag-btn').forEach(btn => {
        btn.addEventListener('click', () => this.chooseDiagnosis(btn));
      });
    }

    this.$('#btn-treat')?.addEventListener('click', () => {
      if (!this.selectedCorrect) return;
      // Переход к лечению. Мидл-3 вставит treatment.php / мини-игру.
      const nick = encodeURIComponent(window.NICK || 'guest');
      window.location.href = 'treatment.php?nick=' + nick + '&id=' + p.id;
    });

    this.updateDiagError();
  },

  chooseDiagnosis(btn) {
    if (!btn) return;
    const isCorrect = btn.dataset.correct === '1';
    const err = this.$('#diag-error');

    // сброс подсветки у остальных
    document.querySelectorAll('.diag-btn').forEach(b => b.classList.remove('correct', 'wrong'));

    if (isCorrect) {
      btn.classList.add('correct');
      this.selectedCorrect = true;
      this.hide(err);
      this.addScore(CONFIG.pointsPerDiagnosis);
      this.unlockTreat(true);
    } else {
      btn.classList.add('wrong');
      this.selectedCorrect = false;
      this.score = Math.max(0, this.score - CONFIG.penalty);
      this.reputation = Math.max(0, this.reputation - CONFIG.penalty);
      this.persist();
      this.showError(err, `Неверный диагноз. −${CONFIG.penalty} очков и репутации. Попробуй ещё раз.`);
      this.unlockTreat(false);
      setTimeout(() => btn.classList.remove('wrong'), 1000);
      if (this.reputation <= 0) {
        this.showError(err, 'Репутация упала до нуля. Смена провалена.');
        this.unlockTreat(false, true);
      }
    }
  },

  unlockTreat(on, blocked = false) {
    const treat = this.$('#btn-treat');
    if (!treat) return;
    treat.disabled = !on || blocked;
  },

  addScore(points) {
    this.score += Math.max(0, points | 0);
    this.persist();
  },

  persist() {
    const nick = window.NICK || 'guest';
    try {
      localStorage.setItem('score_' + nick, String(this.score));
      localStorage.setItem('rep_' + nick, String(this.reputation));
    } catch (e) {}
  },

  updateDiagError() {
    // если репутация уже 0 при заходе — сразу блокируем
    if (this.reputation <= 0) {
      this.showError(this.$('#diag-error'), 'Репутация упала до нуля. Смена провалена.');
      this.unlockTreat(false, true);
    }
  },
};

document.addEventListener('DOMContentLoaded', () => Game.init());
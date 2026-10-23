// assets/patients.js
// Одна сложность. Параметры — в CONFIG. Новые пациенты = объекты в PATIENTS.
const CONFIG = {
  shiftSeconds: 5 * 60,   // длительность смены
  penalty: 10,            // штраф за неверный диагноз (очки и репутация)
  pointsPerDiagnosis: 50, // очки за верный диагноз
};

const PATIENTS = [
  {
    id: 'p1',
    name: 'Иванов Пётр',
    age: 54,
    emoji: '🧔',
    avatarBg: '#DBEAFE',
    symptoms: ['Давящая боль в груди', 'Одышка', 'Холодный пот', 'Боль отдаёт в левую руку'],
    vitals: { ad: '150/95', pulse: '102', temp: '36.7', spo2: '94%' },
    diagnoses: [
      { id: 'd1', label: 'Инфаркт', icon: '❤️‍🩹', correct: true },
      { id: 'd2', label: 'Гастрит', icon: '🫃', correct: false },
      { id: 'd3', label: 'Остеохондроз', icon: '🦴', correct: false },
    ],
    treatment: ['Нитроглицерин под язык', 'Кислород', 'ЭКГ', 'Госпитализация'],
  },
  {
    id: 'p2',
    name: 'Сидорова Анна',
    age: 28,
    emoji: '👩',
    avatarBg: '#FCE7F3',
    symptoms: ['Температура 39.2', 'Сухой кашель', 'Головная боль', 'Слабость'],
    vitals: { ad: '110/70', pulse: '98', temp: '39.2', spo2: '96%' },
    diagnoses: [
      { id: 'd1', label: 'ОРВИ', icon: '🤧', correct: true },
      { id: 'd2', label: 'Аппендицит', icon: '🏥', correct: false },
      { id: 'd3', label: 'Мигрень', icon: '🧠', correct: false },
    ],
    treatment: ['Жаропонижающее', 'Обильное питьё', 'Постельный режим'],
  },
  {
    id: 'p3',
    name: 'Козлов Игорь',
    age: 41,
    emoji: '👨',
    avatarBg: '#FEF3C7',
    symptoms: ['Резкая боль в правом боку', 'Тошнота', 'Температура 37.8'],
    vitals: { ad: '130/80', pulse: '92', temp: '37.8', spo2: '98%' },
    diagnoses: [
      { id: 'd1', label: 'Аппендицит', icon: '🏥', correct: true },
      { id: 'd2', label: 'Отравление', icon: '🤢', correct: false },
      { id: 'd3', label: 'Радикулит', icon: '🦴', correct: false },
    ],
    treatment: ['Не кормить', 'Холод на живот', 'Срочная госпитализация'],
  },
];
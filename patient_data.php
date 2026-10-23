<?php
// patient_data.php — общий источник данных пациента.
// Позже заменится на MySQL-выборку (Мидл-2). Контракт getPatient(?int $id): array сохраняется.

function getAllPatients(): array {
    return [
        1 => [
            'id' => 1,
            'fio' => 'Иванов Пётр Сергеевич',
            'age' => 54,
            'emoji' => '🧔',
            'avatarBg' => '#DBEAFE',
            'symptoms' => ['Давящая боль в груди', 'Одышка', 'Холодный пот', 'Боль отдаёт в левую руку'],
            'vitals' => ['ad' => '150/95', 'pulse' => '102', 'temp' => '36.7', 'spo2' => '94%'],
            'diagnoses' => [
                ['label' => 'Инфаркт', 'icon' => '❤️‍🩹', 'correct' => true],
                ['label' => 'Гастрит', 'icon' => '🫃', 'correct' => false],
                ['label' => 'Остеохондроз', 'icon' => '🦴', 'correct' => false],
            ],
        ],
        2 => [
            'id' => 2,
            'fio' => 'Сидорова Анна Викторовна',
            'age' => 28,
            'emoji' => '👩',
            'avatarBg' => '#FCE7F3',
            'symptoms' => ['Температура 39.2', 'Сухой кашель', 'Головная боль', 'Слабость'],
            'vitals' => ['ad' => '110/70', 'pulse' => '98', 'temp' => '39.2', 'spo2' => '96%'],
            'diagnoses' => [
                ['label' => 'ОРВИ', 'icon' => '🤧', 'correct' => true],
                ['label' => 'Аппендицит', 'icon' => '🏥', 'correct' => false],
                ['label' => 'Мигрень', 'icon' => '🧠', 'correct' => false],
            ],
        ],
        3 => [
            'id' => 3,
            'fio' => 'Козлов Игорь Анатольевич',
            'age' => 41,
            'emoji' => '👨',
            'avatarBg' => '#FEF3C7',
            'symptoms' => ['Резкая боль в правом боку', 'Тошнота', 'Температура 37.8'],
            'vitals' => ['ad' => '130/80', 'pulse' => '92', 'temp' => '37.8', 'spo2' => '98%'],
            'diagnoses' => [
                ['label' => 'Аппендицит', 'icon' => '🏥', 'correct' => true],
                ['label' => 'Отравление', 'icon' => '🤢', 'correct' => false],
                ['label' => 'Радикулит', 'icon' => '🦴', 'correct' => false],
            ],
        ],
    ];
}

function getPatient(?int $id): array {
    $all = getAllPatients();
    if ($id !== null && isset($all[$id])) return $all[$id];
    return $all[array_rand($all)];
}
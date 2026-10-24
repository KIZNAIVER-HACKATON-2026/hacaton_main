<?php
/**
 * Единый баланс развития личного кабинета.
 * Значения намеренно высокие: один полный забег не открывает улучшения.
 */

function progression_equipment(): array
{
    return [
        [
            'id' => 'cart', 'name' => 'Тележка неотложной помощи', 'icon' => '🧰',
            'cost' => 600, 'xp' => 140, 'saved' => 4, 'shifts' => 2,
            'bonus' => 'Открывает первый уровень оснащения',
            'desc' => 'Базовая тележка с расходниками и маркированными лотками.',
        ],
        [
            'id' => 'defibrillator', 'name' => 'Дефибриллятор «Аксион»', 'icon' => '⚡',
            'cost' => 1250, 'xp' => 420, 'saved' => 12, 'shifts' => 5,
            'bonus' => 'Знак готовности экстренного поста',
            'desc' => 'Переносной аппарат для учебного оснащения реанимационного поста.',
        ],
        [
            'id' => 'monitor', 'name' => 'Монитор витальных функций', 'icon' => '📈',
            'cost' => 2200, 'xp' => 800, 'saved' => 25, 'shifts' => 10,
            'bonus' => 'Открывает расширенный профиль кабинета',
            'desc' => 'Монитор наблюдения с учебным экраном ЭКГ и SpO₂.',
        ],
        [
            'id' => 'fridge', 'name' => 'Фарм-холодильник', 'icon' => '🧊',
            'cost' => 3800, 'xp' => 1400, 'saved' => 45, 'shifts' => 16,
            'bonus' => 'Подтверждает уровень «Опытный»',
            'desc' => 'Специализированное хранение термолабильных учебных препаратов.',
        ],
        [
            'id' => 'radio', 'name' => 'Диспетчерская радиостанция', 'icon' => '📻',
            'cost' => 6000, 'xp' => 2300, 'saved' => 75, 'shifts' => 25,
            'bonus' => 'Финальное оснащение подстанции',
            'desc' => 'Стационарная радиостанция прямой связи с учебным диспетчерским центром.',
        ],
    ];
}

function progression_hospital_levels(): array
{
    return [
        1 => [
            'name' => 'Приёмное отделение', 'cost' => 900, 'xp' => 220, 'saved' => 6, 'shifts' => 3,
            'desc' => 'Навигация, зона ожидания и базовая регистрация пациентов.',
        ],
        2 => [
            'name' => 'Триаж-пост', 'cost' => 2100, 'xp' => 650, 'saved' => 20, 'shifts' => 8,
            'desc' => 'Организация первичного осмотра и приоритизации обращений.',
        ],
        3 => [
            'name' => 'Диагностический блок', 'cost' => 4300, 'xp' => 1350, 'saved' => 42, 'shifts' => 15,
            'desc' => 'Расширенная зона наблюдения и учебной диагностики.',
        ],
        4 => [
            'name' => 'Координационный центр', 'cost' => 7800, 'xp' => 2500, 'saved' => 80, 'shifts' => 28,
            'desc' => 'Максимальный уровень развития учебной больницы.',
        ],
    ];
}

function progression_default_profile(): array
{
    return [
        'budget' => 0,
        'xp' => 0,
        'total_saved' => 0,
        'shifts_finished' => 0,
        'operations_finished' => 0,
        'operations_success' => 0,
        'hospital_level' => 0,
        'equipment' => [],
        'streak' => 0,
        'last_played_on' => null,
    ];
}

function progression_catalog_item(string $kind, string $id): ?array
{
    if ($kind === 'equipment') {
        foreach (progression_equipment() as $item) {
            if ($item['id'] === $id) return $item;
        }
        return null;
    }

    if ($kind === 'hospital') {
        $level = (int) $id;
        $levels = progression_hospital_levels();
        return $levels[$level] ?? null;
    }

    return null;
}

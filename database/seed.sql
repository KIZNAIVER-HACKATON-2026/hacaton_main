-- Тестовые данные для локальной проверки (schema.sql должен быть импортирован первым).
USE `shift03`;
SET NAMES utf8mb3 COLLATE utf8mb3_general_ci;

INSERT INTO `players` (`nickname`) VALUES
  ('Test01'),
  ('Тест02'),
  ('Фельдшер'),
  ('Ночной03'),
  ('Смена03')
ON DUPLICATE KEY UPDATE `nickname` = VALUES(`nickname`);

-- Справочник диагнозов для механики выбора.
-- ID закреплены, чтобы кейсы в конфиге игры могли ссылаться на correctDiagnosisId.
INSERT INTO `diagnoses` (`diagnosis_id`, `title`, `short_description`) VALUES
  (1, 'ОРВИ', 'Простудное заболевание: насморк, боль в горле и кашель; температура обычно повышается постепенно.'),
  (2, 'Грипп', 'Вирусная инфекция с резким началом: высокая температура, ломота в теле, сильная слабость и кашель.'),
  (3, 'Пищевое отравление', 'После еды появились тошнота, рвота или диарея; часто болит живот.'),
  (4, 'Острый отит', 'Воспаление уха: боль в ухе, иногда температура и временное ухудшение слуха.'),
  (5, 'Растяжение голеностопа', 'После подворачивания стопы появились боль и отёк вокруг голеностопного сустава.'),
  (6, 'Аллергическая реакция', 'После контакта с аллергеном появились зуд, покраснение или сыпь на коже.')
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `short_description` = VALUES(`short_description`);

-- INSERT IGNORE делает повторный импорт seed.sql безопасным по токенам.
INSERT IGNORE INTO `records`
  (`player_id`, `score`, `finished_at`, `submission_token`)
SELECT `player_id`, 920, '2026-10-20 21:15:00', '00000000-0000-4000-8000-000000000001'
FROM `players` WHERE `nickname` = 'Test01';

INSERT IGNORE INTO `records`
  (`player_id`, `score`, `finished_at`, `submission_token`)
SELECT `player_id`, 810, '2026-10-20 22:10:00', '00000000-0000-4000-8000-000000000002'
FROM `players` WHERE `nickname` = 'Тест02';

INSERT IGNORE INTO `records`
  (`player_id`, `score`, `finished_at`, `submission_token`)
SELECT `player_id`, 760, '2026-10-21 00:05:00', '00000000-0000-4000-8000-000000000003'
FROM `players` WHERE `nickname` = 'Фельдшер';

INSERT IGNORE INTO `records`
  (`player_id`, `score`, `finished_at`, `submission_token`)
SELECT `player_id`, 650, '2026-10-21 01:20:00', '00000000-0000-4000-8000-000000000004'
FROM `players` WHERE `nickname` = 'Ночной03';

INSERT IGNORE INTO `records`
  (`player_id`, `score`, `finished_at`, `submission_token`)
SELECT `player_id`, 540, '2026-10-21 02:35:00', '00000000-0000-4000-8000-000000000005'
FROM `players` WHERE `nickname` = 'Смена03';

-- Пример сейва для кнопки «Продолжить» у Test01.
INSERT INTO `saves` (`player_id`, `state_json`)
SELECT `player_id`, '{"version":1,"remainingSeconds":142,"score":230,"reputation":72,"patientIndex":2}'
FROM `players` WHERE `nickname` = 'Test01'
ON DUPLICATE KEY UPDATE
  `state_json` = VALUES(`state_json`),
  `saved_at` = CURRENT_TIMESTAMP;

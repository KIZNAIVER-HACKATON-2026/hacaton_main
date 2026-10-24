-- Миграция: сюжет «Вернуться на линию» (2026).
-- Необязательна: includes/story.php создаёт таблицу автоматически при первом обращении.
-- Запуск вручную: mysql -u root shift03 < database/migration_2026_story.sql

-- Сюжет «Вернуться на линию»: прогресс игрока по эпизодам (одна строка на игрока).
-- episode — сколько эпизодов пройдено; team / self_trust — накопленные отношения;
-- flags_json — флаги выборов в сюжетных звонках; ending — id концовки после финала.
CREATE TABLE IF NOT EXISTS `player_story` (
  `player_id` INT UNSIGNED NOT NULL,
  `episode` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `team` TINYINT NOT NULL DEFAULT 0,
  `self_trust` TINYINT NOT NULL DEFAULT 0,
  `flags_json` TEXT NULL,
  `choices_json` TEXT NULL,
  `ending` VARCHAR(32) NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`player_id`),
  CONSTRAINT `fk_story_player`
    FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb3
  COLLATE utf8mb3_general_ci;

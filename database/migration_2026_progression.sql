-- Выполните этот файл один раз на уже существующей базе shift03.
-- Для чистой установки достаточно актуального schema.sql.
USE `shift03`;

CREATE TABLE IF NOT EXISTS `player_progress` (
  `player_id` INT UNSIGNED NOT NULL,
  `budget` INT UNSIGNED NOT NULL DEFAULT 0,
  `xp` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_saved` INT UNSIGNED NOT NULL DEFAULT 0,
  `shifts_finished` INT UNSIGNED NOT NULL DEFAULT 0,
  `operations_finished` INT UNSIGNED NOT NULL DEFAULT 0,
  `operations_success` INT UNSIGNED NOT NULL DEFAULT 0,
  `hospital_level` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `equipment_json` TEXT NOT NULL,
  `streak` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `last_played_on` DATE NULL,
  PRIMARY KEY (`player_id`),
  CONSTRAINT `fk_progress_player`
    FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;

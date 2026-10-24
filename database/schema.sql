-- Смена 03 — схема БД для MySQL / OpenServer
-- Версия без выбора сложности: сложность не хранится ни в сейвах, ни в рекордах.
-- Кодировка по требованию проекта: utf8mb3_general_ci.
-- Импортировать этот файл первым.

CREATE DATABASE IF NOT EXISTS `shift03`
  CHARACTER SET utf8mb3
  COLLATE utf8mb3_general_ci;

USE `shift03`;
SET NAMES utf8mb3 COLLATE utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS `players` (
  `player_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nickname` VARCHAR(16) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`player_id`),
  UNIQUE KEY `uq_players_nickname` (`nickname`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb3
  COLLATE utf8mb3_general_ci;

-- Один текущий сейв на ник.
CREATE TABLE IF NOT EXISTS `saves` (
  `player_id` INT UNSIGNED NOT NULL,
  `state_json` LONGTEXT NOT NULL,
  `saved_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`player_id`),
  CONSTRAINT `fk_saves_player`
    FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb3
  COLLATE utf8mb3_general_ci;

-- Справочник двенадцати диагнозов, используемых в учебной смене.
CREATE TABLE IF NOT EXISTS `diagnoses` (
  `diagnosis_id` TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(80) NOT NULL,
  `short_description` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`diagnosis_id`),
  UNIQUE KEY `uq_diagnoses_title` (`title`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb3
  COLLATE utf8mb3_general_ci;

-- Одна строка = один завершённый результат. submission_token создаётся
-- клиентом один раз на финал и повторно используется при повторной отправке.
CREATE TABLE IF NOT EXISTS `records` (
  `record_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `player_id` INT UNSIGNED NOT NULL,
  `score` INT UNSIGNED NOT NULL,
  `finished_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `submission_token` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`record_id`),
  UNIQUE KEY `uq_records_submission_token` (`submission_token`),
  KEY `idx_records_leaderboard` (`score`, `finished_at`, `record_id`),
  CONSTRAINT `fk_records_player`
    FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb3
  COLLATE utf8mb3_general_ci;

-- Постоянная прогрессия личного кабинета. Нулевые значения исключают
-- мгновенную покупку улучшений: прогресс приходит только за завершённые игры.
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
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb3
  COLLATE utf8mb3_general_ci;

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

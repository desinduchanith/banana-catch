CREATE DATABASE IF NOT EXISTS banana_catch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE banana_catch;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(40)  NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS games (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  difficulty      ENUM('easy','medium','hard') NOT NULL,
  started_at      DATETIME NOT NULL,
  ended_at        DATETIME NULL,
  catch_points    INT UNSIGNED NOT NULL DEFAULT 0,
  puzzle_points   INT UNSIGNED NOT NULL DEFAULT 0,
  best_combo      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  score           INT UNSIGNED NOT NULL DEFAULT 0,
  flagged         TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_board (difficulty, score),
  INDEX idx_user (user_id, ended_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS login_attempts (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email        VARCHAR(190) NOT NULL,
  ip           VARCHAR(45)  NOT NULL,
  attempted_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_time (email, attempted_at)
) ENGINE=InnoDB;

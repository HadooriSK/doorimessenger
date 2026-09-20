CREATE DATABASE IF NOT EXISTS doori;
USE doori;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    pin_hash VARCHAR(255) DEFAULT NULL,
    avatar_url LONGTEXT,
    sound BOOLEAN DEFAULT TRUE,
    show_last_seen BOOLEAN DEFAULT TRUE,
    read_receipts BOOLEAN DEFAULT TRUE,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_username VARCHAR(50) NOT NULL,
    recipient_username VARCHAR(50) DEFAULT NULL,
    room_id VARCHAR(50) DEFAULT NULL,
    text TEXT,
    media_url LONGTEXT,
    media_type VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blocked_contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_username VARCHAR(50) NOT NULL,
    blocked_username VARCHAR(50) NOT NULL,
    UNIQUE KEY user_blocked (user_username, blocked_username)
);

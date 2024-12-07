CREATE DATABASE IF NOT EXISTS express_db;

USE express_db;

CREATE USER IF NOT EXISTS 'express_user'@'%' IDENTIFIED BY '1234';
GRANT ALL PRIVILEGES ON express_db.* TO 'express_user'@'%';
FLUSH PRIVILEGES;

CREATE TABLE IF NOT EXISTS transactions (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(10, 2),
    date DATETIME NOT NULL,
    recipient_id INT,
    sender_id INT
);

CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    balance DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    type VARCHAR(255)
);


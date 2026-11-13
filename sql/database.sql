-- Création de la base de données
CREATE DATABASE IF NOT EXISTS linkmeet_db;
USE linkmeet_db;

-- Table utilisateurs
CREATE TABLE utilisateurs (
    id_user INT PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(50) NOT NULL,
    prenom VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    statut ENUM('actif', 'inactif') DEFAULT 'actif',
    date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table administrateurs
CREATE TABLE admins (
    id_admin INT PRIMARY KEY AUTO_INCREMENT,
    id_user INT NOT NULL,
    permissions JSON,
    FOREIGN KEY (id_user) REFERENCES utilisateurs(id_user) ON DELETE CASCADE
);

-- Table réunions
CREATE TABLE reunions (
    id_reunion INT PRIMARY KEY AUTO_INCREMENT,
    nom_reunion VARCHAR(100) NOT NULL,
    code_reunion VARCHAR(20) UNIQUE NOT NULL,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_createur INT NOT NULL,
    statut ENUM('active', 'terminee', 'annulee') DEFAULT 'active',
    FOREIGN KEY (id_createur) REFERENCES utilisateurs(id_user) ON DELETE CASCADE
);

-- Table participants
CREATE TABLE participants (
    id_participant INT PRIMARY KEY AUTO_INCREMENT,
    id_user INT NOT NULL,
    id_reunion INT NOT NULL,
    date_entree DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_sortie DATETIME,
    FOREIGN KEY (id_user) REFERENCES utilisateurs(id_user) ON DELETE CASCADE,
    FOREIGN KEY (id_reunion) REFERENCES reunions(id_reunion) ON DELETE CASCADE,
    UNIQUE KEY unique_participation (id_user, id_reunion)
);

-- Table messages
CREATE TABLE messages (
    id_message INT PRIMARY KEY AUTO_INCREMENT,
    contenu TEXT NOT NULL,
    date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_user INT NOT NULL,
    id_reunion INT NOT NULL,
    FOREIGN KEY (id_user) REFERENCES utilisateurs(id_user) ON DELETE CASCADE,
    FOREIGN KEY (id_reunion) REFERENCES reunions(id_reunion) ON DELETE CASCADE
);

-- Insertion d'un admin par défaut
INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) 
VALUES ('Admin', 'System', 'admin@linkmeet.com', '$2a$10$YourHashedPasswordHere', 'admin');

-- Index pour optimiser les recherches
CREATE INDEX idx_email ON utilisateurs(email);
CREATE INDEX idx_code_reunion ON reunions(code_reunion);
CREATE INDEX idx_reunion_participant ON participants(id_reunion);
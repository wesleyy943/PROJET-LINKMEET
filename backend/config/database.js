// backend/config/database.js
const mysql = require('mysql2');
require('dotenv').config();

// Configuration de la connexion
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'linkmeet_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Version Promise pour les requêtes async/await
const promisePool = pool.promise();

// Tester la connexion
async function testConnection() {
    try {
        const connection = await promisePool.getConnection();
        console.log('✅ Connexion à la base de données établie');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Erreur de connexion à la base de données:', error.message);
        console.error('   Vérifiez que MySQL est démarré dans XAMPP');
        return false;
    }
}

module.exports = { pool, promisePool, testConnection };
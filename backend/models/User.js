const { promisePool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    static async create(userData) {
        const { nom, prenom, email, mot_de_passe } = userData;
        const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
        
        const [result] = await promisePool.query(
            'INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe) VALUES (?, ?, ?, ?)',
            [nom, prenom, email, hashedPassword]
        );
        return result.insertId;
    }

    static async findByEmail(email) {
        const [rows] = await promisePool.query(
            'SELECT * FROM utilisateurs WHERE email = ?',
            [email]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await promisePool.query(
            'SELECT id_user, nom, prenom, email, role, statut, date_inscription FROM utilisateurs WHERE id_user = ?',
            [id]
        );
        return rows[0];
    }

    static async getAll() {
        const [rows] = await promisePool.query(
            'SELECT id_user, nom, prenom, email, role, statut, date_inscription FROM utilisateurs'
        );
        return rows;
    }

    static async update(id, data) {
        const { nom, prenom, email } = data;
        const [result] = await promisePool.query(
            'UPDATE utilisateurs SET nom = ?, prenom = ?, email = ? WHERE id_user = ?',
            [nom, prenom, email, id]
        );
        return result.affectedRows;
    }

    static async delete(id) {
        const [result] = await promisePool.query(
            'DELETE FROM utilisateurs WHERE id_user = ?',
            [id]
        );
        return result.affectedRows;
    }

    static async comparePassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }
}

module.exports = User;
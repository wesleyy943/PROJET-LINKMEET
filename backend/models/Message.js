const { promisePool } = require('../config/database');

class Message {
    static async create(data) {
        const { contenu, id_user, id_reunion } = data;
        const [result] = await promisePool.query(
            'INSERT INTO messages (contenu, id_user, id_reunion) VALUES (?, ?, ?)',
            [contenu, id_user, id_reunion]
        );
        return result.insertId;
    }

    static async getReunionMessages(id_reunion) {
        const [rows] = await promisePool.query(
            `SELECT m.*, u.nom, u.prenom 
             FROM messages m 
             JOIN utilisateurs u ON m.id_user = u.id_user 
             WHERE m.id_reunion = ? 
             ORDER BY m.date_envoi ASC`,
            [id_reunion]
        );
        return rows;
    }
}

module.exports = Message;
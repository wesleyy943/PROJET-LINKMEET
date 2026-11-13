// backend/models/Reunion.js
const { promisePool } = require('../config/database');

class Reunion {
    // === CRÉER UNE RÉUNION ===
    static async create(data) {
        const { nom_reunion, code_reunion, id_createur } = data;
        const [result] = await promisePool.query(
            'INSERT INTO reunions (nom_reunion, code_reunion, id_createur) VALUES (?, ?, ?)',
            [nom_reunion, code_reunion, id_createur]
        );
        return result.insertId;
    }

    // === TROUVER UNE RÉUNION PAR CODE ===
    static async findByCode(code) {
        const [rows] = await promisePool.query(
            'SELECT * FROM reunions WHERE code_reunion = ? AND statut = "active"',
            [code]
        );
        return rows[0];
    }

    // === TROUVER UNE RÉUNION PAR ID ===
    static async findById(id) {
        const [rows] = await promisePool.query(
            'SELECT * FROM reunions WHERE id_reunion = ?',
            [id]
        );
        return rows[0];
    }

    // === RÉCUPÉRER TOUTES LES RÉUNIONS (POUR ADMIN) ===
    static async getAllReunionsForAdmin() {
        const [rows] = await promisePool.query(
            `SELECT r.*, u.nom, u.prenom, u.email 
             FROM reunions r 
             JOIN utilisateurs u ON r.id_createur = u.id_user 
             ORDER BY r.date_creation DESC`
        );
        return rows;
    }

    // === RÉCUPÉRER LES RÉUNIONS D'UN UTILISATEUR ===
    static async getUserReunions(userId) {
        const [rows] = await promisePool.query(
            `SELECT r.*, u.nom, u.prenom, u.email 
             FROM reunions r 
             JOIN utilisateurs u ON r.id_createur = u.id_user 
             WHERE r.id_createur = ? OR r.id_reunion IN (
                 SELECT id_reunion FROM participants WHERE id_user = ? AND date_sortie IS NULL
             )
             ORDER BY r.date_creation DESC`,
            [userId, userId]
        );
        return rows;
    }

    // === AJOUTER UN PARTICIPANT ===
    static async addParticipant(id_user, id_reunion) {
        const [result] = await promisePool.query(
            'INSERT INTO participants (id_user, id_reunion) VALUES (?, ?)',
            [id_user, id_reunion]
        );
        return result.insertId;
    }

    // === RETIRER UN PARTICIPANT ===
    static async removeParticipant(id_user, id_reunion) {
        const [result] = await promisePool.query(
            'UPDATE participants SET date_sortie = NOW() WHERE id_user = ? AND id_reunion = ? AND date_sortie IS NULL',
            [id_user, id_reunion]
        );
        return result.affectedRows;
    }

    // === RÉCUPÉRER LES PARTICIPANTS D'UNE RÉUNION ===
    static async getParticipants(id_reunion) {
        const [rows] = await promisePool.query(
            `SELECT u.id_user, u.nom, u.prenom, u.email, p.date_entree 
             FROM participants p 
             JOIN utilisateurs u ON p.id_user = u.id_user 
             WHERE p.id_reunion = ? AND p.date_sortie IS NULL`,
            [id_reunion]
        );
        return rows;
    }

    // === RÉCUPÉRER LES DÉTAILS D'UNE RÉUNION ===
    static async getReunionDetails(id) {
        const [rows] = await promisePool.query(
            `SELECT r.*, u.nom, u.prenom, u.email,
             (SELECT COUNT(*) FROM participants WHERE id_reunion = r.id_reunion AND date_sortie IS NULL) as nb_participants
             FROM reunions r
             JOIN utilisateurs u ON r.id_createur = u.id_user
             WHERE r.id_reunion = ?`,
            [id]
        );
        return rows[0];
    }

    // === SUPPRIMER UNE RÉUNION ===
    static async delete(id, userId = null) {
        let query = 'DELETE FROM reunions WHERE id_reunion = ?';
        let params = [id];
        
        // Si userId est fourni, vérifier que l'utilisateur est le créateur
        if (userId) {
            query += ' AND id_createur = ?';
            params.push(userId);
        }
        
        const [result] = await promisePool.query(query, params);
        return result.affectedRows;
    }

    // === METTRE À JOUR LE STATUT ===
    static async updateStatus(id, statut, userId = null) {
        let query = 'UPDATE reunions SET statut = ? WHERE id_reunion = ?';
        let params = [statut, id];
        
        if (userId) {
            query += ' AND id_createur = ?';
            params.push(userId);
        }
        
        const [result] = await promisePool.query(query, params);
        return result.affectedRows;
    }
}

module.exports = Reunion;
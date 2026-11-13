const User = require('../models/User');
const Reunion = require('../models/Reunion');
const { promisePool } = require('../config/database');

const getAllUsers = async (req, res) => {
    try {
        const users = await User.getAll();
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la récupération' });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { nom, prenom, email, statut } = req.body;

        await User.update(id, { nom, prenom, email });
        
        if (statut) {
            await promisePool.query(
                'UPDATE utilisateurs SET statut = ? WHERE id_user = ?',
                [statut, id]
            );
        }

        res.json({ message: 'Utilisateur mis à jour' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await User.delete(id);
        res.json({ message: 'Utilisateur supprimé' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la suppression' });
    }
};

const getAllReunions = async (req, res) => {
    try {
        const reunions = await Reunion.getAllReunions();
        res.json(reunions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la récupération' });
    }
};

const deleteReunion = async (req, res) => {
    try {
        const { id } = req.params;
        await Reunion.delete(id);
        res.json({ message: 'Réunion supprimée' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la suppression' });
    }
};

module.exports = {
    getAllUsers,
    updateUser,
    deleteUser,
    getAllReunions,
    deleteReunion
};
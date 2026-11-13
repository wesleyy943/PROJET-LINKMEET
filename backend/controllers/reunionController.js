// backend/controllers/reunionController.js
const Reunion = require('../models/Reunion');
const Message = require('../models/Message');
const { promisePool } = require('../config/database');

// === Générer un code de réunion aléatoire ===
const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// === 1. CRÉER UNE RÉUNION ===
const createReunion = async (req, res) => {
    try {
        const { nom_reunion } = req.body;
        const id_createur = req.user.id_user;
        
        console.log('📝 Création d\'une réunion par l\'utilisateur:', id_createur);
        console.log('📝 Nom de la réunion:', nom_reunion);
        
        if (!nom_reunion || nom_reunion.trim() === '') {
            return res.status(400).json({ message: 'Le nom de la réunion est requis' });
        }

        const code_reunion = generateRoomCode();
        console.log('🔑 Code généré:', code_reunion);

        // Créer la réunion
        const reunionId = await Reunion.create({
            nom_reunion: nom_reunion.trim(),
            code_reunion,
            id_createur
        });

        console.log('✅ Réunion créée avec ID:', reunionId);

        // Ajouter le créateur comme participant
        await Reunion.addParticipant(id_createur, reunionId);

        // Récupérer les détails de la réunion créée
        const reunion = await Reunion.getReunionDetails(reunionId);

        // 🔥 NOTIFIER TOUS LES CLIENTS VIA SOCKET.IO
        const io = req.app.get('io');
        if (io) {
            console.log('📢 Notification de création envoyée');
            io.emit('new-reunion-created', {
                reunion: {
                    id_reunion: reunionId,
                    nom_reunion: nom_reunion.trim(),
                    code_reunion: code_reunion,
                    date_creation: new Date()
                },
                createur: {
                    id: req.user.id_user,
                    nom: req.user.nom,
                    prenom: req.user.prenom
                }
            });
        }

        res.status(201).json({
            message: 'Réunion créée avec succès',
            reunion: {
                id_reunion: reunionId,
                nom_reunion: nom_reunion.trim(),
                code_reunion,
                date_creation: new Date()
            }
        });
    } catch (error) {
        console.error('❌ Erreur création réunion:', error);
        console.error('❌ Stack:', error.stack);
        res.status(500).json({ 
            message: 'Erreur lors de la création de la réunion',
            error: error.message,
            detail: error.stack
        });
    }
};

// === 2. REJOINDRE UNE RÉUNION ===
const joinReunion = async (req, res) => {
    try {
        const { code_reunion } = req.body;
        const id_user = req.user.id_user;

        console.log('🔑 Tentative de rejoindre avec le code:', code_reunion);
        console.log('👤 Utilisateur:', id_user);

        if (!code_reunion || code_reunion.trim() === '') {
            return res.status(400).json({ message: 'Le code de la réunion est requis' });
        }

        const reunion = await Reunion.findByCode(code_reunion.toUpperCase());
        if (!reunion) {
            console.log('❌ Réunion non trouvée avec le code:', code_reunion);
            return res.status(404).json({ message: 'Réunion non trouvée ou inactive' });
        }

        console.log('✅ Réunion trouvée:', reunion.id_reunion, reunion.nom_reunion);

        // Vérifier si l'utilisateur est déjà participant
        const [existing] = await promisePool.query(
            'SELECT * FROM participants WHERE id_user = ? AND id_reunion = ? AND date_sortie IS NULL',
            [id_user, reunion.id_reunion]
        );

        if (existing.length === 0) {
            await Reunion.addParticipant(id_user, reunion.id_reunion);
            console.log('✅ Participant ajouté');
        } else {
            console.log('ℹ️ Utilisateur déjà participant');
        }

        // 🔥 NOTIFIER LES AUTRES PARTICIPANTS
        const io = req.app.get('io');
        if (io) {
            io.to(`room-${reunion.id_reunion}`).emit('user-joined', {
                userId: id_user,
                userName: `${req.user.prenom} ${req.user.nom}`,
                socketId: req.socket?.id || 'unknown'
            });
        }

        res.json({
            message: 'Vous avez rejoint la réunion',
            reunion: {
                id_reunion: reunion.id_reunion,
                nom_reunion: reunion.nom_reunion,
                code_reunion: reunion.code_reunion,
                statut: reunion.statut
            }
        });
    } catch (error) {
        console.error('❌ Erreur participation:', error);
        console.error('❌ Stack:', error.stack);
        res.status(500).json({ 
            message: 'Erreur lors de la participation',
            error: error.message,
            detail: error.stack
        });
    }
};

// === 3. RÉCUPÉRER TOUTES LES RÉUNIONS (Dashboard) ===
const getAllReunions = async (req, res) => {
    try {
        const userId = req.user.id_user;
        const role = req.user.role;
        
        console.log('📊 Récupération des réunions pour:', userId, 'rôle:', role);
        
        let reunions;
        if (role === 'admin') {
            reunions = await Reunion.getAllReunionsForAdmin();
        } else {
            reunions = await Reunion.getUserReunions(userId);
        }
        
        console.log('📊 Réunions trouvées:', reunions.length);
        res.json(reunions);
    } catch (error) {
        console.error('❌ Erreur récupération réunions:', error);
        console.error('❌ Stack:', error.stack);
        res.status(500).json({ 
            message: 'Erreur lors de la récupération des réunions',
            error: error.message
        });
    }
};

// === 4. RÉCUPÉRER LES RÉUNIONS D'UN UTILISATEUR ===
const getUserReunions = async (req, res) => {
    try {
        const userId = req.user.id_user;
        const reunions = await Reunion.getUserReunions(userId);
        res.json(reunions);
    } catch (error) {
        console.error('❌ Erreur récupération réunions utilisateur:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des réunions' });
    }
};

// === 5. RÉCUPÉRER LES DÉTAILS D'UNE RÉUNION ===
const getReunionDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const reunion = await Reunion.getReunionDetails(id);
        
        if (!reunion) {
            return res.status(404).json({ message: 'Réunion non trouvée' });
        }

        const participants = await Reunion.getParticipants(id);
        
        res.json({
            ...reunion,
            participants
        });
    } catch (error) {
        console.error('❌ Erreur récupération détails:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des détails' });
    }
};

// === 6. RÉCUPÉRER LES MESSAGES D'UNE RÉUNION ===
const getReunionMessages = async (req, res) => {
    try {
        const { id } = req.params;
        
        const reunion = await Reunion.findById(id);
        if (!reunion) {
            return res.status(404).json({ message: 'Réunion non trouvée' });
        }

        const messages = await Message.getReunionMessages(id);
        res.json(messages);
    } catch (error) {
        console.error('❌ Erreur récupération messages:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des messages' });
    }
};

// === 7. SUPPRIMER UNE RÉUNION ===
const deleteReunion = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id_user;
        const role = req.user.role;

        console.log('🗑️ Suppression de la réunion:', id);
        console.log('👤 Par l\'utilisateur:', userId, 'rôle:', role);

        // Vérifier si la réunion existe
        const reunion = await Reunion.findById(id);
        if (!reunion) {
            console.log('❌ Réunion non trouvée');
            return res.status(404).json({ message: 'Réunion non trouvée' });
        }

        console.log('📋 Réunion trouvée:', reunion.nom_reunion, 'créateur:', reunion.id_createur);

        // Vérifier les droits (admin ou créateur)
        if (role !== 'admin' && reunion.id_createur !== userId) {
            console.log('❌ Droits insuffisants');
            return res.status(403).json({ 
                message: 'Vous n\'avez pas le droit de supprimer cette réunion' 
            });
        }

        // Supprimer la réunion
        const deleted = await Reunion.delete(id);
        
        if (deleted === 0) {
            return res.status(404).json({ message: 'Réunion non trouvée' });
        }

        console.log('✅ Réunion supprimée avec succès');

        // 🔥 NOTIFIER TOUS LES CLIENTS VIA SOCKET.IO
        const io = req.app.get('io');
        if (io) {
            io.emit('reunion-deleted', { 
                id_reunion: parseInt(id),
                deletedBy: userId,
                deletedByUser: `${req.user.prenom} ${req.user.nom}`
            });
            io.emit('reunion-updated', { 
                action: 'delete',
                id_reunion: parseInt(id),
                timestamp: new Date()
            });
        }

        res.json({ 
            message: 'Réunion supprimée avec succès',
            id_reunion: parseInt(id)
        });
    } catch (error) {
        console.error('❌ Erreur suppression réunion:', error);
        console.error('❌ Stack:', error.stack);
        res.status(500).json({ 
            message: 'Erreur lors de la suppression',
            error: error.message
        });
    }
};

// === 8. QUITTER UNE RÉUNION ===
const leaveReunion = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id_user;

        const reunion = await Reunion.findById(id);
        if (!reunion) {
            return res.status(404).json({ message: 'Réunion non trouvée' });
        }

        const removed = await Reunion.removeParticipant(userId, id);
        
        if (removed === 0) {
            return res.status(404).json({ message: 'Vous n\'êtes pas dans cette réunion' });
        }

        const io = req.app.get('io');
        if (io) {
            io.to(`room-${id}`).emit('user-left', {
                userId: userId,
                userName: `${req.user.prenom} ${req.user.nom}`
            });
        }

        res.json({ 
            message: 'Vous avez quitté la réunion',
            id_reunion: parseInt(id)
        });
    } catch (error) {
        console.error('❌ Erreur départ réunion:', error);
        res.status(500).json({ message: 'Erreur lors du départ' });
    }
};

// === 9. METTRE À JOUR LE STATUT ===
const updateReunionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { statut } = req.body;
        const userId = req.user.id_user;
        const role = req.user.role;

        const validStatus = ['active', 'terminee', 'annulee'];
        if (!validStatus.includes(statut)) {
            return res.status(400).json({ 
                message: 'Statut invalide. Utilisez: active, terminee ou annulee' 
            });
        }

        const reunion = await Reunion.findById(id);
        if (!reunion) {
            return res.status(404).json({ message: 'Réunion non trouvée' });
        }

        if (role !== 'admin' && reunion.id_createur !== userId) {
            return res.status(403).json({ 
                message: 'Vous n\'avez pas le droit de modifier cette réunion' 
            });
        }

        const updated = await Reunion.updateStatus(id, statut);
        
        if (updated === 0) {
            return res.status(404).json({ message: 'Réunion non trouvée' });
        }

        const io = req.app.get('io');
        if (io) {
            io.emit('reunion-updated', { 
                id_reunion: parseInt(id),
                statut: statut,
                updatedBy: userId,
                updatedByUser: `${req.user.prenom} ${req.user.nom}`,
                timestamp: new Date()
            });
        }

        res.json({ 
            message: 'Statut mis à jour avec succès',
            id_reunion: parseInt(id),
            statut: statut
        });
    } catch (error) {
        console.error('❌ Erreur mise à jour statut:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour du statut' });
    }
};

// === 10. RÉCUPÉRER LES PARTICIPANTS ===
const getReunionParticipants = async (req, res) => {
    try {
        const { id } = req.params;
        
        const reunion = await Reunion.findById(id);
        if (!reunion) {
            return res.status(404).json({ message: 'Réunion non trouvée' });
        }

        const participants = await Reunion.getParticipants(id);
        res.json(participants);
    } catch (error) {
        console.error('❌ Erreur récupération participants:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des participants' });
    }
};

// === 11. ENVOYER UN MESSAGE ===
const sendReunionMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { contenu } = req.body;
        const userId = req.user.id_user;

        if (!contenu || contenu.trim() === '') {
            return res.status(400).json({ message: 'Le message ne peut pas être vide' });
        }

        const reunion = await Reunion.findById(id);
        if (!reunion) {
            return res.status(404).json({ message: 'Réunion non trouvée' });
        }

        const messageId = await Message.create({
            contenu: contenu.trim(),
            id_user: userId,
            id_reunion: id
        });

        const [message] = await promisePool.query(
            `SELECT m.*, u.nom, u.prenom 
             FROM messages m 
             JOIN utilisateurs u ON m.id_user = u.id_user 
             WHERE m.id_message = ?`,
            [messageId]
        );

        const io = req.app.get('io');
        if (io) {
            io.to(`room-${id}`).emit('new-message', message[0]);
        }

        res.status(201).json({
            message: 'Message envoyé avec succès',
            data: message[0]
        });
    } catch (error) {
        console.error('❌ Erreur envoi message:', error);
        res.status(500).json({ message: 'Erreur lors de l\'envoi du message' });
    }
};

// === EXPORTATION ===
module.exports = {
    createReunion,
    joinReunion,
    getAllReunions,
    getUserReunions,
    getReunionDetails,
    getReunionMessages,
    deleteReunion,
    leaveReunion,
    updateReunionStatus,
    getReunionParticipants,
    sendReunionMessage
};
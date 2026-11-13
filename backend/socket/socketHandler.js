// backend/socket/socketHandler.js
const Message = require('../models/Message');
const Reunion = require('../models/Reunion');

// Stockage des utilisateurs par salle
const roomUsers = {};

const handleSocketConnection = (socket, io) => {
    console.log('🔌 Nouvelle connexion socket:', socket.id);

    // === Rejoindre une salle ===
    socket.on('join-room', async (data) => {
        const { roomId, userId, userName } = data;
        
        console.log(`👤 ${userName} (${userId}) rejoint la salle ${roomId}`);
        
        // Rejoindre la salle Socket.IO
        socket.join(roomId);
        socket.roomId = roomId;
        socket.userId = userId;
        socket.userName = userName;
        
        // Ajouter l'utilisateur à la liste
        if (!roomUsers[roomId]) {
            roomUsers[roomId] = [];
        }
        
        // Vérifier si l'utilisateur existe déjà
        const existingUser = roomUsers[roomId].find(u => u.userId === userId);
        if (!existingUser) {
            roomUsers[roomId].push({
                userId: userId,
                userName: userName,
                socketId: socket.id
            });
        } else {
            // Mettre à jour le socketId
            existingUser.socketId = socket.id;
        }
        
        console.log(`📊 Participants dans ${roomId}:`, roomUsers[roomId]);
        
        // Envoyer la liste des participants à TOUS les clients de la salle
        io.to(roomId).emit('room-users', roomUsers[roomId]);
        
        // Notifier les autres participants qu'un nouveau utilisateur est arrivé
        socket.to(roomId).emit('user-joined', {
            userId: userId,
            userName: userName,
            socketId: socket.id,
            users: roomUsers[roomId]
        });
        
        // Envoyer la liste au nouveau participant
        socket.emit('room-users', roomUsers[roomId]);
    });

    // === Messages ===
    socket.on('send-message', async (data) => {
        const { roomId, userId, message } = data;
        
        console.log(`💬 Message de ${userId} dans ${roomId}: ${message}`);
        
        try {
            // Sauvegarder en base de données
            await Message.create({
                contenu: message,
                id_user: userId,
                id_reunion: roomId
            });
            
            // Récupérer l'utilisateur pour le nom
            const { promisePool } = require('../config/database');
            const [rows] = await promisePool.query(
                'SELECT nom, prenom FROM utilisateurs WHERE id_user = ?',
                [userId]
            );
            
            const user = rows[0] || { nom: 'Inconnu', prenom: '' };
            
            // Diffuser le message à tous les participants de la salle
            io.to(roomId).emit('new-message', {
                userId: userId,
                message: message,
                nom: user.nom,
                prenom: user.prenom,
                date_envoi: new Date().toISOString()
            });
        } catch (error) {
            console.error('Erreur message:', error);
        }
    });

    // === Offres WebRTC ===
    socket.on('offer', (data) => {
        const { roomId, targetSocketId, offer } = data;
        console.log(`📤 Offre de ${socket.id} vers ${targetSocketId}`);
        socket.to(targetSocketId).emit('offer', {
            from: socket.id,
            offer: offer
        });
    });

    socket.on('answer', (data) => {
        const { roomId, targetSocketId, answer } = data;
        console.log(`📥 Réponse de ${socket.id} vers ${targetSocketId}`);
        socket.to(targetSocketId).emit('answer', {
            from: socket.id,
            answer: answer
        });
    });

    socket.on('ice-candidate', (data) => {
        const { roomId, targetSocketId, candidate } = data;
        console.log(`🧊 ICE candidate de ${socket.id} vers ${targetSocketId}`);
        socket.to(targetSocketId).emit('ice-candidate', {
            from: socket.id,
            candidate: candidate
        });
    });

    // === Quitter une salle ===
    socket.on('leave-room', (data) => {
        const { roomId, userId } = data;
        console.log(`👋 ${userId} quitte la salle ${roomId}`);
        handleLeaveRoom(socket, roomId, userId, io);
    });

    // === Déconnexion ===
    socket.on('disconnect', () => {
        console.log(`🔌 Socket déconnecté: ${socket.id}`);
        
        // Trouver l'utilisateur dans toutes les salles
        for (const roomId in roomUsers) {
            const userIndex = roomUsers[roomId].findIndex(u => u.socketId === socket.id);
            if (userIndex !== -1) {
                const user = roomUsers[roomId][userIndex];
                console.log(`👋 ${user.userName} déconnecté de ${roomId}`);
                handleLeaveRoom(socket, roomId, user.userId, io);
                break;
            }
        }
    });
};

function handleLeaveRoom(socket, roomId, userId, io) {
    // Supprimer l'utilisateur de la liste
    if (roomUsers[roomId]) {
        roomUsers[roomId] = roomUsers[roomId].filter(u => u.userId !== userId);
        
        // Si la salle est vide, supprimer la référence
        if (roomUsers[roomId].length === 0) {
            delete roomUsers[roomId];
        }
    }
    
    // Quitter la salle Socket.IO
    socket.leave(roomId);
    
    // Notifier les autres participants
    io.to(roomId).emit('user-left', {
        userId: userId,
        socketId: socket.id
    });
    
    // Mettre à jour la liste des participants
    if (roomUsers[roomId]) {
        io.to(roomId).emit('room-users', roomUsers[roomId]);
    }
}

module.exports = { handleSocketConnection, roomUsers };
// backend/routes/reunions.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { 
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
} = require('../controllers/reunionController');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes principales
router.post('/create', createReunion);
router.post('/join', joinReunion);
router.get('/', getAllReunions);
router.get('/my-reunions', getUserReunions);
router.get('/:id/details', getReunionDetails);
router.get('/:id/messages', getReunionMessages);
router.get('/:id/participants', getReunionParticipants);

// Routes de modification
router.post('/:id/messages', sendReunionMessage);
router.put('/:id/status', updateReunionStatus);
router.delete('/:id', deleteReunion);
router.post('/:id/leave', leaveReunion);

module.exports = router;
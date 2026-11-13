const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const {
    getAllUsers,
    updateUser,
    deleteUser,
    getAllReunions,
    deleteReunion
} = require('../controllers/adminController');

router.use(authenticate);
router.use(isAdmin);

router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/reunions', getAllReunions);
router.delete('/reunions/:id', deleteReunion);

module.exports = router;
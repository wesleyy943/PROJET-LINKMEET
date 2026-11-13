const User = require('../models/User');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { nom, prenom, email, mot_de_passe } = req.body;

        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé' });
        }

        const userId = await User.create({ nom, prenom, email, mot_de_passe });
        
        res.status(201).json({ 
            message: 'Inscription réussie', 
            userId 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de l\'inscription' });
    }
};

const login = async (req, res) => {
    try {
        const { email, mot_de_passe } = req.body;

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        const isValidPassword = await User.comparePassword(mot_de_passe, user.mot_de_passe);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        if (user.statut === 'inactif') {
            return res.status(403).json({ message: 'Compte désactivé' });
        }

        const token = jwt.sign(
            { id: user.id_user, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id_user,
                nom: user.nom,
                prenom: user.prenom,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la connexion' });
    }
};

module.exports = { register, login };
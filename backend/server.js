// backend/server.js
const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const os = require('os');
require('dotenv').config();

// === 1. CRÉER L'APPLICATION ===
const app = express();

// === 2. TESTER LA CONNEXION À LA BASE DE DONNÉES ===
const { testConnection } = require('./config/database');

// === 3. CONFIGURATION HTTPS ===
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of ['Wi-Fi', 'Ethernet', 'WLAN']) {
        if (interfaces[name]) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
    }
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIP();
console.log(`📡 IP du serveur: ${localIP}`);

// === 4. CHERCHER LES CERTIFICATS ===
function findCertFiles() {
    const patterns = [
        'localhost+1.pem',
        'localhost+2.pem', 
        'localhost+3.pem',
        'localhost.pem'
    ];
    
    for (const pattern of patterns) {
        const certPath = path.join(__dirname, pattern);
        const keyPath = path.join(__dirname, pattern.replace('.pem', '-key.pem'));
        
        if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
            return { cert: certPath, key: keyPath };
        }
    }
    return null;
}

const certFiles = findCertFiles();
let server;
let protocol = 'http';

if (certFiles) {
    try {
        const httpsOptions = {
            key: fs.readFileSync(certFiles.key),
            cert: fs.readFileSync(certFiles.cert)
        };
        server = https.createServer(httpsOptions, app);
        protocol = 'https';
        console.log(`🔒 HTTPS activé avec: ${path.basename(certFiles.cert)}`);
    } catch (error) {
        console.error('❌ Erreur de chargement des certificats:', error.message);
        console.log('📡 Passage en HTTP...');
        server = http.createServer(app);
        protocol = 'http';
    }
} else {
    console.log('📡 Certificats SSL non trouvés, utilisation de HTTP');
    console.log(`💡 Pour activer HTTPS, exécutez:`);
    console.log(`   mkcert -install; mkcert localhost 127.0.0.1 ${localIP} ::1`);
    server = http.createServer(app);
    protocol = 'http';
}

// === 5. MIDDLEWARE ===
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === 6. SOCKET.IO ===
const io = socketIO(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

// === 7. PARTAGER IO AVEC LES CONTROLEURS ===
app.set('io', io);
app.set('socketio', io);

// === 8. ROUTES ===
const authRoutes = require('./routes/auth');
const reunionRoutes = require('./routes/reunions');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/reunions', reunionRoutes);
app.use('/api/admin', adminRoutes);

// === 9. SOCKET HANDLER ===
const { handleSocketConnection } = require('./socket/socketHandler');
io.on('connection', (socket) => {
    handleSocketConnection(socket, io);
});

// === 10. SERVIR LES FICHIERS STATIQUES ===
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/pages/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', req.path));
});

app.get('/js/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', req.path));
});

app.get('/css/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', req.path));
});

// === 11. DÉMARRER LE SERVEUR ===
const PORT = process.env.PORT || 3000;

// Tester la connexion à la base de données avant de démarrer
testConnection().then((connected) => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log('═══════════════════════════════════════════════════');
        console.log('🚀 LinkMeet Serveur démarré avec succès !');
        console.log('═══════════════════════════════════════════════════');
        console.log(`📡 Protocole  : ${protocol}`);
        console.log(`📡 Localhost  : ${protocol}://localhost:${PORT}`);
        console.log(`📡 Réseau     : ${protocol}://${localIP}:${PORT}`);
        console.log('═══════════════════════════════════════════════════');
        console.log('📱 Accès depuis les clients:');
        console.log(`   ${protocol}://${localIP}:${PORT}`);
        console.log('═══════════════════════════════════════════════════');
        console.log(`📊 Base de données: ${connected ? '✅ Connectée' : '❌ Non connectée'}`);
        console.log('═══════════════════════════════════════════════════');
        
        if (protocol === 'http') {
            console.log('⚠️  ATTENTION: Serveur en HTTP non sécurisé');
            console.log('💡  Pour activer HTTPS:');
            console.log(`   mkcert -install; mkcert localhost 127.0.0.1 ${localIP} ::1`);
            console.log('═══════════════════════════════════════════════════');
        } else {
            console.log('🔒 Connexion sécurisée HTTPS activée !');
            console.log('═══════════════════════════════════════════════════');
        }
    });
}).catch((error) => {
    console.error('❌ Erreur de connexion à la base de données:', error);
    console.log('⚠️  Le serveur démarre mais les fonctionnalités de base de données seront limitées');
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Serveur démarré sur ${protocol}://${localIP}:${PORT}`);
    });
});

// === 12. GESTION DES ERREURS ===
process.on('uncaughtException', (error) => {
    console.error('❌ Erreur non capturée:', error);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur...');
    process.exit();
});
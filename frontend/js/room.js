const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'login.html';
}

// Récupération du code de la réunion
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('code');
const roomId = urlParams.get('id') || '1'; // À remplacer par l'ID réel

if (!roomCode) {
    window.location.href = 'dashboard.html';
}

// Configuration Socket.IO
const socket = io('http://localhost:3000');

// Configuration WebRTC
let localStream;
let remoteStreams = {};
let peerConnections = {};
let screenStream;

// Éléments DOM
const localVideo = document.getElementById('localVideo');
const videoGrid = document.getElementById('videoGrid');
const chatContainer = document.getElementById('chatContainer');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

// Informations utilisateur
const user = JSON.parse(localStorage.getItem('user') || '{}');
document.getElementById('roomName').textContent = `Réunion ${roomCode}`;
document.getElementById('roomCode').textContent = roomCode;

// Initialisation
async function initRoom() {
    try {
        // Démarrer la caméra et le microphone
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        localVideo.srcObject = localStream;

        // Rejoindre la salle
        socket.emit('join-room', {
            roomId: roomId,
            userId: user.id,
            userName: `${user.prenom} ${user.nom}`
        });

        // Charger les messages
        await loadMessages();

    } catch (error) {
        console.error('Erreur d\'initialisation:', error);
        alert('Impossible d\'accéder à la caméra/microphone');
    }
}

// Chargement des messages
async function loadMessages() {
    try {
        const response = await fetch(`${API_URL}/reunions/${roomId}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const messages = await response.json();
            messages.forEach(msg => {
                displayMessage(msg, msg.id_user === user.id);
            });
        }
    } catch (error) {
        console.error('Erreur de chargement des messages:', error);
    }
}

// Affichage des messages
function displayMessage(message, isSent) {
    const div = document.createElement('div');
    div.className = `chat-message ${isSent ? 'sent' : 'received'}`;
    div.innerHTML = `
        <div class="small ${isSent ? 'text-light' : 'text-muted'}">
            ${message.prenom} ${message.nom}
        </div>
        <div>${message.contenu}</div>
        <div class="small ${isSent ? 'text-light' : 'text-muted'}" style="font-size: 0.7rem;">
            ${new Date(message.date_envoi).toLocaleTimeString()}
        </div>
    `;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Envoi de message
chatForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    const messageData = {
        roomId: roomId,
        userId: user.id,
        message: message
    };

    // Envoyer via Socket.IO
    socket.emit('send-message', messageData);
    
    // Afficher localement
    displayMessage({
        contenu: message,
        prenom: user.prenom,
        nom: user.nom,
        date_envoi: new Date().toISOString(),
        id_user: user.id
    }, true);

    chatInput.value = '';
});

// Gestion des participants
socket.on('room-users', (users) => {
    console.log('Participants:', users);
    updateParticipants(users);
});

socket.on('user-joined', (data) => {
    console.log(`${data.userName} a rejoint la réunion`);
    // Ajouter le participant à la grille vidéo
    addRemoteUser(data.userId, data.userName);
});

socket.on('user-left', (data) => {
    console.log(`Utilisateur ${data.userId} a quitté`);
    removeRemoteUser(data.userId);
});

// Gestion WebRTC
socket.on('offer', async (data) => {
    const pc = createPeerConnection(data.from);
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('answer', {
        roomId: roomId,
        targetSocketId: data.from,
        answer: answer
    });
});

socket.on('answer', async (data) => {
    const pc = peerConnections[data.from];
    if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
});

socket.on('ice-candidate', async (data) => {
    const pc = peerConnections[data.from];
    if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
});

// Création d'une connexion peer
function createPeerConnection(socketId) {
    const pc = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    });

    // Ajouter les tracks locales
    localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
    });

    pc.ontrack = (event) => {
        if (!remoteStreams[socketId]) {
            remoteStreams[socketId] = new MediaStream();
            addRemoteUser(socketId, `Participant ${socketId}`);
        }
        remoteStreams[socketId].addTrack(event.track);
        updateRemoteVideo(socketId, remoteStreams[socketId]);
    };

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                roomId: roomId,
                targetSocketId: socketId,
                candidate: event.candidate
            });
        }
    };

    peerConnections[socketId] = pc;
    return pc;
}

// Fonctions UI
function addRemoteUser(userId, userName) {
    const container = document.getElementById('videoGrid');
    const col = document.createElement('div');
    col.className = 'col-md-6';
    col.id = `remote-${userId}`;
    col.innerHTML = `
        <div class="bg-secondary rounded h-100 d-flex align-items-center justify-content-center position-relative">
            <video id="remoteVideo-${userId}" autoplay class="w-100 h-100 rounded" style="object-fit: cover;"></video>
            <div class="position-absolute bottom-0 start-0 p-2 text-white">
                <small>${userName}</small>
            </div>
        </div>
    `;
    container.appendChild(col);
}

function updateRemoteVideo(socketId, stream) {
    const video = document.getElementById(`remoteVideo-${socketId}`);
    if (video) {
        video.srcObject = stream;
    }
}

function removeRemoteUser(userId) {
    const element = document.getElementById(`remote-${userId}`);
    if (element) {
        element.remove();
    }
    delete remoteStreams[userId];
    delete peerConnections[userId];
}

function updateParticipants(users) {
    // Mettre à jour l'affichage des participants
    const participantList = users.map(u => `${u.userName}`).join(', ');
    document.querySelector('.badge.bg-info').textContent = `${roomCode} (${users.length} participants)`;
}

// Contrôles audio/vidéo
function toggleAudio() {
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const btn = document.getElementById('audioBtn');
        btn.innerHTML = audioTrack.enabled ? 
            '<i class="bi bi-mic fs-5"></i>' : 
            '<i class="bi bi-mic-mute fs-5"></i>';
        btn.classList.toggle('btn-danger', !audioTrack.enabled);
        btn.classList.toggle('btn-light', audioTrack.enabled);
    }
}

function toggleVideo() {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const btn = document.getElementById('videoBtn');
        btn.innerHTML = videoTrack.enabled ? 
            '<i class="bi bi-camera-video fs-5"></i>' : 
            '<i class="bi bi-camera-video-off fs-5"></i>';
        btn.classList.toggle('btn-danger', !videoTrack.enabled);
        btn.classList.toggle('btn-light', videoTrack.enabled);
    }
}

async function toggleScreenShare() {
    const btn = document.getElementById('screenBtn');
    
    if (!screenStream) {
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true
            });
            
            // Remplacer la track vidéo par le partage d'écran
            const videoTrack = screenStream.getVideoTracks()[0];
            const sender = localStream.getVideoTracks()[0];
            
            // Mettre à jour tous les pairs
            Object.values(peerConnections).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            });
            
            btn.innerHTML = '<i class="bi bi-display fs-5"></i>';
            btn.classList.toggle('btn-success', true);
            btn.classList.toggle('btn-light', false);
            
            videoTrack.onended = () => {
                stopScreenShare();
            };
            
        } catch (error) {
            console.error('Erreur de partage d\'écran:', error);
        }
    } else {
        stopScreenShare();
    }
}

function stopScreenShare() {
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
        
        // Revenir à la caméra
        const videoTrack = localStream.getVideoTracks()[0];
        Object.values(peerConnections).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender && videoTrack) {
                sender.replaceTrack(videoTrack);
            }
        });
        
        const btn = document.getElementById('screenBtn');
        btn.innerHTML = '<i class="bi bi-display fs-5"></i>';
        btn.classList.toggle('btn-success', false);
        btn.classList.toggle('btn-light', true);
    }
}

function leaveRoom() {
    if (confirm('Voulez-vous vraiment quitter la réunion ?')) {
        socket.emit('leave-room', { roomId, userId: user.id });
        window.location.href = 'dashboard.html';
    }
}

// Initialisation
initRoom();
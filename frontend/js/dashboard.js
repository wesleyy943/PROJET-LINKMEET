const API_URL = 'http://localhost:3000/api';

// Vérification de l'authentification
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'login.html';
}

// Récupération des informations utilisateur
const user = JSON.parse(localStorage.getItem('user') || '{}');
document.getElementById('userFullName').textContent = `${user.prenom} ${user.nom}`;

// Chargement des réunions
async function loadReunions() {
    try {
        const response = await fetch(`${API_URL}/reunions/my-reunions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Erreur de chargement');

        const reunions = await response.json();
        displayReunions(reunions);
        updateStats(reunions);
    } catch (error) {
        console.error('Erreur:', error);
    }
}

function displayReunions(reunions) {
    const container = document.getElementById('reunionsList');
    
    if (reunions.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                Aucune réunion pour le moment
            </div>
        `;
        return;
    }

    container.innerHTML = reunions.map(reunion => `
        <div class="card mb-2">
            <div class="card-body d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${reunion.nom_reunion}</h6>
                    <small class="text-muted">
                        <i class="bi bi-code me-1"></i>${reunion.code_reunion}
                        <span class="ms-3">
                            <i class="bi bi-calendar me-1"></i>
                            ${new Date(reunion.date_creation).toLocaleDateString()}
                        </span>
                    </small>
                </div>
                <div>
                    <button class="btn btn-sm btn-success" onclick="joinRoom('${reunion.code_reunion}')">
                        <i class="bi bi-door-open me-1"></i>Rejoindre
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function updateStats(reunions) {
    document.getElementById('totalReunions').textContent = reunions.length;
    const active = reunions.filter(r => r.statut === 'active').length;
    document.getElementById('activeReunions').textContent = active;
    // Estimation du nombre de participants (à améliorer)
    document.getElementById('totalParticipants').textContent = reunions.reduce((acc, r) => acc + (r.participants || 0), 0);
}

// Création d'une réunion
document.getElementById('createMeetingForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nom_reunion = document.getElementById('meetingName').value;
    const resultDiv = document.getElementById('createMeetingResult');

    try {
        const response = await fetch(`${API_URL}/reunions/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nom_reunion })
        });

        const data = await response.json();

        if (response.ok) {
            resultDiv.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle me-2"></i>
                    Réunion créée ! Code: <strong>${data.reunion.code_reunion}</strong>
                    <button class="btn btn-sm btn-success ms-2" onclick="joinRoom('${data.reunion.code_reunion}')">
                        Rejoindre
                    </button>
                </div>
            `;
            document.getElementById('meetingName').value = '';
            loadReunions();
        } else {
            resultDiv.innerHTML = `
                <div class="alert alert-danger">${data.message || 'Erreur lors de la création'}</div>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="alert alert-danger">Erreur de connexion au serveur</div>
        `;
    }
});

// Rejoindre une réunion
document.getElementById('joinMeetingForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const code_reunion = document.getElementById('meetingCode').value.toUpperCase();
    const resultDiv = document.getElementById('joinMeetingResult');

    try {
        const response = await fetch(`${API_URL}/reunions/join`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code_reunion })
        });

        const data = await response.json();

        if (response.ok) {
            window.location.href = `room.html?code=${code_reunion}`;
        } else {
            resultDiv.innerHTML = `
                <div class="alert alert-danger">${data.message || 'Code invalide'}</div>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="alert alert-danger">Erreur de connexion au serveur</div>
        `;
    }
});

function joinRoom(code) {
    window.location.href = `room.html?code=${code}`;
}

// Déconnexion
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
});

// Chargement initial
loadReunions();

// Rafraîchissement automatique toutes les 30 secondes
setInterval(loadReunions, 30000);

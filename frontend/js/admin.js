const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'login.html';
}

// Vérification du rôle admin
const user = JSON.parse(localStorage.getItem('user') || '{}');
if (user.role !== 'admin') {
    window.location.href = 'dashboard.html';
}

document.getElementById('adminName').textContent = `${user.prenom} ${user.nom}`;

// Navigation
function showSection(section) {
    // Cacher toutes les sections
    document.querySelectorAll('[id$="Section"]').forEach(el => {
        el.classList.add('d-none');
    });
    
    // Afficher la section sélectionnée
    document.getElementById(`${section}Section`).classList.remove('d-none');
    
    // Mettre à jour les liens actifs
    document.querySelectorAll('.admin-sidebar .nav-link').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelector(`.admin-sidebar .nav-link[onclick*="${section}"]`)?.classList.add('active');
    
    // Charger les données
    if (section === 'users') loadUsers();
    if (section === 'reunions') loadReunions();
    if (section === 'statistiques') loadStats();
}

// Chargement des utilisateurs
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Erreur de chargement');

        const users = await response.json();
        displayUsers(users);
    } catch (error) {
        console.error('Erreur:', error);
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersList');
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">Aucun utilisateur</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id_user}</td>
            <td>${user.nom}</td>
            <td>${user.prenom}</td>
            <td>${user.email}</td>
            <td>
                <span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}">
                    ${user.role}
                </span>
            </td>
            <td>
                <span class="badge ${user.statut === 'actif' ? 'bg-success' : 'bg-secondary'}">
                    ${user.statut}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-warning me-1" onclick="editUser(${user.id_user})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id_user})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Chargement des réunions
async function loadReunions() {
    try {
        const response = await fetch(`${API_URL}/admin/reunions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Erreur de chargement');

        const reunions = await response.json();
        displayReunions(reunions);
    } catch (error) {
        console.error('Erreur:', error);
    }
}

function displayReunions(reunions) {
    const tbody = document.getElementById('reunionsList');
    
    if (reunions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">Aucune réunion</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = reunions.map(reunion => `
        <tr>
            <td>${reunion.id_reunion}</td>
            <td>${reunion.nom_reunion}</td>
            <td><code>${reunion.code_reunion}</code></td>
            <td>${reunion.prenom} ${reunion.nom}</td>
            <td>${new Date(reunion.date_creation).toLocaleDateString()}</td>
            <td>
                <span class="badge ${reunion.statut === 'active' ? 'bg-success' : 'bg-secondary'}">
                    ${reunion.statut}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteReunion(${reunion.id_reunion})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Statistiques
async function loadStats() {
    try {
        // Récupérer les utilisateurs
        const usersResponse = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await usersResponse.json();

        // Récupérer les réunions
        const reunionsResponse = await fetch(`${API_URL}/admin/reunions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const reunions = await reunionsResponse.json();

        // Mettre à jour les statistiques
        document.getElementById('statTotalUsers').textContent = users.length;
        document.getElementById('statActiveUsers').textContent = users.filter(u => u.statut === 'actif').length;
        document.getElementById('statTotalReunions').textContent = reunions.length;
        document.getElementById('statActiveReunions').textContent = reunions.filter(r => r.statut === 'active').length;
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// Actions admin
async function deleteUser(userId) {
    if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return;

    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            alert('Utilisateur supprimé avec succès');
            loadUsers();
            loadStats();
        } else {
            alert('Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

async function deleteReunion(reunionId) {
    if (!confirm('Voulez-vous vraiment supprimer cette réunion ?')) return;

    try {
        const response = await fetch(`${API_URL}/admin/reunions/${reunionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            alert('Réunion supprimée avec succès');
            loadReunions();
            loadStats();
        } else {
            alert('Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// Ajout d'utilisateur (à implémenter)
async function addUser() {
    const nom = document.getElementById('addNom').value;
    const prenom = document.getElementById('addPrenom').value;
    const email = document.getElementById('addEmail').value;
    const password = document.getElementById('addPassword').value;
    const role = document.getElementById('addRole').value;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom, prenom, email, mot_de_passe: password })
        });

        if (response.ok) {
            alert('Utilisateur ajouté avec succès');
            document.getElementById('addUserForm').reset();
            bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
            loadUsers();
            loadStats();
        } else {
            alert('Erreur lors de l\'ajout');
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// Déconnexion
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Chargement initial
loadUsers();
// frontend/js/config.js
(function() {
    console.log('🔧 Initialisation de LinkMeet...');
    
    const PORT = 3000;
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    // Détection du protocole
    const protocol = window.location.protocol;
    
    // Construction de l'URL de l'API
    let apiUrl;
    let wsProtocol;
    
    if (protocol === 'https:') {
        wsProtocol = 'wss:';
    } else {
        wsProtocol = 'ws:';
    }
    
    if (isLocalhost) {
        apiUrl = `${protocol}//localhost:${PORT}/api`;
    } else {
        apiUrl = `${protocol}//${hostname}:${PORT}/api`;
    }
    
    // Variables globales
    window.API_URL = apiUrl;
    window.SERVER_HOST = hostname;
    window.SERVER_PORT = PORT;
    window.IS_LOCAL = isLocalhost;
    window.IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    window.PROTOCOL = protocol;
    window.WS_PROTOCOL = wsProtocol;
    window.SOCKET_URL = `${wsProtocol}//${hostname}:${PORT}`;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 Configuration LinkMeet:');
    console.log('   Protocole:', protocol);
    console.log('   Hostname:', hostname);
    console.log('   API_URL:', apiUrl);
    console.log('   Socket:', window.SOCKET_URL);
    console.log('   Local:', isLocalhost);
    console.log('   Mobile:', window.IS_MOBILE);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
})();
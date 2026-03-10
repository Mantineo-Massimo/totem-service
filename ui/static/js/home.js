(function() {
    // --- ELEMENTI DEL DOM ---
    const loader = document.getElementById('loader');
    const infopointLink = document.getElementById('infopoint-link');
    const wayfindingLink = document.getElementById('wayfinding-link');
    const mapLink = document.getElementById('map-link'); // Link alla nuova pagina mappa
    const dateElement = document.getElementById('current-date');
    const timeElement = document.getElementById('current-time');

    // --- LOGICA TRANSIZIONE PAGINA ---
    function handleLinkClick(e) {
        e.preventDefault();
        const currentBuilding = new URLSearchParams(window.location.search).get('building') || 'totem_A';
        const destinationUrl = `${this.href}?building=${currentBuilding}`;
        loader.classList.remove('hidden');
        setTimeout(() => { window.location.href = destinationUrl; }, 150);
    }
    if (infopointLink) infopointLink.addEventListener('click', handleLinkClick);
    if (wayfindingLink) wayfindingLink.addEventListener('click', handleLinkClick);
    if (mapLink) mapLink.addEventListener('click', handleLinkClick);
    
    // --- LOGICA OROLOGIO ---
    const state = { timeDifference: 0 };
    const config = { timeServiceUrl: 'http://172.16.32.13/api/time/', dataRefreshInterval: 300 };

    function syncTimeWithServer() {
        fetch(config.timeServiceUrl)
            .then(response => { if (!response.ok) throw new Error('API Fail'); return response.json(); })
            .then(data => {
                state.timeDifference = new Date(data.time) - new Date();
                if (timeElement) timeElement.style.color = '';
            })
            .catch(error => {
                console.error('Could not sync time:', error);
                state.timeDifference = 0;
                if (timeElement) timeElement.style.color = 'red';
            });
    }

    function updateDateTime() {
        const serverTime = new Date(new Date().getTime() + state.timeDifference);
        const clockOptions = { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        if (timeElement) timeElement.textContent = serverTime.toLocaleTimeString('it-IT', clockOptions);
        
        const dateOptions = { timeZone: 'Europe/Rome', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = serverTime.toLocaleDateString('it-IT', dateOptions);
        if (dateElement) dateElement.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    }

    syncTimeWithServer();
    setInterval(updateDateTime, 1000);
    setInterval(syncTimeWithServer, config.dataRefreshInterval * 1000);
})();
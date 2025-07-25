document.addEventListener('DOMContentLoaded', () => {
    // --- Elementi del DOM ---
    const dom = {
        time: document.getElementById('current-time'),
        date: document.getElementById('current-date'),
        classroomsList: document.getElementById('classrooms-list'),
        labsList: document.getElementById('labs-list'),
        officesList: document.getElementById('offices-list'),
        routePath: document.getElementById('route-path'),
        destinationLabel: document.getElementById('destination-label'),
        closePathBtn: document.getElementById('close-path-btn'),
        youAreHere: document.getElementById('you-are-here'),
        floorplanImage: document.getElementById('floorplan-image')
    };

    // --- Funzioni di Utilità ---
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const dateString = now.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        dom.time.textContent = timeString;
        dom.date.textContent = dateString.charAt(0).toUpperCase() + dateString.slice(1);
    }

    // --- Logica Principale ---
    function createCard(item) {
        const card = document.createElement('div');
        card.className = 'card';
        card.textContent = item.name;
        card.addEventListener('click', () => showPath(item.name, item.path));
        return card;
    }

    function showPath(name, pathData) {
        dom.routePath.setAttribute('d', pathData);
        dom.routePath.style.display = 'block';
        dom.destinationLabel.textContent = `Percorso per: ${name}`;
        dom.destinationLabel.style.display = 'block';
        dom.closePathBtn.style.display = 'block';
        
        dom.routePath.style.animation = 'none';
        setTimeout(() => { dom.routePath.style.animation = ''; }, 10);
    }

    function hidePath() {
        dom.routePath.style.display = 'none';
        dom.destinationLabel.style.display = 'none';
        dom.closePathBtn.style.display = 'none';
    }

    async function loadDirectoryData() {
        const params = new URLSearchParams(window.location.search);
        const locationId = params.get('location');

        if (!locationId) {
            document.body.innerHTML = "<h1>Errore: Parametro 'location' mancante nell'URL.</h1>";
            return;
        }

        try {
            // Chiede i dati all'API interna del servizio
            const response = await fetch(`api/location/${locationId}`);
            if (!response.ok) {
                throw new Error(`Errore di rete: ${response.statusText}`);
            }
            const data = await response.json();
            
            // Applica i dati alla pagina
            dom.floorplanImage.src = data.floorplanImage;
            const [cx, cy] = data.youAreHere.split(',');
            dom.youAreHere.setAttribute('cx', cx);
            dom.youAreHere.setAttribute('cy', cy);

            // Popola le liste
            const poi = data.pointsOfInterest;
            poi.classrooms.forEach(item => dom.classroomsList.appendChild(createCard(item)));
            poi.labs.forEach(item => dom.labsList.appendChild(createCard(item)));
            poi.offices.forEach(item => dom.officesList.appendChild(createCard(item)));

        } catch (e) {
            console.error("Impossibile caricare i dati per il totem:", e);
            document.body.innerHTML = `<h1>Impossibile caricare la configurazione per '${locationId}'</h1>`;
        }
    }

    // --- Inizializzazione ---
    updateClock();
    setInterval(updateClock, 1000);
    loadDirectoryData();
    dom.closePathBtn.addEventListener('click', hidePath);
});
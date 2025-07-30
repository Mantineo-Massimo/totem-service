document.addEventListener('DOMContentLoaded', () => {
    // --- Elementi del DOM ---
    const dom = {
        time: document.getElementById('current-time'),
        date: document.getElementById('current-date'),
        locationLabel: document.getElementById('location-label'),
        classroomsList: document.getElementById('classrooms-list'),
        labsList: document.getElementById('labs-list'),
        officesList: document.getElementById('offices-list'),
        routePath: document.getElementById('route-path'),
        destinationLabel: document.getElementById('destination-label'),
        closePathBtn: document.getElementById('close-path-btn'),
        youAreHere: document.getElementById('you-are-here'),
        destinationPoint: document.getElementById('destination-point'),
        floorplanImage: document.getElementById('floorplan-image'),
        tabsContainer: document.querySelector('.directory-tabs'),
        tabButtons: document.querySelectorAll('.tab-button'),
        cardLists: document.querySelectorAll('.card-list'),
        mapView: document.querySelector('.map-view')
    };

    // --- Funzioni di Utilità ---
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

        // MODIFICA CHIAVE: Usa il metodo del browser per trovare il punto finale esatto del percorso.
        // Questo metodo è molto più affidabile del precedente.
        const totalLength = dom.routePath.getTotalLength();
        const endPoint = dom.routePath.getPointAtLength(totalLength);

        // Posiziona e mostra il cerchio di destinazione usando le coordinate corrette
        dom.destinationPoint.setAttribute('cx', endPoint.x);
        dom.destinationPoint.setAttribute('cy', endPoint.y);
        dom.destinationPoint.style.visibility = 'visible';

        dom.destinationLabel.textContent = `Percorso per: ${name}`;
        dom.destinationLabel.style.display = 'block';
        dom.closePathBtn.style.display = 'block';

        // Riavvia l'animazione del disegno del percorso
        dom.routePath.style.animation = 'none';
        setTimeout(() => {
            dom.routePath.style.animation = '';
        }, 10);

        dom.mapView.scrollIntoView({ behavior: 'smooth' });
    }

    function hidePath() {
        dom.routePath.style.display = 'none';
        dom.destinationLabel.style.display = 'none';
        dom.closePathBtn.style.display = 'none';
        dom.destinationPoint.style.visibility = 'hidden';
    }

    function handleTabClick(event) {
        const targetButton = event.target.closest('.tab-button');
        if (!targetButton) return;

        const targetListId = targetButton.dataset.target;
        
        dom.tabButtons.forEach(btn => btn.classList.remove('active'));
        dom.cardLists.forEach(list => list.classList.remove('active'));

        targetButton.classList.add('active');
        document.getElementById(`${targetListId}-list`).classList.add('active');
    }

    async function loadDirectoryData() {
        const params = new URLSearchParams(window.location.search);
        const locationId = params.get('location');

        if (!locationId) {
            document.body.innerHTML = "<h1>Errore: Parametro 'location' mancante.</h1>";
            return;
        }

        try {
            const response = await fetch(`/totem/api/location/${locationId}`);
            if (!response.ok) throw new Error(`Errore di rete: ${response.statusText}`);
            const data = await response.json();
            
            dom.floorplanImage.src = `/totem/${data.floorplanImage}`;
            const [cx, cy] = data.youAreHere.split(',');
            dom.youAreHere.setAttribute('cx', cx);
            dom.youAreHere.setAttribute('cy', cy);
            dom.locationLabel.textContent = data.locationName;

            const poi = data.pointsOfInterest;
            poi.classrooms.forEach(item => dom.classroomsList.appendChild(createCard(item)));
            poi.labs.forEach(item => dom.labsList.appendChild(createCard(item)));
            poi.offices.forEach(item => dom.officesList.appendChild(createCard(item)));

        } catch (e) {
            console.error("Impossibile caricare i dati:", e);
        }
    }

    // --- Inizializzazione ---
    updateClock();
    setInterval(updateClock, 1000);
    loadDirectoryData();
    dom.closePathBtn.addEventListener('click', hidePath);
    dom.tabsContainer.addEventListener('click', handleTabClick);
});

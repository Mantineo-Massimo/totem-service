document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTI DEL DOM ---
    const buildingTitle = document.getElementById('building-title');
    const floorsContainer = document.getElementById('floors-container');
    const loader = document.getElementById('loader');
    const dateElement = document.getElementById('current-date');
    const timeElement = document.getElementById('current-time');
    const homeLink = document.getElementById('home-link');

    // Elementi del Modale
    const modal = document.getElementById('modal');
    const closeModalButton = document.querySelector('.modal-close-button');
    const infoText = document.getElementById('info-text');
    const mapWrapper = document.querySelector('.map-wrapper');
    const floorplanImage = document.getElementById('floorplan-image');
    const pathCanvas = document.getElementById('path-canvas');

    // --- STATO E CONFIGURAZIONE ---
    const API_BASE_URL = 'http://localhost';
    const buildingID = new URLSearchParams(window.location.search).get('building') || 'A';
    const totemID = `totem_${buildingID.toUpperCase()}`;
    const timeState = { timeDifference: 0 };

    // --- LOGICA MODALE ---
    function showModal() {
        if (modal) modal.style.display = 'flex';
    }

    function hideModal() {
        if (modal) modal.style.display = 'none';
        resetResults(); // Pulisce la mappa quando il modale si chiude
    }

    // --- LOGICA OROLOGIO ---
    function syncTimeWithServer() {
        fetch(`${API_BASE_URL}/api/time/`)
            .then(response => { if (!response.ok) throw new Error('API Fail'); return response.json(); })
            .then(data => {
                timeState.timeDifference = new Date(data.time) - new Date();
                if (timeElement) timeElement.style.color = '';
            })
            .catch(error => {
                console.error("Impossibile ottenere l'ora del server:", error);
                timeState.timeDifference = 0;
                if (timeElement) timeElement.style.color = 'red';
            });
    }

    function updateDateTime() {
        const serverTime = new Date(new Date().getTime() + timeState.timeDifference);
        const clockOptions = { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        if (timeElement) timeElement.textContent = serverTime.toLocaleTimeString('it-IT', clockOptions);

        const dateOptions = { timeZone: 'Europe/Rome', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = serverTime.toLocaleDateString('it-IT', dateOptions);
        if (dateElement) dateElement.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    }

    // --- COSTRUZIONE INTERFACCIA ---
    function renderUI(locations) {
        const buildingData = locations[buildingID.toUpperCase()];
        if (!buildingData) {
            floorsContainer.innerHTML = '<p>Dati per questo edificio non trovati.</p>';
            return;
        }

        // La riga seguente è stata rimossa perché l'h1 è nascosto
        // buildingTitle.textContent = buildingData.name; 

        floorsContainer.innerHTML = '';

        const sortedFloors = Object.keys(buildingData.floors).sort((a, b) => {
            const valA = a === 'T' ? -0.5 : parseInt(a, 10);
            const valB = b === 'T' ? -0.5 : parseInt(b, 10);
            return valB - valA;
        });

        for (const floorKey of sortedFloors) {
            const floor = buildingData.floors[floorKey];
            const floorSection = document.createElement('div');
            floorSection.className = 'floor-section';

            const title = document.createElement('h2');
            title.textContent = floor.name;
            floorSection.appendChild(title);

            const cardGrid = document.createElement('div');
            cardGrid.className = 'card-grid';

            floor.rooms.forEach(room => {
                const card = document.createElement('div');
                card.className = 'classroom-card';
                card.textContent = room.name;
                card.dataset.id = room.id;
                card.addEventListener('click', handleCardClick);
                cardGrid.appendChild(card);
            });

            floorSection.appendChild(cardGrid);
            floorsContainer.appendChild(floorSection);
        }
    }

    function handleCardClick(event) {
        showModal();
        const destinationId = event.currentTarget.dataset.id;
        findPath(destinationId);
    }

    // --- LOGICA DI NAVIGAZIONE ---
    function findPath(destinationId) {
        infoText.textContent = 'Calcolo percorso per ' + destinationId + '...';
        mapWrapper.style.display = 'none';
        infoText.style.display = 'block';

        fetch(API_BASE_URL + '/totem/api/find?start_node=' + totemID + '&destination_id=' + destinationId)
            .then(function (response) {
                if (!response.ok) {
                    return response.json().then(function (err) {
                        throw new Error(err.error || 'Aula non trovata nel grafo.');
                    });
                }
                return response.json();
            })
            .then(function (data) {
                displayResults(data);
            })
            .catch(function (error) {
                console.error('Errore durante la ricerca del percorso:', error);
                showError(error.message);
            });
    }

    function displayResults(data) {
        infoText.style.display = 'none';
        mapWrapper.style.display = 'flex';
        floorplanImage.src = `${API_BASE_URL}${data.floorplan_url}`;

        floorplanImage.onload = () => {
            const imgRect = floorplanImage.getBoundingClientRect();
            pathCanvas.width = imgRect.width;
            pathCanvas.height = imgRect.height;
            drawPath(data.path, data.image_dimensions);
        };
        floorplanImage.onerror = () => {
            showError("Impossibile caricare l'immagine della mappa.");
        }
    }

    function drawPath(pathCoordinates, originalImageSize) {
        const ctx = pathCanvas.getContext('2d');
        ctx.clearRect(0, 0, pathCanvas.width, pathCanvas.height);
        if (!pathCoordinates || pathCoordinates.length < 2) return;

        const scaleX = pathCanvas.width / originalImageSize.width;
        const scaleY = pathCanvas.height / originalImageSize.height;

        ctx.strokeStyle = '#2f69aa';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([20, 15]);
        ctx.beginPath();
        ctx.moveTo(pathCoordinates[0][0] * scaleX, pathCoordinates[0][1] * scaleY);
        for (let i = 1; i < pathCoordinates.length; i++) {
            ctx.lineTo(pathCoordinates[i][0] * scaleX, pathCoordinates[i][1] * scaleY);
        }
        ctx.stroke();

        const startPoint = pathCoordinates[0];
        ctx.beginPath();
        ctx.arc(startPoint[0] * scaleX, startPoint[1] * scaleY, 15, 0, 2 * Math.PI);
        ctx.fillStyle = '#0a2b5e';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 4;
        ctx.stroke();

        const endPoint = pathCoordinates[pathCoordinates.length - 1];
        ctx.beginPath();
        ctx.arc(endPoint[0] * scaleX, endPoint[1] * scaleY, 15, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    function showError(message) {
        resetResults();
        infoText.textContent = message;
    }

    function resetResults() {
        infoText.textContent = 'Seleziona un\'aula per visualizzare il percorso.';
        infoText.style.display = 'block';
        mapWrapper.style.display = 'none';
        floorplanImage.src = '';
        const ctx = pathCanvas.getContext('2d');
        ctx.clearRect(0, 0, pathCanvas.width, pathCanvas.height);
    }

    // --- AVVIO E LISTENER ---
    if (closeModalButton) closeModalButton.addEventListener('click', hideModal);
    if (modal) modal.addEventListener('click', (event) => {
        if (event.target === modal) hideModal();
    });

    if (homeLink) {
        homeLink.addEventListener('click', function (e) {
            e.preventDefault();
            loader.classList.remove('hidden');
            loader.style.opacity = '1';
            loader.style.visibility = 'visible';
            setTimeout(() => { window.location.href = this.href; }, 150);
        });
    }

    fetch(`${API_BASE_URL}/totem/api/locations`)
        .then(res => res.json())
        .then(data => {
            renderUI(data);
            loader.classList.add('hidden');
        })
        .catch(error => {
            console.error("Impossibile caricare le aule:", error);
            floorsContainer.innerHTML = '<p>Errore nel caricamento delle aule. Controllare il servizio backend.</p>';
            loader.classList.add('hidden');
        });

    syncTimeWithServer();
    setInterval(updateDateTime, 1000);
    setInterval(syncTimeWithServer, 5 * 60 * 1000);
});
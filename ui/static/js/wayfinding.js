document.addEventListener('DOMContentLoaded', () => {
    // Selettori
    const loader = document.getElementById('loader');
    const floorTabsEl = document.getElementById('floor-tabs');
    const roomsListEl = document.getElementById('rooms-list');
    const floorNameEl = document.getElementById('floor-name');
    const mapImageEl = document.getElementById('map-image');
    const pathSvgEl = document.getElementById('path-svg');
    const mapOverlayEl = document.getElementById('map-overlay');
    const instructionsEl = document.getElementById('path-instructions');
    const homeLink = document.getElementById('home-link');
    
    const dateElement = document.getElementById('current-date');
    const timeElement = document.getElementById('current-time');

    let wayfindingData = {};
    const urlParams = new URLSearchParams(window.location.search);
    let currentTotemId = urlParams.get('totem') || "TOTEM-INGRESSO-P1"; 
    let currentTotem = null;

    // --- Logica per l'orologio sincronizzato ---
    const state = { timeDifference: 0 };
    const config = {
        timeServiceUrl: 'http://172.16.32.13/api/time/',
        dataRefreshInterval: 5 * 60
    };

    function syncTimeWithServer() {
        if (!timeElement) return;
        fetch(config.timeServiceUrl)
            .then(response => { if (!response.ok) throw new Error('API Fail'); return response.json(); })
            .then(data => {
                state.timeDifference = new Date(data.time) - new Date();
                timeElement.style.color = '';
            })
            .catch(error => {
                console.error('Could not sync time:', error);
                state.timeDifference = 0;
                timeElement.style.color = 'red';
            });
    }

    // MODIFICATO: Ora visualizza l'ora locale di Roma
    function updateDateTime() {
        if (!dateElement || !timeElement) return;
        const serverTime = new Date(new Date().getTime() + state.timeDifference);

        // Orologio (ora locale di Roma)
        const clockOptions = {
            timeZone: 'Europe/Rome',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        timeElement.textContent = serverTime.toLocaleTimeString('it-IT', clockOptions);

        // Data (data locale di Roma)
        const dateOptions = {
            timeZone: 'Europe/Rome',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        const formattedDate = serverTime.toLocaleDateString('it-IT', dateOptions);
        dateElement.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    }
    // --- FINE LOGICA OROLOGIO ---

    if (homeLink && loader) {
        homeLink.addEventListener('click', function(e) {
            e.preventDefault();
            loader.classList.remove('hidden');
            setTimeout(() => { window.location.href = this.href; }, 150);
        });
    }

    async function loadData() {
        try {
            const response = await fetch('/totem/api/wayfinding/data');
            wayfindingData = await response.json();
            currentTotem = wayfindingData.totems[currentTotemId];
            if (!currentTotem) {
                const firstTotemKey = Object.keys(wayfindingData.totems)[0];
                currentTotem = wayfindingData.totems[firstTotemKey];
            }
            setupUI();
        } catch (error) {
            console.error("Errore Dati:", error);
            floorNameEl.textContent = "Errore Dati";
            if(loader) loader.classList.add('hidden');
        }
    }
    
    // ... (tutte le altre funzioni di wayfinding come setupUI, showFloor, drawPath, etc., rimangono invariate) ...
    function setupUI() {
        wayfindingData.floors.sort((a, b) => b.floor_id - a.floor_id);
        floorTabsEl.innerHTML = '';
        wayfindingData.floors.forEach(floor => {
            const tab = document.createElement('button');
            tab.className = 'tab-button';
            tab.dataset.floorId = floor.floor_id;
            tab.textContent = floor.name;
            tab.addEventListener('click', () => showFloor(floor.floor_id));
            floorTabsEl.appendChild(tab);
        });
        showFloor(currentTotem.floor);
        if(loader) loader.classList.add('hidden');
    }

    function showFloor(floorId) {
        updateMapView(floorId);
        updateRoomSelectionView(floorId);
    }

    function updateMapView(floorId) {
        const floor = wayfindingData.floors.find(f => f.floor_id == floorId);
        if (!floor) return;
        floorNameEl.textContent = floor.name;
        mapImageEl.src = floor.map_image;
        pathSvgEl.innerHTML = '';
        mapOverlayEl.innerHTML = '';
        if (currentTotem && currentTotem.floor == floorId) {
            addMarker(currentTotem.x, currentTotem.y, 'totem', 'Sei qui!');
        }
    }

    function updateRoomSelectionView(floorId, activeRoomId = null) {
        const floor = wayfindingData.floors.find(f => f.floor_id == floorId);
        if (!floor) return;
        document.querySelectorAll('.tab-button').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.floorId == floorId);
        });
        roomsListEl.innerHTML = '';
        if (floor.rooms) {
            floor.rooms.forEach(room => {
                const roomBtn = document.createElement('button');
                roomBtn.className = 'room-button';
                roomBtn.dataset.roomId = room.id;
                roomBtn.classList.toggle('active', room.id === activeRoomId);
                roomBtn.textContent = room.name;
                roomBtn.addEventListener('click', () => findPathToRoom(room.id));
                roomsListEl.appendChild(roomBtn);
            });
        }
    }

    function findPathToRoom(roomId) {
        const targetRoom = wayfindingData.floors.flatMap(f => f.rooms || []).find(r => r.id === roomId);
        const targetFloor = wayfindingData.floors.find(f => f.rooms && f.rooms.some(r => r.id === roomId));
        if (!targetRoom || !targetFloor) return;
        updateRoomSelectionView(targetFloor.floor_id, roomId);
        if (targetFloor.floor_id === currentTotem.floor) {
            updateMapView(currentTotem.floor);
            setTimeout(() => drawPath(currentTotem, targetRoom, "Stai seguendo il percorso...", targetRoom.name), 100);
        } else {
            const path = findMultiFloorPath(currentTotem.floor, targetFloor.floor_id);
            if (!path) {
                displayInstructions("Percorso tra i piani non trovato.", 4000);
                return;
            }
            showPathSequence(path, currentTotem, targetRoom);
        }
    }
    
    function showPathSequence(path, start, end) {
        let currentPoint = start;
        let step = 0;
        updateMapView(start.floor);
        function nextStep() {
            if (step >= path.length) {
                drawPath(currentPoint, end, "Ora segui il percorso fino alla tua destinazione", end.name);
                return;
            }
            const leg = path[step];
            const startPoi = findPoiById(leg.from_poi, leg.from_floor);
            const endPoi = findPoiById(leg.to_poi, leg.to_floor);
            const nextFloorData = wayfindingData.floors.find(f => f.floor_id === leg.to_floor);
            drawPath(currentPoint, startPoi, `Dirigiti verso ${startPoi.name} per il ${nextFloorData.name}`);
            currentPoint = endPoi;
            step++;
            setTimeout(() => {
                updateMapView(leg.to_floor);
                nextStep();
            }, 4000);
        }
        setTimeout(nextStep, 200);
    }

    function drawPath(startPoint, endPoint, message, targetRoomName = null) {
        if (!startPoint || !endPoint) { console.error("Punto non valido per drawPath."); return; }
        mapOverlayEl.innerHTML = '';
        
        if (startPoint.id === currentTotem.id) {
            addMarker(startPoint.x, startPoint.y, 'totem', 'Sei qui! (Partenza)');
        } else {
            addMarker(startPoint.x, startPoint.y, 'stairs', '');
        }

        let endMarkerType = 'room';
        let endMarkerText = '';
        
        if (targetRoomName) {
            endMarkerType = 'room';
            endMarkerText = `Destinazione: ${targetRoomName}`;
        } else if (endPoint.links_to) {
            endMarkerType = 'stairs';
            const destFloorData = wayfindingData.floors.find(f => f.floor_id == endPoint.links_to.floor);
            const destFloorName = destFloorData ? destFloorData.name : '';
            
            if (endPoint.links_to.floor > startPoint.floor) {
                endMarkerText = `Sali al ${destFloorName}`;
            } else {
                endMarkerText = `Scendi al ${destFloorName}`;
            }
        }
        addMarker(endPoint.x, endPoint.y, endMarkerType, endMarkerText);
        
        displayInstructions(message, 3500);
        const pathPoints = `${startPoint.x},${startPoint.y} ${endPoint.x},${endPoint.y}`;
        pathSvgEl.innerHTML = `<polyline class="path-line" points="${pathPoints}"></polyline>`;
    }

    function addMarker(x, y, type, text = '') {
        const markerWrapper = document.createElement('div');
        markerWrapper.className = 'map-marker-wrapper';
        markerWrapper.style.left = `${x}px`;
        markerWrapper.style.top = `${y}px`;
        const dot = document.createElement('div');
        dot.className = `map-marker-dot ${type}`;
        const label = document.createElement('div');
        label.className = 'map-marker-label';
        if (type === 'stairs') {
            const img = document.createElement('img');
            img.src = '/totem/assets/icons/stairs.svg';
            img.alt = text;
            dot.appendChild(img);
        }
        label.textContent = text;
        markerWrapper.appendChild(dot);
        markerWrapper.appendChild(label);
        mapOverlayEl.appendChild(markerWrapper);
    }
    
    function displayInstructions(message, duration) {
        instructionsEl.textContent = message;
        instructionsEl.style.display = 'block';
        setTimeout(() => { instructionsEl.style.display = 'none'; }, duration);
    }
    
    function findPoiById(poiId, floorId) {
        const floor = wayfindingData.floors.find(f => f.floor_id == floorId);
        if (!floor || !floor.pois) return null;
        return floor.pois.find(p => p.id === poiId);
    }
    
    function findMultiFloorPath(startFloorId, endFloorId) {
        if (startFloorId === endFloorId) return [];
        if (startFloorId === 1 && endFloorId === 0) return [{ from_floor: 1, from_poi: "stairs_1_main", to_floor: 0, to_poi: "stairs_0_main" }];
        if (startFloorId === 0 && endFloorId === 1) return [{ from_floor: 0, from_poi: "stairs_0_main", to_floor: 1, to_poi: "stairs_1_main" }];
        if (startFloorId === 0 && endFloorId === -1) return [{ from_floor: 0, from_poi: "stairs_0_down", to_floor: -1, to_poi: "stairs_-1_down" }];
        if (startFloorId === -1 && endFloorId === 0) return [{ from_floor: -1, from_poi: "stairs_-1_down", to_floor: 0, to_poi: "stairs_0_down" }];
        if (startFloorId === 1 && endFloorId === -1) return [ { from_floor: 1, from_poi: "stairs_1_main", to_floor: 0, to_poi: "stairs_0_main" }, { from_floor: 0, from_poi: "stairs_0_down", to_floor: -1, to_poi: "stairs_-1_down" } ];
        if (startFloorId === -1 && endFloorId === 1) return [ { from_floor: -1, from_poi: "stairs_-1_down", to_floor: 0, to_poi: "stairs_0_down" }, { from_floor: 0, from_poi: "stairs_0_main", to_floor: 1, to_poi: "stairs_1_main" } ];
        return null;
    }

    // Avvio della logica
    syncTimeWithServer();
    let secondsCounter = 0;
    setInterval(() => {
        secondsCounter++;
        updateDateTime();
        if (secondsCounter % config.dataRefreshInterval === 0) {
            syncTimeWithServer();
        }
    }, 1000);

    loadData();
})();
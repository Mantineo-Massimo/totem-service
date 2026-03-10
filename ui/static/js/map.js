(function() {
    // --- ELEMENTI DEL DOM ---
    const floorSelector = document.getElementById('floor-selector');
    const mapImageContainer = document.getElementById('map-image-container');
    const mapImage = document.getElementById('map-image');
    const legendPanel = document.getElementById('legend-panel');
    const legendHandle = document.getElementById('legend-handle');
    const homeLink = document.getElementById('home-link');
    
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const panUpBtn = document.getElementById('pan-up-btn');
    const panDownBtn = document.getElementById('pan-down-btn');
    const panLeftBtn = document.getElementById('pan-left-btn');
    const panRightBtn = document.getElementById('pan-right-btn');
    const resetBtn = document.getElementById('reset-btn');

    // --- DATI MAPPA ---
    const mapData = {
        'A': [
            { name: 'Piano 1', floor: 1, src: '/totem/assets/maps/edificio-a-piano-1.svg' },
            { name: 'Piano Terra', floor: 0, src: '/totem/assets/maps/edificio-a-piano-0.svg' },
            { name: 'Piano -1', floor: -1, src: '/totem/assets/maps/edificio-a-piano-m1.svg' }
        ],
        'B': [
            { name: 'Piano 3', floor: 3, src: '/totem/assets/maps/edificio-b-piano-3.svg' },
            { name: 'Piano 1', floor: 1, src: '/totem/assets/maps/edificio-b-piano-1.svg' }
        ],
        'SBA': [
            { name: 'Piano 2', floor: 2, src: '/totem/assets/maps/edificio-sba-piano-2.svg' },
            { name: 'Piano 1', floor: 1, src: '/totem/assets/maps/edificio-sba-piano-1.svg' },
            { name: 'Piano Terra', floor: 0, src: '/totem/assets/maps/edificio-sba-piano-t.svg' }
        ]
    };

    // --- LOGICA ZOOM E PAN ---
    let scale = 1, transformX = 0, transformY = 0;
    const ZOOM_STEP = 1.2;
    const PAN_STEP = 15;
    let panInterval = null;

    function applyTransform() {
        const containerRect = mapImageContainer.getBoundingClientRect();
        const scaledWidth = mapImage.naturalWidth * scale;
        const scaledHeight = mapImage.naturalHeight * scale;
        const overpanX = Math.max(0, (scaledWidth - containerRect.width) / 2);
        const overpanY = Math.max(0, (scaledHeight - containerRect.height) / 2);
        const clampedX = Math.max(-overpanX, Math.min(overpanX, transformX));
        const clampedY = Math.max(-overpanY, Math.min(overpanY, transformY));
        transformX = clampedX;
        transformY = clampedY;
        mapImage.style.transform = `translate(${clampedX}px, ${clampedY}px) scale(${scale})`;
    }

    // Regola 1: La vista iniziale si adatta allo schermo
    function resetTransform() {
        if (mapImage.naturalWidth > 0) {
            const containerRect = mapImageContainer.getBoundingClientRect();
            const scaleX = containerRect.width / mapImage.naturalWidth;
            const scaleY = containerRect.height / mapImage.naturalHeight;
            scale = Math.min(scaleX, scaleY);
        } else {
            scale = 1;
        }
        transformX = 0;
        transformY = 0;
        applyTransform();
    }
    
    // Regola 3: Zoom In non supera il 300%
    zoomInBtn.addEventListener('click', () => {
        scale = Math.min(3, scale * ZOOM_STEP);
        applyTransform();
    });

    // Regola 2: Zoom Out non scende sotto il 100%
    zoomOutBtn.addEventListener('click', (event) => {
        event.preventDefault();
        scale = Math.max(1, scale / ZOOM_STEP); // <-- Limite minimo impostato a 1
        applyTransform();
    });

    function startPanning(direction) {
        if (panInterval) return;
        panInterval = setInterval(() => {
            switch (direction) {
                case 'up': transformY += PAN_STEP; break;
                case 'down': transformY -= PAN_STEP; break;
                case 'left': transformX += PAN_STEP; break;
                case 'right': transformX -= PAN_STEP; break;
            }
            applyTransform();
        }, 50);
    }

    function stopPanning() {
        clearInterval(panInterval);
        panInterval = null;
    }

    [panUpBtn, panDownBtn, panLeftBtn, panRightBtn].forEach(btn => {
        const direction = btn.id.split('-')[1];
        btn.addEventListener('mousedown', () => startPanning(direction));
        btn.addEventListener('mouseup', stopPanning);
        btn.addEventListener('mouseleave', stopPanning);
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); startPanning(direction); });
        btn.addEventListener('touchend', stopPanning);
    });
    
    // Il pulsante di reset torna alla vista iniziale "adattata"
    resetBtn.addEventListener('click', resetTransform);

    // --- GESTIONE PAGINA ---
    function populateFloorSelector(buildingKey) {
        floorSelector.innerHTML = '';
        const floors = mapData[buildingKey];
        if (floors && floors.length > 0) {
            const sortedFloors = floors.sort((a, b) => a.floor - b.floor);
            sortedFloors.forEach((floor, index) => {
                const button = document.createElement('button');
                button.className = 'floor-button';
                button.textContent = floor.name;
                button.addEventListener('click', () => changeMap(sortedFloors, button));
                floorSelector.appendChild(button);
                if (floor.floor === 0) {
                    changeMap(sortedFloors, button);
                } else if (index === 0 && !floors.some(f => f.floor === 0)) {
                    changeMap(sortedFloors, button);
                }
            });
        } else {
            floorSelector.innerHTML = `<p style="color:white;">Mappe non disponibili.</p>`;
        }
    }

    function changeMap(floors, activeButton) {
        floorSelector.querySelectorAll('.floor-button').forEach(btn => btn.classList.remove('active'));
        activeButton.classList.add('active');
        const activeFloor = floors.find(floor => floor.name === activeButton.textContent);
        if (activeFloor) {
            mapImage.src = activeFloor.src;
            mapImage.onload = () => {
                requestAnimationFrame(() => {
                    resetTransform();
                });
            };
        }
    }

    function preloadMaps(buildingKey) {
        const floors = mapData[buildingKey];
        if (floors) {
            floors.forEach(floor => {
                const img = new Image();
                img.src = floor.src;
            });
        }
    }

    // --- INIZIALIZZAZIONE ---
    let buildingParam = new URLSearchParams(window.location.search).get('building') || 'A';
    if (buildingParam.toLowerCase().startsWith('totem_')) {
        buildingParam = buildingParam.substring(6);
    }
    const currentBuilding = buildingParam;
    
    populateFloorSelector(currentBuilding.toUpperCase());
    preloadMaps(currentBuilding.toUpperCase());
    
    if (legendHandle) {
        legendHandle.addEventListener('click', () => {
            legendPanel.classList.toggle('visible');
        });
    }

    if (homeLink) {
        homeLink.addEventListener('click', function(e) {
            e.preventDefault();
            this.style.opacity = '0.5';
            const destinationUrl = `${this.href}?building=${currentBuilding}`;
            setTimeout(() => { window.location.href = destinationUrl; }, 150);
        });
    }
})();
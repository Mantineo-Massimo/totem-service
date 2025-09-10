document.addEventListener('DOMContentLoaded', function() {
    // --- SELETTORI DEGLI ELEMENTI (dichiarati una sola volta) ---
    const browseContainer = document.getElementById('browse-container');
    const searchContainer = document.getElementById('search-container');
    const browseModeBtn = document.getElementById('browse-mode-btn');
    const searchModeBtn = document.getElementById('search-mode-btn');
    const searchDisplay = document.getElementById('search-display');
    const searchResults = document.getElementById('search-results');
    const virtualKeyboard = document.getElementById('virtual-keyboard');
    const instructions = document.getElementById('instructions');
    const floorNameEl = document.getElementById('floor-name');
    const fgImage = document.getElementById('floorplan-image-fg');
    const bgImage = document.getElementById('floorplan-image-bg');
    const pathOverlay = document.getElementById('path-overlay');
    const youAreHere = document.getElementById('you-are-here');
    const destinationPoint = document.getElementById('destination-point');
    const connectionIcon = document.getElementById('connection-icon');
    const startLabel = document.getElementById('start-label');
    const endLabel = document.getElementById('end-label');

    // --- VARIABILI DI STATO ---
    let wayfindingData = null;
    let totemInfo = null;
    let allDestinations = [];
    let animationTimeout = null;
    let activePathElement = null;

    // --- FUNZIONI PRINCIPALI ---

    function selectDestination(destination) {
        clearTimeout(animationTimeout);
        startAnimatedPath(destination);
    }
    
    function startAnimatedPath(destination) {
        const startFloor = wayfindingData.floors.find(f => f.floorId === totemInfo.floorId);
        const endFloor = wayfindingData.floors.find(f => f.floorId === destination.floorId);
        
        resetSVG(true);
        
        if (startFloor.floorId === endFloor.floorId) {
            instructions.innerHTML = `<p>Segui il percorso per raggiungere <strong>${destination.name}</strong>.</p>`;
            displayFloor(startFloor.floorId);
            drawPoint(youAreHere, totemInfo.coordinates);
            drawPoint(destinationPoint, destination.coordinates, destination.name);
            animatePath(totemInfo.coordinates, destination.coordinates);
            
            activePathElement.addEventListener('animationend', () => {
                animationTimeout = setTimeout(() => startAnimatedPath(destination), 10000);
            }, { once: true });

        } else {
            const startConnection = findClosestConnection(totemInfo.coordinates, startFloor.connectionPoints);
            const endConnection = endFloor.connectionPoints.find(c => c.id === startConnection.id);
            
            instructions.innerHTML = `<p>1. Segui il percorso fino a <strong>${startConnection.type === 'elevator' ? "all'ascensore" : "alle scale"}</strong>.</p>`;
            displayFloor(startFloor.floorId);
            drawPoint(youAreHere, totemInfo.coordinates);
            animatePath(totemInfo.coordinates, startConnection.coordinates);
            
            activePathElement.addEventListener('animationend', () => {
                const iconHref = startConnection.type === 'elevator' ? '/totem/static/assets/elevator_icon.svg' : '/totem/static/assets/stairs_icon.svg';
                showConnection(startConnection.coordinates, iconHref);
                instructions.innerHTML = `<p>2. Raggiungi il <strong>${endFloor.floorName}</strong>.</p>`;
                
                animationTimeout = setTimeout(() => {
                    transitionToFloor(endFloor, () => {
                        instructions.innerHTML = `<p>3. Segui il percorso finale fino a <strong>${destination.name}</strong>.</p>`;
                        resetSVG(true);
                        drawPoint(destinationPoint, destination.coordinates, destination.name);
                        animatePath(endConnection.coordinates, destination.coordinates);
                        
                        activePathElement.addEventListener('animationend', () => {
                           animationTimeout = setTimeout(() => startAnimatedPath(destination), 10000);
                        }, { once: true });
                    });
                }, 2000);
            }, { once: true });
        }
    }
    
    function animatePath(start, end) {
        if (activePathElement) activePathElement.remove();
        
        const newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        newPath.classList.add('draw-animation');
        pathOverlay.appendChild(newPath);
        
        setTimeout(() => {
            newPath.setAttribute('d', `M ${start[0]},${start[1]} L ${end[0]},${end[1]}`);
        }, 50);

        activePathElement = newPath;
        
        pathOverlay.appendChild(youAreHere);
        pathOverlay.appendChild(startLabel);
        pathOverlay.appendChild(destinationPoint);
        pathOverlay.appendChild(endLabel);
    }
    
    function drawPoint(element, coords, labelText = null) {
        if (coords) {
            element.setAttribute('cx', coords[0]);
            element.setAttribute('cy', coords[1]);
            element.style.display = 'block';

            let label = (element.id === 'you-are-here') ? startLabel : endLabel;
            if (labelText) { label.textContent = labelText; }

            if (label) {
                label.setAttribute('x', coords[0]);
                label.setAttribute('y', coords[1] - 25);
                label.style.display = 'block';
            }
        } else {
            element.style.display = 'none';
            if (element.id === 'you-are-here') startLabel.style.display = 'none';
            if (element.id === 'destination-point') endLabel.style.display = 'none';
        }
    }

    function resetSVG(hideAllPoints) {
        if (activePathElement) { activePathElement.remove(); activePathElement = null; }
        drawPoint(destinationPoint, null);
        connectionIcon.style.display = 'none';
        if (hideAllPoints) {
            drawPoint(youAreHere, null);
        }
    }

    function showConnection(coords, iconHref) {
        connectionIcon.setAttribute('href', iconHref);
        connectionIcon.setAttribute('x', coords[0]);
        connectionIcon.setAttribute('y', coords[1]);
        connectionIcon.style.display = 'block';
        connectionIcon.parentNode.appendChild(connectionIcon);
    }

    function transitionToFloor(floor, callback) { 
        bgImage.src = floor.floorplanImage; 
        fgImage.style.opacity = '0'; 
        floorNameEl.textContent = floor.floorName; 
        setTimeout(() => { 
            fgImage.src = floor.floorplanImage; 
            fgImage.style.opacity = '1'; 
            if (callback) callback(); 
        }, 800); 
    }

    function resetToInitialState() { 
        const initialFloor = wayfindingData.floors.find(f => f.floorId === totemInfo.floorId); 
        displayFloor(initialFloor.floorId); 
        drawPoint(youAreHere, totemInfo.coordinates); 
        resetSVG(false); 
        instructions.innerHTML = `<p>Seleziona una destinazione per visualizzare il percorso animato.</p>`; 
    }

    function createFloorButtons() {
        const floorOrder = {'primo_piano': 1, 'piano_terra': 0, 'piano_meno_uno': -1};
        const sortedFloors = [...wayfindingData.floors].sort((a,b) => floorOrder[b.floorId] - floorOrder[a.floorId]);
        sortedFloors.forEach(floor => {
            const details = document.createElement('details');
            if (floor.floorId === totemInfo.floorId) details.open = true;
            const summary = document.createElement('summary');
            summary.textContent = floor.floorName;
            const grid = document.createElement('div');
            grid.className = 'room-buttons-grid';
            floor.pointsOfInterest.forEach(poi => {
                const btn = document.createElement('button');
                btn.className = 'room-button';
                btn.textContent = poi.name;
                btn.onclick = () => selectDestination(allDestinations.find(d => d.name === poi.name));
                grid.appendChild(btn);
            });
            details.appendChild(summary);
            details.appendChild(grid);
            browseContainer.appendChild(details);
        });
    }

    function createVirtualKeyboard() {
        const layout = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM', '1234567890', '-BS-CLEAR'];
        layout.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'keyboard-row';
            if (row.includes('-')) {
                const bs = document.createElement('button');
                bs.textContent = '⌫';
                bs.className = 'keyboard-key special';
                bs.dataset.key = 'BS';
                const clear = document.createElement('button');
                clear.textContent = 'CANC';
                clear.className = 'keyboard-key special';
                clear.dataset.key = 'CLEAR';
                rowDiv.append(bs, clear);
            } else {
                row.split('').forEach(key => {
                    const keyBtn = document.createElement('button');
                    keyBtn.className = 'keyboard-key';
                    keyBtn.textContent = key;
                    keyBtn.dataset.key = key;
                    rowDiv.appendChild(keyBtn);
                });
            }
            virtualKeyboard.appendChild(rowDiv);
        });
    }

    virtualKeyboard.addEventListener('click', function(e) {
        if (!e.target.matches('.keyboard-key')) return;
        const key = e.target.dataset.key;
        let currentText = searchDisplay.textContent;
        if (key === 'BS') {
            searchDisplay.textContent = currentText.slice(0, -1);
        } else if (key === 'CLEAR') {
            searchDisplay.textContent = '';
        } else {
            searchDisplay.textContent += key;
        }
        filterResults(searchDisplay.textContent);
    });

    function filterResults(query) {
        searchResults.innerHTML = '';
        if (query.length === 0) return;
        const filtered = allDestinations.filter(d => d.name.toLowerCase().includes(query.toLowerCase()));
        filtered.forEach(dest => {
            const li = document.createElement('li');
            li.textContent = dest.name;
            li.onclick = () => selectDestination(dest);
            searchResults.appendChild(li);
        });
    }

    function displayFloor(floorId) {
        const floor = wayfindingData.floors.find(f => f.floorId === floorId);
        if (floor) {
            floorNameEl.textContent = floor.floorName;
        }
    }

    function findClosestConnection(start, connections) {
        let closest = null, minDist = Infinity;
        connections.forEach(conn => {
            const dist = Math.hypot(start[0] - conn.coordinates[0], start[1] - conn.coordinates[1]);
            if (dist < minDist) {
                minDist = dist;
                closest = conn;
            }
        });
        return closest;
    }

    function switchMode(mode) {
        clearTimeout(animationTimeout);
        resetToInitialState();
        if (mode === 'browse') {
            browseContainer.classList.remove('hidden');
            searchContainer.classList.add('hidden');
            browseModeBtn.classList.add('active');
            searchModeBtn.classList.remove('active');
        } else {
            browseContainer.classList.add('hidden');
            searchContainer.classList.remove('hidden');
            browseModeBtn.classList.remove('active');
            searchModeBtn.classList.add('active');
        }
    }
    browseModeBtn.addEventListener('click', () => switchMode('browse'));
    searchModeBtn.addEventListener('click', () => switchMode('search'));
    
    // --- AVVIO ---
    fetch('/totem/api/wayfinding/data')
        .then(res => res.json())
        .then(data => {
            wayfindingData = data;
            const totemId = new URLSearchParams(window.location.search).get('totem') || Object.keys(data.totems)[0];
            totemInfo = data.totems[totemId];
            
            wayfindingData.floors.forEach(floor => {
                floor.pointsOfInterest.forEach(poi => {
                    allDestinations.push({ name: poi.name, floorId: floor.floorId, coordinates: poi.coordinates });
                });
            });

            createFloorButtons();
            createVirtualKeyboard();
            
            const initialFloor = wayfindingData.floors.find(f => f.floorId === totemInfo.floorId);
            fgImage.src = initialFloor.floorplanImage;
            bgImage.src = initialFloor.floorplanImage;
            floorNameEl.textContent = initialFloor.floorName;
            drawPoint(youAreHere, totemInfo.coordinates);
            resetSVG(false);
            switchMode('browse');
    });
});
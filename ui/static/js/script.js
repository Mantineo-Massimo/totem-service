/**
 * Script for the Totem Service - Legacy Browser Compatible Version.
 */
document.addEventListener('DOMContentLoaded', function() {
    // --- Riferimenti al DOM ---
    var dom = {
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

    // --- Stato e Configurazione Centralizzati ---
    var state = {
        data: null,
        params: new URLSearchParams(window.location.search)
    };

    var config = {
        dataRefreshInterval: 5 * 60 // in secondi
    };

    var translations = {
        missingLocation: "<h1>Errore: Parametro 'location' mancante.</h1>",
        loadingError: function(locationId) { return "<h1>Impossibile caricare la configurazione per '" + locationId + "'</h1>"; }
    };

    function updateClock() {
        var now = new Date();
        var timeString = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        dom.time.textContent = timeString;
    }

    function updateStaticUI() {
        var now = new Date();
        var dateString = now.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        dom.date.textContent = dateString.charAt(0).toUpperCase() + dateString.slice(1);
    }
    
    function createCard(item) {
        var card = document.createElement('div');
        card.className = 'card';
        card.textContent = item.name;
        card.addEventListener('click', function() { showPath(item.name, item.path); });
        return card;
    }

    function renderDirectory(pointsOfInterest) {
        var classroomsFragment = document.createDocumentFragment();
        pointsOfInterest.classrooms.forEach(function(item) { classroomsFragment.appendChild(createCard(item)); });
        dom.classroomsList.innerHTML = '';
        dom.classroomsList.appendChild(classroomsFragment);

        var labsFragment = document.createDocumentFragment();
        pointsOfInterest.labs.forEach(function(item) { labsFragment.appendChild(createCard(item)); });
        dom.labsList.innerHTML = '';
        dom.labsList.appendChild(labsFragment);

        var officesFragment = document.createDocumentFragment();
        pointsOfInterest.offices.forEach(function(item) { officesFragment.appendChild(createCard(item)); });
        dom.officesList.innerHTML = '';
        dom.officesList.appendChild(officesFragment);
    }
    
    function showPath(name, pathData) {
        dom.routePath.setAttribute('d', pathData);
        dom.routePath.style.display = 'block';

        var totalLength = dom.routePath.getTotalLength();
        var endPoint = dom.routePath.getPointAtLength(totalLength);

        dom.destinationPoint.setAttribute('cx', endPoint.x);
        dom.destinationPoint.setAttribute('cy', endPoint.y);
        dom.destinationPoint.style.visibility = 'visible';

        dom.destinationLabel.textContent = 'Percorso per: ' + name;
        dom.destinationLabel.style.display = 'block';
        dom.closePathBtn.style.display = 'block';

        dom.routePath.style.animation = 'none';
        setTimeout(function() { dom.routePath.style.animation = ''; }, 10);

        dom.mapView.scrollIntoView({ behavior: 'smooth' });
    }

    function hidePath() {
        dom.routePath.style.display = 'none';
        dom.destinationLabel.style.display = 'none';
        dom.closePathBtn.style.display = 'none';
        dom.destinationPoint.style.visibility = 'hidden';
    }

    function handleTabClick(event) {
        var targetButton = event.target.closest('.tab-button');
        if (!targetButton) return;

        var targetListId = targetButton.dataset.target;
        
        dom.tabButtons.forEach(function(btn) { btn.classList.remove('active'); });
        dom.cardLists.forEach(function(list) { list.classList.remove('active'); });

        targetButton.classList.add('active');
        document.getElementById(targetListId + '-list').classList.add('active');
    }

    function loadDirectoryData() {
        var locationId = state.params.get('location');
        if (!locationId) {
            document.body.innerHTML = translations.missingLocation;
            return;
        }

        fetch('/totem/api/location/' + locationId)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Errore di rete: ' + response.statusText);
                }
                return response.json();
            })
            .then(function(data) {
                state.data = data;
                
                dom.floorplanImage.src = '/totem/' + data.floorplanImage;
                var coords = data.youAreHere.split(',');
                var cx = coords[0];
                var cy = coords[1];
                dom.youAreHere.setAttribute('cx', cx);
                dom.youAreHere.setAttribute('cy', cy);
                dom.locationLabel.textContent = data.locationName;

                renderDirectory(data.pointsOfInterest);
            })
            .catch(function(e) {
                console.error("Impossibile caricare i dati per il totem:", e);
                document.body.innerHTML = translations.loadingError(locationId);
            });
    }

    function init() {
        updateStaticUI();
        loadDirectoryData();
        
        dom.closePathBtn.addEventListener('click', hidePath);
        dom.tabsContainer.addEventListener('click', handleTabClick);

        var secondsCounter = 0;
        setInterval(function() {
            secondsCounter++;
            updateClock();

            if (secondsCounter % config.dataRefreshInterval === 0) {
                loadDirectoryData();
            }
        }, 1000);
    }

    init();
});

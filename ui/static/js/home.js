(function() {
    // --- Logica per la transizione di pagina ---
    const loader = document.getElementById('loader');
    const infopointLink = document.getElementById('infopoint-link');

    if (infopointLink && loader) {
        infopointLink.addEventListener('click', function(e) {
            e.preventDefault();
            loader.classList.remove('hidden');
            setTimeout(() => {
                window.location.href = this.href;
            }, 150);
        });
    }

    window.addEventListener('pageshow', function(event) {
        if (document.activeElement) {
            document.activeElement.blur();
        }
    });

    // --- Logica per l'orologio sincronizzato ---
    const dateElement = document.getElementById('current-date');
    const timeElement = document.getElementById('current-time');

    if (!dateElement || !timeElement) {
        console.error("Elementi per data o ora non trovati nella Home.");
        return;
    }
    
    const state = { timeDifference: 0 };
    const config = {
        timeServiceUrl: 'http://172.16.32.13/api/time/',
        dataRefreshInterval: 5 * 60
    };

    function syncTimeWithServer() {
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

    // Avvio della logica dell'orologio
    syncTimeWithServer();
    
    let secondsCounter = 0;
    setInterval(() => {
        secondsCounter++;
        updateDateTime();
        if (secondsCounter % config.dataRefreshInterval === 0) {
            syncTimeWithServer();
        }
    }, 1000);

})();
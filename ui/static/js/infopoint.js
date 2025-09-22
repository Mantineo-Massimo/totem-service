document.addEventListener('DOMContentLoaded', () => {
    // Selettori
    const eventsWrapper = document.getElementById('events-wrapper');
    const newsWrapper = document.getElementById('news-wrapper');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const closeModalButton = document.querySelector('.modal-close-button');
    const dateElement = document.getElementById('current-date');
    const timeElement = document.getElementById('current-time');
    const loader = document.getElementById('loader');
    const homeLink = document.getElementById('home-link');

    // --- Logica per l'orologio sincronizzato ---
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
                console.error("Impossibile ottenere l'ora del server:", error);
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
    
    syncTimeWithServer();
    let secondsCounter = 0;
    setInterval(() => {
        secondsCounter++;
        updateDateTime();
        if (secondsCounter % config.dataRefreshInterval === 0) {
            syncTimeWithServer();
        }
    }, 1000);
    // --- FINE LOGICA OROLOGIO ---

    // --- FUNZIONI DI UTILITÀ (invariate) ---
    function showModal(title, content) {
        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        modal.style.display = 'flex';
    }

    function hideModal() {
        modal.style.display = 'none';
        modalBody.innerHTML = '';
    }
    
    async function showDetailInModal(url, fallbackTitle) {
        showModal(fallbackTitle, '<p class="modal-loading">Caricamento in corso...</p>');
        try {
            const response = await fetch(`/totem/api/scrape/detail?url=${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error(`Errore dal server: ${response.statusText}`);
            const data = await response.json();
            if (data.title) {
                modalTitle.textContent = data.title;
            }
            modalBody.innerHTML = data.body_html;
        } catch (error) {
            console.error('Errore nel caricamento dei dettagli:', error);
            modalBody.innerHTML = '<p>Impossibile caricare il contenuto. Si prega di riprovare più tardi.</p>';
        }
    }

    async function fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Errore HTTP: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Impossibile caricare i dati da ${url}:`, error);
            return [];
        }
    }

    function parseItalianDate(dateString) {
        if (!dateString) return null;
        const monthMap = { 'GEN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAG': 4, 'GIU': 5, 'LUG': 6, 'AGO': 7, 'SET': 8, 'OTT': 9, 'NOV': 10, 'DIC': 11 };
        const parts = dateString.toUpperCase().split(' ');
        if (parts.length < 2) return null;
        const day = parseInt(parts[0], 10);
        const monthStr = parts[1].substring(0, 3);
        const month = monthMap[monthStr];
        const year = parts.length > 2 ? parseInt(parts[parts.length - 1], 10) : new Date().getFullYear();
        if (!isNaN(day) && month !== undefined && !isNaN(year)) {
            return new Date(year, month, day);
        }
        return null;
    }
    
    // Listener (invariati)
    if (homeLink && loader) {
        homeLink.addEventListener('click', function(e) {
            e.preventDefault();
            loader.classList.remove('hidden');
            setTimeout(() => { window.location.href = this.href; }, 150);
        });
    }
    closeModalButton.addEventListener('click', hideModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) hideModal();
    });
    
    // Caricamento dati (invariato)
    Promise.all([
        fetchData('/totem/api/scrape/events'),
        fetchData('/totem/api/scrape/news')
    ]).then(([events, news]) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureEvents = events.filter(event => parseItalianDate(event.date) >= today);
        if (eventsWrapper && futureEvents.length > 0) {
            futureEvents.forEach(event => {
                const slide = document.createElement('div');
                slide.className = 'swiper-slide';
                slide.innerHTML = `<p class="event-date">${event.date||''}</p><h3 class="event-title">${event.title}</h3>`;
                slide.addEventListener('click', () => showDetailInModal(event.link, event.title));
                eventsWrapper.appendChild(slide);
            });
            new Swiper('.swiper-events', { slidesPerView: 1, spaceBetween: 30, loop: true, autoplay: { delay: 5000, disableOnInteraction: false } });
        } else if (eventsWrapper) {
            eventsWrapper.innerHTML = '<p>Nessun evento futuro disponibile.</p>';
        }

        if (newsWrapper && news.length > 0) {
            news.forEach(item => {
                const slide = document.createElement('div');
                slide.className = 'swiper-slide news-card';
                slide.innerHTML = `<h3 class="news-title">${item.title}</h3>`;
                slide.addEventListener('click', () => showDetailInModal(item.link, item.title));
                newsWrapper.appendChild(slide);
            });
            new Swiper('.swiper-news', { direction: 'vertical', slidesPerView: 'auto', spaceBetween: 20, freeMode: true, scrollbar: { el: '.swiper-scrollbar', hide: false } });
        } else if (newsWrapper) {
            newsWrapper.innerHTML = '<p>Nessuna notizia disponibile.</p>';
        }

        if (loader) {
            loader.classList.add('hidden');
        }
    });
});
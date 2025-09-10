document.addEventListener('DOMContentLoaded', function() {
    const eventsContainer = document.getElementById('events-container');
    const newsContainer = document.getElementById('news-container');

    // Riquadro N.1 (Dettagli)
    const detailsOverlay = document.getElementById('details-overlay');
    const closeDetailsBtn = document.getElementById('close-details-btn');
    const detailsTitle = document.getElementById('details-title');
    const detailsDate = document.getElementById('details-date');
    const detailsBody = document.getElementById('details-body');

    // Riquadro N.2 (Visualizzatore Link)
    const linkViewerOverlay = document.getElementById('link-viewer-overlay');
    const closeLinkViewerBtn = document.getElementById('close-link-viewer-btn');
    const linkIframe = document.getElementById('link-iframe');

    let allItems = []; 

    const populateDetailsOverlay = function(item) {
        detailsTitle.textContent = item.title;
        detailsDate.textContent = item.date || '';
        detailsBody.innerHTML = item.body_html;
        detailsOverlay.style.display = 'flex';
    };

    const createCard = function(item, index) {
        const card = document.createElement('div');
        card.className = 'item-card ' + (item.date ? 'event' : 'news');
        
        const summary = item.body_html.replace(/<[^>]+>/g, '').substring(0, 150) + '...';
        card.innerHTML = `<p class="item-date">${item.date || ''}</p><h3 class="item-title">${item.title}</h3><p class="item-description">${summary}</p>`;
        
        card.addEventListener('click', function() {
            populateDetailsOverlay(item);
        });
        return card;
    };

    const fetchAndDisplay = function(url, container) {
        fetch(url).then(res => res.json()).then(items => {
            container.innerHTML = '';
            if (items.error || items.length === 0) {
                container.innerHTML = '<p>Nessun contenuto disponibile.</p>'; return;
            }
            items.forEach(item => {
                const card = createCard(item);
                container.appendChild(card);
            });
        }).catch(err => {
            container.innerHTML = '<p class="error-message">Impossibile caricare i contenuti.</p>';
        });
    };

    // Chiude il riquadro dei dettagli
    closeDetailsBtn.addEventListener('click', function() {
        detailsOverlay.style.display = 'none';
    });

    // Chiude il riquadro del visualizzatore di link
    closeLinkViewerBtn.addEventListener('click', function() {
        linkViewerOverlay.style.display = 'none';
        linkIframe.src = 'about:blank';
    });

    // Intercetta i click sui link all'interno del riquadro dei dettagli
    detailsBody.addEventListener('click', function(event) {
        const link = event.target.closest('a');
        if (link && link.href) {
            event.preventDefault(); // Impedisce al link di aprire una nuova pagina
            linkIframe.src = link.href;
            linkViewerOverlay.style.display = 'flex';
        }
    });

    fetchAndDisplay('/totem/api/scrape/events', eventsContainer);
    fetchAndDisplay('/totem/api/scrape/news', newsContainer);
});
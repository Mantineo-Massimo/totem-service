(function() {
    const dateElement = document.getElementById('current-date');
    const timeElement = document.getElementById('current-time');

    if (!dateElement || !timeElement) {
        console.error("Elementi per data o ora non trovati.");
        return;
    }

    const daysOfWeek = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
    const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

    function updateDateTime() {
        const now = new Date();

        // Formato data: Giorno GG Mese AAAA
        const dayName = daysOfWeek[now.getDay()];
        const dayNumber = String(now.getDate()).padStart(2, '0');
        const monthName = months[now.getMonth()];
        const year = now.getFullYear();
        dateElement.textContent = `${dayName} ${dayNumber} ${monthName} ${year}`;

        // Formato ora: HH:MM:SS
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        timeElement.textContent = `${hours}:${minutes}:${seconds}`;
    }

    updateDateTime();
    setInterval(updateDateTime, 1000);
})();
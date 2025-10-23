// Accordion toggle
document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', () => {
    const body = header.nextElementSibling;
    const arrow = header.querySelector('.arrow');

    if (body.style.maxHeight) {
      body.style.maxHeight = null;
      body.classList.remove('show');
      arrow.classList.remove('rotate');
    } else {
      document.querySelectorAll('.accordion-body').forEach(b => b.style.maxHeight = null);
      document.querySelectorAll('.accordion-body').forEach(b => b.classList.remove('show'));
      document.querySelectorAll('.arrow').forEach(a => a.classList.remove('rotate'));

      body.style.maxHeight = body.scrollHeight + "px";
      body.classList.add('show');
      arrow.classList.add('rotate');
    }
  });
});

// Format datum letterlijk, zonder tijdzone correctie
function formatLiteral(dateStr) {
    // Verwijder Z zodat JS het als lokale tijd behandelt
    const dt = new Date(dateStr.replace('Z',''));
    const options = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };
    return new Intl.DateTimeFormat('nl-NL', options).format(dt);
}

const dayMap = {
    'maandag': 'showsMonday',
    'dinsdag': 'showsTuesday',
    'woensdag': 'showsWednesday',
    'donderdag': 'showsThursday',
    'vrijdag': 'showsFriday',
    'zaterdag': 'showsSaturday',
    'zondag': 'showsSunday'
};

// Fetch data
async function fetchMarathon() {
    try {
        const res = await fetch('https://xr-api-2.faststreamdiensten.nl/marathonuitzending/api/frontend.php?output=all');
        const data = await res.json();

        const showsPerDay = {
            maandag: [], dinsdag: [], woensdag: [],
            donderdag: [], vrijdag: [], zaterdag: [], zondag: []
        };

        data.all.forEach(show => {
            // Gebruik letterlijk de datum uit de API
            const dt = new Date(show.start.replace('Z',''));
            const dayName = dt.toLocaleDateString('nl-NL', { weekday: 'long' });
            if (showsPerDay[dayName]) showsPerDay[dayName].push(show);
        });

        Object.keys(showsPerDay).forEach(day => {
            const container = document.getElementById(dayMap[day]);
            container.innerHTML = '';
            if (showsPerDay[day].length === 0) {
                container.innerHTML = '<em>Geen shows gepland</em>';
            } else {
                showsPerDay[day].forEach(show => {
                    const div = document.createElement('div');
                    div.className = 'mb-2';
                    div.innerHTML = `<span class="show-title">${show.title}</span><br>
                                     <span class="show-time">${formatLiteral(show.start)} - ${formatLiteral(show.end)}</span>`;
                    container.appendChild(div);
                });
            }
        });
    } catch (err) {
        console.error('Fout bij ophalen data:', err);
        Object.values(dayMap).forEach(id => {
            document.getElementById(id).innerText = 'Kon de data niet laden.';
        });
    }
}

fetchMarathon();

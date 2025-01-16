document.addEventListener('DOMContentLoaded', function () {
    // Functie om de beveiliging toe te voegen aan afbeeldingen
    function beveiligAfbeeldingen() {
        // Selecteer alle afbeeldingen op de pagina
        const afbeeldingen = document.querySelectorAll('img');

        // Voorkom het standaard contextmenu en toon een aangepast bericht
        function toonAangepoptBericht(event) {
            event.preventDefault();
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Afbeeldingen zijn beschermd!",
                    text: "Het is niet toegestaan om afbeeldingen te downloaden",
                    confirmButtonText: "Sluiten",
                    icon: "error",
                });
            } else {
                alert("Afbeeldingen zijn beschermd!"); // Fallback als Swal niet beschikbaar is
            }
        }

        // Voeg beveiliging toe aan elke afbeelding
        afbeeldingen.forEach((img) => {
            // Voorkom contextmenu
            img.addEventListener('contextmenu', toonAangepoptBericht);

            // Voorkom slepen en kopiëren
            img.setAttribute('draggable', 'false');
            img.addEventListener('dragstart', function (e) {
                e.preventDefault();
            });
        });
    }

    // Beveilig afbeeldingen die al op de pagina staan
    beveiligAfbeeldingen();

    // Beveilig dynamisch geladen afbeeldingen (bijvoorbeeld via AJAX of SPA)
    const observer = new MutationObserver(beveiligAfbeeldingen);
    observer.observe(document.body, { childList: true, subtree: true });
});

document.addEventListener('DOMContentLoaded', function () {
    // Selecteer alle afbeeldingen op de pagina
    const afbeeldingen = document.querySelectorAll('img');

    // Voorkom het standaard contextmenu en toon een aangepopt bericht | XerosRadio
    function toonAangepoptBericht(event) {
        event.preventDefault();
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: "Abeeldingen zijn beschermd!",
                text: "Het is niet toegestaan om Afbeeldingen te Downloaden",
                icon: "error",
            });
        } else {
            alert("Afbeeldingen zijn beschermd!"); // Fallback als Swal niet beschikbaar is
        }
    }

    // Voeg een eventlistener toe aan elke afbeelding om met rechts klikken om te gaan | XerosRadio
    afbeeldingen.forEach((img) => {
        img.addEventListener('contextmenu', toonAangepoptBericht);

        // Voorkom slepen en kopiëren van afbeeldingen | XerosRadio
        img.setAttribute('draggable', 'false');
        img.addEventListener('dragstart', function (e) {
            e.preventDefault();
        });
    });
});

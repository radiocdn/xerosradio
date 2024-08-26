// Bescherming tegen afbeeldingsdiefstal | XerosRadio
document.addEventListener('DOMContentLoaded', function () {
    // Selecteer alle afbeeldingen op de pagina
    const afbeeldingen = document.querySelectorAll('img');

    // Voorkom het standaard contextmenu en toon een aangepopt bericht | XerosRadio
    function toonAangepoptBericht(event) {
        event.preventDefault();
        alert('U mag geen afbeeldingen van onze app stelen zonder toestemming!');
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

// Scroll automatisch naar het einde van de chatbox na het laden | XerosRadio
window.onload = function () {
    var chatBox = document.getElementById("chatBox");
    if (chatBox) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
};

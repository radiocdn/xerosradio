// Bescherming tegen afbeeldingsdiefstal | XerosRadio
document.addEventListener('DOMContentLoaded', function () {
    // Selecteer alle afbeeldingen op de pagina
    const afbeeldingen = document.querySelectorAll('img');
  
    // Voorkom alles met de Content | XerosRadio
    function toonAangepoptBericht(event) {
        event.preventDefault();
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

// Laad de juiste scroll hoogte van het scherm
window.onload = function() {
    var chatBox = document.getElementById('chatBox');
    chatBox.scrollTop = chatBox.scrollHeight;
};

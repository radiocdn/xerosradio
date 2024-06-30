document.addEventListener('DOMContentLoaded', function () {
    // Selecteer alle afbeeldingen op de pagina
    const afbeeldingen = document.querySelectorAll('img');
  
    // Voeg een eventlistener toe aan elke afbeelding om met rechts klikken om te gaan
    afbeeldingen.forEach((img) => {
        // Voorkom slepen en kopiëren van afbeeldingen
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

// Laad de juiste scroll hoogte van het scherm
window.onload = function() {
    var chatBox = document.getElementById('chatBox');
    chatBox.scrollTop = chatBox.scrollHeight;
};

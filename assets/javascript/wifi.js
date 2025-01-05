function toggleContent(tabId) {
    var content = document.getElementById(tabId);
    var isActive = content.classList.contains('active');

    var contents = document.getElementsByClassName('content');
    for (var i = 0; i < contents.length; i++) {
        contents[i].classList.remove('active');
    }
    var tabs = document.getElementsByClassName('tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }
    if (!isActive) {
        content.classList.add('active');
        event.target.classList.add('active');
    }
}

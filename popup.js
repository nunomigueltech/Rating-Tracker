let saveButton = document.getElementById('openSettings');
saveButton.onclick = function(element) {
    chrome.tabs.create({url: "options.html"});
};
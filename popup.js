function loadSettings() {
    chrome.storage.sync.get('minTime', function(obj) { 
        let value = 0;
        if (obj == null) {
            value = 15;
        } else {
            value = obj.minTime;
        }

        document.getElementById('minTime').value = value;
    });

    chrome.storage.sync.get('maxTime', function(obj) { 
        let value = 0;
        if (obj == null) {
            value = 30;
        } else {
            value = obj.maxTime;
        }

        document.getElementById('maxTime').value = value;
    });
}

let saveButton = document.getElementById('saveSettings');
saveButton.onclick = function(element) {
    let minTime = parseInt(document.getElementById('minTime').value);
    let maxTime = parseInt(document.getElementById('maxTime').value);

    if (minTime > maxTime) {
        minTime = maxTime;
        document.getElementById('minTime').value = minTime;
    }

    chrome.storage.sync.set({'minTime' : minTime});
    chrome.storage.sync.set({'maxTime' : maxTime});
}

loadSettings();
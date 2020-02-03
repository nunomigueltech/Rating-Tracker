// START OF UI HANDLING
function selectTab(tabIndex) {
    //Hide All Tabs
    document.getElementById('tab1Content').style.display="none";
    document.getElementById('tab2Content').style.display="none";
    document.getElementById('tab3Content').style.display="none";
    
    //Show the Selected Tab
    document.getElementById('tab' + tabIndex + 'Content').style.display="block";  
}

let tab1 = document.getElementById('tab1')
tab1.onclick = (element) => {
    selectTab(1);
}

let tab2 = document.getElementById('tab2')
tab2.onclick = (element) => {
    selectTab(2);
}

let tab3 = document.getElementById('tab3')
tab3.onclick = (element) => {
    selectTab(3);
}

// enable or disable the minimum/maximum time fields
function updateRefreshFields(areFieldsDisabled) {
    document.getElementById('minTime').disabled = areFieldsDisabled;
    document.getElementById('maxTime').disabled = areFieldsDisabled;
}

let enableRefreshButton = document.getElementById('refreshEnabled');
enableRefreshButton.onclick = (element) => {
    updateRefreshFields(false);
};
let disableRefreshButton = document.getElementById('refreshDisabled');
disableRefreshButton.onclick = (element) => {
    updateRefreshFields(true);
};

let resetButton = document.getElementById('resetStorage');
resetButton.onclick = (element) => {
    if (confirm("Are you sure that want to clear ALL extension storage? This includes your settings and your recorded hours.")) {
        chrome.storage.sync.clear();
        window.location.reload();
    }
};

function loadWeek(dateObject, dayCounter, hours) {
    if (dayCounter > 6 || dayCounter < 0) return;

    let dateEntries = document.getElementById('weeklyView').rows[1].cells;
    let hourEntries = document.getElementById('weeklyView').rows[2].cells;

    var dayString = dateObject.toDateString();
    dateEntries[dayCounter].innerHTML = dayString.substring(4);
    var dayKey = dateObject.getMonth() + '/' + dateObject.getDate() + '/' + dateObject.getFullYear();
    chrome.storage.sync.get(dayKey, (data) => {
        let minutesWorked = (typeof data[dayKey] === 'undefined')? 0.0 : parseInt(data[dayKey]);
        let hoursWorked = minutesWorked/60.0;

        hours += hoursWorked;
        hourEntries[dayCounter].innerHTML = hoursWorked.toFixed(2) + ' hours';
        if (dayCounter == 6) {
            // when all entries are loaded for the week, store the total and update
            // the navigation label
            let navigationLabel = document.getElementById('navigationHeader');
            navigationLabel.innerHTML = dateEntries[0].innerHTML + ' - ' + dateEntries[6].innerHTML;
            hourEntries[7].innerHTML = hours.toFixed(2) + ' hours';
        }
      
        dateObject.setDate(dateObject.getDate() + 1);
        loadWeek(dateObject, dayCounter + 1, hours);
    });
}

let weekOffset = 0;
function loadHourView() {
    var date = new Date();

    // move date to the beginning of the week
    date.setDate(date.getDate() - date.getDay() + (weekOffset * 7));
    loadWeek(date, 0, 0.0);
};

let previousWeekButton = document.getElementById('prevWeekButton');
previousWeekButton.onclick = (element) => {
    weekOffset -= 1;
    loadHourView();
};

let nextWeekButton = document.getElementById('nextWeekButton');
nextWeekButton.onclick = (element) => {
    weekOffset += 1;
    loadHourView();
};

function fadeoutSavedLabel() {
    let savedLabel = document.getElementById('save-confirmation');
    savedLabel.style.opacity = '0';
}
// END OF UI HANDLING

// START OF INTERNAL HANDLING
function loadSettings() {
    chrome.storage.sync.get(['minTime', 'maxTime', 'refreshSetting', 'refreshSoundSetting',
                             'refreshSoundVolumeSetting', 'timeoutSoundSetting',
                             'timeoutSoundVolumeSetting', 'dailyHourDisplaySetting',
                             'weeklyHourDisplaySetting', 'refreshTimerSetting'], function(data) { 

        let minTime = data['minTime'];
        let maxTime = data['maxTime'];
        let refreshEnabled = data['refreshSetting'];
        let refreshSoundEnabled = data['refreshSoundSetting'];
        let refreshSoundVolume = data['refreshSoundVolumeSetting'];
        let refreshTimerEnabled = data['refreshTimerSetting'];
        let timeoutSoundEnabled = data['timeoutSoundSetting'];
        let timeoutSoundVolume = data['timeoutSoundVolumeSetting'];
        let dailyHourDisplayEnabled = data['dailyHourDisplaySetting'];
        let weeklyHourDisplayEnabled = data['weeklyHourDisplaySetting'];

        if (typeof minTime === 'undefined') {
            minTime = 30;
            chrome.storage.sync.set({'minTime' : minTime});
        }
        
        if (typeof maxTime === 'undefined') {
            maxTime = 60;
            chrome.storage.sync.set({'maxTime' : maxTime});
        }

        if (typeof refreshEnabled === 'undefined') {
            refreshEnabled = true;
            chrome.storage.sync.set({'refreshSetting' : refreshEnabled});
        }

        if (typeof refreshSoundEnabled === 'undefined') {
            refreshSoundEnabled = true;
            chrome.storage.sync.set({'refreshSoundSetting' : refreshSoundEnabled});
        }

        if (typeof refreshSoundVolume === 'undefined') {
            refreshSoundVolume = 100;
            chrome.storage.sync.set({'refreshSoundVolumeSetting' : refreshSoundVolume});
        }

        if (typeof refreshTimerEnabled === 'undefined') {
            refreshTimerEnabled = true;
            chrome.storage.sync.set({'refreshTimerSetting' : refreshTimerEnabled});
        }


        if (typeof timeoutSoundEnabled === 'undefined') {
            timeoutSoundEnabled = true;
            chrome.storage.sync.set({'timeoutSoundSetting' : timeoutSoundEnabled});
        }

        if (typeof timeoutSoundVolume === 'undefined') {
            timeoutSoundVolume = 100;
            chrome.storage.sync.set({'timeoutSoundVolumeSetting' : timeoutSoundVolume});
        }

        if (typeof dailyHourDisplayEnabled === 'undefined') {
            dailyHourDisplayEnabled = true;
            chrome.storage.sync.set({'dailyHourDisplaySetting' : dailyHourDisplayEnabled});
        }

        if (typeof weeklyHourDisplayEnabled === 'undefined') {
            weeklyHourDisplayEnabled = true;
            chrome.storage.sync.set({'weeklyHourDisplaySetting' : weeklyHourDisplayEnabled});
        }

        document.getElementById('minTime').value = minTime;
        document.getElementById('maxTime').value = maxTime;
        document.getElementById('refreshEnabled').checked = refreshEnabled;
        document.getElementById('refreshDisabled').checked = !refreshEnabled;
        document.getElementById('soundTaskFound').checked = refreshSoundEnabled;
        document.getElementById('displayRefreshTimer').checked = refreshTimerEnabled;
        document.getElementById('soundLevelTaskFound').value = refreshSoundVolume;
        document.getElementById('soundTaskTimeout').checked = timeoutSoundEnabled;
        document.getElementById('soundLevelTaskTimeout').value = timeoutSoundVolume;
        document.getElementById('displayHoursDay').checked = dailyHourDisplayEnabled;
        document.getElementById('displayHoursWeek').checked = weeklyHourDisplayEnabled;
        updateRefreshFields(!refreshEnabled);
    });
}

let saveButton = document.getElementById('saveSettings');
saveButton.onclick = function(element) {
    let minTime = parseInt(document.getElementById('minTime').value);
    let maxTime = parseInt(document.getElementById('maxTime').value);
    let refreshSetting = document.getElementById('refreshEnabled').checked;
    let refreshSoundSetting = document.getElementById('soundTaskFound').checked;
    let refreshSoundVolumeSetting = parseInt(document.getElementById('soundLevelTaskFound').value);
    let refreshTimerSetting = document.getElementById('displayRefreshTimer').checked;
    let timeoutSoundSetting = document.getElementById('soundTaskTimeout').checked;
    let timeoutSoundVolumeSetting = parseInt(document.getElementById('soundLevelTaskTimeout').value);
    let dailyHourDisplaySetting = document.getElementById('displayHoursDay').checked;
    let weeklyHourDisplaySetting = document.getElementById('displayHoursWeek').checked;

    if (minTime < 1) {
        minTime = 1;
        document.getElementById('minTime').value = minTime;
    }
    
    if (maxTime < 1) {
        maxTime = 1;
        document.getElementById('maxTime').value = maxTime;
    }

    if (minTime > maxTime) {
        minTime = maxTime;
        document.getElementById('minTime').value = minTime;
    }

    chrome.storage.sync.set({'minTime' : minTime});
    chrome.storage.sync.set({'maxTime' : maxTime});
    chrome.storage.sync.set({'refreshSetting' : refreshSetting});
    chrome.storage.sync.set({'refreshSoundSetting' : refreshSoundSetting});
    chrome.storage.sync.set({'refreshSoundVolumeSetting' : refreshSoundVolumeSetting});
    chrome.storage.sync.set({'refreshTimerSetting' : refreshTimerSetting});
    chrome.storage.sync.set({'timeoutSoundSetting' : timeoutSoundSetting});
    chrome.storage.sync.set({'timeoutSoundVolumeSetting' : timeoutSoundVolumeSetting});
    chrome.storage.sync.set({'dailyHourDisplaySetting' : dailyHourDisplaySetting});
    chrome.storage.sync.set({'weeklyHourDisplaySetting' : weeklyHourDisplaySetting});

    // update save notification
    let savedLabel = document.getElementById('save-confirmation');
    savedLabel.style.opacity = '1';
    window.setTimeout(fadeoutSavedLabel, 3000);
}

loadSettings();
loadHourView();
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

function loadWeek(dateObject, dayCounter, minutes) {
    if (dayCounter > 6 || dayCounter < 0) return;

    let dateEntries = document.getElementById('weeklyView').rows[1].cells;
    let hourEntries = document.getElementById('weeklyView').rows[2].cells;

    var dayString = dateObject.toDateString();
    dateEntries[dayCounter].innerHTML = dayString.substring(4);
    var dayKey = dateObject.getMonth() + '/' + dateObject.getDate() + '/' + dateObject.getFullYear();
    chrome.storage.sync.get(dayKey, (data) => {
        let minutesWorked = (typeof data[dayKey] === 'undefined')? 0.0 : parseInt(data[dayKey]);
        let hoursWorked = minutesWorked/60.0;

        minutes += minutesWorked;
        hourEntries[dayCounter].innerHTML = hoursWorked.toFixed(2) + ' hours';
        if (dayCounter == 6) {
            // when all entries are loaded for the week, store the total and update
            // the navigation label
            let navigationLabel = document.getElementById('navigationHeader');
            navigationLabel.innerHTML = dateEntries[0].innerHTML + ' - ' + dateEntries[6].innerHTML;

            let hoursWorked = minutes/60;
            hourEntries[7].innerHTML = hoursWorked.toFixed(2) + ' hours';
        }
      
        dateObject.setDate(dateObject.getDate() + 1);
        loadWeek(dateObject, dayCounter + 1, minutes);
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

let taskWebsiteButton = document.getElementById('taskWebsite');
taskWebsiteButton.onclick = (element) => {
    let taskWebsiteURL = document.getElementById('taskWebsiteURL');
    taskWebsiteURL.disabled = !taskWebsiteButton.checked;
};

let employeeWebsiteButton = document.getElementById('employeeWebsite');
employeeWebsiteButton.onclick = (element) => {
    let employeeWebsiteURL = document.getElementById('employeeWebsiteURL');
    employeeWebsiteURL.disabled = !employeeWebsiteButton.checked;
};

let timesheetWebsiteButton = document.getElementById('timesheetWebsite');
timesheetWebsiteButton.onclick = (element) => {
    let timesheetWebsiteURL = document.getElementById('timesheetWebsiteURL');
    timesheetWebsiteURL.disabled = !timesheetWebsiteButton.checked;
};
// END OF UI HANDLING

// START OF INTERNAL HANDLING
function getValue(data, key, defaultValue) {
    let result = data[key]
    if (typeof result === 'undefined') {
        result = defaultValue;
        chrome.storage.sync.set({[key] : result});
    }

    return result;
}

function loadSettings() {
    chrome.storage.sync.get(['minTime', 'maxTime', 'refreshSetting', 'refreshSoundSetting',
                             'refreshSoundVolumeSetting', 'timeoutSoundSetting',
                             'timeoutSoundVolumeSetting', 'dailyHourDisplaySetting',
                             'weeklyHourDisplaySetting', 'refreshTimerSetting',
                             'taskWebsiteSetting', 'taskWebsiteURLSetting',
                             'employeeWebsiteSetting', 'employeeWebsiteURLSetting',
                            'timesheetWebsiteSetting', 'timesheetWebsiteURLSetting']
                             , function(data) { 

        let minTime = getValue(data, 'minTime', 30);
        let maxTime = getValue(data, 'maxTime', 60);
        let refreshEnabled = getValue(data, 'refreshSetting', true);
        let refreshSoundEnabled = getValue(data, 'refreshSoundSetting', true);
        let refreshSoundVolume = getValue(data, 'refreshSoundVolumeSetting', 100);
        let refreshTimerEnabled = getValue(data, 'refreshTimerSetting', true);
        let timeoutSoundEnabled = getValue(data, 'timeoutSoundSetting', true);
        let timeoutSoundVolume = getValue(data, 'timeoutSoundVolumeSetting', 100);
        let dailyHourDisplayEnabled = getValue(data, 'dailyHourDisplaySetting', true);
        let weeklyHourDisplayEnabled = getValue(data, 'weeklyHourDisplaySetting', true);
        let taskWebsiteEnabled = getValue(data, 'taskWebsiteSetting', false);
        let taskWebsiteURL = getValue(data, 'taskWebsiteURLSetting', '');
        let employeeWebsiteEnabled = getValue(data, 'employeeWebsiteSetting', false);
        let employeeWebsiteURL = getValue(data, 'employeeWebsiteURLSetting', '');
        let timesheetWebsiteEnabled = getValue(data, 'timesheetWebsiteSetting', false);
        let timesheetWebsiteURL = getValue(data, 'timesheetWebsiteURLSetting', '');

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
        document.getElementById('taskWebsite').checked = taskWebsiteEnabled;
        document.getElementById('taskWebsiteURL').value = taskWebsiteURL;
        document.getElementById('taskWebsiteURL').disabled = !taskWebsiteEnabled;
        document.getElementById('employeeWebsite').checked = employeeWebsiteEnabled;
        document.getElementById('employeeWebsiteURL').value = employeeWebsiteURL;
        document.getElementById('employeeWebsiteURL').disabled = !employeeWebsiteEnabled;
        document.getElementById('timesheetWebsite').checked = timesheetWebsiteEnabled;
        document.getElementById('timesheetWebsiteURL').value = timesheetWebsiteURL;
        document.getElementById('timesheetWebsiteURL').disabled = !timesheetWebsiteEnabled;
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
    let taskWebsiteSetting = document.getElementById('taskWebsite').checked;
    let taskWebsiteURLSetting = document.getElementById('taskWebsiteURL').value;
    let employeeWebsiteSetting = document.getElementById('employeeWebsite').checked;
    let employeeWebsiteURLSetting = document.getElementById('employeeWebsiteURL').value;
    let timesheetWebsiteSetting = document.getElementById('timesheetWebsite').checked;
    let timesheetWebsiteURLSetting = document.getElementById('timesheetWebsiteURL').value;

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
    chrome.storage.sync.set({'taskWebsiteSetting' : taskWebsiteSetting});
    chrome.storage.sync.set({'taskWebsiteURLSetting' : taskWebsiteURLSetting});
    chrome.storage.sync.set({'employeeWebsiteSetting' : employeeWebsiteSetting});
    chrome.storage.sync.set({'employeeWebsiteURLSetting' : employeeWebsiteURLSetting});
    chrome.storage.sync.set({'timesheetWebsiteSetting' : timesheetWebsiteSetting});
    chrome.storage.sync.set({'timesheetWebsiteURLSetting' : timesheetWebsiteURLSetting});

    // update save notification
    let savedLabel = document.getElementById('save-confirmation');
    savedLabel.style.opacity = '1';
    window.setTimeout(fadeoutSavedLabel, 3000);
}

loadSettings();
loadHourView();
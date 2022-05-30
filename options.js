// START OF UI HANDLING
let tabs = document.getElementsByClassName('tab');
for (let i = 0; i < tabs.length; i++) {
    tabs[i].onclick = (element) => {
        let optionsTabURL = chrome.extension.getURL('options.html?tab=' + tabs[i].id)
        selectTab(tabs[i].id);
        window.history.pushState({path: optionsTabURL},'',optionsTabURL);
    }
}

/**
 * Changes content visible to the user according to the tab ID selected.
 * @param {number} tabIndex Integer reflecting tab ID in options menu.
 * @return {boolean} returns true if tab was successfully found and activated
 */
function selectTab(tabID) {
    selectedTab = document.getElementById(tabID + 'Content')
    if (selectedTab == null) {
        return false;
    }

    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].id != tabID) {
            document.getElementById(tabs[i].id + 'Content').style.display = 'none';
        }
    }

    //Show the Selected Tab
    document.getElementById(tabID + 'Content').style.display = 'block';
    return true;
}

/**
 * START OF CHANGELOG HANDLER
 */

let changelogVersionSelector = document.getElementById('versionSelect');
changelogVersionSelector.onchange = (event) => {
    let selectedVersionID = changelogVersionSelector.value;

    let availableVersions = changelogVersionSelector.options;
    for (let version of availableVersions) {
        let internalVersionID = version.value;

        if (selectedVersionID !== internalVersionID) {
            document.getElementById(internalVersionID).style.display = 'none';
        } else {
            document.getElementById('changelogVersion').innerText = 'Version ' + version.innerText + ' Changelog';
            document.getElementById(internalVersionID).style.display = 'block';
        }
    }
};

/**
 * END OF CHANGELOG HANDLER
 */

/**
 * Updates the status of min/max refresh time fields. Updated when settings are loaded 
 * and on interaction with the enable/disable refresh radiobuttons.
 * @param {boolean} areFieldsDisabled Boolean that disables min/max refresh fields if FALSE
 */
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
        chrome.runtime.sendMessage({status : "verify-settings"});
    }
};

/**
 * Updates the Hour View in the options menu.
 * @param {Object} dateObject Date object to be used for each operation.
 * @param {number} dayCounter Integer that should be initialized to 0. Used as accumulator for recursion.
 * @param {number} minutes Float that tracks the minutes worked throughout the week. Initialized to 0.0
 */
function loadWeek(dateObject, dayCounter, minutes) {
    if (dayCounter > 6 || dayCounter < 0) return;

    let dateEntries = document.getElementById('weeklyView').rows[1].cells;
    let hourEntries = document.getElementById('weeklyView').rows[2].cells;

    let dayString = dateObject.toDateString();
    dateEntries[dayCounter].innerHTML = dayString.substring(4);
    let dayKey = dateObject.getMonth() + '/' + dateObject.getDate() + '/' + dateObject.getFullYear();
    chrome.storage.sync.get([dayKey, 'displayTimeInHoursMinutesSetting'], (data) => {
        let minutesWorked = (typeof data[dayKey] === 'undefined')? 0.0 : parseInt(data[dayKey]);
        minutes += minutesWorked;

        hourEntries[dayCounter].innerHTML = getTimeWorkedString(minutesWorked, data['displayTimeInHoursMinutesSetting']);
        if (dayCounter == 6) {
            // when all entries are loaded for the week, store the total and update
            // the navigation label
            let navigationLabel = document.getElementById('navigationHeader');
            navigationLabel.innerHTML = dateEntries[0].innerHTML + ' - ' + dateEntries[6].innerHTML;
            hourEntries[7].innerHTML = getTimeWorkedString(minutes, data['displayTimeInHoursMinutesSetting']);
        }
      
        dateObject.setDate(dateObject.getDate() + 1);
        loadWeek(dateObject, dayCounter + 1, minutes);
    });
}

let weekOffset = 0;
function loadHourView() {
    let date = new Date();

    // move date to the beginning of the week
    date.setDate(date.getDate() - date.getDay() + (weekOffset * 7));
    loadWeek(date, 0, 0.0);
}

function getTimeWorkedString(minutesWorked, shouldDisplayTimeInHoursMinutes) {
    if (shouldDisplayTimeInHoursMinutes) {
        const hoursWorked = minutesWorked/60.0;
        const leftoverMinutesWorked = minutesWorked % 60;
        return hoursWorked.toFixed(0) + ' hrs. ' + leftoverMinutesWorked + ' mins.';
    } else {
        const hoursWorked = minutesWorked/60.0;
        return hoursWorked.toFixed(2) + ' hours'
    }
}

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

let beforeGoalNotificationsCheckbox = document.getElementById('beforeGoalNotificationsEnabled');
beforeGoalNotificationsCheckbox.onclick = (element) => {
    let goalMinutesText = document.getElementById('notificationMinutes');
    goalMinutesText.disabled = !beforeGoalNotificationsCheckbox.checked;
};

chrome.runtime.onMessage.addListener( 
    function(request, sender, sendResponse) {
        if (request.status == "update-calendar") {
            let hourEntries = document.getElementById('weeklyView').rows[2].cells;
            let date = new Date();
            let currentDay = date.getDay();
            let hoursDay = (request.timeDay) / 60;
            let hoursWeek = (request.timeWeek) / 60;

            hourEntries[currentDay].innerHTML = hoursDay.toFixed(2) + ' hours';
            hourEntries[7].innerHTML = hoursWeek.toFixed(2) + ' hours';
        }
    });
// END OF UI HANDLING

// START OF INTERNAL HANDLING

/**
 * Reads value from the object literal and sets a default value if it was undefined.
 * @param {Object} data Object literal to read data from.
 * @param {string} key String containing the key to access data to verify.
 * @param {*} defaultValue Variable that contains a back-up value for undefined entries.
 */
function getValue(setting, defaultValue) {
    let result = setting;
    if (typeof setting === 'undefined') {
        result = defaultValue;
        chrome.storage.sync.set({[setting] : result});
    }

    return result;
}

/**
 * Updates field values such that the min value is always smaller than the max and the
 * value of each field does not go below a certain value.
 * @param {number} minValue Float containing the minimum value allowed on text fields.
 * @param {number} minVariable Float representing the min. value we are testing.
 * @param {number} maxVariable Float representing the max. value we are testing.
 * @param {string} minElementID String containing the ID of the min. value field.
 * @param {string} maxElementID String containing the ID of the max. value field.
 */
function updateMinMaxFields(minValue, minVariable, maxVariable, minElementID, maxElementID) {
    if (minVariable < minValue) {
        minVariable = minValue;
        document.getElementById(minElementID).value = minVariable;
    }
    
    if (maxVariable < minValue) {
        maxVariable = minValue;
        document.getElementById(maxElementID).value = maxVariable;
    }

    if (minVariable > maxVariable) {
        minVariable = maxVariable;
        document.getElementById(minElementID).value = minVariable;
    }
}

function loadSettings() {
    chrome.storage.sync.get(['minTime', 'maxTime', 'refreshSetting', 'refreshSoundSetting',
                             'refreshSoundVolumeSetting', 'timeoutSoundSetting',
                             'timeoutSoundVolumeSetting', 'dailyHourDisplaySetting',
                             'weeklyHourDisplaySetting', 'refreshTimerSetting',
                             'taskWebsiteSetting', 'taskWebsiteURLSetting',
                             'employeeWebsiteSetting', 'employeeWebsiteURLSetting',
                             'timesheetWebsiteSetting', 'timesheetWebsiteURLSetting',
                             'dynamicGoalsSetting', 'dailyHourGoal', 'weeklyHourGoal',
                             'beforeGoalNotificationsSetting', 'notificationMinutes',
                             'goalNotificationsSetting', 'updateNotificationsSetting',
                             'taskCompletionNotificationsSetting', 'timekeepingEstimatedSetting',
                             'displayTimeInHoursMinutesSetting', 'soundTaskRefreshTimeoutSetting',
                             'calendarShortcutSetting'] ,
                    function(data) {

        let minTime = getValue(data['minTime'], 30);
        let maxTime = getValue(data['maxTime'], 60);
        let refreshEnabled = getValue(data['refreshSetting'], true);
        let refreshSoundEnabled = getValue(data['refreshSoundSetting'], true);
        let refreshSoundVolume = getValue(data['refreshSoundVolumeSetting'], 100);
        let refreshTimerEnabled = getValue(data['refreshTimerSetting'], true);
        let timeoutSoundEnabled = getValue(data['timeoutSoundSetting'], true);
        let timeoutSoundVolume = getValue(data['timeoutSoundVolumeSetting'], 100);
        let dailyHourDisplayEnabled = getValue(data['dailyHourDisplaySetting'], true);
        let weeklyHourDisplayEnabled = getValue(data['weeklyHourDisplaySetting'], true);
        let taskWebsiteEnabled = getValue(data['taskWebsiteSetting'], false);
        let taskWebsiteURL = getValue(data['taskWebsiteURLSetting'], '');
        let employeeWebsiteEnabled = getValue(data['employeeWebsiteSetting'], false);
        let employeeWebsiteURL = getValue(data['employeeWebsiteURLSetting'], '');
        let timesheetWebsiteEnabled = getValue(data['timesheetWebsiteSetting'], false);
        let timesheetWebsiteURL = getValue(data['timesheetWebsiteURLSetting'], '');
        let dynamicGoalsEnabled = getValue(data['dynamicGoalsSetting'], false);
        let dailyHourGoal = getValue(data['dailyHourGoal'], 8.0);
        let weeklyHourGoal = getValue(data['weeklyHourGoal'], 20.0);
        let goalNotificationsEnabled = getValue(data['goalNotificationsSetting'], true);
        let beforeGoalNotificationsEnabled = getValue(data['beforeGoalNotificationsSetting'], true);
        let notificationMinutes = getValue(data['notificationMinutes'], 15);
        let updateNotificationsEnabled = getValue(data['updateNotificationsSetting'], true);
        let taskCompletionNotificationsEnabled = getValue(data['taskCompletionNotificationsSetting'], true);
        let timekeepingEstimatedEnabled = getValue(data['timekeepingEstimatedSetting'], false);
        let displayTimeInHoursMinutesEnabled = getValue(data['displayTimeInHoursMinutesSetting'], false);
        let soundTaskRefreshTimeoutEnabled = getValue(data['soundTaskRefreshTimeoutSetting'], false);
        let calendarShortcutEnabled = getValue(data['calendarShortcutSetting'], false);

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
        document.getElementById('displayColoredGoals').checked = dynamicGoalsEnabled;
        document.getElementById('dailyHourGoal').value = dailyHourGoal;
        document.getElementById('weeklyHourGoal').value = weeklyHourGoal;
        document.getElementById('goalNotificationsEnabled').checked = goalNotificationsEnabled;
        document.getElementById('beforeGoalNotificationsEnabled').checked = beforeGoalNotificationsEnabled;
        document.getElementById('notificationMinutes').value = notificationMinutes;
        document.getElementById('notificationMinutes').disabled = !beforeGoalNotificationsEnabled;
        document.getElementById('updateNotificationsEnabled').checked = updateNotificationsEnabled;
        document.getElementById('taskCompletionNotificationsEnabled').checked = taskCompletionNotificationsEnabled;
        document.getElementById('timekeepingEstimated').checked = timekeepingEstimatedEnabled;
        document.getElementById('displayTimeInHoursMinutes').checked = displayTimeInHoursMinutesEnabled;
        document.getElementById('soundTaskRefreshTimeout').checked = soundTaskRefreshTimeoutEnabled;
        document.getElementById('calendarShortcut').checked = calendarShortcutEnabled;
        updateRefreshFields(!refreshEnabled);
    });
}

function saveSettings() {
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
    let dynamicGoalsSetting = document.getElementById('displayColoredGoals').checked;
    let dailyHourGoal = parseFloat(document.getElementById('dailyHourGoal').value);
    let weeklyHourGoal = parseFloat(document.getElementById('weeklyHourGoal').value);
    let goalNotificationsSetting = document.getElementById('goalNotificationsEnabled').checked;
    let beforeGoalNotificationsSetting = document.getElementById('beforeGoalNotificationsEnabled').checked;
    let notificationMinutes = parseInt(document.getElementById('notificationMinutes').value);
    let updateNotificationsSetting = document.getElementById('updateNotificationsEnabled').checked;
    let taskCompletionNotificationsSetting = document.getElementById('taskCompletionNotificationsEnabled').checked;
    let timekeepingEstimatedSetting = document.getElementById('timekeepingEstimated').checked;
    let displayTimeInHoursMinutesSetting = document.getElementById('displayTimeInHoursMinutes').checked;
    let soundTaskRefreshTimeoutSetting = document.getElementById('soundTaskRefreshTimeout').checked;
    let calendarShortcutSetting = document.getElementById('calendarShortcut').checked;

    updateMinMaxFields(1, minTime, maxTime, 'minTime', 'maxTime');
    updateMinMaxFields(1, dailyHourGoal, weeklyHourGoal, 'dailyHourGoal', 'weeklyHourGoal');

    if (notificationMinutes < 0) {
        notificationMinutes = 0;
        document.getElementById('notificationMinutes').value = 0;
    }

    chrome.storage.sync.set({'minTime': minTime, 'maxTime': maxTime, 'refreshSetting': refreshSetting,
        'refreshSoundSetting': refreshSoundSetting, 'refreshSoundVolumeSetting': refreshSoundVolumeSetting,
        'refreshTimerSetting': refreshTimerSetting, 'timeoutSoundSetting': timeoutSoundSetting,
        'timeoutSoundVolumeSetting': timeoutSoundVolumeSetting, 'dailyHourDisplaySetting': dailyHourDisplaySetting,
        'weeklyHourDisplaySetting': weeklyHourDisplaySetting, 'taskWebsiteSetting': taskWebsiteSetting,
        'taskWebsiteURLSetting': taskWebsiteURLSetting, 'employeeWebsiteSetting': employeeWebsiteSetting,
        'employeeWebsiteURLSetting': employeeWebsiteURLSetting, 'timesheetWebsiteSetting': timesheetWebsiteSetting,
        'timesheetWebsiteURLSetting': timesheetWebsiteURLSetting, 'dynamicGoalsSetting': dynamicGoalsSetting,
        'dailyHourGoal': dailyHourGoal, 'weeklyHourGoal': weeklyHourGoal, 'goalNotificationsSetting': goalNotificationsSetting,
        'beforeGoalNotificationsSetting': beforeGoalNotificationsSetting, 'notificationMinutes' : notificationMinutes,
        'updateNotificationsSetting': updateNotificationsSetting, 'taskCompletionNotificationsSetting': taskCompletionNotificationsSetting,
        'timekeepingEstimatedSetting': timekeepingEstimatedSetting, 'displayTimeInHoursMinutesSetting': displayTimeInHoursMinutesSetting,
        'soundTaskRefreshTimeoutSetting': soundTaskRefreshTimeoutSetting, 'calendarShortcutSetting': calendarShortcutSetting},
        () => {
            // re-render the weekly view after settings are saved
            loadHourView();
        });
}

let saveButton = document.getElementById('saveSettings');
saveButton.onclick = function(element) {
    saveSettings();

    // update save notification
    let savedLabel = document.getElementById('save-confirmation');
    savedLabel.style.opacity = '1';
    window.setTimeout(fadeoutSavedLabel, 3000);
};

function loadTab() {
    let parameterString = window.location.search;
    let urlParams = new URLSearchParams(parameterString);
    let tabName = urlParams.get('tab')

    if (!selectTab(tabName)) {
        selectTab('general'); // if url is invalid then it selects the fallback (general) tab
    }
}

loadTab();
loadSettings();
loadHourView();

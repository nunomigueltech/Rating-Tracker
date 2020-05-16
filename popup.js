/*
    INTERNAL VERSION
 */
const extension_version = "1.1.0";

let settingsButton = document.getElementById('openSettings');
settingsButton.onclick = function() {
    chrome.runtime.openOptionsPage();
};

let taskWebsiteURL = '';
let taskWebsiteButton = document.getElementById('openTaskWebsite');
taskWebsiteButton.onclick = function() {
    chrome.tabs.create({url: taskWebsiteURL})
};

let employeeWebsiteURL = '';
let employeeWebsiteButton = document.getElementById('openEmployeeWebsite');
employeeWebsiteButton.onclick = function() {
    chrome.tabs.create({url: employeeWebsiteURL})
};

let timesheetWebsiteURL = '';
let timesheetWebsiteButton = document.getElementById('openTimesheetWebsite');
timesheetWebsiteButton.onclick = function() {
    chrome.tabs.create({url: timesheetWebsiteURL})
};

let calendarButton = document.getElementById('openCalendar');
calendarButton.onclick = function() {
    let calendarTabURL = chrome.extension.getURL('options.html?tab=calendar');
    chrome.tabs.create({url: calendarTabURL})
};


let updateButton = document.getElementById('updateText');
updateButton.onclick = function() {
    let updatePageURL = chrome.extension.getURL('update.html');
    chrome.tabs.create({url: updatePageURL});
    chrome.storage.local.set({'localExtensionVersion' : extension_version});
};

let hideUpdateButton = document.getElementById('updateCloseImg');
hideUpdateButton.onclick = function() {
    hideElement('updateNotification', false);
    chrome.storage.local.set({'localExtensionVersion' : extension_version});
};

/**
 * Returns string containing CSS color (according to the progress of a particular goal)
 * that can be applied to the pop-up text.
 * @param {number} percent Float that represents the completion of a particular user goal.
 */
function getTextColor(percent) {
    if (percent > 1.0) {
        percent = 1.0;
    }
    let hslValue = 120 * percent;

    return 'hsl(' + hslValue + ', 100%, 40%)';
}

/**
 * Updates the color of an HTML element according to the progress of user goals.
 * @param {string} labelElement String containing the ID of the label containing the string you wish to update.
 * @param {number} currentProgress Float containing the hours worked towards the current goal.
 * @param {number} goal Float containing the hours configured for the current goal.
 */
function updateTextColor(labelElement, currentProgress, goal) {
    let goalCompletionPercentage = currentProgress / goal;
    labelElement.style.color = getTextColor(goalCompletionPercentage);
}

/**
 * Updates the goal text according to user settings and progress towards goals.
 * @param {boolean} goalTextEnabled Boolean that either updates goal text or hides it in the pop-up.
 * @param {string} labelElementName String containing the ID of the label containing the string you wish to update.
 * @param {string} labelText String containing text you'd like to add to the progress label.
 * @param {number} currentProgress Float containing the hours worked towards the current goal.
 * @param {number} goal Float containing the hours configured for the current goal.
 * @param {boolean} dynamicGoalsEnabled Boolean - if true, text is colored to reflect goal progress.
 */
function updateGoalText(goalTextEnabled, labelElementName, labelText, currentProgress, goal, dynamicGoalsEnabled) {
    let labelElement = document.getElementById(labelElementName);
    if (goalTextEnabled) {
        labelElement.innerText = currentProgress.toFixed(2) + ' / ' + goal + labelText;
        if (dynamicGoalsEnabled) {
            updateTextColor(labelElement, currentProgress, goal);
        }
    } else {
        labelElement.style.display = 'none';
    }
}

/**
 * Hides the target HTML element if the setting is NOT true.
 * @param {string} elementName String containing the ID of the element you wish to (possibly) hide.
 * @param {boolean} setting Boolean that determines the visibility of the element.
 */
function hideElement(elementName, setting) {
    if (!setting) {
        let popupElement = document.getElementById(elementName);
        popupElement.style.display = 'none';
    }
}

/**
 * Returns a string that can be used to lookup work data from a particular day.
 * @param {Object} dateObj that represents that day you want to look up
 * @returns {string} containing date
 */
function getSpecificDateKey(dateObj) {
    return dateObj.getMonth() + '/' + dateObj.getDate() + '/' + dateObj.getFullYear();
}

/**
 * Returns a string that can be used to lookup work data from the current day.
 * @returns {string} containing date
 */
function getDateKey() {
    let date = new Date();

    return getSpecificDateKey(date);
}

/**
 * Returns the value found in the object literal and handles undefined results.
 * @param {Object} arrayName Object literal that contains data retrieved from Chrome storage.
 * @param {string} key String representing the key of the value being handled.
 * @param {number} defaultValue If the value pulled from the object literal is undefined, this becomes its new value.
 */
function getValue(arrayName, key, defaultValue) {
    let result = arrayName[key];
    if (typeof result === 'undefined') {
        result = defaultValue;
    }

    return result;
}

// request data and settings from background script to initialize fields
function initialize() {
    let date = new Date();
    date.setDate(date.getDate() - date.getDay());

    let dateKeys = [];
    for (let i = 0; i < 7; i++) {
        dateKeys[i] = getSpecificDateKey(date);
        date.setDate(date.getDate() + 1);
    }

    let minutesWorkedWeek = 0.0;
    chrome.storage.sync.get(dateKeys, (items) => {
        let values = Object.values(items);
        for (let i = 0; i < values.length; i++) {
            if (values[i] !== 'undefined') {
                minutesWorkedWeek += parseFloat(values[i]);
            }
        }

        chrome.storage.local.get(['localExtensionVersion'], function(data) {
            let localExtensionVersion = data['localExtensionVersion'];
            let dateKey = getDateKey();
            chrome.storage.sync.get([dateKey, 'dailyHourDisplaySetting', 'weeklyHourDisplaySetting',
                'dynamicGoalsSetting', 'taskWebsiteSetting', 'taskWebsiteURLSetting',
                'taskWebsiteSetting', 'taskWebsiteURLSetting', 'employeeWebsiteSetting',
                'timesheetWebsiteSetting', 'timesheetWebsiteURLSetting', 'dailyHourGoal',
                'weeklyHourGoal', 'updateNotificationsSetting', 'calendarShortcutSetting'], function(data) {
                let minutesWorkedToday = getValue(data, dateKey, 0.0);
                let hoursWorkedToday = minutesWorkedToday / 60.0;

                let hoursWorkedWeek = minutesWorkedWeek / 60.0;

                let displayDailyHoursEnabled = getValue(data, 'dailyHourDisplaySetting', true);
                let displayWeeklyHoursEnabled = getValue(data, 'weeklyHourDisplaySetting', true);
                let dynamicGoalsEnabled = getValue(data, 'dynamicGoalsSetting', false);

                let taskWebsiteButtonEnabled = getValue(data, 'taskWebsiteSetting', false);
                taskWebsiteURL = getValue(data, 'taskWebsiteURLSetting', '');

                let employeeWebsiteButtonEnabled = getValue(data, 'employeeWebsiteSetting', false);
                employeeWebsiteURL = getValue(data, 'employeeWebsiteURLSetting', '');

                let timesheetWebsiteButtonEnabled = getValue(data, 'timesheetWebsiteSetting', false);
                timesheetWebsiteURL = getValue(data, 'timesheetWebsiteURLSetting', '');

                let calendarShortcutEnabled = getValue(data, 'calendarShortcutSetting', false);

                let dailyHourGoal = getValue(data, 'dailyHourGoal', 8.0);
                let weeklyHourGoal = getValue(data, 'weeklyHourGoal', 20.0);

                updateGoalText(displayDailyHoursEnabled, 'hoursWorkedToday', ' hours today',
                    hoursWorkedToday, dailyHourGoal, dynamicGoalsEnabled);

                updateGoalText(displayWeeklyHoursEnabled, 'hoursWorkedWeek', ' hours this week',
                    hoursWorkedWeek, weeklyHourGoal, dynamicGoalsEnabled);

                hideElement('taskWebsiteButton', taskWebsiteButtonEnabled);
                hideElement('openEmployeeWebsite', employeeWebsiteButtonEnabled);
                hideElement('openTimesheetWebsite', timesheetWebsiteButtonEnabled);
                hideElement('openCalendar', calendarShortcutEnabled);

                let additionalButtonsEnabled = employeeWebsiteButtonEnabled || timesheetWebsiteButtonEnabled || calendarShortcutEnabled;
                hideElement('additionalSiteButtons', additionalButtonsEnabled);

                let isUpToDate = extension_version === localExtensionVersion;
                let updateNotificationsEnabled = getValue(data, 'updateNotificationsSetting', true);
                hideElement('updateNotification', updateNotificationsEnabled && !isUpToDate);
                if (updateNotificationsEnabled && !isUpToDate) {
                    let updateText = document.getElementById('updateText');
                    updateText.innerText = "What's New in Version "  + extension_version;
                }

                let buttonDividerEnabled = taskWebsiteButtonEnabled || additionalButtonsEnabled;
                hideElement('buttonDivider', buttonDividerEnabled);
            });
        });
    });
}

initialize();
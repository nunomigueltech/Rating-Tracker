let settingsButton = document.getElementById('openSettings');
settingsButton.onclick = function(element) {
    chrome.runtime.openOptionsPage();
};

let taskWebsiteURL = '';
let taskWebsiteButton = document.getElementById('openTaskWebsite');
taskWebsiteButton.onclick = function(element) {
    chrome.tabs.create({url: taskWebsiteURL})
};

let employeeWebsiteURL = '';
let employeeWebsiteButton = document.getElementById('openEmployeeWebsite');
employeeWebsiteButton.onclick = function(element) {
    chrome.tabs.create({url: employeeWebsiteURL})
};

let timesheetWebsiteURL = '';
let timesheetWebsiteButton = document.getElementById('openTimesheetWebsite');
timesheetWebsiteButton.onclick = function(element) {
    chrome.tabs.create({url: timesheetWebsiteURL})
};

/**
 * Returns string containing CSS color (according to the progress of a particular goal) 
 * that can be applied to the pop-up text. 
 * @param {Float that represents the completion of a particular user goal.} percent 
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
 * @param {String containing the ID of the label containing the string you wish to update.} labelElement 
 * @param {Float containing the hours worked towards the current goal.} currentProgress 
 * @param {Float containing the hours configured for the current goal.} goal 
 */
function updateTextColor(labelElement, currentProgress, goal) {
    let goalCompletionPercentage = currentProgress / goal;
    labelElement.style.color = getTextColor(goalCompletionPercentage);
}

/**
 * Updates the goal text according to user settings and progress towards goals.
 * @param {Boolean that either updates goal text or hides it in the pop-up.} goalTextEnabled 
 * @param {String containing the ID of the label containing the string you wish to update.} labelElementName 
 * @param {String containing text you'd like to add to the progress label.} labelText 
 * @param {Float containing the hours worked towards the current goal.} currentProgress 
 * @param {Float containing the hours configured for the current goal.} goal 
 * @param {Boolean - if true, text is colored to reflect goal progress.} dynamicGoalsEnabled 
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
 * @param {String containing the ID of the element you wish to (possibly) hide.} elementName 
 * @param {Boolean that determines the visibility of the element.} setting 
 */
function hideElement(elementName, setting) {
    if (!setting) {
        let popupElement = document.getElementById(elementName);
        popupElement.style.display = 'none';
    }
}

debugger;
// request data and settings from background script to initialize fields
chrome.runtime.sendMessage({status : "popup-data"}, (response) => {
    console.log(response)
    let minutesWorkedToday = parseFloat(response.hours[0]);
    let hoursWorkedToday = minutesWorkedToday / 60.0;
    let minutesWorkedWeek = parseFloat(response.hours[1]);
    let hoursWorkedWeek = minutesWorkedWeek / 60.0;
    let displayDailyHoursEnabled = response.data[0];
    let displayWeeklyHoursEnabled = response.data[1];
    let dynamicGoalsEnabled = response.data[2];
    let taskWebsiteButtonEnabled = response.taskWebsite[0];
    taskWebsiteURL = response.taskWebsite[1];
    let employeeWebsiteButtonEnabled = response.employeeWebsite[0];
    employeeWebsiteURL = response.employeeWebsite[1];
    let timesheetWebsiteButtonEnabled = response.timesheetWebsite[0];
    timesheetWebsiteURL = response.timesheetWebsite[1];
    let dailyHourGoal = response.goals[0];
    let weeklyHourGoal = response.goals[1];
    
    updateGoalText(displayDailyHoursEnabled, 'hoursWorkedToday', ' hours today', 
                   hoursWorkedToday, dailyHourGoal, dynamicGoalsEnabled);

    updateGoalText(displayWeeklyHoursEnabled, 'hoursWorkedWeek', ' hours this week', 
                   hoursWorkedWeek, weeklyHourGoal, dynamicGoalsEnabled);

    hideElement('taskWebsiteButton', taskWebsiteButtonEnabled);
    hideElement('openEmployeeWebsite', employeeWebsiteButtonEnabled);
    hideElement('openTimesheetWebsite', timesheetWebsiteButtonEnabled);
    
    let additionalButtonsEnabled = employeeWebsiteButtonEnabled || timesheetWebsiteButtonEnabled;
    hideElement('additionalSiteButtons', additionalButtonsEnabled);

    let buttonDividerEnabled = taskWebsiteButtonEnabled || additionalButtonsEnabled;
    hideElement('buttonDivider', buttonDividerEnabled);
});

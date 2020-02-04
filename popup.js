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


// request data and settings from background script to initialize fields
chrome.runtime.sendMessage({status : "popup-data"}, (response) => {
    let minutesWorkedToday = parseFloat(response.hours[0]);
    let hoursWorkedToday = minutesWorkedToday / 60.0;
    let minutesWorkedWeek = parseFloat(response.hours[1]);
    let hoursWorkedWeek = minutesWorkedWeek / 60.0;
    let displayDailyHoursEnabled = response.data[0];
    let displayWeeklyHoursEnabled = response.data[1];
    let taskWebsiteButtonEnabled = response.taskWebsite[0];
    taskWebsiteURL = response.taskWebsite[1];
    let employeeWebsiteButtonEnabled = response.employeeWebsite[0];
    employeeWebsiteURL = response.employeeWebsite[1];
    let timesheetWebsiteButtonEnabled = response.timesheetWebsite[0];
    timesheetWebsiteURL = response.timesheetWebsite[1];

    let hoursWorkedTodayLabel = document.getElementById('hoursWorkedToday');
    if (displayDailyHoursEnabled) {
        hoursWorkedTodayLabel.innerHTML = (hoursWorkedToday.toFixed(2) * 1.0) + ' / 8.0 hours today';
    } else {
        hoursWorkedTodayLabel.style.display = 'none';
    }

    let hoursWorkedWeekLabel = document.getElementById('hoursWorkedWeek');
    if (displayWeeklyHoursEnabled) {
        hoursWorkedWeekLabel.innerHTML = (hoursWorkedWeek.toFixed(2) * 1.0) + ' / 20.0 hours this week';
    } else {
        hoursWorkedWeekLabel.style.display = 'none';
    }

    if (!taskWebsiteButtonEnabled) {
        let taskWebsiteButton = document.getElementById('taskWebsiteButton');
        taskWebsiteButton.style.display = 'none';
    }

    if (!employeeWebsiteButtonEnabled) {
        let openEmployeeWebsite = document.getElementById('openEmployeeWebsite');
        openEmployeeWebsite.style.display = 'none';
    }
    if (!timesheetWebsiteButtonEnabled) {
        let openTimesheetWebsite = document.getElementById('openTimesheetWebsite');
        openTimesheetWebsite.style.display = 'none';
    }

    if (!employeeWebsiteButtonEnabled && !timesheetWebsiteButtonEnabled) {
        let additionalSiteButtons = document.getElementById('additionalSiteButtons');
        additionalSiteButtons.style.display = 'none';

        if (!taskWebsiteButtonEnabled) {
            let buttonDivider = document.getElementById('buttonDivider');
            buttonDivider.style.display = 'none';
        }
    }
});

let settingsButton = document.getElementById('openSettings');
settingsButton.onclick = function(element) {
    chrome.tabs.create({url: "options.html"});
};

// request data and settings from background script to initialize fields
chrome.runtime.sendMessage({status : "popup-data"}, (response) => {
    let minutesWorkedToday = parseFloat(response.hours[0]);
    let hoursWorkedToday = minutesWorkedToday / 60.0;
    let minutesWorkedWeek = parseFloat(response.hours[1]);
    let hoursWorkedWeek = minutesWorkedWeek / 60.0;
    let displayDailyHoursEnabled = response.data[0];
    let displayWeeklyHoursEnabled = response.data[1];

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
});

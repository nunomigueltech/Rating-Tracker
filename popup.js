let settingsButton = document.getElementById('openSettings');
settingsButton.onclick = function(element) {
    chrome.tabs.create({url: "options.html"});
};

chrome.runtime.sendMessage({status : "hours-worked-day"}, (response) => {
    let minutesWorked = (typeof response === 'undefined')? 0.0 : parseFloat(response.hours);
    let hoursWorked = minutesWorked / 60.0;

    let hoursWorkedLabel = document.getElementById('hoursWorkedToday');
    hoursWorkedLabel.innerHTML = (hoursWorked.toFixed(2) * 1.0) + ' / 8.0 hours today';
});

chrome.runtime.sendMessage({status : "hours-worked-week"}, (response) => {
    let minutesWorked = (typeof response === 'undefined')? 0.0 : parseFloat(response.hours);
    let hoursWorked = minutesWorked / 60.0;

    let hoursWorkedLabel = document.getElementById('hoursWorkedWeek');
    hoursWorkedLabel.innerHTML = (hoursWorked.toFixed(2) * 1.0) + ' / 20.0 hours this week';
});
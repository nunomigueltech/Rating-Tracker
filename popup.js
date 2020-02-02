let saveButton = document.getElementById('openSettings');
saveButton.onclick = function(element) {
    chrome.tabs.create({url: "options.html"});
};

chrome.runtime.sendMessage({status : "hours-worked"}, (response) => {
    console.log(response)
    let minutesWorked = (typeof response === 'undefined')? 0.0 : parseFloat(response.hours);
    let hoursWorked = minutesWorked / 60.0;

    let hoursWorkedLabel = document.getElementById('hoursWorked');
    hoursWorkedLabel.innerHTML = (hoursWorked.toFixed(2) * 1.0) + ' / 8.0 hours worked';
});
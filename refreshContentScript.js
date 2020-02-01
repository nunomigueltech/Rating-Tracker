var isRunning = true;

chrome.runtime.connect().onDisconnect.addListener(function() {
    isRunning = false;
});

function checkWork() {
    let taskList = document.querySelector('ul.ewok-rater-task-option');

    if (taskList.innerText.includes("Acquire if available")) {
        chrome.runtime.sendMessage({status : "work-available"});
    } else {
        chrome.runtime.sendMessage({status : "work-unavailable"});
    }
}

function handleRefresh() {
    if (!isRunning) return;

    window.location.reload();
    checkWork();
}

var minTime = 0;
var maxTime = 0;

checkWork();
chrome.runtime.sendMessage({status : "return-refresh-status"}, (response) => {
    let refreshStatus = response.value;

    if (refreshStatus) {
        chrome.runtime.sendMessage({status : "return-time-interval"}, (response) => {
            minTime = parseInt(response.value[0]);
            maxTime = parseInt(response.value[1]);
        
            let waitTime = Math.ceil( (Math.random() * (maxTime - minTime)) + minTime + 1);
            console.log('Waiting ' + waitTime + ' seconds.');
            setTimeout(handleRefresh, waitTime * 1000);
        });
    }
});
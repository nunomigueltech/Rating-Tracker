var isRunning = true;

chrome.runtime.connect().onDisconnect.addListener(function() {
    isRunning = false;
});

// NO TASKS CLASS - h2. ewok-rater-task-header ewok-rater-no-tasks
function checkWork() {
    let taskList = document.querySelector('div.container');
    if (taskList.innerText.includes('Acquire if available') || taskList.innerText.includes('Incomplete Tasks')) {
        chrome.runtime.sendMessage({status : 'work-available'});
    } else {
        chrome.runtime.sendMessage({status : 'work-unavailable'});
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
chrome.runtime.sendMessage({status : 'return-refresh-status'}, (response) => {
    let refreshStatus = response.value;

    if (refreshStatus) {
        chrome.runtime.sendMessage({status : 'return-time-interval'}, (response) => {
            let refreshEnabled = response.value[0];

            if (refreshEnabled) {
                minTime = parseInt(response.value[1]);
                maxTime = parseInt(response.value[2]);
            
                let waitTime = Math.ceil( (Math.random() * (maxTime - minTime)) + minTime + 1);
                setTimeout(handleRefresh, waitTime * 1000);
                if (response.refreshTimerEnabled) {
                    chrome.runtime.sendMessage({status : 'refresh-timer', time : waitTime});
                }
            }
        });
    }
});
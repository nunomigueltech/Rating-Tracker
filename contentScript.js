
var minTime = 1;
var maxTime = 3;
var isRunning = true;

chrome.runtime.connect().onDisconnect.addListener(function() {
    isRunning = false;
});

function checkWork() {
    var taskList = document.querySelector('ul.ewok-rater-task-option');

    if (taskList.innerText.includes("Acquire if available")) {
        chrome.runtime.sendMessage({status : "work-available"});
    }
}

function handleRefresh() {
    if (!isRunning) return;

    window.location.reload();
    checkWork();

    var waitTime = Math.ceil( (Math.random() * (maxTime - minTime)) + minTime + 1);
    console.log('Waiting ' + waitTime + ' seconds.');
    setTimeout(handleRefresh, waitTime * 1000);
}

var waitTime = Math.ceil( (Math.random() * (maxTime - minTime)) + minTime + 1);
console.log('Waiting ' + waitTime + ' seconds.');
setTimeout(handleRefresh, waitTime * 1000);
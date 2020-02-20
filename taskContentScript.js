/**
 * Reads the task time declared on the task page and returns it as a float.
 */
function getTaskTime() {
    let element = document.querySelector('span.ewok-estimated-task-weight');

    let contentStrings = element.innerText.split(" ");
    console.log("Found " + contentStrings[0] + " minute task")
    return parseFloat(contentStrings[0]);
}

/**
 * Extracts the task ID from the task page URL (assuming the ID begins after = )
 */
function getTaskID() {
    let taskID = document.URL.split('=');
    return taskID[1];
}

/**
* Plays a random notification sound when the task timer has run out.
*/
function taskTimeout(soundVolume) {
    console.log("Task timed out at " + taskTime + " minutes")
    let soundID = Math.ceil(Math.random() * 4);
    let soundName = 'taskcomplete' + soundID + '.wav';
    let soundURL = chrome.runtime.getURL('sounds/' + soundName)

    let sound = new Audio(soundURL);
    sound.volume = parseInt(soundVolume)/100.0;
    sound.addEventListener("canplaythrough", event => {
        sound.play();
    });
}

function getDateKey() {
    let dateObj = new Date();
    var dateString = dateObj.getMonth() + '/' + dateObj.getDate() + '/' + dateObj.getFullYear();

    return dateString;
}

/***
 * Saves (to local/sync storage) the time the user spent working on the current task. Done in content script
 * instead of background script due to synchronization issues. Rather than making the extension persistent, messaging
 * is used.
 * @param minutesPassed
 */
function submitHours(minutesPassed) {
    var dateString = getDateKey();
    let taskTimeLimit = getTaskTime();
    let minutesWorked = ((minutesPassed < taskTimeLimit) ?  minutesPassed : taskTimeLimit);

    chrome.storage.sync.get([dateString], function(result) {
        let minutesRecorded = result[dateString];
        if (minutesRecorded === 'undefined') {
            minutesRecorded = 0.0;
        }
        let totalMinutes = minutesRecorded + minutesWorked;

        chrome.storage.sync.set({[dateString] : totalMinutes}, function() {
            console.log("Logging " + minutesWorked + " minutes for a total of " + totalMinutes + " minutes.")
        });
    });
}

let submitButton = document.querySelector('button#ewok-task-submit-button');
submitButton.onclick = (element) => {
    chrome.runtime.sendMessage({status : "submit-task"}, function(response) {
        submitHours(response.timePassed);
    });
};

let stopButton = document.querySelector('button#ewok-task-submit-done-button');
stopButton.onclick = (element) => {
    chrome.runtime.sendMessage({status : "submit-task"}, function(response) {
        submitHours(response.timePassed);
    });
};

let cancelButton = document.querySelector('button#ewok-task-cancel-button');
cancelButton.onclick = (element) => {
    chrome.runtime.sendMessage({status : "cancel-task"});
};

let submitReportButton = document.querySelector('div .ewok-release-buttons').querySelector('button');
submitReportButton.onclick = (element) => {
    let releaseButton = document.getElementById('ewok-release-release');
    // if the user decides to release the task, cancel it
    if (releaseButton.checked) {  
        chrome.runtime.sendMessage({status : "cancel-task"});
    }  
};

let taskTime = getTaskTime();
chrome.runtime.sendMessage({status : "new-task", time : taskTime, id : getTaskID()}, function(response) {
    let soundEnabled = response.timeoutEnabled;
    let soundVolume = response.timeoutVolume;

    if (soundEnabled) {
        window.setTimeout(function() {
            taskTimeout(soundVolume)
        }, taskTime * 60000);
    }
});
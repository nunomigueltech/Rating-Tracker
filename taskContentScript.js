/**
 * Reads the task time declared on the task page and returns it as a float.
 */
function getTaskTime() {
    let element = document.querySelector('span.ewok-estimated-task-weight');

    let contentStrings = element.innerText.split(" ");
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
    console.log('Task timed out. Loading audio data...');
    let soundID = Math.ceil(Math.random() * 4);
    let soundName = 'taskcomplete' + soundID + '.wav';
    let soundURL = chrome.runtime.getURL('sounds/' + soundName);

    let sound = new Audio(soundURL);
    sound.volume = parseInt(soundVolume)/100.0;
    sound.addEventListener("canplaythrough", event => {
        sound.play();
    });

    chrome.storage.sync.get('taskCompletionNotificationsSetting', (setting) => {
        let notificationEnabled = setting['taskCompletionNotificationsSetting'];

        if (notificationEnabled) {
            chrome.runtime.sendMessage({status : "reached-aet"});
        }
    });
}

let submitButton = document.querySelector('button#ewok-task-submit-button');
submitButton.onclick = (element) => {
    chrome.runtime.sendMessage({status : "submit-task"});
};

let stopButton = document.querySelector('button#ewok-task-submit-done-button');
stopButton.onclick = (element) => {
    chrome.runtime.sendMessage({status : "submit-task"});
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

/***
 * Sets a timeout to play task alarm sound.
 * @param {string} taskTimestamp Returned from Date getTime()
 */
function loadAlarm(taskTimestamp) {
    chrome.storage.sync.get(['timeoutSoundSetting', 'timeoutSoundVolumeSetting'], (settings) => {
        let soundEnabled = settings['timeoutSoundSetting'];

        if (soundEnabled) {
            let taskLength = getTaskTime();
            let soundVolume = settings['timeoutSoundVolumeSetting'];
            let taskTimeMilliseconds = taskLength * 60000;
            let currentTime = new Date().getTime(); // time in milliseconds
            let taskTimeElapsed = currentTime - taskTimestamp;
            let taskTimeRemaining = taskTimeMilliseconds - taskTimeElapsed;

            console.log('Active task is ' + taskLength + ' minutes long');
            if (taskTimeRemaining > 0) {
                console.log('Setting alarm for task!');
                window.setTimeout(function() {
                    taskTimeout(soundVolume);
                }, taskTimeRemaining);
            }
        }
    });
}

function initialize() {
    // set internal task ID
    chrome.storage.local.get(['taskID', 'taskTimestamp'], (task) => {
        let internalTaskID = task['taskID'];
        let pageTaskID = getTaskID();

        if (internalTaskID != pageTaskID) {
            console.log('Tracking new task (ID:' + pageTaskID + ')');
            let currentTime = new Date().getTime();
            chrome.storage.local.set({'taskID': pageTaskID, 'taskTimestamp': currentTime, 'taskTime': getTaskTime(),
                                      'taskActive': true}, () => { loadAlarm(currentTime); });
        } else {
            console.log('Resuming tracking for task (ID:' + pageTaskID + ')');
            loadAlarm(task['taskTimestamp']); // alarm needs to be loaded each time the page refreshes, even if it's the same task
        }
    });
}

initialize();
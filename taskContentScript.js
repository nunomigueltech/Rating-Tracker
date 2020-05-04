/**
 * Reads the task time declared on the task page and returns it as a float.
 */
function getTaskTime() {
    let element = document.querySelector('span.ewok-estimated-task-weight');

    let contentStrings = element.innerText.split(" ");
    return Number(contentStrings[0]);
}

/**
 * Extracts the task ID from the task page URL (assuming the ID begins after = )
 */
function getTaskID() {
    let taskID = document.URL.split('=');
    if (taskID.length >= 2) {
        return taskID[1];
    } else {
        return null;
    }
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
    let timestamp = new Date().getTime();
    chrome.storage.local.set({'clickTimestamp': timestamp});
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
    chrome.storage.sync.get(['timeoutSoundSetting', 'timeoutSoundVolumeSetting', 'taskCompletionNotificationsSetting',
                                    'soundTaskRefreshTimeoutSetting'], (settings) => {
        let soundEnabled = settings['timeoutSoundSetting'];

        if (soundEnabled) {
            let taskLength = getTaskTime();
            let soundVolume = settings['timeoutSoundVolumeSetting'];
            let notifyRefreshedTask = settings['soundTaskRefreshTimeoutSetting'];
            let badgeNotificationEnabled = settings['taskCompletionNotificationsSetting'];
            let taskTimeMilliseconds = taskLength * 60000;
            let currentTime = new Date().getTime(); // time in milliseconds
            let taskTimeElapsed = currentTime - taskTimestamp;
            let taskTimeRemaining = taskTimeMilliseconds - taskTimeElapsed;

            console.log('Active task is ' + taskLength + ' minutes long');
            if (taskTimeRemaining > 0 || notifyRefreshedTask) {
                if (taskTimeRemaining < 0) {
                    taskTimeRemaining = 0;
                }

                console.log('Setting alarm for task!');
                window.setTimeout(function() {
                    taskTimeout(soundVolume);
                }, taskTimeRemaining);
            } else if (badgeNotificationEnabled) {
                chrome.runtime.sendMessage({status : "reached-aet"});
            }
        }
    });
}

function initialize() {
    // set internal task ID
    chrome.storage.local.get(['taskID', 'taskTimestamp', 'clickTimestamp', 'loadTimestamp', 'loadFinishedTimestamp'], (task) => {
        let internalTaskID = task['taskID'];
        let pageTaskID = getTaskID();
        let pageTaskTime = getTaskTime();
        let clickTimestamp = task['clickTimestamp'];
        let loadTimestamp = task['loadTimestamp'];
        let loadFinishedTimestamp = task['loadFinishedTimestamp'];

        if (pageTaskID === null || pageTaskID === '') {
            alert('Strange! There was an error while Rating Tracker was trying to find the id for the current task. You can email nrodriguesdev@gmail.com to get this resolved.');
            return;
        }

        if (!Number.isFinite(pageTaskTime) || pageTaskTime.valueOf() <= 0) {
            alert('There was an error while Rating Tracker was trying to find the AET for the current task. This is highly unusual. You can email nrodriguesdev@gmail.com to get this resolved.');
            return;
        }

        if (internalTaskID != pageTaskID) {
            chrome.storage.sync.get(['timekeepingEstimatedSetting'], (setting) => {
                console.log('Tracking new task (ID:' + pageTaskID + ')');

                let htmlLoadTime = loadTimestamp - clickTimestamp;
                console.log('It took ' + htmlLoadTime + ' ms to send, receive, and process the server response.');

                let domLoadTime = loadFinishedTimestamp - loadTimestamp;
                console.log('It took ' + domLoadTime + ' ms to load the DOM.');

                let currentTime = new Date().getTime();
                if (setting['timekeepingEstimatedSetting']) {
                    // network delay estimation ENABLED
                    let estimatedDelay = Math.floor((htmlLoadTime*.5) * (Math.log10(domLoadTime)/3));
                    console.log('Adjusting timestamp for estimated delay of ' + estimatedDelay + ' ms.');
                    currentTime -= estimatedDelay;
                }

                chrome.storage.local.set({'taskID': pageTaskID, 'taskTimestamp': currentTime, 'taskTime': getTaskTime(),
                    'taskActive': true}, () => { loadAlarm(currentTime); });
            });
        } else {
            console.log('Resuming tracking for task (ID:' + pageTaskID + ')');
            loadAlarm(task['taskTimestamp']); // alarm needs to be loaded each time the page refreshes, even if it's the same task
        }
    });
}

initialize();
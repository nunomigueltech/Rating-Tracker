// store timestamp when user clicks button on task list
var taskButtons = document.querySelectorAll('.ewok-rater-task-option .button');
taskButtons.forEach(function(button) {
   button.onclick = (element) => {
       let timestamp = new Date().getTime();
       chrome.storage.local.set({'clickTimestamp': timestamp});
   }
});

/*
 *Checks the web-page for work and sends message to the background script with its result.
*/
function workIsAvailable() {
    let taskListText = document.querySelector('div.container').innerText;

    return (taskListText.includes('Acquire if available') || taskListText.includes('Incomplete Tasks'))
}

function weeklyHoursCompleted() {
    let taskListText = document.querySelector('div.container').innerText;

    return (taskListText.includes('No tasks are currently available. Please try again after'))
}

function playWorkAlert() {
    chrome.storage.sync.get(['refreshSoundSetting', 'refreshSoundVolumeSetting'], (settings) => {
        let soundEnabled = settings['refreshSoundSetting'];

        if (soundEnabled) {
            let taskURL = chrome.runtime.getURL('sounds/taskaccept1.mp3');
            let taskSound = new Audio(taskURL);
            taskSound.volume = parseInt(settings['refreshSoundVolumeSetting']) / 100.0;
            taskSound.addEventListener('canplaythrough', event => {
                taskSound.play();
            });
        }
    });
}

function loadRefreshTimer() {
    chrome.storage.sync.get(['refreshSetting', 'minTime', 'maxTime', 'refreshTimerSetting'], (settings) => {
        let refreshEnabled = settings['refreshSetting'];

        if (refreshEnabled) {
            let minTime = settings['minTime'];
            let maxTime = settings['maxTime'];

            let waitTime = Math.ceil( (Math.random() * (maxTime - minTime)) + minTime + 1);
            setTimeout(() => {window.location.reload()}, waitTime * 1000);

            // check if timer should be displayed in the extension icon
            if (settings['refreshTimerSetting']) {
                chrome.runtime.sendMessage({status : 'refresh-timer', time: waitTime}); // notify background script to display refresh timer
            }
        }
    });
}

function initialize() {
    if (weeklyHoursCompleted()) return;

    if (workIsAvailable()) {
        playWorkAlert();
    } else {
        loadRefreshTimer();
    }
}

initialize();
'use strict';

chrome.runtime.onConnect.addListener(port => {});

var isRefreshing = true;
var storage = [];
var weekMinutesWorked = 0.0; // used to provide constant time access to pop-up script

var currentTask = {
  time: 0.0,
  taskID: '',  
  timeout: null,

  start(taskID, time, func) {
    let date = new Date();
    this.startTime = date.getTime();

    this.taskID = taskID;
    this.time = parseFloat(time) * 60000.0;
    this.timeout = window.setTimeout(func, this.time);
  },

  // calculates the time passed in milliseconds
  timePassed() {
    let date = new Date();
    let currentTime = Date.now();
    return currentTime - this.startTime;
  },

  cancelTimeout() {
    clearTimeout(this.timeout);
  },

  clear() {
    this.time = 0.0;
    this.cancelTimeout();
  }
};

function getSpecificDateKey(dateObj) {
  var dateString = dateObj.getMonth() + '/' + dateObj.getDate() + '/' + dateObj.getFullYear();
  
  return dateString;
}

function getDateKey() {
  let date = new Date();

  return getSpecificDateKey(date);
}

function calculateWeekHours() {
  let date = new Date();
  date.setDate(date.getDate() - date.getDay());

  let dateKeys = [];
  for (let i = 0; i < 7; i++) {
    dateKeys[i] = getSpecificDateKey(date);
    date.setDate(date.getDate() + 1);
  }

  let totalMinutes = 0.0;
  chrome.storage.sync.get(dateKeys, (items) => {
    let values = Object.values(items)
    for (let i = 0; i < values.length; i++) {
      totalMinutes += parseFloat(values[i]);
    }

    weekMinutesWorked = totalMinutes;
  });
}

// save task when complete
function updateHours() {
  if (currentTask.time == 0.0) return;

  var dateString = getDateKey();
  chrome.storage.sync.get(dateString, (items) => {
    let minutes = parseFloat(items[dateString]);
    if (typeof minutes === 'undefined') {
      minutes = 0.0;
    } 

    let minutesPassed = currentTask.timePassed() / 60000;
    if (minutesPassed < currentTask.time) {
      minutes += minutesPassed;
    } else {
      minutes += currentTask.time;
    }

    currentTask.clear();
    chrome.storage.sync.set({[dateString] : minutes});
  });
}

// play sound when task times out
function taskTimeout() {
  if (storage['timeoutSoundSetting']) {
    let soundID = Math.ceil(Math.random() * 4);
    let soundName = 'taskcomplete' + soundID + '.wav';
  
    let sound = new Audio('sounds/' + soundName);
    sound.volume = parseInt(storage['timeoutSoundVolumeSetting'])/100.0;
    sound.addEventListener("canplaythrough", event => {
        sound.play();
    });
  }

  updateHours();
}

// Messages used to share data with other scripts
chrome.runtime.onMessage.addListener( 
  function(request, sender, sendResponse) {
    switch(request.status) {
      case 'work-available':
        isRefreshing = false;

        if (storage['refreshSoundSetting']) {
          let taskSound = new Audio('sounds/taskaccept1.mp3')
          taskSound.volume = parseInt(storage['refreshSoundVolumeSetting'])/100.0;
          taskSound.addEventListener('canplaythrough', event => {
            taskSound.play();
          });
        }
        break;

      case 'work-unavailable':
        isRefreshing = true;
        break;

      // Supply refresh setting data to refresh content script
      case 'return-time-interval': 
        sendResponse({value: [storage['refreshSetting'], storage['minTime'], storage['maxTime']]});
        break;

      case 'return-refresh-status':
        sendResponse({value: isRefreshing});
        break;

      case 'new-task':
        if (request.id != currentTask.taskID) {
          if (currentTask.time != 0.0) {
            updateHours();
          }
          currentTask.start(request.id, request.time, taskTimeout);
        }
        break;

      case 'cancel-task':
        if (currentTask.time != 0.0) {
          currentTask.cancelTimeout();
          updateHours();
        }
        break;
      
      case 'hours-worked-day':
        var dateKey = getDateKey();
        let hoursWorked = (typeof storage[dateKey] === 'undefined')? 0.0 : storage[dateKey];
        sendResponse({hours: hoursWorked});
        break;

      case 'hours-worked-week':
        sendResponse({hours: weekMinutesWorked});
        break;
    }
  }
);

// Store new setting changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  for (const [key, value] of Object.entries(changes)) {
    let todaysDateKey = getDateKey();
    if (key === todaysDateKey) {
      weekHours += (parseFloat(value)/60.0);
    }

    storage[key] = value.newValue;
  }
});

function initializeStorage() {
  var dateKey = getDateKey();
  chrome.storage.sync.get(['minTime', 'maxTime', 'refreshSetting', 'refreshSoundSetting',
                           'refreshSoundVolumeSetting', 'timeoutSoundSetting', 
                           'timeoutSoundVolumeSetting', dateKey], (items) => {
    if (items == null) {
      console.log("Failed to load information from Google Chrome storage.");
    } else {
      storage = items;
    }
  });
}

initializeStorage();
calculateWeekHours();
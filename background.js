'use strict';
 
chrome.runtime.onConnect.addListener(port => {});

var isRefreshing = true;
var storage = [];
var minutesWorkedWeek = 0.0; // used to provide constant time access to pop-up script
var globalRefreshTime = 0;
var globalRefreshInterval = null;

var refreshTimer = {
  time: 0,
  startTime: null,
  interval: null,

  start(time) {
    this.time = time;
    let date = new Date();
    this.startTime = date.getTime();
    if (storage['refreshTimerSetting']) {
      this.interval = window.setInterval(refreshTimer.update, 1000);
    }
  },

  restart() {
    if (this.time <= 0) return;

    let date = new Date();
    let currentTime = date.getTime();
    let timePassed = currentTime - this.startTime;
    this.time -= Math.floor(timePassed / 1000);
    if (this.time > 0) {
      this.update();
      this.interval = window.setInterval(refreshTimer.update, 1000);
    }
  },

  update() {
    console.log("Updating refresh timer")
    if (refreshTimer.time < 0) {
      refreshTimer.clear();
    } else {
      chrome.browserAction.setBadgeText({text: refreshTimer.time-- + ''});
    }
  },

  clear() {
    window.clearInterval(refreshTimer.interval);
    chrome.browserAction.setBadgeText({text: ''});
  }
}

var currentTask = {
  time: 0.0,
  taskID: '',  
  timeout: null,
  active: false,

  start(taskID, time, func) {
    let date = new Date();
    this.startTime = date.getTime();
    this.active = true;

    this.taskID = taskID;
    this.time = parseFloat(time);
    this.timeout = window.setTimeout(func, currentTask.getMilliseconds());
  },

  getMilliseconds() {
    return this.time * 60000.0;
  },

  // calculates the time passed in milliseconds
  timePassed() {
    let currentTime = Date.now();
    return currentTime - this.startTime;
  },

  cancelTimeout() {
    clearTimeout(this.timeout);
  },

  clear() {
    this.active = false;
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
      if (values[i] !== 'undefined') {
        totalMinutes += parseFloat(values[i]);
      } 
    }

    minutesWorkedWeek = totalMinutes;
  });
}

// save task when complete
function updateHours() {
  if (!currentTask.active) return;

  var dateString = getDateKey();
  chrome.storage.sync.get(dateString, (items) => {
    let minutes = storage[dateString];
    let minutesPassed = currentTask.timePassed() / 60000;

    if (minutesPassed < currentTask.time) {
      console.log("Logging " + minutesPassed + " minutes (" + minutesPassed + " < " + currentTask.time + ")")
      minutes += minutesPassed;
    } else {
      console.log("Logging " + currentTask.time + " minutes.")
      minutes += currentTask.time;
    }

    currentTask.clear();
    chrome.storage.sync.set({[dateString] : minutes});
  });
}

// play sound when task times out
function taskTimeout() {
  console.log("Task timed out at " + currentTask.time + " minutes")
  if (storage['timeoutSoundSetting']) {
    let soundID = Math.ceil(Math.random() * 4);
    let soundName = 'taskcomplete' + soundID + '.wav';
  
    let sound = new Audio('sounds/' + soundName);
    sound.volume = parseInt(storage['timeoutSoundVolumeSetting'])/100.0;
    sound.addEventListener("canplaythrough", event => {
        sound.play();
    });
  }
}

function resetRefreshTimer() {
  clearInterval(globalRefreshInterval);
  chrome.browserAction.setBadgeText({text: ''});
}

// updates extension badge text to keep track of current refresh timer
function updateRefreshTimer() {
  if (globalRefreshTime < 0) {
    resetRefreshTimer();
  } else {
    chrome.browserAction.setBadgeText({text: globalRefreshTime-- + ''});
  }
}

// Messages used to share data with other scripts
chrome.runtime.onMessage.addListener( 
  function(request, sender, sendResponse) {
    switch(request.status) {
      case 'work-available':
        isRefreshing = false;
        resetRefreshTimer();
        
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
          currentTask.start(request.id, request.time, taskTimeout);
        }
        break;

      case 'cancel-task':
        if (currentTask.active) {
          currentTask.clear();
        }
        break;

      case 'submit-task':
        if (currentTask.active) {
          updateHours();
        }
        break;
      
      case 'popup-data':
        var dateKey = getDateKey();
        sendResponse({hours: [storage[dateKey], minutesWorkedWeek],
                      data: [storage['dailyHourDisplaySetting'], storage['weeklyHourDisplaySetting'], storage['dynamicGoalsSetting']], 
                      taskWebsite: [storage['taskWebsiteSetting'], storage['taskWebsiteURLSetting']], 
                      employeeWebsite: [storage['employeeWebsiteSetting'], storage['employeeWebsiteURLSetting']],
                      timesheetWebsite: [storage['timesheetWebsiteSetting'], storage['timesheetWebsiteURLSetting']], 
                      goals: [storage['dailyHourGoal'], storage['weeklyHourGoal']]});
        break;

      case 'refresh-timer':
        // start icon badge timer when refresh time is received from content script
        //globalRefreshTime = request.time - 1;
        //resetRefreshTimer();
        //globalRefreshInterval = setInterval(updateRefreshTimer, 1000);
        refreshTimer.clear();
        refreshTimer.start(request.time);
        break;

      case 'reset-storage':
        initializeStorage();
        calculateWeekHours();
        break;
    }
  }
);

// handle undefined values from object literal by using default values
function getValue(data, key, defaultValue) {
  let result = data[key]
  if (typeof result === 'undefined') {
      result = defaultValue;
      chrome.storage.sync.set({[key] : result});
  }

  return result;
}

// Store new setting changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  for (const [key, value] of Object.entries(changes)) {
    let todaysDateKey = getDateKey();
    if (key === todaysDateKey) {
      let oldMinutes = getValue(value, 'oldValue', 0);
      let newMinutes = getValue(value, 'newValue', 0);
      let addedTime = newMinutes - oldMinutes;
      console.log("Adding " + addedTime + " minutes to weekly hours.")
      minutesWorkedWeek += addedTime;

      chrome.runtime.sendMessage({status: "update-calendar", timeDay: newMinutes, timeWeek: minutesWorkedWeek});

      // HANDLE NOTIFICATIONS 
      let notificationText = '';
      let dailyGoalMinutes = storage['dailyHourGoal'] * 60;
      let weeklyGoalMinutes = storage['weeklyHourGoal'] * 60;
      let goalNotificationEnabled = storage['goalNotificationsSetting'];
      let beforeGoalNotificationEnabled = storage['beforeGoalNotificationsSetting'];
      let notificationMinutes = storage['notificationMinutes'];
      if (newMinutes < dailyGoalMinutes) {
        let timeDifference = dailyGoalMinutes - newMinutes;
        if (beforeGoalNotificationEnabled && (timeDifference <= notificationMinutes)) {
          notificationText = notificationText + 'You are ' + timeDifference.toFixed(2) + ' minutes away from achieving your daily goal! '; 
        }
      } else {
        if (goalNotificationEnabled) {
          notificationText = notificationText + 'You have achieved your daily goal of ' + storage['dailyHourGoal'] + ' hours! '; 
        }
      }

      if (minutesWorkedWeek < weeklyGoalMinutes) {
        let timeDifference = weeklyGoalMinutes - minutesWorkedWeek;
        if (beforeGoalNotificationEnabled && (timeDifference <= notificationMinutes)) {
          notificationText = notificationText + 'You are ' + timeDifference.toFixed(2) + ' minutes away from achieving your weekly goal!'; 
        }
      } else {
        if (goalNotificationEnabled) {
          notificationText = notificationText + 'You have achieved your weekly goal of ' + storage['weeklyHourGoal'] + ' hours!'; 
        }
      }

      if (notificationText != '') {
        chrome.notifications.create({type: 'basic', iconUrl: 'images/icon128.png', title: 'Gooooooooal!!', message: notificationText});
      }
    }

    if (key === 'refreshTimerSetting') {
      if (!value.newValue) {
        console.log("Trying to clear")
        refreshTimer.clear();
        //resetRefreshTimer();
      } else {
        refreshTimer.restart();
      }
    }

    storage[key] = getValue(value, 'newValue', value['oldValue']); // keep old value if new one is undefined
  }
});

function initializeStorage() {
  var dateKey = getDateKey();
  chrome.storage.sync.get(['minTime', 'maxTime', 'refreshSetting', 'refreshSoundSetting',
                           'refreshSoundVolumeSetting', 'timeoutSoundSetting', 
                           'timeoutSoundVolumeSetting', 'dailyHourDisplaySetting',
                           'weeklyHourDisplaySetting', 'refreshTimerSetting', 
                           'taskWebsiteSetting', 'taskWebsiteURLSetting', 
                           'employeeWebsiteSetting', 'employeeWebsiteURLSetting',
                           'timesheetWebsiteSetting', 'timesheetWebsiteURLSetting',
                           'dynamicGoalsSetting', 'dailyHourGoal', 'weeklyHourGoal',
                           'goalNotificationsSetting', 'beforeGoalNotificationsSetting',
                           'notificationMinutes', dateKey], (data) => {
    if (data == null) {
      console.error("Failed to load information from Google Chrome storage.");
    } else {
      storage['minTime'] = getValue(data, 'minTime', 30);
      storage['maxTime'] = getValue(data, 'maxTime', 60);
      storage['refreshSetting'] = getValue(data, 'refreshSetting', true);
      storage['refreshSoundSetting'] = getValue(data, 'refreshSoundSetting', true);
      storage['refreshSoundVolumeSetting'] = getValue(data, 'refreshSoundVolumeSetting', 100);
      storage['timeoutSoundSetting'] = getValue(data, 'timeoutSoundSetting', true);
      storage['timeoutSoundVolumeSetting'] = getValue(data, 'timeoutSoundVolumeSetting', 100);
      storage['dailyHourDisplaySetting'] = getValue(data, 'dailyHourDisplaySetting', true);
      storage['weeklyHourDisplaySetting'] = getValue(data, 'weeklyHourDisplaySetting', true);
      storage['refreshTimerSetting'] = getValue(data, 'refreshTimerSetting', true);
      storage['taskWebsiteSetting'] = getValue(data, 'taskWebsiteSetting', false);
      storage['taskWebsiteURLSetting'] = getValue(data, 'taskWebsiteURLSetting', '');
      storage['employeeWebsiteSetting'] = getValue(data, 'employeeWebsiteSetting', false);
      storage['employeeWebsiteURLSetting'] = getValue(data, 'employeeWebsiteURLSetting', '');
      storage['timesheetWebsiteSetting'] = getValue(data, 'timesheetWebsiteSetting', false);
      storage['timesheetWebsiteURLSetting'] = getValue(data, 'timesheetWebsiteURLSetting', '');
      storage['dynamicGoalsSetting'] = getValue(data, 'dynamicGoalsSetting', false);
      storage['dailyHourGoal'] = getValue(data, 'dailyHourGoal', 8.0);
      storage['weeklyHourGoal'] = getValue(data, 'weeklyHourGoal', 20.0);
      storage['goalNotificationsSetting'] = getValue(data, 'goalNotificationsSetting', true);
      storage['beforeGoalNotificationsSetting'] = getValue(data, 'beforeGoalNotificationsSetting', true);
      storage['notificationMinutes'] = getValue(data, 'notificationMinutes', 15.0);
      storage[dateKey] = getValue(data, dateKey, 0.0);
    }
  });
}

initializeStorage();
calculateWeekHours();
'use strict';

var isRefreshing = true;
var storage = []; // keeping settings in memory reduces
var minutesWorkedWeek = 0.0; // used to provide constant time access to pop-up script

/** 
  *refreshTimer handles the timer that appears on the extension icon when there are
  *no tasks available to the user and they are waiting for the next page refresh.   
*/
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

/**
 * Handles every aspect of information regarding the status of the user's 
 * current task.
 */
var currentTask = {
  time: 0.0,
  taskID: '',  
  timeout: null,
  date: null,
  active: false,

  start(taskID, time) {
    if (taskID == currentTask.taskID) return; 
    
    this.date = new Date();
    this.startTime = this.date.getTime();
    this.active = true;

    this.taskID = taskID;
    this.time = parseFloat(time);
    console.log("New task added - ID: " + taskID + " and Time: " + time + " minutes.")
  },

  getMilliseconds() { // time was standardized to minutes across the extension
    return this.time * 60000.0;
  },

  /** 
    * Returns the time passed since the current task began in milliseconds.
    */
  timePassed() {
    let currentTime = Date.now();
    return currentTime - this.startTime;
  },

  clear() {
    this.active = false;
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

/**
 * Sums hours worked across the week and stores them into global minutesWorkedWeek 
 * for later use.
 */
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

/**
 * Handles the storing of task minutes into Chrome storage. Called when a task 
 * has been submitted (completed). 
 */
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

/**
 * Handles message-passing from content-scripts. Delivers cached settings/data to
 * content scripts when requested.
 */
chrome.runtime.onMessage.addListener( 
  function(request, sender, sendResponse) {
    switch(request.status) {
      case 'work-available':
        isRefreshing = false;
        refreshTimer.clear();
        
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

      // Supply refresh setting data to refresh content script (is refresh enabled?)
      case 'return-time-interval': 
        sendResponse({value: [storage['refreshSetting'], storage['minTime'], storage['maxTime']]});
        break;

      case 'return-refresh-status':
        sendResponse({value: isRefreshing});
        break;

      case 'new-task':
        console.log("New task request - ID: " + request.id + " and Time: " + request.time + " minutes.")
        sendResponse({timeoutEnabled: storage['timeoutSoundSetting'], timeoutVolume: storage['timeoutSoundVolumeSetting']});
        if (request.id != currentTask.taskID) {
          currentTask.start(request.id, request.time);
        }
        break;

      case 'cancel-task':
        if (currentTask.active) {
          currentTask.clear();
        }
        break;

      case 'submit-task':
        console.log("Task submitted")
        if (currentTask.active) {
          updateHours();
        }
        break;
      
      // supplies ALL of the information required to display the extension pop-up correctly
      case 'popup-data':
        var dateKey = getDateKey();
        sendResponse({hours: [storage[dateKey], minutesWorkedWeek],
                      data: [storage['dailyHourDisplaySetting'], storage['weeklyHourDisplaySetting'], storage['dynamicGoalsSetting']], 
                      taskWebsite: [storage['taskWebsiteSetting'], storage['taskWebsiteURLSetting']], 
                      employeeWebsite: [storage['employeeWebsiteSetting'], storage['employeeWebsiteURLSetting']],
                      timesheetWebsite: [storage['timesheetWebsiteSetting'], storage['timesheetWebsiteURLSetting']], 
                      goals: [storage['dailyHourGoal'], storage['weeklyHourGoal']]});
        break;

      // start icon badge timer when refresh time is received from content script
      case 'refresh-timer':
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

/**
 * Returns the value found in the object literal and handles undefined results.
 * @param {Object literal that contains data retrieved from Chrome storage.} data 
 * @param {String representing the key of the value being handled.} key 
 * @param {If the value pulled from the object literal is undefined, this becomes its new value.} defaultValue 
 */
function getValue(data, key, defaultValue) {
  let result = data[key]
  if (typeof result === 'undefined') {
      result = defaultValue;
  }

  return result;
}

/**
 * Returns a string with an appropriate goal notification, if there is one to make. 
 * Returns empty string if no notification will be made.
 * @param {String representing period of time to consider. ('daily' or 'weekly')} periodID 
 * @param {Float containing the latest minutes worked for this period.} minutesWorked 
 */
function getNotificationString(periodID, minutesWorked) {
  let notificationText = ''
  let goalHours = storage[periodID + 'HourGoal']; 
  let goalMinutes = goalHours * 60;

  if (minutesWorked < goalMinutes) {
    let timeDifference = goalMinutes - minutesWorked;
    let beforeGoalNotificationEnabled = storage['beforeGoalNotificationsSetting'];
    let notificationMinutes = storage['notificationMinutes'];

    if (beforeGoalNotificationEnabled && (timeDifference <= notificationMinutes)) {
      notificationText += 'You are ' + timeDifference.toFixed(2) + ' minutes away from achieving your  goal! '; 
    }
  } else {
    let goalNotificationEnabled = storage['goalNotificationsSetting'];

    if (goalNotificationEnabled) {
      notificationText += 'You have achieved your ' + periodID + ' goal of ' + goalHours + ' hours! '; 
    }
  }

  return notificationText;
}

/**
 * Creates a Chrome notification if a goal has been met or is close to being met.
 * @param {Float containing the minutes worked for the day.} dailyMinutes 
 */
function handleNotifications(dailyMinutes) {
  let dailyNotification = getNotificationString('daily', dailyMinutes);
  let weeklyNotification = getNotificationString('weekly', minutesWorkedWeek);
  let notificationText = dailyNotification + weeklyNotification;

  if (notificationText != '') {
    chrome.notifications.create({type: 'basic', iconUrl: 'images/icon128.png', title: 'Gooooooooal!!', message: notificationText});
  }
}

/**
 * Listens for changes in storage, which occur when new settings are saved or when
 * a task is completed. Updates the cached storage values and handles task notifications.
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  for (const [key, value] of Object.entries(changes)) {
    let todaysDateKey = getDateKey();
    if (key === todaysDateKey) {
      let oldMinutes = getValue(value, 'oldValue', 0);
      let newMinutes = getValue(value, 'newValue', 0);
      let addedTime = newMinutes - oldMinutes;
      
      let currentDay = new Date().getDay();
      let taskDay = currentTask.date.getDay();

      // checks if user acquired task on late Saturday, but submitted it on Sunday (following week period)
      if (taskDay == 6 && currentDay == 0) { 
        minutesWorkedWeek = addedTime;
      } else {
        minutesWorkedWeek += addedTime;
      }
      
      chrome.runtime.sendMessage({status: "update-calendar", timeDay: newMinutes, timeWeek: minutesWorkedWeek});
      handleNotifications(newMinutes);
    }

    if (key === 'refreshTimerSetting') {
      let refreshTimerEnabled = value.newValue;
      if (refreshTimerEnabled) { 
        refreshTimer.restart();
      } else {
        refreshTimer.clear();
      }
    }

    storage[key] = getValue(value, 'newValue', value['oldValue']); // keep old value if new one is undefined
  }
});

/**
 * Loads all settings from storage into a cached array.
 */
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
'use strict';

/**
 *refreshTimer handles the timer that appears on the extension icon when there are
 *no tasks available to the user and they are waiting for the next page refresh.
 */
const refreshTimer = {
  time: 0,
  startTime: null,
  interval: null,

  start(time) {
    this.time = time;
    let date = new Date();
    this.startTime = date.getTime();
    this.interval = window.setInterval(refreshTimer.update, 1000);
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
    console.log("Updating refresh timer");
    if (refreshTimer.time < 0) {
      refreshTimer.clear();
    } else {
      chrome.browserAction.setBadgeText({text: refreshTimer.time-- + ''});
    }
  },

  clear() {
    window.clearInterval(refreshTimer.interval);
    clearBadgeText();
  }
};

/**
 * Clears the text displayed on the extension badge
 */
function clearBadgeText() {
  chrome.browserAction.setBadgeText({text: ''});
}

/**
 * Returns a string that can be used to lookup work data from a particular day.
 * @param {Object} dateObj that represents that day you want to look up
 * @returns {string} containing date
 */
function getSpecificDateKey(dateObj) {
  return dateObj.getMonth() + '/' + dateObj.getDate() + '/' + dateObj.getFullYear();
}

/**
 * Returns a string that can be used to lookup work data from the current day.
 * @returns {string} containing date
 */
function getDateKey() {
  let date = new Date();

  return getSpecificDateKey(date);
}

function submitHours() {
  const dateString = getDateKey();
  chrome.storage.sync.get(dateString, (data) => {
    chrome.storage.local.get(['taskTimestamp', 'taskTime'], (taskInfo) => {
      let taskTimeLimit = taskInfo['taskTime'];
      let currentTime = new Date().getTime(); // time in milliseconds
      let taskTimeElapsed = currentTime - taskInfo['taskTimestamp'];

      let minutesElapsed = taskTimeElapsed / 60000;
      let minutesWorked = ((minutesElapsed < taskTimeLimit) ?  minutesElapsed : taskTimeLimit);

      console.log("Logging now..");
      let minutesRecorded = getValue(data, dateString, 0.0);
      let totalMinutes = minutesRecorded + minutesWorked;

      chrome.storage.sync.set({[dateString] : totalMinutes}, function() {
        console.log("Logging " + minutesWorked + " minutes for a total of " + totalMinutes + " minutes.")
      });
      chrome.storage.local.set({'taskActive': false});
    })
  });
}

/**
 * Sums hours worked across the week
 */
function calculateWeekHours() {
  let date = new Date();
  date.setDate(date.getDate() - date.getDay());

  let dateKeys = [];
  for (let i = 0; i < 7; i++) {
    dateKeys[i] = getSpecificDateKey(date);
    date.setDate(date.getDate() + 1);
  }

  return new Promise((resolve, reject) => {
    let totalMinutes = 0.0;
    chrome.storage.sync.get(dateKeys, (items) => {
      let values = Object.values(items);
      for (let i = 0; i < values.length; i++) {
        if (values[i] !== 'undefined') {
          totalMinutes += values[i];
        }
      }

      if (totalMinutes === 'undefined') {
        reject(null);
      } else {
        resolve(totalMinutes)
      }
    });
  })
}

/**
 * Handles message-passing from content-scripts. Delivers cached settings/data to
 * content scripts when requested.
 */
chrome.runtime.onMessage.addListener( 
  function(request, sender, sendResponse) {
    switch(request.status) {
      case 'cancel-task':
        clearBadgeText();
        chrome.storage.local.get('taskActive', (status) => {
          if (status['taskActive']) {
            chrome.storage.local.set({'taskID': -1, 'taskTimestamp': null, 'taskTime': 0, 'taskActive': false});
          }
        });
        break;

      case 'submit-task':
        console.log("Task submitted");
        clearBadgeText();
        chrome.storage.local.get('taskActive', (status) => {
          if (status['taskActive']) {
            submitHours();
          }
        });
        break;

      // start icon badge timer when refresh time is received from content script
      case 'refresh-timer':
        refreshTimer.clear();
        refreshTimer.start(request.time);
        break;

      case 'reached-aet':
        chrome.browserAction.setBadgeText({text: 'FIN'});
        break;

      case 'verify-settings':
        verifySettingsIntegrity();
        break;
    }
  }
);

/**
 * Returns the value found in the object literal and handles undefined results.
 * @param {Object} data Object literal that contains data retrieved from Chrome storage.
 * @param {string} key String representing the key of the value being handled.
 * @param {*} defaultValue If the value pulled from the object literal is undefined, this becomes its new value.
 */
function getValue(data, key, defaultValue) {
  let result = data[key];
  if (typeof result === 'undefined') {
      result = defaultValue;
  }

  return result;
}

/**
 * Returns a string with an appropriate goal notification, if there is one to make. 
 * Returns empty string if no notification will be made.
 * @param {string} periodID String representing period of time to consider. ('daily' or 'weekly')
 * @param {Object} storage Object literal containing values for beforeGoalNotificationsSetting, goalNotificationsSetting,
*                  and notificationMinutes from sync storage.
 * @param {number} minutesWorked Float containing the latest minutes worked for this period.
 */
function getNotificationString(periodID, storage, minutesWorked) {
  let notificationText = '';
  let goalHours = storage[periodID + 'HourGoal'];
  let goalMinutes = goalHours * 60;

  if (minutesWorked < goalMinutes) {
    let timeDifference = goalMinutes - minutesWorked;
    let beforeGoalNotificationEnabled = storage['beforeGoalNotificationsSetting'];
    let notificationMinutes = storage['notificationMinutes'];

    if (beforeGoalNotificationEnabled && (timeDifference <= notificationMinutes)) {
      notificationText += 'You are ' + timeDifference.toFixed(2) + ' minutes away from achieving your ' + periodID + ' goal! ';
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
 * @param {number} dailyMinutes Float containing the minutes worked for the day.
 * @param {number} weeklyMinutes Float containing the minutes worked for the week.
 */
function handleNotifications(previousMinutes, weeklyMinutes) {
  let todaysDateKey = getDateKey();
  chrome.storage.sync.get([todaysDateKey, 'dailyHourGoal', 'weeklyHourGoal', 'beforeGoalNotificationsSetting', 'notificationMinutes',
    'goalNotificationsSetting'], (storage) => {
    let dailyMinutes = storage[todaysDateKey];
    let timeChange = dailyMinutes - previousMinutes
    let previousWeeklyMinutes = weeklyMinutes - timeChange;
    let dailyGoalMinutes = storage['dailyHourGoal'] * 60;
    let weeklyGoalMinutes = storage['weeklyHourGoal'] * 60;

    let dailyNotification = (previousMinutes < dailyGoalMinutes)? getNotificationString('daily', storage, dailyMinutes) : '';
    let weeklyNotification = (previousWeeklyMinutes < weeklyGoalMinutes)?  getNotificationString('weekly', storage, weeklyMinutes) : '';
    let notificationText = dailyNotification + weeklyNotification;

    if (notificationText != '') {
      chrome.notifications.create({type: 'basic', iconUrl: 'images/icon128.png', title: 'Gooooooooal!!', message: notificationText});
    }
  });
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

      if (newMinutes > oldMinutes) { // to be removed/changed when time edits are allowed
        calculateWeekHours()
            .then(function(weeklyMinutes) {
              chrome.runtime.sendMessage({status: "update-calendar", timeDay: newMinutes, timeWeek: weeklyMinutes});
              handleNotifications(oldMinutes, weeklyMinutes);
            })
            .catch(function(val) {
              console.log('ERROR: Couldnt calculate weekly work hours.')
            });
      }
    }

    if (key === 'refreshTimerSetting') {
      let refreshTimerEnabled = value.newValue;
      if (refreshTimerEnabled) { 
        refreshTimer.restart();
      } else {
        refreshTimer.clear();
      }
    }
  }
});

chrome.runtime.onUpdateAvailable.addListener((details) => {
  chrome.storage.local.set({'updateAvailable' : true});
});

function verifySettingsIntegrity() {
  console.log('Verifying settings integrity..')
  let defaultSettings = new Object();
  defaultSettings = {
    'minTime': 30,
    'maxTime': 60,
    'refreshSetting': true,
    'refreshSoundSetting': true,
    'refreshSoundVolumeSetting': 100,
    'refreshTimerSetting': true,
    'timeoutSoundSetting': true,
    'timeoutSoundVolumeSetting': 100,
    'dailyHourDisplaySetting': true,
    'weeklyHourDisplaySetting': true,
    'taskWebsiteSetting': false,
    'taskWebsiteURLSetting': '',
    'employeeWebsiteSetting': false,
    'employeeWebsiteURLSetting': '',
    'timesheetWebsiteSetting': false,
    'timesheetWebsiteURLSetting': '',
    'dynamicGoalsSetting': false,
    'dailyHourGoal': 8.0,
    'weeklyHourGoal': 20.0,
    'goalNotificationsSetting': true,
    'beforeGoalNotificationsSetting': true,
    'notificationMinutes': 15,
    'updateNotificationsEnabled': true,
    'taskCompletionNotificationsEnabled': true,
    'timekeepingEstimatedSetting': false,
    'soundTaskRefreshTimeoutSetting': false,
    'calendarShortcutSetting': false
  };

  chrome.storage.sync.get(Object.keys(defaultSettings), (settings) => {
    let newMappings = new Object();
    for (const key in settings) {
      if (typeof key === 'undefined') {
        // default mapping NOT stored yet
        newMappings[key] = defaultSettings[key];
      }
    }

    // store default mappings
    if (Object.keys(newMappings).length !== 0) {
      chrome.storage.sync.set(newMappings);
    }
  });
}

chrome.runtime.onStartup.addListener(verifySettingsIntegrity);
chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.local.set({'updateAvailable' : false});
  chrome.storage.local.set({'ignoreUpdatePrompt' : false});
  verifySettingsIntegrity;
});
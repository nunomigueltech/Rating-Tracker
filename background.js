'use strict';

chrome.runtime.onConnect.addListener(port => {});

var storage = [];
var isRefreshing = true;

chrome.runtime.onMessage.addListener( 
  function(request, sender, sendResponse) {
    switch(request.status) {
      case "work-available":
        isRefreshing = false;

        let taskSound = new Audio('sounds/taskaccept1.mp3')
        taskSound.addEventListener("canplaythrough", event => {
          taskSound.play();
        });
        break;

      case "work-unavailable":
        isRefreshing = true;
        break;

      // Supply refresh setting data to refresh content script
      case "return-time-interval": 
        sendResponse({value: [storage['minTime'], storage['maxTime']]});
        break;

      case "return-refresh-status":
        sendResponse({value: isRefreshing});
        break;
    }
  }
);

chrome.storage.onChanged.addListener((changes, areaName) => {
  for (const [key, value] of Object.entries(changes)) {
    storage[key] = value.newValue;
  }
});

chrome.storage.sync.get(['minTime', 'maxTime'], (items) => {
  if (items == null) {
    console.log("Failed to load information from Google Chrome storage.");
  } else {
    storage = items;
  }
});
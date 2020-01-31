'use strict';

chrome.runtime.onConnect.addListener(port => {});

var storage = [];
var isRefreshing = true;

chrome.runtime.onMessage.addListener( 
  function(request, sender, sendResponse) {
    if (request.status == "work-available") {
      isRefreshing = false;
    }
    if (request.status == "work-unavailable") {
      isRefreshing = true;
    }
    if (request.status == "return-time-interval") {
      sendResponse({value: [storage['minTime'], storage['maxTime']]});
    }
    if (request.status == "return-refresh-status") {
      sendResponse({value: isRefreshing});
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
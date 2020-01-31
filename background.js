'use strict';

chrome.runtime.onConnect.addListener(port => {});

var readyToRefresh = true;
chrome.runtime.onMessage.addListener( 
  function(request, sender, sendResponse) {
    if (request.status == "work-available") {
      readyToRefresh = false;
      console.log("Work found!");
    }
  }
);
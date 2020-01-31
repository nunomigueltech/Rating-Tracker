'use strict';

var readyToRefresh = true;
chrome.webNavigation.onCompleted.addListener( function(n) {
  if (readyToRefresh) {
    console.log('Ready to act captain!');
  }
}, {url: [{hostContains : 'raterhub.com'}]});
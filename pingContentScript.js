/**
 * Saves a timestamp that marks when the page was initially loaded. Helps calculate ping to improve accuracy of
 * time keeping.
 */
function recordLoadTime() {
    let timestamp = new Date().getTime();
    chrome.storage.local.set({'loadTimestamp': timestamp});
}

recordLoadTime();
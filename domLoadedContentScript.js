function recordLoadTime() {
    let timestamp = new Date().getTime();
    chrome.storage.local.set({'loadFinishedTimestamp': timestamp});
}

recordLoadTime();
function checkTaskTime() {
    let element = document.querySelector('span.ewok-estimated-task-weight');

    let contentStrings = element.innerText.split(" ");
    return parseFloat(contentStrings[0]);
}

// pulls the task ID from the URL (assuming the ID begins after = )
function getTaskID() {
    let taskID = document.URL.split('=');
    return taskID[1];
}

let submitButton = document.querySelector('button#ewok-task-submit-button');
submitButton.onclick = (element) => {
    chrome.runtime.sendMessage({status : "submit-task"});
};

let stopButton = document.querySelector('button#ewok-task-submit-done-button');
stopButton.onclick = (element) => {
    chrome.runtime.sendMessage({status : "submit-task"});
};

let cancelButton = document.querySelector('button#ewok-task-cancel-button');
cancelButton.onclick = (element) => {
    chrome.runtime.sendMessage({status : "cancel-task"});
};

let releaseButton = document.querySelector('div .ewok-release-buttons').querySelector('button');
releaseButton.onclick = (element) => {
    let radioButton = document.getElementById('ewok-release-release');
    // if the user decides to release the task, cancel it
    if (radioButton.checked) {  
        chrome.runtime.sendMessage({status : "cancel-task"});
    }  
};

chrome.runtime.sendMessage({status : "new-task", time : checkTaskTime(), id : getTaskID()});
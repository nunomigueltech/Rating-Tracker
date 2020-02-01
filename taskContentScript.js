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

chrome.runtime.sendMessage({status : "new-task", time : checkTaskTime(), id : getTaskID()});
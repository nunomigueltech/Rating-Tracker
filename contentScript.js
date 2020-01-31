var taskList = document.querySelector('ul.ewok-rater-task-option');


if (taskList.innerText.includes("Acquire if available")) {
    chrome.runtime.sendMessage({status : "work-available"});
}
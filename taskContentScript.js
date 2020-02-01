function checkTaskTime() {
    let element = document.querySelector('span.ewok-estimated-task-weight');

    let contentStrings = element.innerText.split(" ");
    return parseInt(contentStrings[0]);
}

function handleTaskCompletion() {
    let soundID = Math.ceil(Math.random() * 4);
    let soundName = 'taskcomplete' + soundID + '.wav';

    let sound = new Audio();
    sound.src = chrome.extension.getURL('sounds/' + soundName);
    sound.addEventListener("canplaythrough", event => {
        sound.play();
    })
}

console.log("Waiting " + checkTaskTime() + " mins");
setTimeout(handleTaskCompletion, checkTaskTime() * 1000);
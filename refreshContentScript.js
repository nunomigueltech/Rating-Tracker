/*
 *Checks the web-page for work and sends message to the background script with its result.
*/
function checkWork() {
    let taskListText = document.querySelector('div.container').innerText;
    if (taskListText.includes('Acquire if available') || taskListText.includes('Incomplete Tasks')) {
        chrome.runtime.sendMessage({status : 'work-available'});
    } else {
        chrome.runtime.sendMessage({status : 'work-unavailable'});
    }
}

function handleRefresh() {
    window.location.reload();
    checkWork();
}

checkWork();
chrome.runtime.sendMessage({status : 'return-refresh-status'}, (response) => { 
    let refreshStatus = response.value;

    if (refreshStatus) {
        chrome.runtime.sendMessage({status : 'return-time-interval'}, (response) => {
            let refreshEnabled = response.value[0];

            if (refreshEnabled) {
                let minTime = parseInt(response.value[1]);
                let maxTime = parseInt(response.value[2]);
            
                let waitTime = Math.ceil( (Math.random() * (maxTime - minTime)) + minTime + 1);
                setTimeout(handleRefresh, waitTime * 1000);
                chrome.runtime.sendMessage({status : 'refresh-timer', time : waitTime});
            }
        });
    }
});
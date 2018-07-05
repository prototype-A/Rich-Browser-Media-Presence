const SERVER = 'localhost';
const PORT = 8080;
var xhr = new XMLHttpRequest();
var mediaInfo = { title: '', creator: '', position: 0, duration: 0, state: '' };
var count = 0;

function sendParams() {
	console.log(`${mediaInfo.playing} ${mediaInfo.title} by ${mediaInfo.creator}  [${mediaInfo.position}:${mediaInfo.duration}]`);
	xhr.open('POST', `http://${SERVER}:${PORT}/`);
	xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	xhr.send(`title=${mediaInfo.title}&creator=${mediaInfo.creator}&pos=${mediaInfo.position}&dur=${mediaInfo.duration}&state=${mediaInfo.state}`);
	mediaInfo.title = '';
	mediaInfo.creator = '';
	mediaInfo.position = 0;
	mediaInfo.duration = 0;
	mediaInfo.state = '';
}

function getParams(tab) {
	chrome.tabs.sendMessage(tab, 'state');
	chrome.tabs.sendMessage(tab, 'position');
	chrome.tabs.sendMessage(tab, 'duration');
	chrome.tabs.sendMessage(tab, 'creator');
}

// Listen for messages from content script injected into video tab
chrome.runtime.onMessage.addListener((req) => {
	console.log(`Request: ${req}`);
	param = req.substring(0, req.indexOf(':'));
	value = req.substring(req.indexOf(':') + 1, req.length + 1);
	mediaInfo[param] = value;
	// Make sure we have all info returned
	count++;
	if (count >= 4) {
		count = 0;
		sendParams();
	}
});

// Check for first-most YouTube tab whenever user navigates to a page
chrome.webNavigation.onCompleted.addListener((details) => {
	if (document.readyState == 'load') {
		console.log('Page loaded');
	}
	if (details.url.startsWith("https://www.youtube.com/watch?v=")) {
		chrome.tabs.get(details.tabId, (tab) => {
			//console.log("User is now listening to " + tab.title.replace(" - YouTube", ""));
			mediaInfo.title = tab.title.replace(" - YouTube", "");
			getParams(details.tabId);
		});
	}
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
	if (document.readyState == 'load') {
		console.log('Page loaded');
	}
	if (details.url.startsWith("https://www.youtube.com/watch?v=")) {
		//console.log('Video changed');
		chrome.tabs.get(details.tabId, (tab) => {
			//console.log("User is now listening to " + tab.title.replace(" - YouTube", ""));
			mediaInfo.title = tab.title.replace(" - YouTube", "");
			getParams(details.tabId);
		});
	}
});

// Check for first-most YouTube tab whenever user moves tabs in Chrome
chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
	chrome.windows.getLastFocused({populate: true}, (window) => {
		for (var i = 0; i <= moveInfo.toIndex; i++) {
			if (window.tabs[i].url.startsWith("https://www.youtube.com/watch?v=")) {
				//console.log("Now listening to " + window.tabs[i].title.replace(" - YouTube", ""));
				mediaInfo.title = window.tabs[i].title.replace(" - YouTube", "");
				getParams(window.tabs[i].id);
				break;
			}
		}
	});
});

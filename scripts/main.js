const SERVER = 'localhost';
const PORT = 8080;
var xhr = new XMLHttpRequest();


function sendParam(param, value) {
	xhr.open('POST', `http://${SERVER}:${PORT}/`);
	xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	xhr.send(`param=${param}&value=${value}`);
}

function getParams(tab) {
	sendParam('videoId', getVideoId(tab.url));
}

// Listen for messages from content script injected into video tab
chrome.runtime.onMessage.addListener((req) => {
	console.log(`Request: ${req}`);
	param = req.substring(0, req.indexOf('='));
	value = req.substring(req.indexOf('=') + 1, req.length + 1);
	sendParam(param, value);
});

// Check for first-most YouTube tab whenever user navigates to a page
chrome.webNavigation.onCompleted.addListener(() => {
	//findYoutubeTab();
});

// YouTube uses pushState-based navigation which doesn't trigger most
// web navigation events unless it's a page refresh
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
	if (details.url.startsWith("https://www.youtube.com/watch?v=")) {
		chrome.tabs.get(details.tabId, (tab) => {
			getParams(details);
		});
	}
});

// Check for first-most YouTube tab whenever user moves tabs in Chrome
chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
	chrome.windows.getLastFocused({populate: true}, (window) => {
		for (var i = 0; i <= moveInfo.toIndex; i++) {
			if (window.tabs[i].url.startsWith("https://www.youtube.com/watch?v=")) {
				getParams(window.tabs[i]);
				break;
			}
		}
	});
});

// Check for first-most YouTube tab when a tab is closed
chrome.tabs.onRemoved.addListener(() => {
	//findYoutubeTab();
});

function getVideoId(url) {
	var extra = url.indexOf('&');
	if (extra != -1) {
		return url.substring(url.indexOf('v=') + 2, extra + 1);
	} else {
		return url.substring(url.indexOf('v=') + 2, url.length + 1);
	}
}

function findYoutubeTab() {
	chrome.windows.getLastFocused({populate: true}, (window) => {
		var tabFound = false;
		for (var i = 0; i <= window.tabs.length; i++) {
			try {
				if (window.tabs[i].url.startsWith("https://www.youtube.com/watch?v=")) {
					tabFound = true;
					getParams(window.tabs[i]);
					break;
				}
			} catch (e) {}
		}
		if (!tabFound) {
			console.log('No YouTube tab found');
		}
	});
}

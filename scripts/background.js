const LISTENER_SERVER = 'localhost';
const LISTENER_PORT = 8080;
var xhr = new XMLHttpRequest();

const SUPPORTED_URLS = [ 'https://www.youtube.com/watch?v=' ];
const URL_PLATFORM = [ 'youtube' ];
const URL_EXTRA = [ ' - YouTube' ];
const CS_PORT_NAME = 'RichChromeYouTubePresence';
let csPort = null;
let richPresenceEnabled = false;
let enabledTabId = -1;
let currentlyPlaying = '';
let tabsInjected = [];

// Returns true/false whether rich presence is currently enabled for a tab
function isRichPresenceEnabled() {
	return richPresenceEnabled;
}

// Returns the title of the media that is currently playing
function getCurrenlyPlaying() {
	return currentlyPlaying;
}

// Formats media title for display
function formatMediaTitle(title, index) {
	let indexFound = false;
	if (index == undefined) {
		for (index = 0; index < SUPPORTED_URLS.length; index++) {
			if (title.endsWith(URL_EXTRA[index])) {
				indexFound = true;
				break;
			}
		}
	} else {
		indexFound = true;
	}
	
	if (indexFound) {
		return title.replace(new RegExp(URL_EXTRA[index] + '$'), '');
	}
}

// Enables rich presence for current tab
function enableRichPresence(callback) {
	// Check if url is supported
	chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
		let currentTab = tabs[0];
		let supported = false;
		for (let i = 0; i < SUPPORTED_URLS.length; i++) {
			if (currentTab.url.startsWith(SUPPORTED_URLS[i])) {
				supported = true;
				if (!tabsInjected.includes(currentTab.id)) {
					// Inject content script to tab and allow it to connect to extension
					chrome.tabs.executeScript({ file: './scripts/video_script.js' });
					chrome.runtime.onConnect.addListener(function(port) {
						console.assert(port.name == CS_PORT_NAME);
						csPort = port;
						// Listen for messages from content script
						csPort.onMessage.addListener(function(msg) {
							if (enabledTabId != -1 || msg == null) {
								// Update currently-playing media title in popup
								let newTitle = formatMediaTitle(msg.title);
								if (currentlyPlaying != newTitle) {
									currentlyPlaying = newTitle;
									chrome.runtime.sendMessage({ title: currentlyPlaying });
								}
								
								// Send media info to listener
								console.log(msg);
								sendMediaData(msg);
							}
						});
					});
					tabsInjected.push(currentTab.id);
				}
				chrome.tabs.sendMessage(currentTab.id, {
					portName: CS_PORT_NAME,
					supportedUrls: SUPPORTED_URLS
				});
				
				richPresenceEnabled = true;
				enabledTabId = currentTab.id;
				currentlyPlaying = formatMediaTitle(currentTab.title, i);
				
				callback(currentlyPlaying);
				return;
			}
		}
		if (!supported) {
			error('This URL is not supported.');
			callback(null);
			return;
		}
	});
}

// Disables rich presence
function disableRichPresence() {
	if (csPort != null) {
		csPort.disconnect();
	}
	
	richPresenceEnabled = false;
	enabledTabId = -1;
	currentlyPlaying = '';
}


// Sends media data from extension to listener
function sendMediaData(req) {
	xhr.open('POST', `http://${LISTENER_SERVER}:${LISTENER_PORT}/`);
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.onerror = function() {
		error('Failed to connect to listener.');
	}
	xhr.send(JSON.stringify(req));
}

// Display error
function error(msg) {
	alert(msg);
}
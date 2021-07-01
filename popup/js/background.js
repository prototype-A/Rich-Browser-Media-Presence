const LISTENER_SERVER = 'localhost';
const LISTENER_PORT = 8080;

const SUPPORTED_URLS = [ 'https://www.youtube.com/watch?v=', 'https://www.nicovideo.jp/watch/sm', 'https://live.nicovideo.jp/watch/lv', 'https://www.bilibili.com/video/', 'https://live.bilibili.com/' ];
const URL_EXTRA = [ ' - YouTube', ' - ニコニコ動画', ' - Niconico Video', ' - niconico動畫', ' - ニコニコ生放送', '_哔哩哔哩 (゜-゜)つロ 干杯~-bilibili', ' - 哔哩哔哩直播，二次元弹幕直播平台' ];
const URL_PLATFORM = [ 'YouTube', 'NicoNicoDouga', 'NicoNicoDouga', 'NicoNicoDouga', 'NicoNicoDouga Live', 'BiliBili', 'BiliBili Live' ];

const CS_PORT_NAME = 'RichBrowserMediaPresence';
var csPort = null;
var richPresenceEnabled = false;
var enabledTabId = -1;
var injectedTabs = [];
var currentMedia = null;

var xhr = new XMLHttpRequest();


// Injects the content script into the specified tab
function injectContentScript(tabId, callback) {
	chrome.tabs.executeScript(tabId, { file: '/scripts/video_script.js' }, () => {
		connectToContentScript(tabId, callback);
	});
}

// Establishes a connection to the content script injected into the specified tab
function connectToContentScript(tabId, callback) {
	let portName = CS_PORT_NAME + `Tab${tabId}`;
	
	// Connect to injected content script in tab
	csPort = chrome.tabs.connect(tabId, { name: portName });
	
	// Listen for messages from content script
	csPort.onMessage.addListener((message) => {
		sendMediaInfo(message);
		
		if (callback) {
			try {
				callback(getCurrentMedia());
			} catch (error) {}
			callback = null;
		}
	});
}

// Enables rich presence for the current tab
function enableRichPresence(callback) {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		// Check if url is supported
		let currentTab = tabs[0];
		let tabId = currentTab.id;
		
		for (let i = 0; i < SUPPORTED_URLS.length; i++) {
			if (currentTab.url.startsWith(SUPPORTED_URLS[i])) {
				// Inject content script into tab
				if (!injectedTabs.includes(tabId)) {
					injectedTabs.push(tabId);
					injectContentScript(tabId, callback);
					
					// Detect history state update for push-based navigation
					chrome.webNavigation.onHistoryStateUpdated.addListener((tab) => {
						//console.log('! ' + tab.url);
						
						// Refresh the enabled tab to obtain new thumbnail data
						if (tab.tabId === tabId) {
							chrome.tabs.reload(tabId);
						}
					});
					
					// Detect if user navigated to a new webpage with browser navigation
					chrome.webNavigation.onCompleted.addListener((tab) => {
						//console.log(tab.url);
						
						// Re-inject content script if it was the same tab as the current tab
						if (tab.tabId === tabId) {
							injectContentScript(tabId, callback);
						}
					});
					
					// Detect when a tab is closed
					chrome.tabs.onRemoved.addListener((closedTabId, removeInfo) => {
						// If the enabled tab is closed
						if (closedTabId === tabId) {
							// Disable rich presence
							disableRichPresence();
							
							// Remove the tab id from the list of injected tabs
							injectedTabs.splice(closedTabId, 1);
						}
					});
				} else {
					// Content script already/still injected
					connectToContentScript(tabId, callback);
				}
				
				richPresenceEnabled = true;
				enabledTabId = tabId;
				
				return;
			}
		}
		
		console.error('This URL is not supported.');
		callback(null);
		
		return;
	});
}

// Disables rich presence
function disableRichPresence() {
	if (csPort) {
		csPort.disconnect();
		csPort = null;
	}
	
	richPresenceEnabled = false;
	enabledTabId = -1;
	currentMedia = null;
}


// Returns true/false whether rich presence is currently enabled for a tab
function isRichPresenceEnabled() {
	return richPresenceEnabled;
}

// Returns the id of the tab that rich presence is currently enabled on
function getEnabledTabId() {
	return enabledTabId;
}

// Returns the content script port used to obtain updates for the playing media
function getContentScriptPort() {
	return csPort;
}

// Returns info of the media that is currently playing
function getCurrentMedia() {
	if (currentMedia) {
		return currentMedia;
	}
	
	return null;
}


// Play/pause the video
function togglePlayback(play) {
	if (isRichPresenceEnabled()) {
		csPort.postMessage({
			pause: !play
		});
	}
}

// Seek to specific playback position
function seekPosition(pos) {
	if (isRichPresenceEnabled()) {
		csPort.postMessage({
			seekPos: pos
		});
	}
}

// Seek forward/backward a set increment
function seekPlayback(seek) {
	if (isRichPresenceEnabled()) {
		csPort.postMessage({
			seek: seek
		});
	}
}

// Toggle video looping
function toggleLooping(loop) {
	if (isRichPresenceEnabled()) {
		csPort.postMessage({
			loop: loop
		});
	}
}


// Formats media title for display, removing unnecessary substrings from the title
function formatMediaTitle(title) {
	// Remove " - [Platform]" from the end
	for (let i = 0; i < URL_EXTRA.length; i++) {
		if (title.endsWith(URL_EXTRA[i])) {
			title = title.substring(0, title.indexOf(URL_EXTRA[i]));
			
			// Remove stream start date & time from NicoNico Live
			if (i === 4) {
				title = title.substring(0, title.lastIndexOf(' - '));
			}
		}
	}
	
	// Remove # of YouTube notifications at the beginning
	const notifMatches = title.match(/^(\(\d+\)\s)/);
	if (notifMatches) {
		title = title.replace(notifMatches[0], '');
	}
	
	return title;
}

// Returns the platform from the tab title
function getPlatform(title) {
	for (let i = 0; i < URL_EXTRA.length; i++) {
		if (title.endsWith(URL_EXTRA[i])) {
			return URL_PLATFORM[i];
		}
	}
	
	return null;
}

// Returns whether the url is supported or not
function isSupportedPlatform(url) {
	// Checks if the url of the tab is a supported site
	for (let i = 0; i < SUPPORTED_URLS.length; i++) {
		if (url.startsWith(SUPPORTED_URLS[i])) {
			return true;
		}
	}

	return false;
}


// Update media info to be displayed on popup
function updatePopupMediaInfo(info) {
	currentMedia = {
		title: formatMediaTitle(info.title),
		chapter: info.chapter,
		platform: getPlatform(info.title),
		thumbnail: info.thumbnail,
		position: info.position,
		duration: info.duration,
		paused: info.paused,
		isLooping: info.isLooping,
		isLive: info.isLive
	}
}

// Sends media data from browser extension to running listener script
function sendMediaInfo(info) {
	if (enabledTabId !== -1 && info) {
		// Update info to be displayed in popup
		updatePopupMediaInfo(info);
		
		//console.log(currentMedia);
		
		// Send media info to listener
		xhr.open('POST', `http://${LISTENER_SERVER}:${LISTENER_PORT}`);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.onerror = () => {
			console.error('Failed to connect to listener.');
		}
		xhr.send(JSON.stringify(currentMedia));
	}
}
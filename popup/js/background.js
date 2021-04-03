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
var currentMediaTitle = '';
var currentMediaChapter = '';

var xhr = new XMLHttpRequest();


// Injects the content script into the specified tab
function injectContentScript(tabId, callback) {
	chrome.tabs.executeScript(tabId, { file: '/scripts/video_script.js' }, () => {
		connectToContentScripts(tabId, callback);
	});
}

// Establishes a connection to the content script injected into the specified tab
function connectToContentScripts(tabId, callback) {
	let portName = CS_PORT_NAME + `Tab${tabId}`;
	
	// Connect to injected content script in tab
	csPort = chrome.tabs.connect(tabId, { name: portName });
	
	// Listen for messages from content script
	csPort.onMessage.addListener((message) => {
		if (message.playingState) {
			sendMediaInfo(message);
		} else {
			updatePopupMediaInfo(message);
			callback(getCurrentlyPlaying());
		}
	});
}

// Enables rich presence for current tab
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
					
					// Re-inject content script if user navigated to a new webpage
					// using traditional non push-based web browser navigation
					chrome.webNavigation.onCompleted.addListener((tab) => {
						//console.log(tab.url);
						
						// Only inject if same tab and not a YouTube link
						// New url will be 'about:blank' when playing the "up next" YouTube video
						if (tab.tabId === tabId && !(tab.url.startsWith(SUPPORTED_URLS[0]) || tab.url.startsWith('about:blank'))) {
							injectContentScript(tabId, callback);
						}
					});
				} else {
					// Content script already/still injected
					connectToContentScripts(tabId, callback);
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
	//injectedTabs.splice(enabledTabId, 1);
	enabledTabId = -1;
	currentMediaTitle = '';
	currentMediaChapter = '';
}

// Returns the content script port used to obtain updates for the playing media
function getContentScriptPort() {
	return csPort;
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
	currentMediaTitle = formatMediaTitle(info.title);
	currentMediaChapter = info.chapter;
}

// Sends media data from browser extension to running listener script
function sendMediaInfo(info) {
	if (enabledTabId !== -1 && info) {
		//console.log(info);
		
		// Set video platform
		info.platform = getPlatform(info.title);
		
		// Format title
		info.title = formatMediaTitle(info.title);
		
		// Update info to be displayed in popup
		updatePopupMediaInfo(info);
		
		// Send media info to listener
		xhr.open('POST', `http://${LISTENER_SERVER}:${LISTENER_PORT}`);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.onerror = () => {
			console.error('Failed to connect to listener.');
		}
		xhr.send(JSON.stringify(info));
	}
}

// Returns true/false whether rich presence is currently enabled for a tab
function isRichPresenceEnabled() {
	return richPresenceEnabled;
}

// Returns the title of the media that is currently playing
function getCurrentlyPlaying() {
	if (currentMediaChapter) {
		return `${currentMediaChapter} - ${currentMediaTitle}`;
	}
	
	return `${currentMediaTitle}`;
}
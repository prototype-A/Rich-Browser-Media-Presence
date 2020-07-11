const BTN_ENABLE_TEXT = 'Enable for Current Tab';
const BTN_DISABLE_TEXT = 'Disable';
const ENABLED_TEXT = 'Enabled';
const DISABLED_TEXT = 'Disabled';
const STATUS_GOOD_CLASS_NAME = 'status-good';
const STATUS_BAD_CLASS_NAME = 'status-bad';

window.onload = function() {
	let extensionStatus = document.getElementById('extensionStatus');
	let currentlyPlaying = document.getElementById('currentlyPlaying');
	let playingStatus = document.getElementById('playingStatus');
	let onOffBtn = document.getElementById('onOffBtn');
	onOffBtn.onclick = function() {
		if (!chrome.extension.getBackgroundPage().isRichPresenceEnabled()) {
			// Enable rich presence for current tab media
			chrome.extension.getBackgroundPage().enableRichPresence(function(mediaPlaying) {
				if (mediaPlaying != null && mediaPlaying != undefined) {
					togglePlayingMedia(true);
					enable();
				}
			});
		} else {
			disable();
		}
	}
	
	if (chrome.extension.getBackgroundPage().isRichPresenceEnabled()) {
		playingStatus.textContent = chrome.extension.getBackgroundPage().getCurrenlyPlaying();
		currentlyPlaying.hidden = false;
		enable();
	} else {
		// Initialize to disabled
		disable();
	}
}

// Update currently-playing media when video changes
chrome.runtime.onMessage.addListener(function(msg) {
	togglePlayingMedia(true, msg.title);
});

// Change status and button text to display as enabled
function enable() {
	// Currently enabled on a tab
	extensionStatus.textContent = ENABLED_TEXT;
	extensionStatus.classList.remove(STATUS_BAD_CLASS_NAME);
	extensionStatus.classList.add(STATUS_GOOD_CLASS_NAME);
	
	onOffBtn.textContent = BTN_DISABLE_TEXT;
}

// Disable rich presence
function disable() {
	chrome.extension.getBackgroundPage().disableRichPresence();
	
	extensionStatus.textContent = DISABLED_TEXT;
	extensionStatus.classList.remove(STATUS_GOOD_CLASS_NAME);
	extensionStatus.classList.add(STATUS_BAD_CLASS_NAME);
	
	togglePlayingMedia(false);
	
	onOffBtn.textContent = BTN_ENABLE_TEXT;
}

// Show/hide currently-playing media <div>
function togglePlayingMedia(show, title) {
	currentlyPlaying.hidden = !show;
	if (!currentlyPlaying.hidden) {
		if (title != undefined) {
			playingStatus.textContent = title;
		} else {
			playingStatus.textContent = chrome.extension.getBackgroundPage().getCurrenlyPlaying();
		}
	} else {
		playingStatus.textContent = '';
	}
}
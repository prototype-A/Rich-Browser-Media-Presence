const BTN_ENABLE_TEXT = 'Enable for Current Tab';
const BTN_DISABLE_TEXT = 'Disable';
const ENABLED_TEXT = 'Enabled';
const DISABLED_TEXT = 'Disabled';
const STATUS_GOOD_CLASS_NAME = 'status-good';
const STATUS_BAD_CLASS_NAME = 'status-bad';


// Called every time popup is opened
window.onload = () => {
	var extensionStatus = document.getElementById('extensionStatus');
	var currentlyPlaying = document.getElementById('currentlyPlaying');
	var playingStatus = document.getElementById('playingStatus');
	var toggleButton = document.getElementById('toggleBtn');
	
	// Update extension popup while it is open when the video/chapter changes
	var mediaUpdate = chrome.extension.getBackgroundPage().getContentScriptPort();
	if (mediaUpdate) {
		mediaUpdate.onMessage.addListener((message) => {
			togglePlayingMedia(true, chrome.extension.getBackgroundPage().getCurrentlyPlaying());
		});
	}
	
	toggleButton.onclick = () => {
		if (!chrome.extension.getBackgroundPage().isRichPresenceEnabled()) {
			// Enable rich presence for current tab's media
			chrome.extension.getBackgroundPage().enableRichPresence((playingMedia) => {
				if (playingMedia) {
					enable();
					togglePlayingMedia(true, playingMedia);
				}
			});
		} else {
			disable();
		}
	}
	
	if (chrome.extension.getBackgroundPage().isRichPresenceEnabled()) {
		togglePlayingMedia(true, chrome.extension.getBackgroundPage().getCurrentlyPlaying());
	} else {
		// Initialize to disabled
		disable();
	}
	
	// Change status and button text to display as enabled
	function enable() {
		extensionStatus.textContent = ENABLED_TEXT;
		extensionStatus.classList.remove(STATUS_BAD_CLASS_NAME);
		extensionStatus.classList.add(STATUS_GOOD_CLASS_NAME);
		
		toggleButton.textContent = BTN_DISABLE_TEXT;
	}
	
	// Disable rich presence
	function disable() {
		chrome.extension.getBackgroundPage().disableRichPresence();
		
		extensionStatus.textContent = DISABLED_TEXT;
		extensionStatus.classList.remove(STATUS_GOOD_CLASS_NAME);
		extensionStatus.classList.add(STATUS_BAD_CLASS_NAME);
		
		togglePlayingMedia(false);
		
		toggleButton.textContent = BTN_ENABLE_TEXT;
	}
	
	// Show/hide currently-playing media <div>
	function togglePlayingMedia(show, title) {
		currentlyPlaying.hidden = !show;
		
		if (!currentlyPlaying.hidden) {
			if (title) {
				playingStatus.textContent = title;
			} else {
				playingStatus.textContent = chrome.extension.getBackgroundPage().getCurrentlyPlaying();
			}
			enable();
		} else {
			playingStatus.textContent = '';
		}
	}
}
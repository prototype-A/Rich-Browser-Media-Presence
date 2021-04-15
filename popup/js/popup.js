const THUMBNAIL_FADE = 'linear-gradient(to right, white, transparent 20%), linear-gradient(to bottom, white, transparent 30%)';
const ENABLED_TEXT = 'Enabled';
const DISABLED_TEXT = 'Disabled';
const STATUS_ENABLED_CLASS_NAME = 'status-enabled';
const STATUS_DISABLED_CLASS_NAME = 'status-disabled';
const BUTTON_PRESSED_CLASS_NAME = 'button-on';
const BUTTON_PLAY_TEXT = '⏵︎';
const BUTTON_PAUSE_TEXT = '⏸';
const PLAYBACK_BAR = '━━━━━━━━━━━';
const POSITION_INDICATOR = '●';
const POSITION_START = -0.14;
const SEEK_AMOUNT = 10;


// Called every time popup is opened
window.onload = () => {
	var toggle = document.getElementById('enableToggle');
	var enabledStatus = document.getElementById('enabledStatus');
	var mediaPlatform = document.getElementById('mediaPlatform');
	var mediaTitle = document.getElementById('mediaTitle');
	var mediaThumbnail = document.getElementById('mediaThumbnail');
	
	var mediaUpdatePort = null;
	var portUpdater = null;
	var mediaPosition = document.getElementById('mediaPosition');
	var playbackPosition = document.getElementById('playbackPosition');
	var mediaDuration = document.getElementById('mediaDuration');
	var playbackBar = document.getElementById('playbackBar');
	
	var playBtn = document.getElementById('playButton');
	var rwBtn = document.getElementById('rewindButton');
	var ffBtn = document.getElementById('fastforwardButton');
	var loopBtn = document.getElementById('loopButton');
	
	
	// Switch toggled on/off
	toggle.onclick = () => {
		if (!chrome.extension.getBackgroundPage().isRichPresenceEnabled()) {
			// Enable rich presence for current tab's media
			chrome.extension.getBackgroundPage().enableRichPresence((mediaInfo) => {
				if (mediaInfo) {
					enable(mediaInfo);
					startUpdates();
				} else {
					disable();
				}
			});
		} else {
			disable();
		}
	}
	
	// Play button clicked
	playBtn.onclick = () => {
		let bg = chrome.extension.getBackgroundPage();
		if (bg.isRichPresenceEnabled()) {
			if (playBtn.textContent === BUTTON_PLAY_TEXT) {
				playBtn.textContent = BUTTON_PAUSE_TEXT;
				bg.togglePlayback(true);
			} else {
				playBtn.textContent = BUTTON_PLAY_TEXT;
				bg.togglePlayback(false);
			}
		}
	}
	
	// Rewind button clicked
	rwBtn.onclick = (event) => {
		let bg = chrome.extension.getBackgroundPage();
		if (bg.isRichPresenceEnabled()) {
			if (event.detail === 2) {
				bg.seekPlayback(-SEEK_AMOUNT * 3);
			} else if (event.detail == 1) {
				bg.seekPlayback(-SEEK_AMOUNT);
			}
		}
	};
	
	// Fast forward button clicked
	ffBtn.onclick = (event) => {
		let bg = chrome.extension.getBackgroundPage();
		if (bg.isRichPresenceEnabled()) {
			if (event.detail === 2) {
				bg.seekPlayback(SEEK_AMOUNT * 3);
			} else if (event.detail == 1) {
				bg.seekPlayback(SEEK_AMOUNT);
			}
		}
	};
	
	// Loop button clicked
	loopBtn.onclick = () => {
		let bg = chrome.extension.getBackgroundPage();
		if (bg.isRichPresenceEnabled()) {
			if (loopBtn.classList.contains(BUTTON_PRESSED_CLASS_NAME)) {
				loopBtn.classList.remove(BUTTON_PRESSED_CLASS_NAME);
				bg.toggleLooping(false);
			} else {
				loopBtn.classList.add(BUTTON_PRESSED_CLASS_NAME);
				bg.toggleLooping(true);
			}
		}
	}
	
	
	// If rich presence is enabled when popup is opened
	if (chrome.extension.getBackgroundPage().isRichPresenceEnabled()) {
		startUpdates();
	} else {
		// Rich presence disabled/initialize extension to disabled
		disable();
	}
	
	// Update the extension popup when the video/chapter changes while it is open
	function startUpdates() {
		// Get current media info for instant first update
		update();
		
		// Update the content script port every second for when the video changes
		portUpdater = setInterval(function updateMedia() {
			mediaUpdatePort = chrome.extension.getBackgroundPage().getContentScriptPort();
			if (mediaUpdatePort) {
				mediaUpdatePort.onMessage.addListener(update);
			}
			
			return updateMedia;
		}(), 1000);
	}
	
	// Update the extension popup
	function update() {
		enable(chrome.extension.getBackgroundPage().getCurrentMedia());
	}
	
	// Change status and button text to display as enabled
	function enable(mediaInfo) {
		toggle.checked = true;
		
		enabledStatus.textContent = ENABLED_TEXT;
		enabledStatus.classList.remove(STATUS_DISABLED_CLASS_NAME);
		enabledStatus.classList.add(STATUS_ENABLED_CLASS_NAME);
		
		updateMedia(mediaInfo);
	}
	
	// Disable rich presence
	function disable() {
		chrome.extension.getBackgroundPage().disableRichPresence();
		
		enabledStatus.textContent = DISABLED_TEXT;
		enabledStatus.classList.remove(STATUS_ENABLED_CLASS_NAME);
		enabledStatus.classList.add(STATUS_DISABLED_CLASS_NAME);
		
		updateMedia(null);
	}
	
	// Updates the playing media info in the popup
	function updateMedia(mediaInfo) {
		//console.log(mediaInfo);
		
		if (mediaInfo) {
			// Update video thumbnail
			mediaThumbnail.style.backgroundImage = THUMBNAIL_FADE + `, url("${mediaInfo.thumbnail}")`;
			
			// Update media platform
			mediaPlatform.textContent = mediaInfo.platform;
			
			// Update media title
			mediaTitle.textContent = (mediaInfo.chapter) ? `${mediaInfo.chapter} - ${mediaInfo.title}` : mediaInfo.title;
			
			// Update media position
			mediaPosition.textContent = getTimeAsString(mediaInfo.position);
			
			// Update media playback position bar
			let newPosition = POSITION_START + Math.round((0.0366 * playbackBar.offsetWidth * (mediaInfo.position / mediaInfo.duration)) * 100) / 100;
			playbackPosition.style.transform = `translateX(${newPosition}em)`;
			
			// Update media duration
			mediaDuration.textContent = getTimeAsString(mediaInfo.duration);
			
			// Update play button
			if (mediaInfo.paused) {
				playBtn.textContent = BUTTON_PLAY_TEXT;
			} else {
				playBtn.textContent = BUTTON_PAUSE_TEXT;
			}
			
			// Update loop button
			if (mediaInfo.isLooping) {
				loopBtn.classList.add(BUTTON_PRESSED_CLASS_NAME);
			} else {
				loopBtn.classList.remove(BUTTON_PRESSED_CLASS_NAME);
			}
		} else {
			toggle.checked = false;
			stopMediaUpdates();
			mediaPlatform.textContent = 'Platform';
			mediaThumbnail.style.backgroundImage = '';
			mediaTitle.textContent = 'Title';
			mediaPosition.textContent = '0:00';
			mediaDuration.textContent = '0:00';
			playbackPosition.style.transform = `translateX(${POSITION_START}em)`;
			playBtn.textContent = BUTTON_PLAY_TEXT;
			loopBtn.classList.remove(BUTTON_PRESSED_CLASS_NAME);
		}
	}
	
	
	// When popup closes
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState !== 'visible') {
			stopMediaUpdates();
		}
	});
	
	// Remove updater when popup closes to fix "Can't access dead object" errors
	function stopMediaUpdates() {
		if (mediaUpdatePort) {
			mediaUpdatePort.onMessage.removeListener(update);
		}
		
		if (portUpdater) {
			clearInterval(portUpdater);
			portUpdater = null;
		}
	}
}

// Returns the time as a string in the format hh:mm:ss from a number
function getTimeAsString(time) {
	if (isNaN(time)) {
		return '0:00';
	}
	
	let hh = Math.floor(time / 3600);
	let mm = Math.floor(time / 60);
	let ss = (time % 60).toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping:false });
	
	if (hh > 0) {
		mm = (Math.floor(time / 60) - hh * 60).toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping:false });
		
		return `${hh}:${mm}:${ss}`;
	}
	
	return `${mm}:${ss}`;
}
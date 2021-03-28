var connected = false;
var bgPort = null;
var mediaStatusFeed = null;


// Request port name to establish connection to extension with from this content script
chrome.runtime.onConnect.addListener((port) => {
	if (!connected) {
		bgPort = port;
		connected = true;
		console.log(`Connected to port "${bgPort.name}"`);
		
		// Update extension popup
		bgPort.postMessage({
			title: getVideoTitle(),
			chapter: getVideoChapter()
		});
		
		// Send media status to extension every second
		mediaStatusFeed = setInterval(() => {
			if (!connected) {
				clearInterval(mediaStatusFeed);
				mediaStatusFeed = null;
			} else {
				let player = getPlayer();

				if (player) {
					let position = Math.round(player.currentTime);
					let duration = Math.round(player.duration);
					let playingState = (player.paused) ? 'paused': 'playing';
					
					bgPort.postMessage({
						title: getVideoTitle(),
						chapter: getVideoChapter(),
						platform: getVideoTitle(),
						position: position,
						duration: duration,
						playingState: playingState,
						isLive: getVideoLiveStatus()
					});
				}
			}
		}, 1000);
		
		// Stop sending media status after disabling extension
		bgPort.onDisconnect.addListener(() => {
			bgPort = null;
			connected = false;
			console.log(`Disconnected from port "${portName}`);
		});
	}
});

// Returns the YT || NND video player element on the page
function getPlayer() {
	return document.getElementsByClassName('video-stream')[0] ||
		document.getElementsByClassName('MainVideoPlayer')[0].firstElementChild;
}

// Returns the title of the video
function getVideoTitle() {
	return document.title;
}

// Returns the current chapter of the video
function getVideoChapter() {
	// YouTube
	let chapter = document.querySelector('.ytp-chapter-title-content');
	let chapterIsVisible = (chapter) ? window.getComputedStyle(chapter.parentElement.parentElement).display !== 'none' : false;
	return (chapter && chapterIsVisible) ? chapter.textContent : null;
}

// Returns whether the video is currently live-streamed or not
function getVideoLiveStatus() {
	// YouTube
	let liveBadge = document.querySelector('.ytp-live-badge');
	return liveBadge && !liveBadge.getAttribute('disabled');
}
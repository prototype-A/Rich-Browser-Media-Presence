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
				
				if (player.video) {
					bgPort.postMessage({
						title: getVideoTitle(),
						chapter: getVideoChapter(),
						platform: getVideoTitle(),
						position: Math.round(player.video.currentTime),
						duration: Math.round(player.video.duration),
						playingState: (player.video.paused) ? 'paused': 'playing',
						isLive: player.isLive
					});
				}
			}
		}, 1000);
		
		// Stop sending media status after disabling extension
		bgPort.onDisconnect.addListener(() => {
			console.log(`Disconnected from port "${bgPort.name}`);
			connected = false;
			bgPort = null;
		});
	}
});

// Returns the video player element on the page and
// whether the video is currently live-streamed or not
function getPlayer() {
	// NicoNicoDouga
	try {
		return {
			video: document.getElementsByClassName('MainVideoPlayer')[0].firstElementChild,
			isLive: false
		}
	} catch (error) {}
	
	// NicoNicoDouga Live
	try {
		return {
			video: document.getElementsByClassName('___video-layer___1FNad ___ga-ns-video-layer___2iHmz ___video-layer___qLdFV')[0].firstElementChild.children[1],
			isLive: true
		}
	} catch (error) {}
	
	// BiliBili
	try {
		return {
			video: document.getElementsByClassName('bilibili-player-video')[0].firstElementChild,
			isLive: false
		}
	} catch (error) {}
	
	// BiliBili Live
	try {
		return {
			video: document.getElementsByClassName('bilibili-live-player-video')[0].firstElementChild,
			isLive: true
		}
	} catch (error) {}
	
	// YouTube
	let liveBadge = document.getElementsByClassName('ytp-live-badge')[0];
	return {
		video: document.getElementsByClassName('video-stream')[0],
		isLive: liveBadge && !liveBadge.getAttribute('disabled')
	};
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

	return (chapterIsVisible) ? chapter.textContent : null;
}
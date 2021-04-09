var connected = false;
var bgPort = null;
var mediaStatusFeed = null;


// Request port name to establish connection to extension with from this content script
chrome.runtime.onConnect.addListener((port) => {
	if (!connected) {
		bgPort = port;
		connected = true;
		console.log(`Connected to port "${bgPort.name}"`);
		
		// Send media status to extension every second
		mediaStatusFeed = setInterval(function sendMediaInfo() {
			if (!connected) {
				clearInterval(mediaStatusFeed);
				mediaStatusFeed = null;
			} else {
				let player = getPlayer();
				
				if (player.video) {
					bgPort.postMessage({
						title: getVideoTitle(),
						chapter: getVideoChapter(),
						thumbnail: getVideoThumbnail(),
						position: Math.floor(player.video.currentTime),
						duration: Math.floor(player.video.duration),
						paused: getVideoPaused(),
						isLooping: getVideoLooping(),
						isLive: player.isLive
					});
				}
			}
			
			return sendMediaInfo;
		}(), 1000);
		
		// Received input from extension popup
		bgPort.onMessage.addListener((command) => {
			//console.log(command);
			
			if (command.hasOwnProperty('pause')) {
				// Play/pause video
				toggleVideoPlayback(!command.pause);
			} else if (command.hasOwnProperty('loop')) {
				// Set looping
				toggleVideoLooping(command.loop);
			} else if (command.hasOwnProperty('seek')) {
				// Seek
				getPlayer().video.currentTime += command.seek;
			}
		});
		
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

// Returns the thumbnail of the video
function getVideoThumbnail() {
	// YouTube/BiliBili
	let thumbnail = document.querySelector('[itemprop=thumbnailUrl]');
	if (thumbnail) {
		return thumbnail.href || thumbnail.content;
	}
	
	// NicoNicoDouga
	let nndVideoData = document.getElementById('js-initial-watch-data');
	if (nndVideoData) {
		let dataJson = JSON.parse(nndVideoData.dataset['apiData'].replace('&quot;', '"').replace('\/', '/'));
		return dataJson.video.thumbnail.ogp;
	}
	
	// NicoNico Live
	let nndliveThumbnail = document.querySelector('[property=og:image]');
	if (nndliveThumbnail) {
		return nndliveThumbnail.content;
	}
	
	// BiliBili Live
	return '';
}

// Returns whether the video is playing or paused
function getVideoPaused() {
	// NicoNicoDouga
	let nndPlayBtn = getNNDPlayButton();
	if (nndPlayBtn) {
		return nndPlayBtn.classList.contains('PlayerPlayButton');
	}
	
	return getPlayer().video.paused;
}

// Returns whether the video is set to loop or not
function getVideoLooping() {
	// NicoNicoDouga
	let nndRepeatBtn = getNNDRepeatButton();
	if (nndRepeatBtn) {
		return nndRepeatBtn.classList.contains('PlayerRepeatOffButton');
	}
	
	return getPlayer().video.loop;
}

// Gets the play button element from the NicoNicoDouga page
function getNNDPlayButton() {
	return document.getElementsByClassName('ActionButton ControllerButton PlayerPauseButton')[0] ||
			document.getElementsByClassName('ActionButton ControllerButton PlayerPlayButton')[0];
}

// Gets the repeat button element from the NicoNicoDouga page
function getNNDRepeatButton() {
	return document.getElementsByClassName('ActionButton ControllerButton PlayerRepeatOnButton')[0] ||
			document.getElementsByClassName('ActionButton ControllerButton PlayerRepeatOffButton')[0];
}

// Plays/pauses the video
function toggleVideoPlayback(play) {
	// NicoNicoDouga
	let nndPlayBtn = getNNDPlayButton();
	if (nndPlayBtn &&
		(nndPlayBtn.classList.contains('PlayerPauseButton') && !play ||
		nndPlayBtn.classList.contains('PlayerPlayButton') && play)) {
		nndPlayBtn.click();
	} else {
		// Other
		let video = getPlayer().video;
		
		if (play) {
			video.play();
		} else {
			video.pause();
		}
	}
}

// Toggles whether the video should loop or not
function toggleVideoLooping(loop) {
	// NicoNicoDouga
	let nndRepeatBtn = getNNDRepeatButton();
	
	if (nndRepeatBtn &&
		(nndRepeatBtn.classList.contains('PlayerRepeatOnButton') && loop ||
		nndRepeatBtn.classList.contains('PlayerRepeatOffButton') && !loop)) {
		nndRepeatBtn.click();
	} else {
		getPlayer().video.loop = loop;
	}
}
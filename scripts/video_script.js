// Get YouTube video player
ytplayer = document.getElementsByClassName('video-stream')[0];
if (ytplayer in window) {
	console.log('YouTube video not found');
}

setInterval(() => {
	chrome.runtime.sendMessage(`position=${ytplayer.currentTime}`);
	if (ytplayer.paused) {
		chrome.runtime.sendMessage('state=paused');
	} else {
		chrome.runtime.sendMessage('state=playing');
	}
}, 1000);

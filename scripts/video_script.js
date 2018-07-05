// Get YouTube video player
ytplayer = document.getElementsByClassName('video-stream')[0];
if (ytplayer in window) {
	console.log('YouTube video not found');
}

// Received request from extension
chrome.runtime.onMessage.addListener((req) => {
	switch (req) {
		// Get video's channel name
		case 'creator':
			channel = document.getElementsByClassName('yt-simple-endpoint style-scope yt-formatted-string')[0].innerHTML;
			chrome.runtime.sendMessage(`creator:${channel}`);
			break;
		case 'position':
			chrome.runtime.sendMessage(`position:${Math.round(ytplayer.currentTime)}`);
			break;
		case 'duration':
			chrome.runtime.sendMessage(`duration:${Math.round(ytplayer.duration)}`);
			break;
		case 'state':
			var state = (ytplayer.paused ? 'state:Paused' : 'state:Playing');
			chrome.runtime.sendMessage(state);
			break;
		default:
			console.log(`Received invalid request: ${req}`);
	}
});
/*
// Send current video playback position every second
setInterval(() => {
	currTime = Math.round(ytplayer.currentTime);
	videoDuration = Math.round(ytplayer.duration);
	if (!(ytplayer.paused) || currTime < videoDuration) {
		//currPos = currTime / videoDuration;
		//console.log(currPos);
		//chrome.runtime.sendMessage(currPos);
	}
}, 1000);
*/

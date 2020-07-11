// Request port name to establish connection to extension with from this content script
let port = null;
let connected = false;
let supportedUrls = [];


chrome.runtime.onMessage.addListener(function(req, sender, res) {
	let portName = req.portName;
	supportedUrls = req.supportedUrls
	if (!connected) {
		port = chrome.runtime.connect({ name: portName });
		connected = true;
		console.log('Connected to port ' + portName);

		// Stop sending media status after disabling extension
		port.onDisconnect.addListener(function() {
			console.log('Disconnected from port ' + portName);
			connected = false;
		});
	}
});

// Send media status to extension every second
setInterval(() => {
	if (connected) {
		// Check if user has not navigated away from video in this tab
		if (isSupported(window.location.href)) {
			// Get YouTube video player
			ytplayer = document.getElementsByClassName('video-stream')[0];
			let liveBadge = document.querySelector('.ytp-live-badge');
			
			let title = document.title;
			let position = Math.round(ytplayer.currentTime);
			let duration = Math.round(ytplayer.duration);
			let playingState = (ytplayer.paused) ? 'paused': 'playing';
			let isLive = liveBadge && !liveBadge.getAttribute('disabled');

			port.postMessage({
				title: title,
				position: position,
				duration: duration,
				playingState: playingState,
				isLive: isLive
			});
		} else {
			port.postMessage(null);
		}
	}
}, 1000);

// Checks if url of tab is (still) a supported site
function isSupported(url) {
	for (let i = 0; i < supportedUrls.length; i++) {
		if (url.startsWith(supportedUrls[i])) {
			return true;
		}
	}

	return false;
}
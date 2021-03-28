const CLIENT_ID = '427263043941171211';
const CLIENT = require('discord-rich-presence')(CLIENT_ID);

var SERVER = 'localhost';
var PORT = 8080;
var express = require('express');
var cors = require('cors');
var app = express();


var currMediaInfo = {
	title: '',
	chapter: null,
	platform: '',
	position: 0,
	duration: 0,
	state: 'stopped',
	isLive: false
};
var playback;


console.log('\nLaunching listener');

// CORS to allow connection from "Origin: *"
app.use(cors());

// Enable CORS Pre-Flight request
app.options('/', cors());

// Handle incoming POST requests from extension
app.post('/', express.json({ type: '*/*' }), (req, res) => {
	//console.log(req.body);
	
	let newMediaInfo = {
		title: req.body.title,
		chapter: req.body.chapter,
		platform: req.body.platform,
		position: req.body.position,
		duration: req.body.duration,
		state: req.body.playingState,
		isLive: req.body.isLive
	};
	
	updateMediaStatus(newMediaInfo);
	
	
	res.end();
});

// Start listening
app.listen(PORT, SERVER, () => {
	console.log(`Listening at http://${SERVER}:${PORT}\n`);
});

// Handle updating status
function updateMediaStatus(newMediaInfo) {
	let now = getNow();
	let formattedTitle = formatPlayingTitle(newMediaInfo);
	
	if (newMediaInfo === null) {
		// Stopped
		updatePresence({
			details: currMediaInfo.title,
			smallImageKey: 'stopped',
			smallImageText: 'Stopped',
			instance: false,
		});
	} else if (currMediaInfo.state !== newMediaInfo.state && currMediaInfo.title === newMediaInfo.title) {
		// Ignore 'paused' state when queueing next song
		if (newMediaInfo.position !== newMediaInfo.duration && newMediaInfo.state === 'paused') {
			// Playback paused
			currMediaInfo = newMediaInfo;
			pausePlayback();
			console.log(`Paused:【${formatPlayingTitle(currMediaInfo)}】 on ${currMediaInfo.platform}`);
			
			updatePresence({
				details: formattedTitle,
				state: `on ${currMediaInfo.platform}`,
				smallImageKey: 'paused',
				smallImageText: 'Paused',
				instance: true,
			});
		} else if (newMediaInfo.state === 'playing') {
			// Playback resumed
			currMediaInfo = newMediaInfo;
			startPlayback();
			console.log(`Resumed:【${formatPlayingTitle(currMediaInfo)}】 on ${currMediaInfo.platform}`);
			
			if (currMediaInfo.isLive) {
				// Listening live
				updatePresence({
					details: currMediaInfo.title,
					state: `on ${currMediaInfo.platform}`,
					startTimestamp: now,
					endTimestamp: now + currMediaInfo.duration,
					smallImageKey: 'listeninglive',
					smallImageText: 'Listening Live',
					instance: true,
				});
			} else {
				// Regular video
				updatePresence({
					details: formattedTitle,
					state: `on ${currMediaInfo.platform}`,
					startTimestamp: now,
					endTimestamp: now + currMediaInfo.duration - currMediaInfo.position,
					smallImageKey: 'playing',
					smallImageText: 'Playing',
					instance: true,
				});
			}
		}
	} else if (currMediaInfo.title !== newMediaInfo.title ||
				currMediaInfo.chapter !== newMediaInfo.chapter || 
				currMediaInfo.platform !== newMediaInfo.platform ||
				(currMediaInfo.duration !== newMediaInfo.duration &&
				currMediaInfo.title !== newMediaInfo.title)) {
		// New video/chapter
		if (newMediaInfo.live) {
			// Listening live
			currMediaInfo = newMediaInfo;
			currMediaInfo.position = 0;
			currMediaInfo.duration = -1;
			console.log(`Now listening live to:【${currMediaInfo.title}】 on ${currMediaInfo.platform}`);
			
			updatePresence({
				details: currMediaInfo.title,
				state: `on ${currMediaInfo.platform}`,
				startTimestamp: now,
				smallImageKey: 'listeninglive',
				smallImageText: 'Listening Live',
				instance: true,
			});
		} else if (newMediaInfo.state === 'playing') {
			currMediaInfo = newMediaInfo;
			console.log(`Now listening to:【${formattedTitle}】 on ${currMediaInfo.platform}`);
			
			updatePresence({
				details: formattedTitle,
				state: `on ${currMediaInfo.platform}`,
				startTimestamp: now,
				endTimestamp: now + currMediaInfo.duration - currMediaInfo.position,
				smallImageKey: 'playing',
				smallImageText: 'Playing',
				instance: true,
			});
		}
		
		startPlayback();
	} else if (currMediaInfo.title === newMediaInfo.title &&
				Math.abs(currMediaInfo.position - newMediaInfo.position) >= 3) {
		// Update playback position after seeking
		currMediaInfo.position = newMediaInfo.position;
		let mm = Math.floor(newMediaInfo.position / 60);
		let ss = (newMediaInfo.position % 60).toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping:false });
		console.log(`Seek 【${currMediaInfo.title}】 on ${currMediaInfo.platform} to ${mm}:${ss}`);
		
		updatePresence({
			details: formattedTitle,
			state: `on ${currMediaInfo.platform}`,
			startTimestamp: now,
			endTimestamp: now + currMediaInfo.duration - newMediaInfo.position,
			smallImageKey: currMediaInfo.state,
			smallImageText: currMediaInfo.state,
			instance: true,
		});
	}
}

// Update rich presence on Discord client
function updatePresence(presence) {
	presence.largeImageText = currMediaInfo.platform;
	presence.largeImageKey = currMediaInfo.platform.toLowerCase();
	
	CLIENT.updatePresence(presence);
};

// Formats the title of the playing media to be displayed
function formatPlayingTitle(mediaInfo) {
	if (mediaInfo.chapter) {
		return `${mediaInfo.chapter} - ${mediaInfo.title}`;
	}
	
	return `${mediaInfo.title}`;
}

// Start updating playback position locally
function startPlayback() {
	if (!playback) {
		playback = setInterval(() => {
			if (currMediaInfo.position < currMediaInfo.duration) {
				currMediaInfo.position++;
			}
		}, 1000);
	}
}

// Stop updating playback position
function pausePlayback() {
	clearInterval(playback);
	playback = null;
}

// Get current epoch time
function getNow() {
	return Math.round(Date.now() / 1000);
}
const CLIENT_ID = '427263043941171211';
const CLIENT = require('discord-rich-presence')(CLIENT_ID);
const SERVER = 'localhost';
const PORT = 8080;

var express = require('express');
var cors = require('cors');
var app = express();

let currMediaInfo = { title: '', platform: '', position: 0, duration: 0, state: 'stopped', isLive: false };
var playback;


print('Launching listener');

// CORS to allow connection from "Origin: *"
app.use(cors());

// Enable CORS Pre-Flight request
app.options('/', cors());

// Handle incoming POST requests from extension
app.post('/', express.json({ type: '*/*' }), (req, res) => {
	
	//console.log(req.body);
	
	let newMediaInfo = {
		title: removePlatform(req.body.title),
		platform: getPlatform(req.body.title),
		position: req.body.position,
		duration: req.body.duration,
		state: req.body.playingState,
		isLive: req.body.isLive
	};
	
	updateMediaStatus(newMediaInfo);
	
	/*
	res.send({
		success: true
	});
	*/
	res.end();
});

// Start listening
app.listen(PORT, SERVER, () => {
	print(`Listening at http://${SERVER}:${PORT}`);
});

// Handle updating status
function updateMediaStatus(newMediaInfo) {

	let now = getNow();
	
	if (newMediaInfo == null) {
		// Stopped
		updatePresence({
			details: currMediaInfo.title,
			smallImageKey: 'stopped',
			smallImageText: 'Stopped',
			instance: false,
		});
	} else if (currMediaInfo.state != newMediaInfo.state &&
		currMediaInfo.title == newMediaInfo.title) {
		// Ignore 'paused' state when queueing next song
		if (newMediaInfo.position != newMediaInfo.duration &&
			newMediaInfo.state == 'paused') {
			// Playback paused
			currMediaInfo = newMediaInfo;
			pausePlayback();
			print(`Paused:【${currMediaInfo.title}】`);
			
			updatePresence({
				details: currMediaInfo.title,
				state: `on ${currMediaInfo.platform}`,
				largeImageKey: currMediaInfo.platform.toLowerCase(),
				largeImageText: currMediaInfo.platform,
				smallImageKey: 'paused',
				smallImageText: 'Paused',
				instance: true,
			});
		} else if (newMediaInfo.state == 'playing') {
			// Playback resumed
			currMediaInfo = newMediaInfo;
			startPlayback();
			print(`Resumed:【${currMediaInfo.title}】`);
			
			if (currMediaInfo.isLive) {
				// Listening live
				updatePresence({
					details: currMediaInfo.title,
					state: `on ${currMediaInfo.platform}`,
					startTimestamp: now,
					endTimestamp: now + currMediaInfo.duration,
					largeImageKey: currMediaInfo.platform.toLowerCase(),
					largeImageText: currMediaInfo.platform,
					smallImageKey: 'listeninglive',
					smallImageText: 'Listening Live',
					instance: true,
				});
			} else {
				// Regular video
				updatePresence({
					details: currMediaInfo.title,
					state: `on ${currMediaInfo.platform}`,
					startTimestamp: now,
					endTimestamp: now + currMediaInfo.duration - currMediaInfo.position,
					largeImageKey: currMediaInfo.platform.toLowerCase(),
					largeImageText: currMediaInfo.platform,
					smallImageKey: 'playing',
					smallImageText: 'Playing',
					instance: true,
				});
			}
		}
	} else if (currMediaInfo.title != newMediaInfo.title || 
				currMediaInfo.platform != newMediaInfo.platform ||
				(currMediaInfo.duration != newMediaInfo.duration &&
				currMediaInfo.title != newMediaInfo.title)) {
		// New video
		if (newMediaInfo.live) {
			// Listening live
			currMediaInfo = newMediaInfo;
			currMediaInfo.position = 0;
			currMediaInfo.duration = -1;
			print(`Now listening live to:【${currMediaInfo.title}】`);
			
			updatePresence({
				details: currMediaInfo.title,
				state: `on ${currMediaInfo.platform}`,
				startTimestamp: now,
				largeImageKey: currMediaInfo.platform.toLowerCase(),
				largeImageText: currMediaInfo.platform,
				smallImageKey: 'listeninglive',
				smallImageText: 'Listening Live',
				instance: true,
			});
		} else if (newMediaInfo.state == 'playing') {
			currMediaInfo = newMediaInfo;
			print(`Now listening to:【${currMediaInfo.title}】`);
			
			updatePresence({
				details: currMediaInfo.title,
				state: `on ${currMediaInfo.platform}`,
				startTimestamp: now,
				endTimestamp: now + currMediaInfo.duration - currMediaInfo.position,
				largeImageKey: currMediaInfo.platform.toLowerCase(),
				largeImageText: currMediaInfo.platform,
				smallImageKey: 'playing',
				smallImageText: 'Playing',
				instance: true,
			});
		}
		
		startPlayback();
	} else if (currMediaInfo.title == newMediaInfo.title &&
				Math.abs(currMediaInfo.position - newMediaInfo.position) >= 3) {
		// Update playback position after seeking
		currMediaInfo.position = newMediaInfo.position;
		let mm = Math.floor(newMediaInfo.position / 60);
		let ss = (newMediaInfo.position % 60).toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping:false });
		print(`Seek 【${currMediaInfo.title}】 to ${mm}:${ss}`);
		
		updatePresence({
			details: currMediaInfo.title,
			state: `on ${currMediaInfo.platform}`,
			startTimestamp: now,
			endTimestamp: now + currMediaInfo.duration - newMediaInfo.position,
			largeImageKey: currMediaInfo.platform.toLowerCase(),
			largeImageText: currMediaInfo.platform,
			smallImageKey: currMediaInfo.state,
			smallImageText: currMediaInfo.state,
			instance: true,
		});
	}
}

// Update rich presence on Discord client
function updatePresence(presence) {
	CLIENT.updatePresence(presence);
};

// Start updating playback position
function startPlayback() {
	if (playback == null || playback == undefined) {
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

const URL_PLATFORM = [ 'YouTube' ];
const URL_EXTRA = [ ' - YouTube' ];

// Returns the platform from the title
function getPlatform(title) {
	for (let i = 0; i < URL_EXTRA.length; i++) {
		if (title.endsWith(URL_EXTRA[i])) {
			return URL_PLATFORM[i];
		}
	}
	
	return null;
}

// Removes the platform from the title
function removePlatform(title) {
	for (let i = 0; i < URL_EXTRA.length; i++) {
		if (title.endsWith(URL_EXTRA[i])) {
			return title.substring(0, title.indexOf(URL_EXTRA[i]));
		}
	}
	
	return title;
}

// Print to command line
function print(message) {
	console.log(message + '\n');
}

// Get current epoch time
function getNow() {
	return Math.round(Date.now() / 1000);
}

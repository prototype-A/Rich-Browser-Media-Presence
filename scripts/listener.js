const readline = require('readline');

const CLIENT_ID = '427263043941171211';
const CLIENT = require('discord-rich-presence')(CLIENT_ID);

var SERVER = 'localhost';
var PORT = 8080;
var express = require('express');
var cors = require('cors');
var app = express();


var currMediaInfo = {
	title: 'Title',
	chapter: null,
	platform: 'Platform',
	position: 0,
	duration: 0,
	state: 'stopped',
	isLive: false
};
var positionUpdater;


console.log('\nLaunching listener...');

// CORS to allow connection from "Origin: *"
app.use(cors());

// Enable CORS Pre-Flight request
app.options('/', cors());

// Handle incoming POST requests from browser extension
app.post('/', express.json({ type: '*/*' }), (req, res) => {
	//console.log(req.body);
	
	let newMediaInfo = {
		title: req.body.title,
		chapter: req.body.chapter,
		platform: req.body.platform,
		position: req.body.position,
		duration: req.body.duration,
		state: (req.body.paused) ? 'paused' : 'playing',
		isLive: req.body.isLive
	};
	
	updateMediaStatus(newMediaInfo);
	
	res.end();
});

// Start listening
app.listen(PORT, SERVER, () => {
	//console.log(`Listening at http://${SERVER}:${PORT}\n`);
	console.log('Ready\n');
	displayPlayback();
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
	} else if (newMediaInfo.state === 'playing' &&
				(currMediaInfo.title !== newMediaInfo.title ||
				currMediaInfo.chapter !== newMediaInfo.chapter || 
				currMediaInfo.platform !== newMediaInfo.platform ||
				(currMediaInfo.duration !== newMediaInfo.duration &&
				currMediaInfo.title !== newMediaInfo.title))) {
		currMediaInfo = newMediaInfo;
		
		// New video/chapter
		if (newMediaInfo.isLive) {
			// Listening live
			currMediaInfo.position = 0;
			currMediaInfo.duration = 0;
			console.log(`Now listening live to:【${currMediaInfo.title}】 on ${currMediaInfo.platform}`);
			
			updatePresence({
				details: currMediaInfo.title,
				state: `on ${currMediaInfo.platform}`,
				startTimestamp: now,
				smallImageKey: 'listeninglive',
				smallImageText: 'Listening Live',
				instance: true,
			});
		} else {
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
		
		startPositionUpdate();
	} else if (newMediaInfo.state === 'paused' &&
				currMediaInfo.state !== newMediaInfo.state) {
		// Playback paused
		currMediaInfo = newMediaInfo;
		
		// Ignore 'paused' state when queueing next song
		if (newMediaInfo.position !== newMediaInfo.duration && newMediaInfo.state === 'paused') {
			console.log(`Paused:【${formatPlayingTitle(currMediaInfo)}】 on ${currMediaInfo.platform}`);
			stopPositionUpdate();
			
			updatePresence({
				details: formattedTitle,
				state: `on ${currMediaInfo.platform}`,
				smallImageKey: 'paused',
				smallImageText: 'Paused',
				instance: true,
			});
		}
	} else if (newMediaInfo.state === 'playing' &&
				currMediaInfo.state !== newMediaInfo.state) {
		currMediaInfo = newMediaInfo;
		
		// Playback resumed
		console.log(`Resumed:【${formatPlayingTitle(currMediaInfo)}】 on ${currMediaInfo.platform}`);
		startPositionUpdate();
			
		if (currMediaInfo.isLive) {
			// Listening live
			updatePresence({
				details: currMediaInfo.title,
				state: `on ${currMediaInfo.platform}`,
				startTimestamp: now,
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
	} else if (currMediaInfo.title === newMediaInfo.title &&
				Math.abs(currMediaInfo.position - newMediaInfo.position) >= 3 &&
				!currMediaInfo.isLive &&
				currMediaInfo.state !== 'paused') {
		// Update playback position after seeking
		currMediaInfo.position = newMediaInfo.position;
		
		let newTime = getTimeAsString(currMediaInfo.position);
		console.log(`Seek 【${currMediaInfo.title}】 on ${currMediaInfo.platform} to ${newTime}`);
		
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
	// Remove " Live" if present to get correct large image key
	let liveStringIndex = currMediaInfo.platform.indexOf(' Live')
	let platformIconKey = (liveStringIndex !== -1) ?
							currMediaInfo.platform.substr(0, liveStringIndex) :
							currMediaInfo.platform;
	presence.largeImageText = platformIconKey;
	presence.largeImageKey = platformIconKey.toLowerCase();
	
	CLIENT.updatePresence(presence);
};


// Formats the title of the playing media to be displayed
function formatPlayingTitle(mediaInfo) {
	if (mediaInfo.chapter) {
		return `${mediaInfo.chapter} - ${mediaInfo.title}`;
	}
	
	return `${mediaInfo.title}`;
}

// Displays the playing media information in the console window
function displayPlayback() {
	let bar = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
	let barIndex = Math.floor(currMediaInfo.position / (currMediaInfo.duration + 0.01) * bar.length);
	bar = bar.substr(0, barIndex) + '●' + bar.substr(barIndex + 1, bar.length);
	let position = ' ' + getTimeAsString(currMediaInfo.position);
	let duration = ' ' + getTimeAsString(currMediaInfo.duration);
	
	let title = `【 ${formatPlayingTitle(currMediaInfo)} 】`;
	let titleIndent = position.length + 1 + bar.length / 2 - title.length / 2;
	titleIndent = (titleIndent < 0) ? '' : ' '.repeat(titleIndent);
	
	let platform = currMediaInfo.platform;
	let platformIndent = position.length + 2 + bar.length / 2 - platform.length / 2;
	platformIndent = (platformIndent <= 0) ? '' : ' '.repeat(platformIndent);
	
	let buttons = ['⏪', (currMediaInfo.state === 'paused') ? '⏵' : '⏸', ' ⏩'];
	let buttonSpacing = bar.length / buttons.length;
	let buttonText = ' '.repeat(buttonSpacing / buttons.length) + buttons[0];
	buttonSpacing = (buttonSpacing <= 0) ? '' : ' '.repeat(buttonSpacing);
	for (let i = 1; i < buttons.length; i++) {
		buttonText += buttonSpacing + buttons[i];
	}
	buttonText = ' '.repeat(position.length + 1) + buttonText;
	
	console.clear();
	console.log(`\n${titleIndent}${title}\n`);
	console.log(`${platformIndent}${platform}\n`);
	console.log(`${position} ${bar} ${duration}\n`);
	console.log(`${buttonText}\n\n`);
}

// Start updating playback position locally
function startPositionUpdate() {
	if (!positionUpdater) {
		positionUpdater = setInterval(function updateBar() {
			if (currMediaInfo.position < currMediaInfo.duration) {
				// Update terminal
				displayPlayback();
				currMediaInfo.position++;
			}
			
			return updateBar;
		}(), 1000);
	}
}

// Stop updating playback position
function stopPositionUpdate() {
	clearInterval(positionUpdater);
	positionUpdater = null;
	
	// Update terminal
	displayPlayback();
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

// Get current epoch time
function getNow() {
	return Math.round(Date.now() / 1000);
}
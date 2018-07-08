const CLIENT_ID = '427263043941171211';
const SERVER = 'localhost';
const PORT = 8080;
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var https = require('https');
const YT_API_KEY = process.env.YOUTUBE_API_KEY;
const CLIENT = require('discord-rich-presence')(CLIENT_ID);
var oldMediaInfo = { title: '', creator: '', position: 0, duration: 0, state: 'playing' };
var mediaInfo = { title: '', creator: '', position: 0, duration: 0, state: 'playing', starttime: 0, endtime: 0, bar: '' };
var timer = 0;
var updated = false;


console.log('Launching listener');
// Handle incoming POST requests
app.post('/', bodyParser.urlencoded({ extended: true }), (req, res) => {
	//console.log(`[POST]: ${req.body.param}=${req.body.value}`);
	switch (req.body.param) {
		case 'videoId':
			updateVideoInfo(req.body.value);
			break;
		case 'position':
		case 'state':
			updateMediaStatus({ [req.body.param]: req.body.value });
			break;
		default:
			console.log(`Invalid parameter: ${req.body.param}=${req.body.value}`);
	}
	res.end();
});

// CORS to allow connection from `Origin: chrome-extension://...`
app.use((req, res) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
	// Only allow the extension to POST info
	res.header('Access-Control-Allow-Methods', 'POST');
});

app.listen(PORT, SERVER, () => {
	console.log(`Listening at http://${SERVER}:${PORT}`);
});

function updateVideoInfo(videoId) {
	https.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails&id=${videoId}&key=${YT_API_KEY}`, (res) => {
		let data = '';
		res.on('data', (chunk) => {
			data += chunk;
		});
		res.on('end', () => {
			data = JSON.parse(data);
			updateMediaInfo({ title: data.items[0].snippet.title, creator: data.items[0].snippet.channelTitle, duration: toSeconds(data.items[0].contentDetails.duration) });
		});
	}).on('error', (err) => {
		console.log(`[Error]: ${err.message}`);
	});
}

function updateInfo(args = { title, creator, position, duration, state, starttime, endtime }) {
	for (var param in args) {
		if (args[param]) {
			oldMediaInfo[param] = mediaInfo[param];
			mediaInfo[param] = args[param];
		}
	}
}

function updateMediaStatus(args = { position, state }) {
	if (args.state == 'paused' && mediaInfo.state != args.state) {
		pause();
	} else if (args.state == 'playing' && mediaInfo.state != args.state) {
		resume();
	}
	updateInfo({ position: args.position, state: args.state });
}

function updateMediaInfo(args = { title, creator, duration }) {
	updateInfo({ title: args.title, creator: args.creator, duration: args.duration });
	//console.log(`${mediaInfo.state} ${mediaInfo.title} by ${mediaInfo.creator}[${mediaInfo.position}:${mediaInfo.duration}]`);
	updatePresence();
}

function updatePresence() {
	if (!updated) {
		console.log('Updating presence');
		let now = getNow()
		mediaInfo.starttime = now;
		mediaInfo.endtime = now + mediaInfo.duration;
		CLIENT.updatePresence({
			details: mediaInfo.title,
			state: mediaInfo.creator,
			startTimestamp: mediaInfo.starttime,
			endTimestamp: mediaInfo.endtime,
			largeImageKey: 'youtube',
			smallImageKey: mediaInfo.state,
			instance: false,
		});
		//updated = true;
	}
};

function pause() {
	console.log('Updating presence');
	let now = getNow();
	CLIENT.updatePresence({
		details: mediaInfo.title,
		state: mediaInfo.creator,
		largeImageKey: 'youtube',
		smallImageKey: 'paused',
		instance: false,
	});
}

function resume() {
	console.log('Updating presence');
	let now = getNow();
	CLIENT.updatePresence({
		details: mediaInfo.title,
		state: mediaInfo.creator,
		startTimestamp: now,
		endTimestamp: now + mediaInfo.duration - Math.round(mediaInfo.position),
		largeImageKey: 'youtube',
		smallImageKey: 'playing',
		instance: false,
	});
}

function updateBar() {
	if (mediaInfo.duration != 0) {
		pos = Math.round(mediaInfo.position / mediaInfo.duration);
		//console.log("Current position: " + pos);
		var timeline = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';
		mediaInfo.bar = timeline.substring(0, pos) + '🔘' + timeline.substring(pos, timeline.length + 1);
	}
}

function getNow() {
	return Date.now() / 1000;
}

// Convert ISO 8601 duration to seconds
function toSeconds(dur) {
	var mul = { H: 3600, M: 60, S: 1 };
	var duration = 0;
	if (dur.charAt(0) == 'P' || dur.charAt(0) == 'T') {
		return duration += toSeconds(dur.substring(1));
	} else if (dur.length >= 2) {
		var i = 1;
		while (!isNaN(Number(dur.substring(0, i + 1)))) {
			i++;
		}
		duration += Number(dur.substring(0, i)) * mul[dur.charAt(i)];
		return duration += toSeconds(dur.substring(i + 1));
	} else {
		return 0;
	}
}

setInterval(() => {
	/*
	// Discord RPC rate limit only allows for 4 updates/min => 1 update/15s
	if (updated) {
		timer = (timer + 1) % 16;
		if (timer == 0) {
			updated = false;
		}
	}
	*/
	if (mediaInfo.duration != 0 && mediaInfo.position < mediaInfo.duration) {
		updateBar();
	}
}, 1000);

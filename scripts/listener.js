const CLIENT_ID = '427263043941171211';
const SERVER = 'localhost';
const PORT = 8080;
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
const CLIENT = require('discord-rich-presence')(CLIENT_ID);
var oldMediaInfo = { title: '', creator: '', position: 0, duration: 0, state: '' };
var mediaInfo = { title: '', creator: '', position: 0, duration: 0, state: '', bar: '' };
var timer = 0;
var updated = false;


console.log('Launching listener');
// Handle all POST requests
app.post('/', bodyParser.urlencoded({ extended: true }), (req, res) => {
	console.log(`Received POST request`);
	updateMediaInfo({ title: req.body.title, creator: req.body.creator, position: req.body.pos, duration: req.body.dur, state: req.body.state });
	res.end();
});

// CORS to allow connection from `Origin: chrome-extension://...`
app.use((req, res) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
	res.header('Access-Control-Allow-Methods', 'POST');
});

app.listen(PORT, SERVER, () => {
	console.log(`Listening at http://${SERVER}:${PORT}`);
});

setInterval(() => {
	// Discord RPC rate limit only allows for 4 updates/min = 1 update/15s
	if (updated) {
		timer = (timer + 1) % 16;
		if (timer == 0) {
			updated = false;
		}
	}
	if (mediaInfo.duration != 0 && mediaInfo.position < mediaInfo.duration) {
		mediaInfo.position++;
	}
}, 1000);

async function updateBar() {
	if (mediaInfo.duration != 0) {
		pos = Math.round(mediaInfo.position / mediaInfo.duration);
		//console.log("Current position: " + pos);
		var timeline = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';
		mediaInfo.bar = timeline.substring(0, pos) + '🔘' + timeline.substring(pos, timeline.length + 1);
	}
}

function updateMediaInfo(args = { title, creator, position, duration, state }) {
	Object.entries(args).forEach(([key, value]) => {
		console.log(key, value);
		oldMediaInfo[key] = mediaInfo[key];
		mediaInfo[key] = args[key];
	});
	/*
	for (var param : args) {
		console.log(`Param: ${param}`);
		oldMediaInfo.param = mediaInfo.param;
		mediaInfo.param = args.param;
	}
	*/
	/*
	if (args.title) {
		oldMediaInfo.title = mediaInfo.title;
		mediaInfo.title = args.title;
	}
	if (args.creator) {
		oldMediaInfo.creator = mediaInfo.creator;
		mediaInfo.creator = args.creator;
	}
	if (args.position) {
		oldMediaInfo.position = mediaInfo.position;
		mediaInfo.position = args.position;
	}
	if (args.duration) {
		oldMediaInfo.duration = mediaInfo.duration;
		mediaInfo.duration = args.duration;
	}
	if (args.state) {
		oldMediaInfo.state = mediaInfo.state;
		mediaInfo.state = args.state;
	}
	*/
	console.log(`${mediaInfo.state} ${mediaInfo.title} by ${mediaInfo.creator}[${mediaInfo.position}:${mediaInfo.duration}]`);
	updatePresence();
}

function updatePresence() {
	if (!updated) {
		console.log('Updating presence');
		var date = Math.round(Date.now() / 1000);
		CLIENT.updatePresence({
			details: mediaInfo.title,
			state: mediaInfo.creator,
			startTimestamp: date,
			endTimestamp: date + parseInt(mediaInfo.duration, 10),
			largeImageKey: 'youtube'
		});
		updated = true;
	}
};

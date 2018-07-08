# Rich Chrome YouTube Presence
Displays the YouTube video being played in your first-most Chrome tab with Rich Presence as your "Playing" status on your desktop Discord client  
  

## Requisites
Nodejs  
Node modules:
* express
* body-parser
* discord-rich-presence
A YouTube Data v3 API key  
  

## How to use
Download/clone this repo
Go to chrome://extensions > Enable Developer mode > Load Unpacked > Navigate to repo directory > Open  
Create a YouTube API key in your Google Developers console if you don't have one  
  
Linux:  
Replace **YOUR_YOUTUBE_API_KEY_HERE** in *launch_listener.sh* with your YouTube API key  
Run  
`./launch_listener.sh`  
in a terminal window in the repo directory  
  
Windows:  
Replace **process.env.YOUTUBE_API_KEY** in *scripts/listener.js* with your YouTube API key  
Run  
`node .\scripts\listener.js`  
in a command prompt or powershell window in the repo directory  
  

## Exiting
CTRL+C the listener running in terminal/command prompt/powershell  

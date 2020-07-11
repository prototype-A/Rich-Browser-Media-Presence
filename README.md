# Rich Chrome YouTube Presence
Displays a YouTube tab in Rich Presence as your "Playing" status on your desktop Discord client  
  
  
## List of Supported Sites
* YouTube  
  
  
## Setup
* Download and install Node.js  
* Download/clone this repo  
* In Google Chrome, navigate to *chrome://extensions* and enable **Developer mode** at the top right
* Click *Load Unpacked* at the top left > Navigate into the extracted/cloned repo directory > Open  
* Open a terminal/command prompt/powershell window > Navigate to the extracted/cloned repo directory > Execute `npm install`
  
  
## Running
**Linux**:  
In a terminal window inside the repo directory, execute  
`node ./scripts/listener.js`  
  
**Windows**:  
In a command prompt/powershell window inside the repo directory, execute  
`node .\scripts\listener.js`  
  
  
Navigate to a video on a supported site > Click the extension icon > Click **Enable for Current Tab**  
  
  
## Exiting
**CTRL+C** the listener running in the terminal/command prompt/powershell  

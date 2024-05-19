# README

speechreader use the SpeechSynthesisUtterance interface of the Web Speech API 
and provider a ready to use wrapper class to start adding TTS functionality to your project.

## Installation

With [npm](https://npmjs.com/) installed, run  :

```
$ npm install speechreader
```

## Usage

Import the synthesizer class 

```js
import { Synthesizer } from 'speechreader'
```

Use the Synthesizer to read text 
```js
 const synthesizer = new Synthesizer('I am a little tea pot')
 synthesizer.play()
```

Use the Synthesizer to read HTML text
```js
 const synthesizer = new Synthesizer('<html><h1>I am a little tea pot</h1></html>')
 synthesizer.play()
```

Set speech synthesizer local
```js
 const synthesizer = new Synthesizer('I am a little tea pot','en-US')
 synthesizer.play()
```

Pause text reading
```js
 synthesizer.pause()
```

resume text reading
```js
 synthesizer.resume()
```

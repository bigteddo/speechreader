# README

speechreader use the SpeechSynthesisUtterance interface of the Web Speech API 
and provider a ready to use wrapper class to start adding TTS functionality to your project.
This library is meant to be added on  PROJECT RUNNING ON A WEB BROWSER.

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

Set speech synthesizer locale
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

stop text reading
```js
 synthesizer.stop()
```

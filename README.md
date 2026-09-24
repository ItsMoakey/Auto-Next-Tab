# Auto Next Tab

A lightweight Manifest V3 browser extension that automatically closes a tab when its video finishes playing, jumps to the next tab, and starts that video playing - so you can queue up a bunch of video tabs and let them play through hands-free.

## Features

- **Auto-advance on video end** - detects when a `<video>` element finishes, closes the current tab, and switches to the next tab in the window.
- **Auto-play next video** - starts playback in the tab it switches to.
- **Toggle on/off** - click the extension's toolbar icon to enable or disable the behavior at any time.
- **Works everywhere** - the content script runs on all URLs and in all frames, so it works on most sites that embed video.

## Installation

Since this extension isn't published to the Chrome Web Store, install it as an unpacked extension:

1. Download or clone this repository.
   ```bash
   git clone https://github.com/ItsMoakey/Auto-Next-Tab.git
   ```
2. Open `chrome://extensions` in Chrome (or the equivalent page in a Chromium-based browser, e.g. `edge://extensions`).
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the folder containing this repository's files.
5. The **Auto Next Tab** icon should now appear in your toolbar.

## Usage

1. Open several tabs with videos you want to watch in sequence.
2. Click the **Auto Next Tab** toolbar icon to turn it on (click again to turn it off).
3. Let a video play to the end — its tab will close automatically, and the browser will jump to the next tab and start that video.

## How it works

- `manifest.json` - Manifest V3 configuration. Declares the `tabs` and `storage` permissions, registers `background.js` as the service worker, and injects `content.js` into every page at `document_start`.
- `content.js` - Runs inside each page, watches for the video ending, and messages the background script.
- `background.js` - Listens for messages from the content script and handles closing the current tab and switching to the next one.

## Permissions

| Permission | Why it's needed |
|---|---|
| `tabs` | To close the finished video's tab and switch to the next tab. |
| `storage` | To remember whether the extension is toggled on or off. |

## Compatibility

Built for Manifest V3, so it works in Chrome, Edge, and other Chromium-based browsers that support MV3 extensions.

## Contributing

Issues and pull requests are welcome. If you run into a site where auto-advance doesn't trigger correctly, please open an issue with the site and a description of the video player used.

## License

MIT

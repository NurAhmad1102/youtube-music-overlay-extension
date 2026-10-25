# YT Music Gaming Overlay & Mini Player (Always-on-Top)

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Chrome 116+](https://img.shields.io/badge/Chrome_Required-v116%2B_(Document_PiP)-34A853?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/web-platform/document-picture-in-picture/)
[![Platform](https://img.shields.io/badge/Platform-Windows_%7C_macOS_%7C_Linux-blue)](#-how-to-use-while-gaming)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A Google Chrome Extension (Manifest V3) that provides an **Always-on-Top Floating Mini Player** tailored specifically for **YouTube Music**. Designed for gamers to effortlessly control music and **instantly search and play new tracks while playing games in Windows** without ever needing to Alt+Tab.

---

> [!WARNING]
> ### IMPORTANT / AD-BLOCKER WARNING
> **"Some adblock extensions will make this extension not work"**
> 
> Certain ad-blocking extensions (such as **uBlock Origin, AdGuard, Brave Shields, or aggressive third-party YouTube adblockers**) may cause this extension to malfunction or prevent the overlay launcher button from appearing.
> 
> **Why this happens:**
> - *Cosmetic Filtering* or *Element Hiding* rules in adblockers may inadvertently hide the injected floating `[Game Overlay]` button on YouTube Music.
> - Strict background request blocking can intercept internal YouTube Music API queries (`/youtubei/v1/search`), breaking in-overlay track search.
> - Certain custom adblock scripts may interfere with YouTube Music's player lifecycle hooks.
> 
> **How to resolve:**
> 1. Open [music.youtube.com](https://music.youtube.com/).
> 2. Click your adblocker's icon in the browser toolbar.
> 3. **Disable / Whitelist** adblocking specifically for `music.youtube.com`.
> 4. Refresh the page (<kbd>F5</kbd>).

---

## Key Features

1. **Always-on-Top Floating Mini Player (Document Picture-in-Picture)**
   - Stays on top of all applications & games (as long as games run in *Borderless Windowed* or *Windowed* mode).
   - Dynamic album artwork with ambient glow effects, song title, artist info, and playback progress bar.
   - Seamless two-way real-time synchronization with the background YouTube Music tab.

2. **In-Overlay Instant Search & Playback**
   - Built-in search bar directly inside the floating mini player window.
   - Real-time search results with thumbnails, song titles, artists, and track durations.
   - **Click any result $\rightarrow$ song plays immediately** with zero page reload (*zero page reload*).

3. **Ultra-Compact Gaming Mode**
   - Click the minimize dot on the overlay header to collapse the window into a sleek mini bar.
   - Drastically saves screen real estate to prevent distractions during intense gaming sessions.

4. **Global Keyboard Shortcuts (Works Outside Browser)**
   - Operates globally even when Google Chrome is minimized or when you are focused inside a game.

| Default Shortcut | Action |
| :--- | :--- |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> | Play / Pause Music |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>→</kbd> | Next Track |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>←</kbd> | Previous Track |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>O</kbd> | Focus / Highlight Overlay Launcher |

> [!TIP]
> You can customize these shortcuts anytime by visiting `chrome://extensions/shortcuts` in Google Chrome.

5. **Robust & Secure Architecture (Trusted Types Safe)**
   - **MAIN World Scripting**: Eliminates *Extension Context Invalidation* issues when the extension is updated or reloaded in the background.
   - **Zero `innerHTML` Sinks**: The Document PiP UI is constructed entirely using pure DOM APIs (`createElement`, `textContent`, `setAttribute`), making it completely compliant with YouTube Music's strict TrustedHTML security policies.

---

## Installation Guide

1. **Clone or Download This Repository**:
   ```bash
   git clone https://github.com/USERNAME/youtube-music-overlay-extension.git
   ```
   *(Or download the ZIP file from GitHub and extract it to a folder on your computer)*.

2. **Open Chrome Extensions Page**:
   - Type `chrome://extensions/` into Chrome's address bar and press <kbd>Enter</kbd>.

3. **Enable Developer Mode**:
   - Toggle the **"Developer mode"** switch in the top-right corner.

4. **Load the Extension**:
   - Click **"Load unpacked"** in the top-left corner.
   - Select the folder containing this extension's files (`manifest.json`).

5. **YT Music Gaming Overlay & Mini Player** is now installed and ready to use!

---

## How to Use While Gaming

1. **Open YouTube Music**:
   - Navigate to [music.youtube.com](https://music.youtube.com/) in Chrome and start playing any music.
2. **Launch the Overlay**:
   - Click the floating red button at the bottom-right corner of YouTube Music: **[ Game Overlay (PiP) ]**.
   - *(Or click the extension icon in Chrome's toolbar $\rightarrow$ click **"Launch Game Overlay"**)*.
3. **Position the Window**:
   - Drag the Always-on-Top mini window to your desired corner (e.g., top-right of your primary screen or onto a secondary monitor).
4. **Start Your Game**:
   - Launch your game.
   - **Crucial Requirement:** Ensure your game's display settings are set to **Borderless Windowed** or **Windowed Fullscreen** so that the Always-on-Top overlay remains visible on top of your game.
5. **Search & Change Songs Anytime**:
   - Type any song title or artist in the overlay search bar and click to play instantly without leaving your game!

---

## Project Structure

```text
overlay_YtMusic_extension/
├── .gitignore               # Git ignore configuration
├── LICENSE                  # MIT License
├── README.md                # Project documentation & adblock warning
├── manifest.json            # Manifest V3 configuration (tabs, scripting)
├── background.js            # Service worker & global keyboard shortcuts handler
├── content/
│   ├── ytm_bridge.js        # MAIN world bridge script & Document PiP builder
│   └── ytm_inject.css       # Floating launcher pill styling for YouTube Music
├── icons/
│   ├── icon16.png           # 16x16 toolbar icon
│   ├── icon48.png           # 48x48 extensions manager icon
│   └── icon128.png          # 128x128 store & installation icon
└── popup/
    ├── popup.html           # Extension popup controller markup
    ├── popup.css            # Dark zinc theme styling
    └── popup.js             # Interactive popup logic & tab controller
```

---

## Troubleshooting

| Issue | Likely Cause | Solution |
| :--- | :--- | :--- |
| **Launcher button does not appear on YouTube Music** | Adblock extension is hiding the button via cosmetic filter. | Whitelist `music.youtube.com` in your adblocker or disable it temporarily, then refresh the page. |
| **Track search returns no results** | Internal API calls to YouTube Music are blocked by an adblocker or network drop. | Ensure `music.youtube.com` is whitelisted in your adblocker and that you have an active YouTube Music tab open. |
| **Overlay disappears behind the game** | The game is running in *Exclusive Fullscreen* mode. | Change your game display settings from *Exclusive Fullscreen* to **Borderless Windowed** or **Windowed**. |
| **Document PiP fails to open** | Browser version does not support Document Picture-in-Picture. | Update Google Chrome to the latest version (requires Chrome 116+). |
| **Global shortcuts do not respond in game** | Shortcut scope is restricted or game runs with elevated administrator rights. | Visit `chrome://extensions/shortcuts` and ensure the shortcuts are set to **Global** (not *In Chrome*). If the game runs as Administrator, run Chrome as Administrator as well. |

---

## License

This project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute it.

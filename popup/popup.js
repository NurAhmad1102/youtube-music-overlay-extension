// Popup Controller for YT Music Gaming Overlay
// Interacts directly with the page MAIN world via chrome.scripting (Zero isolated content script dependency)

document.addEventListener('DOMContentLoaded', async () => {
  const viewNoYTM = document.getElementById('view-no-ytm');
  const viewYTMActive = document.getElementById('view-ytm-active');
  const btnOpenYTM = document.getElementById('btn-open-ytm');
  const btnFocusYTM = document.getElementById('btn-focus-ytm');
  const pipStatusBadge = document.getElementById('pip-status-badge');
  const pipStatusText = document.getElementById('pip-status-text');

  const popupCover = document.getElementById('popup-cover');
  const popupTitle = document.getElementById('popup-title');
  const popupArtist = document.getElementById('popup-artist');

  const btnQuickPlay = document.getElementById('btn-quick-play');
  const btnQuickPrev = document.getElementById('btn-quick-prev');
  const btnQuickNext = document.getElementById('btn-quick-next');

  let activeTabId = null;

  // Execute a command directly in the YouTube Music page context (MAIN world)
  function sendCommand(cmd) {
    if (!activeTabId) return;
    try {
      chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        world: "MAIN",
        func: (command) => {
          window.postMessage({
            source: "YTM_OVERLAY_EXT",
            type: "COMMAND",
            command: command
          }, "*");
        },
        args: [cmd]
      }, () => {
        if (chrome.runtime.lastError) {
          console.warn("[Popup] Could not execute command:", chrome.runtime.lastError.message);
        }
        setTimeout(refreshStatus, 300);
      });
    } catch (e) {
      console.warn("Could not execute command:", e);
    }
  }

  // Check tab status directly with Chrome tabs API
  async function refreshStatus() {
    try {
      const tabs = await chrome.tabs.query({ url: "*://music.youtube.com/*" });
      if (!tabs || tabs.length === 0) {
        viewNoYTM.style.display = 'flex';
        viewYTMActive.style.display = 'none';
        pipStatusBadge.className = 'badge-status idle';
        pipStatusText.textContent = 'Offline';
        activeTabId = null;
        return;
      }

      const targetTab = tabs.find(t => t.active) || tabs[0];
      activeTabId = targetTab.id;
      viewNoYTM.style.display = 'none';
      viewYTMActive.style.display = 'flex';

      // Query player status directly via chrome.scripting in MAIN world
      chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        world: "MAIN",
        func: () => {
          const playerBar = document.querySelector('ytmusic-player-bar');
          const video = document.querySelector('video');
          const titleEl = playerBar?.querySelector('.title.ytmusic-player-bar');
          const title = titleEl?.textContent?.trim() || "YouTube Music";
          const bylineEl = playerBar?.querySelector('.byline.ytmusic-player-bar');
          const artist = bylineEl?.textContent?.trim() || "";
          const thumbImg = playerBar?.querySelector('.thumbnail img') || playerBar?.querySelector('img#img');
          const thumbnail = thumbImg?.src || "";
          const player = document.querySelector('#movie_player');
          let isPlaying = false;
          if (player && typeof player.getPlayerState === 'function') {
            isPlaying = (player.getPlayerState() === 1);
          } else if (video) {
            isPlaying = !video.paused;
          }
          if (!isPlaying && navigator.mediaSession?.playbackState === 'playing') {
            isPlaying = true;
          }
          const pipActive = Boolean(window.documentPictureInPicture && window.documentPictureInPicture.window && !window.documentPictureInPicture.window.closed);

          return {
            title,
            artist,
            thumbnail,
            isPlaying,
            pipActive
          };
        }
      }, (results) => {
        if (chrome.runtime.lastError || !results || !results[0] || !results[0].result) {
          popupTitle.textContent = "YouTube Music Siap";
          popupArtist.textContent = "Buka overlay untuk memutar";
          return;
        }

        const status = results[0].result;
        popupTitle.textContent = status.title || "Tidak Ada Musik";
        popupArtist.textContent = status.artist || "YouTube Music";
        if (status.thumbnail && !status.thumbnail.startsWith('data:')) {
          popupCover.src = status.thumbnail;
        }

        // Play/Pause button icons
        const iconPlay = btnQuickPlay.querySelector('.icon-play');
        const iconPause = btnQuickPlay.querySelector('.icon-pause');
        if (status.isPlaying) {
          iconPlay.style.display = 'none';
          iconPause.style.display = 'block';
        } else {
          iconPlay.style.display = 'block';
          iconPause.style.display = 'none';
        }

        // Badge
        if (status.pipActive) {
          pipStatusBadge.className = 'badge-status active';
          pipStatusText.textContent = 'PiP Aktif';
        } else {
          pipStatusBadge.className = 'badge-status idle';
          pipStatusText.textContent = 'Standby';
        }
      });
    } catch (err) {
      console.warn("Error refreshing status:", err);
    }
  }

  // Action: Open YouTube Music
  btnOpenYTM?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: "OPEN_YTM_TAB" }, () => {
      setTimeout(refreshStatus, 1500);
    });
  });

  // Action: Focus YouTube Music and launch/highlight overlay
  btnFocusYTM?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: "FOCUS_YTM_TAB" }, () => {
      window.close(); // Close popup so user is focused on YTM
    });
  });

  // Quick Controls
  btnQuickPlay?.addEventListener('click', () => {
    sendCommand("play-pause");
  });

  btnQuickPrev?.addEventListener('click', () => {
    sendCommand("prev-track");
  });

  btnQuickNext?.addEventListener('click', () => {
    sendCommand("next-track");
  });

  // Initial refresh
  refreshStatus();
});

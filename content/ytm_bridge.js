// Main World Bridge Script for YouTube Music Gaming Overlay
// Runs directly in the context of music.youtube.com
// 100% Pure DOM Construction — Zero innerHTML Sinks (Completely immune to TrustedHTML restrictions)

(() => {
  // Guard against multiple executions / duplicate event listeners
  if (window.__ytmOverlayBridgeLoaded) {
    console.log("[YT Music Overlay] Main World Bridge already active.");
    return;
  }
  window.__ytmOverlayBridgeLoaded = true;

  console.log("[YT Music Overlay] Main World Bridge initialized (Pure DOM Engine).");

  let pipWindow = null;
  let syncInterval = null;
  let isSeeking = false;

  // Helper: Format seconds to M:SS or H:MM:SS
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // Robust helper to find YouTube Music like button (prevents accidentally selecting Dislike)
  function getLikeButton() {
    const playerBar = document.querySelector('ytmusic-player-bar');
    return playerBar?.querySelector('#like-button-renderer yt-button-shape button') ||
           playerBar?.querySelector('ytmusic-like-button-renderer #button-shape-like button') ||
           playerBar?.querySelector('ytmusic-like-button-renderer button[aria-label*="Like" i]') ||
           playerBar?.querySelector('ytmusic-like-button-renderer button[aria-label*="Suka" i]') ||
           playerBar?.querySelector('.like');
  }

  // Get current track metadata from YouTube Music DOM / MediaSession
  function getCurrentTrackInfo() {
    const video = document.querySelector('video');
    const playerBar = document.querySelector('ytmusic-player-bar');

    // Title
    let title = "Tidak Ada Musik";
    const titleEl = playerBar?.querySelector('.title.ytmusic-player-bar');
    if (titleEl && titleEl.textContent.trim()) {
      title = titleEl.textContent.trim();
    } else if (navigator.mediaSession?.metadata?.title) {
      title = navigator.mediaSession.metadata.title;
    }

    // Artist & Album
    let artist = "YouTube Music";
    const bylineEl = playerBar?.querySelector('.byline.ytmusic-player-bar');
    if (bylineEl && bylineEl.textContent.trim()) {
      artist = bylineEl.textContent.trim();
    } else if (navigator.mediaSession?.metadata?.artist) {
      artist = navigator.mediaSession.metadata.artist;
    }

    // Artwork Thumbnail
    let thumbnail = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=600&auto=format&fit=crop";
    const thumbImg = playerBar?.querySelector('.thumbnail img') || playerBar?.querySelector('img#img');
    if (thumbImg && thumbImg.src && !thumbImg.src.startsWith('data:')) {
      thumbnail = thumbImg.src;
    } else if (navigator.mediaSession?.metadata?.artwork?.length) {
      const art = navigator.mediaSession.metadata.artwork;
      thumbnail = art[art.length - 1].src;
    }

    // Status
    const currentTime = video ? video.currentTime : 0;
    const duration = video && !isNaN(video.duration) ? video.duration : 0;
    
    // Determine isPlaying robustly across YouTube player, HTML5 video, and MediaSession
    const player = document.querySelector('#movie_player');
    let isPlaying = false;
    if (player && typeof player.getPlayerState === 'function') {
      isPlaying = (player.getPlayerState() === 1); // 1 = Playing
    } else if (video) {
      isPlaying = !video.paused;
    }
    if (!isPlaying && navigator.mediaSession?.playbackState === 'playing') {
      isPlaying = true;
    }

    // Like status
    const likeBtn = getLikeButton();
    const liked = likeBtn ? likeBtn.getAttribute('aria-pressed') === 'true' : false;

    // Shuffle & Repeat status with strict parsing (prevents false-positive blinking)
    const shuffleEl = playerBar?.querySelector('.shuffle') || playerBar?.querySelector('tp-yt-paper-icon-button.shuffle');
    const repeatEl = playerBar?.querySelector('.repeat') || playerBar?.querySelector('tp-yt-paper-icon-button.repeat');
    const shuffled = isShuffleActive(shuffleEl);
    const repeated = isRepeatActive(repeatEl);

    return {
      title,
      artist,
      thumbnail,
      currentTime,
      duration,
      isPlaying,
      liked,
      shuffled,
      repeated
    };
  }

  // Active status helpers for Repeat & Shuffle
  function isRepeatActive(el) {
    if (!el) return false;
    const pressed = el.getAttribute('aria-pressed');
    if (pressed === 'true') return true;
    if (pressed === 'false') return false;

    const checked = el.getAttribute('aria-checked');
    if (checked === 'true') return true;
    if (checked === 'false') return false;

    if (el.classList.contains('active') || el.classList.contains('selected')) {
      return true;
    }

    const label = (el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase();
    if (!label) return false;

    // "Turn off" action prompt means repeat is currently ACTIVE
    if (label.includes('turn off') || label.includes('nonaktifkan')) {
      return true;
    }

    // Explicit off states or "Turn on" prompt means it is INACTIVE
    if (label.includes('repeat off') || label.includes('off') || label.includes('mati') || label.includes('turn on') || label.includes('aktifkan') || label.includes('tidak aktif')) {
      return false;
    }

    // Only active if repeat all or repeat one mode is indicated
    return label.includes('all') || label.includes('one') || label.includes('semua') || label.includes('satu');
  }

  function isShuffleActive(el) {
    if (!el) return false;
    const pressed = el.getAttribute('aria-pressed');
    if (pressed === 'true') return true;
    if (pressed === 'false') return false;

    const checked = el.getAttribute('aria-checked');
    if (checked === 'true') return true;
    if (checked === 'false') return false;

    if (el.classList.contains('active') || el.classList.contains('selected')) {
      return true;
    }

    const label = (el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase();
    if (!label) return false;

    // "Turn off" action prompt means shuffle is currently ACTIVE
    if (label.includes('turn off') || label.includes('nonaktifkan')) {
      return true;
    }

    // "Turn on" prompt or explicit off means it is INACTIVE
    if (label.includes('shuffle off') || label.includes('off') || label.includes('mati') || label.includes('turn on') || label.includes('aktifkan') || label.includes('tidak aktif')) {
      return false;
    }

    return label.includes('on') || label.includes('aktif');
  }

  // Playback Action Helpers
  function togglePlayPause() {
    const player = document.querySelector('#movie_player');
    if (player && typeof player.getPlayerState === 'function') {
      const state = player.getPlayerState();
      if (state === 1) { // Currently Playing -> Pause
        if (typeof player.pauseVideo === 'function') {
          player.pauseVideo();
          return;
        }
      } else { // Currently Paused -> Play
        if (typeof player.playVideo === 'function') {
          player.playVideo();
          return;
        }
      }
    }

    const playPauseBtn = document.querySelector('ytmusic-player-bar #play-pause-button');
    if (playPauseBtn) {
      playPauseBtn.click();
      return;
    }

    const video = document.querySelector('video');
    if (video) {
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  }

  function playNext() {
    const player = document.querySelector('#movie_player');
    if (player && typeof player.nextVideo === 'function') {
      player.nextVideo();
    } else {
      document.querySelector('ytmusic-player-bar .next-button')?.click();
    }
  }

  function playPrevious() {
    const player = document.querySelector('#movie_player');
    if (player && typeof player.previousVideo === 'function') {
      player.previousVideo();
    } else {
      document.querySelector('ytmusic-player-bar .previous-button')?.click();
    }
  }

  function seekTrack(percent) {
    const video = document.querySelector('video');
    const player = document.querySelector('#movie_player');
    if (video && video.duration) {
      const targetTime = (percent / 100) * video.duration;
      if (player && typeof player.seekTo === 'function') {
        player.seekTo(targetTime, true);
      } else {
        video.currentTime = targetTime;
      }
    }
  }

  function seekRelative(seconds) {
    const video = document.querySelector('video');
    const player = document.querySelector('#movie_player');
    if (video && video.duration) {
      const targetTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
      if (player && typeof player.seekTo === 'function') {
        player.seekTo(targetTime, true);
      } else {
        video.currentTime = targetTime;
      }
    }
  }

  function toggleLike() {
    const likeBtn = getLikeButton();
    likeBtn?.click();
  }

  function toggleShuffle() {
    const playerBar = document.querySelector('ytmusic-player-bar');
    const shuffleBtn = playerBar?.querySelector('.shuffle') ||
                       playerBar?.querySelector('tp-yt-paper-icon-button.shuffle');
    shuffleBtn?.click();
  }

  function toggleRepeat() {
    const playerBar = document.querySelector('ytmusic-player-bar');
    const repeatBtn = playerBar?.querySelector('.repeat') ||
                      playerBar?.querySelector('tp-yt-paper-icon-button.repeat');
    repeatBtn?.click();
  }

  // Play song directly by videoId without page reload
  function playSongById(videoId) {
    if (!videoId) return;
    const player = document.querySelector('#movie_player');
    if (player && typeof player.loadVideoById === 'function') {
      try {
        player.loadVideoById(videoId, 0);
        player.playVideo();
        return;
      } catch (err) {
        console.warn("[YT Music Overlay] player.loadVideoById failed, fallback to anchor:", err);
      }
    }

    // SPA Navigation Fallback
    const a = document.createElement('a');
    a.href = `/watch?v=${videoId}`;
    a.className = 'yt-simple-endpoint';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 100);
  }

  // YouTube Music Internal Search
  async function searchMusic(query) {
    if (!query || query.trim() === '') return [];

    try {
      const apiKey = window.ytcfg?.get('INNERTUBE_API_KEY');
      const context = window.ytcfg?.get('INNERTUBE_CONTEXT');

      if (apiKey && context) {
        const response = await fetch(`https://music.youtube.com/youtubei/v1/search?key=${apiKey}&prettyPrint=false`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            context: context,
            query: query
          })
        });

        const data = await response.json();
        const results = parseSearchResults(data);
        if (results.length > 0) return results;
      }
    } catch (err) {
      console.warn("[YT Music Overlay] Search API error:", err);
    }
    return [];
  }

  // Parse Innertube search JSON response
  function parseSearchResults(data) {
    const items = [];

    function traverse(obj) {
      if (!obj || typeof obj !== 'object') return;

      if (obj.musicResponsiveListItemRenderer) {
        const r = obj.musicResponsiveListItemRenderer;

        let videoId = r.playNavigationEndpoint?.watchEndpoint?.videoId ||
                      r.navigationEndpoint?.watchEndpoint?.videoId ||
                      r.doubleTapEndpoint?.watchEndpoint?.videoId ||
                      r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ||
                      r.playlistItemData?.videoId;

        if (!videoId && r.flexColumns) {
          for (const col of r.flexColumns) {
            const runs = col.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
            for (const run of runs) {
              if (run.navigationEndpoint?.watchEndpoint?.videoId) {
                videoId = run.navigationEndpoint.watchEndpoint.videoId;
                break;
              }
            }
            if (videoId) break;
          }
        }

        if (videoId) {
          const titleRuns = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
          const title = titleRuns.map(x => x.text).join('') || 'Unknown Song';

          const subRuns = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
          const artist = subRuns.map(x => x.text).join('') || 'YouTube Music';

          const durRuns = r.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs || [];
          const duration = durRuns.map(x => x.text).join('') || '';

          const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
          const thumbnail = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : '';

          items.push({
            videoId,
            title,
            artist,
            duration,
            thumbnail
          });
        }
        return;
      }

      if (Array.isArray(obj)) {
        for (const item of obj) traverse(item);
      } else {
        for (const key of Object.keys(obj)) {
          traverse(obj[key]);
        }
      }
    }

    traverse(data);

    const seen = new Set();
    const unique = [];
    for (const item of items) {
      if (!seen.has(item.videoId)) {
        seen.add(item.videoId);
        unique.push(item);
      }
    }

    return unique.slice(0, 15);
  }

  // Helper to safely create an SVG element without innerHTML
  function createSvg(viewBox, className, pathD, width = 18, height = 18) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('class', className);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('fill', 'currentColor');
    svg.style.width = width + 'px';
    svg.style.height = height + 'px';
    svg.style.display = 'block';
    svg.style.flexShrink = '0';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('fill', 'currentColor');
    svg.appendChild(path);
    return svg;
  }

  // Pure DOM Builder for Document PiP UI (Zero innerHTML, 100% Trusted Types safe)
  function buildPipUI(doc) {
    // 1. Background Vignette
    const bg = doc.createElement('div');
    bg.className = 'fixed inset-0 bg-radial-vignette opacity-80 -z-10 pointer-events-none';
    doc.body.appendChild(bg);

    // 2. Widget Wrapper
    const wrapper = doc.createElement('div');
    wrapper.id = 'widget-wrapper';
    wrapper.className = 'w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden transition-all duration-300';

    // Ambient Glow FX
    const glow = doc.createElement('div');
    glow.id = 'ambient-glow';
    glow.className = 'ambient-glow-fx pointer-events-none';
    wrapper.appendChild(glow);

    // Header
    const header = doc.createElement('div');
    header.className = 'flex items-center justify-between mb-4 header-bar';

    const brand = doc.createElement('div');
    brand.className = 'flex items-center gap-2';
    const ytSvg = createSvg('0 0 576 512', 'text-red-600', 'M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.837V174.08l142.48 81.92-142.48 81.92z', 18, 18);
    const brandTitle = doc.createElement('span');
    brandTitle.className = 'text-xs font-semibold tracking-wider text-zinc-400 uppercase';
    brandTitle.textContent = 'YT Music Extension';
    brand.appendChild(ytSvg);
    brand.appendChild(brandTitle);

    const dots = doc.createElement('div');
    dots.className = 'flex items-center gap-1.5';
    const btnMin = doc.createElement('button');
    btnMin.id = 'btn-minimize';
    btnMin.title = 'Perkecil / Mode Mini';
    const btnClose = doc.createElement('button');
    btnClose.id = 'btn-close';
    btnClose.title = 'Tutup Overlay';
    dots.appendChild(btnMin);
    dots.appendChild(btnClose);

    header.appendChild(brand);
    header.appendChild(dots);
    wrapper.appendChild(header);

    // Search Bar Input (Generous 44px height, solid dark bg, high contrast)
    const searchContainer = doc.createElement('div');
    searchContainer.className = 'search-container';

    const searchIconWrapper = doc.createElement('div');
    searchIconWrapper.className = 'search-icon-wrapper';
    const searchSvg = createSvg('0 0 512 512', 'search-svg', 'M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0s208 93.1 208 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z', 16, 16);
    searchIconWrapper.appendChild(searchSvg);

    const searchInput = doc.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'song-search';
    searchInput.placeholder = 'Cari judul lagu atau artis...';
    searchInput.autocomplete = 'off';
    searchInput.spellcheck = false;

    const searchResults = doc.createElement('div');
    searchResults.id = 'search-results';
    searchResults.className = 'hidden';

    searchContainer.appendChild(searchIconWrapper);
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(searchResults);
    wrapper.appendChild(searchContainer);

    // Album Cover Image Box
    const coverBox = doc.createElement('div');
    coverBox.className = 'album-cover-box relative mb-5 aspect-square w-full rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700/50 shadow-lg';

    const coverImg = doc.createElement('img');
    coverImg.id = 'album-cover';
    coverImg.src = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=600&auto=format&fit=crop';
    coverImg.alt = 'Album Cover';
    coverImg.className = 'w-full h-full object-cover transition-transform duration-500';

    const badge = doc.createElement('div');
    badge.className = 'now-playing-badge';
    const dot = doc.createElement('span');
    dot.id = 'playing-dot';
    dot.className = 'playing-dot-indicator animate-pulse';
    const badgeText = doc.createElement('span');
    badgeText.id = 'now-playing-badge';
    badgeText.textContent = 'Now Playing';
    badge.appendChild(dot);
    badge.appendChild(badgeText);

    coverBox.appendChild(coverImg);
    coverBox.appendChild(badge);
    wrapper.appendChild(coverBox);

    // Track Metadata
    const meta = doc.createElement('div');
    meta.className = 'flex items-center justify-between mb-4 track-meta';

    const metaText = doc.createElement('div');
    metaText.className = 'min-w-0 pr-3';
    const titleH2 = doc.createElement('h2');
    titleH2.id = 'song-title';
    titleH2.className = 'font-bold text-lg text-white truncate tracking-tight';
    titleH2.textContent = 'Memuat lagu...';
    const artistP = doc.createElement('p');
    artistP.id = 'artist-name';
    artistP.className = 'text-xs font-medium text-zinc-400 truncate';
    artistP.textContent = 'YouTube Music';
    metaText.appendChild(titleH2);
    metaText.appendChild(artistP);

    const favBtn = doc.createElement('button');
    favBtn.id = 'favorite-btn';
    favBtn.title = 'Suka / Favorit';
    const favIconSpan = doc.createElement('span');
    favIconSpan.id = 'favorite-icon';
    const heartReg = createSvg('0 0 512 512', 'svg-heart-regular', 'M244 84L256 96l12-12c32.6-32.6 79-47.5 124.6-39.9C461.5 55.6 512 115.2 512 185.1v5.8c0 41.5-17.2 81.2-47.6 109.5L283.7 469.1c-7.5 7-17.4 10.9-27.7 10.9s-20.2-3.9-27.7-10.9L47.6 300.4C17.2 272.1 0 232.4 0 190.9v-5.8c0-69.9 50.5-129.5 119.4-141C165 36.5 211.4 51.4 244 84zm-48.4 24.2c-29.3-5-60.1 5.4-81.2 26.5C92.2 156.9 80 187.6 80 220.1v5.8c0 23.3 9.7 45.6 26.8 61.5L256 426.9l149.2-139.5c17.1-15.9 26.8-38.2 26.8-61.5v-5.8c0-32.5-12.2-63.2-34.4-85.4-21.1-21.1-51.9-31.5-81.2-26.5-30.8 5.2-57.8 24.6-70.4 51.7-6 12.8-24.1 12.8-30.1 0-12.6-27.1-39.6-46.5-70.3-51.7z', 20, 20);
    const heartSolid = createSvg('0 0 512 512', 'svg-heart-solid text-red-500', 'M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z', 20, 20);
    heartSolid.style.display = 'none';
    favIconSpan.appendChild(heartReg);
    favIconSpan.appendChild(heartSolid);
    favBtn.appendChild(favIconSpan);

    meta.appendChild(metaText);
    meta.appendChild(favBtn);
    wrapper.appendChild(meta);

    // Progress Bar Section
    const progSection = doc.createElement('div');
    progSection.className = 'mb-5 progress-section';
    const progContainer = doc.createElement('div');
    progContainer.id = 'progress-container';
    progContainer.className = 'relative cursor-pointer py-1';
    const progBar = doc.createElement('input');
    progBar.type = 'range';
    progBar.id = 'progress-bar';
    progBar.min = '0';
    progBar.max = '100';
    progBar.value = '0';
    progBar.className = 'w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600 hover:h-2 transition-all';
    progContainer.appendChild(progBar);

    const timeDiv = doc.createElement('div');
    timeDiv.className = 'flex justify-between text-[11px] font-medium text-zinc-400 mt-1';
    const curTime = doc.createElement('span');
    curTime.id = 'current-time';
    curTime.textContent = '0:00';
    const totTime = doc.createElement('span');
    totTime.id = 'total-duration';
    totTime.textContent = '0:00';
    timeDiv.appendChild(curTime);
    timeDiv.appendChild(totTime);

    progSection.appendChild(progContainer);
    progSection.appendChild(timeDiv);
    wrapper.appendChild(progSection);

    // Controls Row (Clean, accurate music icons - zero white pill artifacts)
    const controlsRow = doc.createElement('div');
    controlsRow.className = 'flex items-center justify-between px-1';

    // Shuffle Button (Intertwined crossing arrows)
    const shuffleBtn = doc.createElement('button');
    shuffleBtn.id = 'shuffle-btn';
    shuffleBtn.title = 'Acak / Shuffle';
    shuffleBtn.className = 'ctrl-btn text-zinc-500 hover:text-white transition-colors cursor-pointer';
    shuffleBtn.appendChild(createSvg('0 0 512 512', 'svg-icon', 'M403.8 284.7c6 4.2 13.6 6.3 21.2 5.6s14.8-4.7 19.8-10.5l64-75c8.7-10.2 8.7-25.2 0-35.4l-64-75c-7.9-9.2-20.7-12.8-32.3-8.8s-19.5 15.2-19.5 27.5V160H352c-47.5 0-91.8 21.6-121.2 58.7L189.6 270.4 141.7 207c-29.4-38.9-75-63-124.7-63H0v48h17c34.8 0 66.8 16.9 87.3 44.1l53.9 71.4-53.9 71.4C83.8 407.1 51.8 424 17 424H0v48h17c49.7 0 95.3-24.1 124.7-63l47.9-63.4 41.2 51.7C260.2 474.4 304.5 496 352 496h40.8v46.9c0 12.3 7.9 23.5 19.5 27.5s24.4.4 32.3-8.8l64-75c8.7-10.2 8.7-25.2 0-35.4l-64-75c-5-5.9-12.2-9.8-19.8-10.5s-15.2 1.4-21.2 5.6l-32 22.4v-38.6c-31.5-2.2-61-17.6-80.5-42.3L268.4 288l41.6-52.8c19.5-24.7 49-40.1 80.5-42.3V232l32 22.7z', 18, 18));

    // Previous Track Button (Bar + Left Triangle)
    const prevBtn = doc.createElement('button');
    prevBtn.id = 'prev-btn';
    prevBtn.title = 'Lagu Sebelumnya (Previous)';
    prevBtn.className = 'ctrl-btn text-zinc-300 hover:text-white cursor-pointer';
    prevBtn.appendChild(createSvg('0 0 320 512', 'svg-icon', 'M267.5 440.6c9.5 7.9 22.8 9.7 34.1 4.4s18.4-16.6 18.4-29V96c0-12.4-7.2-23.7-18.4-29s-24.5-3.6-34.1 4.4L96 214.3V96c0-17.7-14.3-32-32-32S32 78.3 32 96v320c0 17.7 14.3 32 32 32s32-14.3 32-32V297.7l171.5 142.9z', 20, 20));

    // Play/Pause Big Center Button
    const playBtn = doc.createElement('button');
    playBtn.id = 'play-btn';
    playBtn.title = 'Putar / Jeda (Play/Pause)';
    const playIconSpan = doc.createElement('span');
    playIconSpan.id = 'play-icon';
    playIconSpan.className = 'flex items-center justify-center';
    const playSvg = createSvg('0 0 384 512', 'svg-play', 'M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z', 20, 20);
    const pauseSvg = createSvg('0 0 320 512', 'svg-pause', 'M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z', 20, 20);
    pauseSvg.style.display = 'none';
    playIconSpan.appendChild(playSvg);
    playIconSpan.appendChild(pauseSvg);
    playBtn.appendChild(playIconSpan);

    // Next Track Button (Right Triangle + Bar)
    const nextBtn = doc.createElement('button');
    nextBtn.id = 'next-btn';
    nextBtn.title = 'Lagu Berikutnya (Next)';
    nextBtn.className = 'ctrl-btn text-zinc-300 hover:text-white cursor-pointer';
    nextBtn.appendChild(createSvg('0 0 320 512', 'svg-icon', 'M52.5 440.6c-9.5 7.9-22.8 9.7-34.1 4.4S0 428.4 0 416V96c0-12.4 7.2-23.7 18.4-29s24.5-3.6 34.1 4.4L224 214.3V96c0-17.7 14.3-32 32-32s32 14.3 32 32v320c0 17.7-14.3 32-32 32s-32-14.3-32-32V297.7L52.5 440.6z', 20, 20));

    // Repeat Button (Looping Arrows)
    const repeatBtn = doc.createElement('button');
    repeatBtn.id = 'repeat-btn';
    repeatBtn.title = 'Ulangi / Repeat';
    repeatBtn.className = 'ctrl-btn text-zinc-500 hover:text-white transition-colors cursor-pointer';
    repeatBtn.appendChild(createSvg('0 0 512 512', 'svg-icon', 'M0 224c0 17.7 14.3 32 32 32s32-14.3 32-32c0-53 43-96 96-96h160v48c0 10.7 6.4 20.4 16.2 24.7s21.2 2.3 28.9-5.1l80-77.3c10.4-10 10.4-26.6 0-36.6l-80-77.3c-7.7-7.4-19.1-9.4-28.9-5.1S320 21.3 320 32V80H160C71.6 80 0 151.6 0 224zm512 64c0-17.7-14.3-32-32-32s-32 14.3-32 32c0 53-43 96-96 96H192v-48c0-10.7-6.4-20.4-16.2-24.7s-21.2-2.3-28.9 5.1l-80 77.3c-10.4 10-10.4 26.6 0 36.6l80 77.3c7.7 7.4 19.1 9.4 28.9 5.1S192 490.7 192 480V432h160c88.4 0 160-71.6 160-144z', 18, 18));

    controlsRow.appendChild(shuffleBtn);
    controlsRow.appendChild(prevBtn);
    controlsRow.appendChild(playBtn);
    controlsRow.appendChild(nextBtn);
    controlsRow.appendChild(repeatBtn);
    wrapper.appendChild(controlsRow);

    doc.body.appendChild(wrapper);
  }

  // Build Document Picture-in-Picture Window UI
  async function openPipWindow() {
    if (!('documentPictureInPicture' in window)) {
      alert("Browser Chrome Anda belum mendukung Document Picture-in-Picture. Pastikan Chrome sudah diperbarui ke versi terbaru (v116+).");
      return;
    }

    // Reuse existing open window, or reset zombie reference if closed
    if (pipWindow && !pipWindow.closed) {
      pipWindow.focus();
      return;
    }
    pipWindow = null;

    try {
      pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 384,
        height: 595
      });

      window.postMessage({ source: "YTM_OVERLAY_PAGE", type: "PIP_STATE_CHANGED", active: true }, "*");

      // Construct document head & styles
      pipWindow.document.title = "YT Music Extension (Overlay)";

      const style = pipWindow.document.createElement('style');
      style.textContent = getPipStyles();
      pipWindow.document.head.appendChild(style);

      // Construct body HTML using 100% Pure DOM methods (Zero innerHTML)
      buildPipUI(pipWindow.document);

      // Bind events inside the PiP window
      initPipWindowEvents(pipWindow);

      // Clean up cleanly on window close
      const handlePipClosed = () => {
        if (syncInterval) {
          clearInterval(syncInterval);
          syncInterval = null;
        }
        pipWindow = null;
        window.postMessage({ source: "YTM_OVERLAY_PAGE", type: "PIP_STATE_CHANGED", active: false }, "*");
      };

      pipWindow.addEventListener('pagehide', handlePipClosed);
      pipWindow.addEventListener('unload', handlePipClosed);

    } catch (err) {
      console.error("[YT Music Overlay] Gagal membuka Document PiP:", err);
      pipWindow = null;
    }
  }

  // Initialize interactive controls & sync loop in PiP window
  function initPipWindowEvents(win) {
    const doc = win.document;

    // Elements
    const widgetWrapper = doc.getElementById('widget-wrapper');
    const songSearch = doc.getElementById('song-search');
    const searchResults = doc.getElementById('search-results');
    const albumCover = doc.getElementById('album-cover');
    const nowPlayingBadge = doc.getElementById('now-playing-badge');
    const playingDot = doc.getElementById('playing-dot');
    const songTitle = doc.getElementById('song-title');
    const artistName = doc.getElementById('artist-name');
    const favoriteBtn = doc.getElementById('favorite-btn');
    const favoriteIcon = doc.getElementById('favorite-icon');
    const progressBar = doc.getElementById('progress-bar');
    const currentTimeEl = doc.getElementById('current-time');
    const totalDurationEl = doc.getElementById('total-duration');
    const shuffleBtn = doc.getElementById('shuffle-btn');
    const prevBtn = doc.getElementById('prev-btn');
    const playBtn = doc.getElementById('play-btn');
    const playIcon = doc.getElementById('play-icon');
    const nextBtn = doc.getElementById('next-btn');
    const repeatBtn = doc.getElementById('repeat-btn');
    const btnMinimize = doc.getElementById('btn-minimize');
    const btnClose = doc.getElementById('btn-close');

    // Minimize / Compact Mode Toggle with Dynamic Frame Sizing
    btnMinimize?.addEventListener('click', () => {
      const isCompact = widgetWrapper.classList.toggle('compact-view');
      doc.body.classList.toggle('is-compact', isCompact);
      btnMinimize.title = isCompact ? "Perbesar (Mode Normal)" : "Perkecil (Mode Mini)";

      try {
        if (typeof win.resizeTo === 'function') {
          // Dynamic frame resizing: 260px for compact widget, 595px for full view with cover & search
          win.resizeTo(384, isCompact ? 260 : 595);
        }
      } catch (err) {
        console.warn("[YT Music Overlay] win.resizeTo error:", err);
      }
    });

    // Close window
    btnClose?.addEventListener('click', () => {
      win.close();
    });

    // Controls Event Listeners
    playBtn?.addEventListener('click', () => {
      // Instant optimistic UI toggle for immediate responsiveness
      const playSvg = playIcon?.querySelector('.svg-play');
      const pauseSvg = playIcon?.querySelector('.svg-pause');
      if (playSvg && pauseSvg) {
        const isShowingPlay = (playSvg.style.display !== 'none');
        if (isShowingPlay) {
          playSvg.style.display = 'none';
          pauseSvg.style.display = 'block';
          playingDot?.classList.add('animate-pulse');
          if (nowPlayingBadge) nowPlayingBadge.textContent = 'Now Playing';
        } else {
          playSvg.style.display = 'block';
          pauseSvg.style.display = 'none';
          playingDot?.classList.remove('animate-pulse');
          if (nowPlayingBadge) nowPlayingBadge.textContent = 'Paused';
        }
      }

      togglePlayPause();
      setTimeout(syncState, 150);
      setTimeout(syncState, 400);
    });
    nextBtn?.addEventListener('click', () => { playNext(); setTimeout(syncState, 150); });
    prevBtn?.addEventListener('click', () => { playPrevious(); setTimeout(syncState, 150); });
    favoriteBtn?.addEventListener('click', () => { toggleLike(); setTimeout(syncState, 150); });
    shuffleBtn?.addEventListener('click', () => { toggleShuffle(); setTimeout(syncState, 150); });
    repeatBtn?.addEventListener('click', () => { toggleRepeat(); setTimeout(syncState, 150); });

    // Seeking with fail-safe release listeners
    const cancelSeeking = () => { isSeeking = false; };
    progressBar?.addEventListener('mousedown', () => { isSeeking = true; });
    progressBar?.addEventListener('touchstart', () => { isSeeking = true; });
    progressBar?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      const video = document.querySelector('video');
      if (video && video.duration) {
        currentTimeEl.textContent = formatTime((val / 100) * video.duration);
      }
    });
    progressBar?.addEventListener('change', (e) => {
      seekTrack(parseFloat(e.target.value));
      isSeeking = false;
    });
    progressBar?.addEventListener('mouseup', cancelSeeking);
    progressBar?.addEventListener('touchend', cancelSeeking);
    win.addEventListener('mouseup', cancelSeeking);
    win.addEventListener('touchend', cancelSeeking);
    win.addEventListener('pointerup', cancelSeeking);

    // Global keyboard navigation inside the PiP overlay
    win.addEventListener('keydown', (e) => {
      // Allow normal typing inside the search input
      if (doc.activeElement === songSearch) {
        if (e.key === 'Escape') {
          searchResults.classList.add('hidden');
          songSearch.blur();
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        playBtn?.click();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) {
          playNext();
        } else {
          seekRelative(5);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) {
          playPrevious();
        } else {
          seekRelative(-5);
        }
      } else if (e.key === 'Escape') {
        searchResults.classList.add('hidden');
      }
    });

    // Search Input Functionality (Pure DOM creation, zero innerHTML)
    let searchTimer = null;
    songSearch?.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      clearTimeout(searchTimer);

      if (query === '') {
        searchResults.classList.add('hidden');
        searchResults.replaceChildren();
        return;
      }

      // Show loading indicator safely
      searchResults.replaceChildren();
      const loadingDiv = doc.createElement('div');
      loadingDiv.className = 'search-empty-text flex items-center justify-center gap-2';
      const spinner = doc.createElement('span');
      spinner.className = 'spinner';
      const loadingText = doc.createElement('span');
      loadingText.textContent = 'Mencari di YouTube Music...';
      loadingDiv.appendChild(spinner);
      loadingDiv.appendChild(loadingText);
      searchResults.appendChild(loadingDiv);
      searchResults.classList.remove('hidden');

      searchTimer = setTimeout(async () => {
        const matches = await searchMusic(query);
        searchResults.replaceChildren();

        if (matches && matches.length > 0) {
          matches.forEach(song => {
            const item = doc.createElement('div');
            item.className = 'search-item';
            item.setAttribute('data-id', song.videoId);

            const img = doc.createElement('img');
            img.src = song.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop';
            img.className = 'search-item-thumb';
            img.onerror = () => {
              img.src = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop';
            };

            const info = doc.createElement('div');
            info.className = 'search-item-info';

            const titleP = doc.createElement('p');
            titleP.className = 'search-item-title';
            titleP.textContent = song.title;

            const artistP = doc.createElement('p');
            artistP.className = 'search-item-artist';
            artistP.textContent = song.artist;

            info.appendChild(titleP);
            info.appendChild(artistP);

            const durSpan = doc.createElement('span');
            durSpan.className = 'search-item-duration';
            durSpan.textContent = song.duration;

            item.appendChild(img);
            item.appendChild(info);
            item.appendChild(durSpan);

            item.addEventListener('click', () => {
              playSongById(song.videoId);
              searchResults.classList.add('hidden');
              songSearch.value = '';
            });

            searchResults.appendChild(item);
          });
        } else {
          const emptyDiv = doc.createElement('div');
          emptyDiv.className = 'search-empty-text';
          emptyDiv.textContent = 'Tidak ada lagu ditemukan';
          searchResults.appendChild(emptyDiv);
        }
      }, 350);
    });

    // Close search dropdown when clicking outside
    doc.addEventListener('click', (e) => {
      if (!songSearch.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.add('hidden');
      }
    });

    // Continuous Real-Time State Sync Engine
    function syncState() {
      if (!pipWindow || pipWindow.closed) {
        if (syncInterval) {
          clearInterval(syncInterval);
          syncInterval = null;
        }
        pipWindow = null;
        return;
      }

      const info = getCurrentTrackInfo();

      // Update text & artwork
      if (songTitle.textContent !== info.title) songTitle.textContent = info.title;
      if (artistName.textContent !== info.artist) artistName.textContent = info.artist;
      if (albumCover.src !== info.thumbnail && info.thumbnail) {
        albumCover.src = info.thumbnail;
      }

      // Update Play/Pause Button
      const playSvg = playIcon?.querySelector('.svg-play');
      const pauseSvg = playIcon?.querySelector('.svg-pause');
      if (playSvg && pauseSvg) {
        if (info.isPlaying) {
          playSvg.style.display = 'none';
          pauseSvg.style.display = 'block';
          playingDot?.classList.add('animate-pulse');
          if (nowPlayingBadge) nowPlayingBadge.textContent = 'Now Playing';
        } else {
          playSvg.style.display = 'block';
          pauseSvg.style.display = 'none';
          playingDot?.classList.remove('animate-pulse');
          if (nowPlayingBadge) nowPlayingBadge.textContent = 'Paused';
        }
      }

      // Update Time & Progress (unless currently dragging)
      if (!isSeeking) {
        currentTimeEl.textContent = formatTime(info.currentTime);
        totalDurationEl.textContent = formatTime(info.duration);
        if (info.duration > 0) {
          progressBar.value = ((info.currentTime / info.duration) * 100).toFixed(1);
        } else {
          progressBar.value = 0;
        }
      }

      // Update Favorite / Like Button
      const heartRegular = favoriteIcon.querySelector('.svg-heart-regular');
      const heartSolid = favoriteIcon.querySelector('.svg-heart-solid');
      if (info.liked) {
        heartRegular.style.display = 'none';
        heartSolid.style.display = 'block';
        favoriteBtn.classList.add('text-red-500');
        favoriteBtn.classList.remove('text-zinc-500');
      } else {
        heartRegular.style.display = 'block';
        heartSolid.style.display = 'none';
        favoriteBtn.classList.remove('text-red-500');
        favoriteBtn.classList.add('text-zinc-500');
      }

      // Update Shuffle
      shuffleBtn.classList.toggle('text-red-500', info.shuffled);
      shuffleBtn.classList.toggle('text-zinc-500', !info.shuffled);

      // Update Repeat
      repeatBtn.classList.toggle('text-red-500', info.repeated);
      repeatBtn.classList.toggle('text-zinc-500', !info.repeated);
    }

    // Initial sync & interval
    syncState();
    syncInterval = setInterval(syncState, 350);
  }

  // Self-Contained Tailwind-identical CSS (Zero external network dependencies)
  function getPipStyles() {
    return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        user-select: none;
      }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background-color: #09090b;
        color: #ffffff;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
        overflow-x: hidden;
        overflow-y: auto;
      }

      /* Native Button Reset - Prevents Browser Default White buttonface Pills */
      button {
        background: transparent !important;
        border: none !important;
        outline: none !important;
        cursor: pointer !important;
        padding: 0 !important;
        margin: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: inherit !important;
        -webkit-appearance: none !important;
        appearance: none !important;
      }

      /* Custom Scrollbar for Dropdown */
      ::-webkit-scrollbar {
        width: 6px;
      }
      ::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.4);
      }

      /* Radial vignette background */
      .bg-radial-vignette {
        background: radial-gradient(ellipse at top, #27272a, #18181b, #000000);
      }

      .fixed { position: fixed; }
      .absolute { position: absolute; }
      .relative { position: relative; }
      .inset-0 { inset: 0; }
      .top-3 { top: 12px; }
      .right-3 { right: 12px; }
      .top-full { top: 100%; }
      .left-0 { left: 0; }
      .right-0 { right: 0; }
      .inset-y-0 { top: 0; bottom: 0; }
      .z-20 { z-index: 20; }
      .-z-10 { z-index: -10; }

      .w-full { width: 100%; }
      .max-w-sm { max-width: 384px; }
      .aspect-square { aspect-ratio: 1 / 1; }

      .flex { display: flex; }
      .flex-1 { flex: 1; }
      .flex-shrink-0 { flex-shrink: 0; }
      .items-center { align-items: center; }
      .justify-between { justify-content: space-between; }
      .justify-center { justify-content: center; }
      .min-w-0 { min-width: 0; }

      .gap-1\\.5 { gap: 6px; }
      .gap-2 { gap: 8px; }
      .gap-3 { gap: 12px; }

      .mb-4 { margin-bottom: 16px; }
      .mb-5 { margin-bottom: 20px; }
      .mt-1 { margin-top: 4px; }
      .mt-2 { margin-top: 8px; }
      .ml-auto { margin-left: auto; }
      .p-5 { padding: 20px; }
      .px-1 { padding-left: 4px; padding-right: 4px; }
      .px-2 { padding-left: 8px; padding-right: 8px; }
      .py-1 { padding-top: 4px; padding-bottom: 4px; }
      .pr-3 { padding-right: 12px; }

      /* Backgrounds & Colors */
      .bg-zinc-900 { background-color: #18181b; }
      .bg-zinc-800 { background-color: #27272a; }
      .bg-red-500 { background-color: #ef4444; }

      .text-white { color: #ffffff; }
      .text-black { color: #000000; }
      .text-zinc-100 { color: #f4f4f5; }
      .text-zinc-300 { color: #d4d4d8; }
      .text-zinc-400 { color: #a1a1aa; }
      .text-zinc-500 { color: #71717a; }
      .text-red-500 { color: #ef4444; }
      .text-red-600 { color: #dc2626; }
      .fill-current { fill: currentColor; }

      /* Borders & Shadows */
      .border { border-width: 1px; border-style: solid; }
      .border-zinc-800 { border-color: #27272a; }
      .border-none { border: none; }

      .rounded-xl { border-radius: 12px; }
      .rounded-2xl { border-radius: 16px; }
      .rounded-3xl { border-radius: 24px; }
      .rounded-full { border-radius: 9999px; }

      .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4); }
      .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6); }

      /* Typography */
      .text-xs { font-size: 12px; }
      .text-sm { font-size: 14px; }
      .text-lg { font-size: 18px; }
      .font-medium { font-weight: 500; }
      .font-semibold { font-weight: 600; }
      .font-bold { font-weight: 700; }
      .tracking-tight { letter-spacing: -0.025em; }
      .tracking-wider { letter-spacing: 0.05em; }
      .uppercase { text-transform: uppercase; }
      .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      .pointer-events-none { pointer-events: none; }
      .cursor-pointer { cursor: pointer; }
      .overflow-hidden { overflow: hidden; }
      .overflow-y-auto { overflow-y: auto; }
      .hidden { display: none !important; }
      .object-cover { object-fit: cover; }

      .transition-all { transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1); }
      .transition-colors { transition: color 200ms ease, background-color 200ms ease; }
      .duration-300 { transition-duration: 300ms; }
      .duration-500 { transition-duration: 500ms; }

      /* Ambient Glow */
      .ambient-glow-fx {
        position: absolute;
        top: -48px;
        left: -48px;
        width: 192px;
        height: 192px;
        background-color: rgba(220, 38, 38, 0.2);
        border-radius: 9999px;
        filter: blur(64px);
        transition: all 500ms ease;
      }

      /* 1. Search Bar Styling (Generous 44px height, high contrast, clean placeholder) */
      .search-container {
        position: relative;
        margin-bottom: 20px;
        width: 100%;
      }
      .search-icon-wrapper {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        left: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        color: #71717a;
        transition: color 0.2s ease;
        z-index: 2;
      }
      .search-container:focus-within .search-icon-wrapper {
        color: #ef4444;
      }
      #song-search {
        width: 100% !important;
        height: 44px !important;
        line-height: 44px !important;
        background-color: #18181b !important;
        color: #ffffff !important;
        font-family: inherit !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        border: 1px solid #3f3f46 !important;
        border-radius: 14px !important;
        padding: 0 16px 0 42px !important;
        outline: none !important;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4) !important;
        transition: all 0.2s ease !important;
        box-sizing: border-box !important;
      }
      #song-search::placeholder {
        color: #71717a !important;
        font-size: 13px !important;
        opacity: 1 !important;
      }
      #song-search:focus {
        border-color: #ef4444 !important;
        background-color: #222227 !important;
        color: #ffffff !important;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25), inset 0 1px 2px rgba(0,0,0,0.3) !important;
      }

      /* 2. Search Dropdown Results (Solid dark background, crystal-clear white text) */
      #search-results {
        position: absolute !important;
        top: calc(100% + 8px) !important;
        left: 0 !important;
        right: 0 !important;
        background-color: #121214 !important;
        border: 1px solid #3f3f46 !important;
        border-radius: 14px !important;
        box-shadow: 0 18px 45px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.08) !important;
        max-height: 230px !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        z-index: 100 !important;
      }
      #search-results.hidden {
        display: none !important;
      }
      .search-item {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        padding: 10px 14px !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
        cursor: pointer !important;
        background-color: transparent !important;
        transition: background-color 0.15s ease !important;
      }
      .search-item:last-child {
        border-bottom: none !important;
      }
      .search-item:hover {
        background-color: #27272a !important;
      }
      .search-item-thumb {
        width: 40px !important;
        height: 40px !important;
        border-radius: 8px !important;
        object-fit: cover !important;
        flex-shrink: 0 !important;
        background-color: #27272a !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
      }
      .search-item-info {
        min-width: 0 !important;
        flex: 1 !important;
      }
      .search-item-title {
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        line-height: 1.35 !important;
        margin: 0 0 2px 0 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .search-item-artist {
        font-size: 11px !important;
        font-weight: 500 !important;
        color: #a1a1aa !important;
        line-height: 1.35 !important;
        margin: 0 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .search-item-duration {
        font-size: 11px !important;
        font-weight: 600 !important;
        color: #71717a !important;
        flex-shrink: 0 !important;
        margin-left: auto !important;
      }
      .search-empty-text {
        padding: 16px !important;
        font-size: 12px !important;
        color: #a1a1aa !important;
        text-align: center !important;
      }

      /* 3. Media Controls & Buttons (Distinct, recognizable music icons) */
      .ctrl-btn {
        width: 40px !important;
        height: 40px !important;
        border-radius: 50% !important;
        background: transparent !important;
        color: #a1a1aa !important;
        transition: all 0.2s ease !important;
      }
      .ctrl-btn:hover {
        color: #ffffff !important;
        background-color: rgba(255, 255, 255, 0.1) !important;
        transform: scale(1.08) !important;
      }
      .ctrl-btn:active {
        transform: scale(0.92) !important;
      }

      #shuffle-btn.text-red-500, #repeat-btn.text-red-500 {
        color: #ef4444 !important;
        background-color: rgba(239, 68, 68, 0.15) !important;
      }

      #play-btn {
        width: 56px !important;
        height: 56px !important;
        border-radius: 50% !important;
        background-color: #ffffff !important;
        color: #000000 !important;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.5) !important;
        transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
      }
      #play-btn:hover {
        background-color: #f4f4f5 !important;
        transform: scale(1.06) !important;
        box-shadow: 0 6px 22px rgba(255, 255, 255, 0.25) !important;
      }
      #play-btn:active {
        transform: scale(0.95) !important;
      }

      #favorite-btn {
        width: 36px !important;
        height: 36px !important;
        border-radius: 50% !important;
        background: transparent !important;
        color: #71717a !important;
        transition: all 0.2s ease !important;
      }
      #favorite-btn:hover {
        color: #ef4444 !important;
        background-color: rgba(239, 68, 68, 0.12) !important;
        transform: scale(1.1) !important;
      }
      #favorite-btn.text-red-500 {
        color: #ef4444 !important;
      }

      #btn-minimize, #btn-close {
        width: 12px !important;
        height: 12px !important;
        border-radius: 50% !important;
        transition: background-color 0.2s ease !important;
      }
      #btn-minimize { background-color: #52525b !important; }
      #btn-minimize:hover { background-color: #eab308 !important; }
      #btn-close { background-color: #52525b !important; }
      #btn-close:hover { background-color: #ef4444 !important; }

      /* Now Playing Badge on Artwork */
      .now-playing-badge {
        position: absolute !important;
        top: 12px !important;
        right: 12px !important;
        background: rgba(0, 0, 0, 0.75) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        border: 1px solid rgba(255, 255, 255, 0.18) !important;
        border-radius: 9999px !important;
        padding: 4px 10px !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        color: #f4f4f5 !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        letter-spacing: 0.3px !important;
        pointer-events: none !important;
      }
      .playing-dot-indicator {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background-color: #ef4444;
      }

      /* Spinner */
      .spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-top-color: #dc2626;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Animations */
      .animate-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.85); }
      }

      /* Native Range Input styling */
      input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        background: #27272a;
        height: 6px;
        border-radius: 8px;
        outline: none;
        cursor: pointer;
      }
      input[type="range"]:hover {
        height: 8px;
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #dc2626;
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      input[type="range"]:hover::-webkit-slider-thumb {
        transform: scale(1.2);
      }

      /* Compact View Mode (when user clicks yellow minimize dot) */
      body.is-compact {
        padding: 8px !important;
        min-height: 0 !important;
        height: 100vh !important;
        overflow-y: hidden !important;
      }

      .compact-view {
        padding: 14px 16px !important;
        border-radius: 20px !important;
      }

      .compact-view .search-container,
      .compact-view .album-cover-box {
        display: none !important;
      }

      .compact-view .header-bar {
        margin-bottom: 10px !important;
      }

      .compact-view .track-meta {
        margin-bottom: 10px !important;
      }

      .compact-view .progress-section {
        margin-bottom: 12px !important;
      }
    `;
  }

  // Ensure launcher pill styles are available in DOM
  function ensurePillStyle() {
    if (document.getElementById('ytm-overlay-pill-style')) return;
    const style = document.createElement('style');
    style.id = 'ytm-overlay-pill-style';
    style.textContent = `
      .ytm-overlay-pill-btn {
        position: fixed;
        bottom: 85px;
        right: 25px;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: linear-gradient(135deg, rgba(255, 30, 60, 0.95), rgba(180, 0, 40, 0.95));
        color: #ffffff;
        font-family: 'Roboto', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 13px;
        font-weight: 600;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 9999px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(255, 0, 50, 0.4), 0 2px 6px rgba(0, 0, 0, 0.4);
        transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
        backdrop-filter: blur(8px);
        user-select: none;
      }
      .ytm-overlay-pill-btn:hover {
        transform: translateY(-2px) scale(1.04);
        box-shadow: 0 6px 25px rgba(255, 0, 50, 0.6), 0 4px 10px rgba(0, 0, 0, 0.5);
        background: linear-gradient(135deg, rgba(255, 50, 80, 1), rgba(210, 10, 50, 1));
      }
      .ytm-overlay-pill-btn:active {
        transform: translateY(1px) scale(0.98);
      }
      .ytm-overlay-pill-btn svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }
      .ytm-overlay-pill-btn .ytm-pip-badge {
        background: rgba(255, 255, 255, 0.2);
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .ytm-launcher-highlight {
        animation: ytm-pulse-glow 1s infinite alternate !important;
      }
      @keyframes ytm-pulse-glow {
        0% { transform: scale(1); box-shadow: 0 0 10px rgba(255, 0, 60, 0.6); }
        100% { transform: scale(1.12); box-shadow: 0 0 35px rgba(255, 0, 60, 1), 0 0 15px rgba(255, 255, 255, 0.8); }
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // Inject Floating Button inside YouTube Music page (Pure DOM construction, zero innerHTML)
  function injectLauncherPill() {
    if (document.getElementById('ytm-overlay-launcher-btn')) return;
    ensurePillStyle();

    const pill = document.createElement('button');
    pill.id = 'ytm-overlay-launcher-btn';
    pill.className = 'ytm-overlay-pill-btn';
    pill.title = 'Buka Overlay Mini Player (Always-on-Top)';

    // Safe SVG icon creation
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 576 512');
    svg.style.width = '16px';
    svg.style.height = '16px';
    svg.style.fill = 'currentColor';

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.837V174.08l142.48 81.92-142.48 81.92z');
    svg.appendChild(path);

    const textSpan = document.createElement('span');
    textSpan.textContent = ' 🎮 Game Overlay';

    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'ytm-pip-badge';
    badgeSpan.textContent = 'PiP';

    pill.appendChild(svg);
    pill.appendChild(textSpan);
    pill.appendChild(badgeSpan);

    pill.addEventListener('click', () => {
      openPipWindow();
    });

    document.body.appendChild(pill);
  }

  // Highlight launcher button when requested from popup or shortcut
  function highlightLauncher() {
    const pill = document.getElementById('ytm-overlay-launcher-btn');
    if (!pill) {
      injectLauncherPill();
      return;
    }

    pill.classList.add('ytm-launcher-highlight');
    pill.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
      pill.classList.remove('ytm-launcher-highlight');
    }, 3000);
  }

  // Listen for messages from Isolated Content Script
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.source !== "YTM_OVERLAY_EXT") return;

    if (event.data.type === "COMMAND") {
      switch (event.data.command) {
        case "play-pause":
          togglePlayPause();
          break;
        case "next-track":
          playNext();
          break;
        case "prev-track":
          playPrevious();
          break;
        case "toggle-pip":
          if (pipWindow) {
            pipWindow.focus();
          } else {
            highlightLauncher();
          }
          break;
      }
    }

    if (event.data.type === "HIGHLIGHT_LAUNCHER") {
      highlightLauncher();
    }

    if (event.data.type === "GET_PLAYER_STATUS") {
      const status = getCurrentTrackInfo();
      status.pipActive = !!pipWindow;
      window.postMessage({
        source: "YTM_OVERLAY_PAGE",
        type: "PLAYER_STATUS_REPLY",
        reqId: event.data.reqId,
        status: status
      }, "*");
    }
  });

  // Continuously ensure the launcher button is present in DOM even after Polymer SPA renders
  function ensureLauncher() {
    if (!document.getElementById('ytm-overlay-launcher-btn')) {
      if (document.body) {
        injectLauncherPill();
      }
    }
  }

  setInterval(ensureLauncher, 1200);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureLauncher);
  } else {
    ensureLauncher();
  }

})();

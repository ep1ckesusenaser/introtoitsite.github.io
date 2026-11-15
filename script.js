/* =========================================================
   Vladimir's homepage — scripts (no frameworks)
   Loaded in <head>: the theme is applied before the first
   paint, everything else waits for DOMContentLoaded.
   ========================================================= */
(() => {
  'use strict';

  const root = document.documentElement;
  const THEME_KEY = 'vladimir-homepage-theme';
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  root.classList.add('js');

  /* ---------- Theme ---------- */

  // localStorage can be blocked (private mode, file:// rules), so every access is guarded.
  const readStoredTheme = () => {
    try {
      const value = localStorage.getItem(THEME_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (error) {
      return null;
    }
  };

  const storeTheme = (theme) => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      /* the toggle still works for this visit */
    }
  };

  const systemTheme = () => (darkQuery.matches ? 'dark' : 'light');

  root.dataset.theme = readStoredTheme() || systemTheme();

  function syncThemeUi() {
    const isDark = root.dataset.theme === 'dark';
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = isDark ? '#08111f' : '#f5f9ff';
  }

  function setTheme(theme, persist) {
    root.dataset.theme = theme;
    if (persist) storeTheme(theme);
    syncThemeUi();
  }

  function initTheme() {
    syncThemeUi();

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
      });
    }

    // Follow the system theme until the visitor picks one with the button.
    darkQuery.addEventListener('change', () => {
      if (!readStoredTheme()) setTheme(systemTheme(), false);
    });
  }

  /* ---------- Mobile menu ---------- */

  function initMenu() {
    const header = document.querySelector('.site-header');
    const button = document.getElementById('menu-toggle');
    const nav = document.getElementById('site-nav');
    if (!header || !button || !nav) return;

    const isOpen = () => header.classList.contains('nav-open');
    const setOpen = (open) => {
      header.classList.toggle('nav-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };

    button.addEventListener('click', () => setOpen(!isOpen()));

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('click', (event) => {
      if (isOpen() && !header.contains(event.target)) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        button.focus();
      }
    });

    window.matchMedia('(min-width: 1061px)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  /* ---------- Highlight the current section in the menu ---------- */

  function initActiveNav() {
    const links = Array.from(document.querySelectorAll('.site-nav a[href^="#"]'));
    const linkById = new Map(links.map((link) => [link.getAttribute('href').slice(1), link]));
    const hero = document.getElementById('top');
    const sections = [hero, ...links.map((link) => document.getElementById(link.getAttribute('href').slice(1)))]
      .filter(Boolean);
    if (!('IntersectionObserver' in window) || sections.length < 2) return;

    const setActive = (id) => {
      links.forEach((link) => {
        const active = link === linkById.get(id);
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };

    // The last section is short and may never reach the middle of the screen,
    // so at the very bottom of the page it always wins.
    const lastId = links[links.length - 1].getAttribute('href').slice(1);
    const isAtBottom = () =>
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    let currentId = null;
    const update = () => setActive(isAtBottom() ? lastId : currentId);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) currentId = entry.target.id;
      });
      update();
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach((section) => observer.observe(section));
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ---------- Network detective: packet animation ---------- */

  function initRoute() {
    const route = document.querySelector('.route');
    const button = document.getElementById('send-packet');
    const status = document.getElementById('route-status');
    if (!route || !button) return;

    const nodes = Array.from(route.querySelectorAll('.route-node'));
    const hops = nodes.length - 1;
    const STEP_MS = 450;
    let timers = [];

    const finish = () => {
      button.disabled = false;
      button.textContent = 'Send again';
      if (status) status.textContent = `Done: the packet reached inha.uz in ${hops} hops.`;
    };

    const run = () => {
      timers.forEach(clearTimeout);
      timers = [];
      nodes.forEach((node) => node.classList.remove('is-lit'));
      route.style.setProperty('--progress', '0');
      nodes[0].classList.add('is-lit');

      if (reducedMotion.matches) {
        nodes.forEach((node) => node.classList.add('is-lit'));
        route.style.setProperty('--progress', '1');
        finish();
        return;
      }

      button.disabled = true;
      if (status) status.textContent = 'Packet on its way…';

      for (let i = 1; i <= hops; i += 1) {
        // First the line grows to the next node, then that node lights up.
        timers.push(setTimeout(() => {
          route.style.setProperty('--progress', String(i / hops));
        }, i * STEP_MS - 350));
        timers.push(setTimeout(() => {
          nodes[i].classList.add('is-lit');
          if (i === hops) finish();
        }, i * STEP_MS));
      }
    };

    button.addEventListener('click', run);

    // Play once by itself when the route first scrolls into view.
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          run();
        }
      }, { threshold: 0.6 });
      observer.observe(route);
    }
  }

  /* ---------- Music player ---------- */

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const whole = Math.floor(seconds);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  };

  // Paints the filled part of a range slider (see .range in styles.css).
  const paintRange = (range) => {
    const min = Number(range.min) || 0;
    const max = Number(range.max) || 100;
    range.style.setProperty('--fill', `${((range.value - min) / (max - min)) * 100}%`);
  };

  function initPlayer() {
    const byId = (id) => document.getElementById(id);
    const list = byId('tracklist');
    const ui = {
      label: byId('player-label'),
      title: byId('player-title'),
      artist: byId('player-artist'),
      play: byId('player-play'),
      prev: byId('player-prev'),
      next: byId('player-next'),
      seek: byId('player-seek'),
      time: byId('player-time'),
      duration: byId('player-duration'),
      volumeBox: byId('volume'),
      volume: byId('volume-slider'),
      volumeValue: byId('volume-value'),
      mute: byId('mute-toggle'),
      chip: byId('now-playing'),
      chipText: byId('now-playing-text'),
    };
    if (!list || Object.values(ui).some((element) => !element)) return;

    // The playlist lives in the HTML: every <li class="track"> carries its own data.
    const tracks = Array.from(list.querySelectorAll('.track')).map((item) => ({
      item,
      button: item.querySelector('button'),
      src: item.dataset.src,
      title: item.dataset.title,
      artist: item.dataset.artist,
      duration: Number(item.dataset.duration) || 0,
    }));
    if (!tracks.length) return;

    const DEFAULT_VOLUME = 5; // % of each track's own loudness, on every visit
    const CHIP_IDLE_TEXT = ui.chipText.textContent;
    // Two audio elements: one plays, the spare one quietly buffers the next track,
    // so the Internet Archive's slow first response does not leave a gap between songs.
    let audio = new Audio();
    let spare = new Audio();
    audio.preload = 'auto';
    spare.preload = 'auto';

    let current = 0;
    let wantsToPlay = false;   // a play request is active (used to skip broken tracks)
    let pausedByUser = false;  // the visitor paused on purpose: never auto-start again
    let hasStarted = false;    // music has actually played at least once
    let isSeeking = false;
    let errorsInRow = 0;

    const track = () => tracks[current];
    const totalTime = () => (Number.isFinite(audio.duration) ? audio.duration : track().duration);

    function showTime() {
      ui.time.textContent = formatTime(audio.currentTime);
      ui.duration.textContent = formatTime(totalTime());
      if (!isSeeking) {
        const total = totalTime();
        ui.seek.value = String(total ? Math.round((audio.currentTime / total) * 1000) : 0);
        paintRange(ui.seek);
      }
    }

    function showState() {
      const playing = !audio.paused;
      const { title, artist } = track();
      root.classList.toggle('is-playing', playing);
      ui.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      ui.play.title = playing ? 'Pause' : 'Play';
      ui.chip.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
      ui.chipText.textContent = playing ? `${artist} — ${title}` : CHIP_IDLE_TEXT;
      if (playing) ui.label.textContent = audio.readyState >= 3 ? 'Now playing' : 'Loading…';
      else if (hasStarted) ui.label.textContent = 'Paused';
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }

    function showTrack() {
      const { title, artist } = track();
      ui.title.textContent = title;
      ui.artist.textContent = artist;
      tracks.forEach((entry, index) => {
        const isCurrent = index === current;
        entry.item.classList.toggle('is-current', isCurrent);
        if (isCurrent) entry.button.setAttribute('aria-current', 'true');
        else entry.button.removeAttribute('aria-current');
      });
      // Shows the track on the lock screen / system media controls.
      if ('mediaSession' in navigator && 'MediaMetadata' in window) {
        navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album: 'Vladimir’s breakcore playlist' });
      }
      showTime();
      showState();
    }

    function load(index) {
      current = (index + tracks.length) % tracks.length;
      const { src } = track();
      if (spare.getAttribute('src') === src && !spare.error) {
        // The spare player already buffered this track: swap the two players.
        audio.pause();
        [audio, spare] = [spare, audio];
        spare.removeAttribute('src');
        spare.load();
      } else {
        audio.src = src;
      }
      showTrack();
    }

    function preloadNext() {
      const { src } = tracks[(current + 1) % tracks.length];
      if (spare.getAttribute('src') !== src) spare.src = src;
    }

    function play() {
      wantsToPlay = true;
      pausedByUser = false;
      const attempt = audio.play();
      if (attempt) {
        attempt.catch((error) => {
          // NotAllowedError: the browser blocks sound until the visitor interacts with the page.
          if (error.name === 'NotAllowedError') wantsToPlay = false;
          showState();
        });
      }
    }

    function pause() {
      wantsToPlay = false;
      pausedByUser = true;
      audio.pause();
    }

    const toggle = () => (audio.paused ? play() : pause());

    function next() {
      load(current + 1);
      play();
    }

    function previous() {
      if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
      }
      load(current - 1);
      play();
    }

    function playTrack(index) {
      if (index === current) {
        toggle();
        return;
      }
      load(index);
      play();
    }

    // Audio events keep the UI in sync. Both players are listened to,
    // but only events from the one that is currently playing count.
    const onAudio = (type, handler) => [audio, spare].forEach((element) => {
      element.addEventListener(type, (event) => {
        if (event.target === audio) handler(event);
      });
    });

    onAudio('play', showState);
    onAudio('pause', showState);
    onAudio('waiting', showState);
    onAudio('canplay', showState);
    onAudio('playing', () => {
      hasStarted = true;
      errorsInRow = 0;
      stopWaitingForInteraction();
      showState();
      preloadNext();
    });
    onAudio('timeupdate', showTime);
    onAudio('loadedmetadata', showTime);
    onAudio('ended', next);
    onAudio('error', () => {
      errorsInRow += 1;
      ui.label.textContent = 'Track unavailable';
      // Skip a broken track, but give up after trying the whole list once.
      if (wantsToPlay && errorsInRow < tracks.length) setTimeout(next, 1200);
    });

    // Buttons
    ui.play.addEventListener('click', toggle);
    ui.chip.addEventListener('click', toggle);
    ui.next.addEventListener('click', next);
    ui.prev.addEventListener('click', previous);
    tracks.forEach((entry, index) => entry.button.addEventListener('click', () => playTrack(index)));

    // Seek bar
    const endSeek = () => { isSeeking = false; };
    ui.seek.addEventListener('pointerdown', () => { isSeeking = true; });
    ui.seek.addEventListener('pointerup', endSeek);
    ui.seek.addEventListener('pointercancel', endSeek);
    ui.seek.addEventListener('input', () => {
      paintRange(ui.seek);
      ui.time.textContent = formatTime((ui.seek.value / 1000) * totalTime());
    });
    ui.seek.addEventListener('change', () => {
      endSeek();
      if (Number.isFinite(audio.duration)) audio.currentTime = (ui.seek.value / 1000) * audio.duration;
      else showTime();
    });

    // Volume: starts at 5% every time, the slider in the header changes it.
    function showMuted() {
      ui.volumeBox.classList.toggle('is-muted', audio.muted || Number(ui.volume.value) === 0);
      const label = audio.muted ? 'Unmute' : 'Mute';
      ui.mute.setAttribute('aria-label', label);
      ui.mute.title = label;
    }

    function applyVolume() {
      const value = Number(ui.volume.value);
      [audio, spare].forEach((element) => { element.volume = value / 100; });
      ui.volumeValue.textContent = `${value}%`;
      ui.volume.setAttribute('aria-valuetext', `${value}%`);
      paintRange(ui.volume);
      showMuted();
    }

    ui.volume.value = String(DEFAULT_VOLUME);
    applyVolume();
    // iOS leaves volume to the hardware buttons and ignores audio.volume.
    if (Math.abs(audio.volume - DEFAULT_VOLUME / 100) > 0.01) ui.volumeBox.classList.add('is-fixed');

    const setMuted = (muted) => [audio, spare].forEach((element) => { element.muted = muted; });

    ui.volume.addEventListener('input', () => {
      setMuted(false);
      applyVolume();
    });

    ui.mute.addEventListener('click', () => {
      if (Number(ui.volume.value) === 0) {
        ui.volume.value = String(DEFAULT_VOLUME);
        setMuted(false);
        applyVolume();
        return;
      }
      setMuted(!audio.muted);
      showMuted();
    });

    // System media keys and lock-screen controls
    if ('mediaSession' in navigator) {
      const actions = { play, pause, previoustrack: previous, nexttrack: next };
      Object.entries(actions).forEach(([action, handler]) => {
        try {
          navigator.mediaSession.setActionHandler(action, handler);
        } catch (error) {
          /* this browser does not support that action */
        }
      });
    }

    // Browsers block sound until the visitor interacts with the page, so the music
    // starts on the first click or key press anywhere (unless it was paused on purpose).
    const START_EVENTS = ['click', 'keydown'];

    function startOnInteraction(event) {
      if (hasStarted || pausedByUser) {
        stopWaitingForInteraction();
        return;
      }
      // Player buttons start and stop the music themselves.
      if (event.target.closest && event.target.closest('[data-player-control]')) return;
      if (audio.paused) play();
    }

    function stopWaitingForInteraction() {
      START_EVENTS.forEach((type) => document.removeEventListener(type, startOnInteraction, true));
    }

    START_EVENTS.forEach((type) => document.addEventListener(type, startOnInteraction, true));

    load(0);
    play(); // plays right away if the browser allows autoplay
  }

  /* ---------- Footer year ---------- */

  function initYear() {
    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMenu();
    initActiveNav();
    initRoute();
    initPlayer();
    initYear();
  });
})();

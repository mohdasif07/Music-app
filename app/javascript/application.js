/*
 * Rails 4–style demo:
 * - SoftNav swaps only #page-content (back button keeps #global-player + <audio> alive)
 * - No Stimulus, no Turbo
 * - Copy this file into Sprockets app/assets/javascripts for Rails 4
 */

(function (window, document) {
  "use strict"

  var TRACKS = {
    drift: {
      id: "drift",
      title: "Evening Drift",
      artist: "Session One",
      src: "/audio/background.mp3",
      art: "/cover.svg",
      durationLabel: "—:—"
    },
    night: {
      id: "night",
      title: "Night Wire",
      artist: "Session One",
      src: "/audio/background.mp3",
      art: "/cover.svg",
      durationLabel: "—:—"
    },
    dawn: {
      id: "dawn",
      title: "Dawn Static",
      artist: "Session Two",
      src: "/audio/background.mp3",
      art: "/cover.svg",
      durationLabel: "—:—"
    }
  }

  var ALBUMS = {
    "session-one": {
      id: "session-one",
      title: "Session One",
      artist: "Music App",
      art: "/cover.svg",
      trackIds: ["drift", "night"]
    },
    "session-two": {
      id: "session-two",
      title: "Session Two",
      artist: "Music App",
      art: "/cover.svg",
      trackIds: ["dawn"]
    }
  }

  var PLAYLISTS = {
    "late-night": {
      id: "late-night",
      title: "Late Night Mix",
      art: "/cover.svg",
      trackIds: ["night", "dawn", "drift"]
    }
  }

  var REPEAT = { OFF: "off", ONE: "one", ALL: "all" }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00"
    var mins = Math.floor(seconds / 60)
    var secs = Math.floor(seconds % 60)
    return mins + ":" + String(secs).padStart(2, "0")
  }

  function tracksFromIds(ids) {
    return ids.map(function (id) {
      return TRACKS[id]
    }).filter(Boolean)
  }

  // --- Hash SPA router (Android-safe).
  // Links use /#/albums/... so Back only changes the hash — document + <audio> never unload.
  var SoftNav = {
    init: function () {
      if (document.documentElement.dataset.softNav === "true") return
      document.documentElement.dataset.softNav = "true"

      document.addEventListener("click", SoftNav.onClick, true)
      // hashchange only — Android system Back is handled by AndroidBackGuard (popstate).
      window.addEventListener("hashchange", SoftNav.onHashChange)

      SoftNav.normalizeToHash()
    },

    // Convert /albums/x → /#/albums/x without leaving the page when already on SPA shell.
    normalizeToHash: function () {
      var path = window.location.pathname.replace(/\/$/, "") || "/"
      var album = path.match(/^\/albums\/([^\/]+)$/)
      var playlist = path.match(/^\/playlists\/([^\/]+)$/)
      var targetHash = null

      if (album) targetHash = "#/albums/" + album[1]
      else if (playlist) targetHash = "#/playlists/" + playlist[1]
      else if (path === "/" && !window.location.hash) targetHash = "#/"

      if (targetHash && window.location.hash !== targetHash) {
        if (path !== "/") {
          // Hard path URL: replace with hash on root (one navigation max via redirect controllers).
          window.location.replace("/" + targetHash)
          return
        }
        history.replaceState({ softNav: true }, "", "/" + targetHash)
      } else if (!window.location.hash) {
        history.replaceState({ softNav: true }, "", "/#/")
      }
    },

    currentRoute: function () {
      var hash = window.location.hash || "#/"
      // Support "#/albums/x" and "#albums/x"
      var route = hash.replace(/^#/, "")
      if (route.charAt(0) !== "/") route = "/" + route
      return route
    },

    onClick: function (event) {
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      var link = event.target.closest && event.target.closest("a[href]")
      if (!link) return
      if (link.target && link.target !== "_self") return
      if (link.hasAttribute("download")) return
      if (link.getAttribute("data-soft-nav") === "false") return

      var href = link.getAttribute("href")
      if (!href) return

      var route = SoftNav.hrefToRoute(href)
      if (!route) return

      event.preventDefault()
      event.stopPropagation()
      SoftNav.visit(route, { push: true })
    },

    hrefToRoute: function (href) {
      // "#/albums/x", "/#/albums/x", "/albums/x"
      if (href.charAt(0) === "#") {
        var r = href.replace(/^#/, "")
        if (r.charAt(0) !== "/") r = "/" + r
        return SoftNav.isAppRoute(r) ? r : null
      }

      try {
        var url = new URL(href, window.location.origin)
        if (url.origin !== window.location.origin) return null
        if (url.hash && url.hash.length > 1) {
          var hr = url.hash.replace(/^#/, "")
          if (hr.charAt(0) !== "/") hr = "/" + hr
          if (SoftNav.isAppRoute(hr)) return hr
        }
        var path = url.pathname.replace(/\/$/, "") || "/"
        if (SoftNav.isAppRoute(path)) return path
      } catch (e) {}
      return null
    },

    isAppRoute: function (route) {
      if (route === "/" || route === "") return true
      if (/^\/albums\/[^\/]+$/.test(route)) return true
      if (/^\/playlists\/[^\/]+$/.test(route)) return true
      return false
    },

    onHashChange: function () {
      SoftNav.render(SoftNav.currentRoute())
    },

    visit: function (route, options) {
      var push = !options || options.push !== false
      if (!SoftNav.isAppRoute(route)) return
      if (route === "") route = "/"

      var nextHash = "#/" + (route === "/" ? "" : route.replace(/^\//, ""))
      // Normalize: "#/" for home, "#/albums/x" for album
      if (route === "/") nextHash = "#/"
      else nextHash = "#" + route

      if (push) {
        if (window.location.hash !== nextHash) {
          // Hash assignment pushes history — Android Back pops hash only (no document unload).
          window.location.hash = nextHash
        } else {
          SoftNav.render(route)
        }
      } else {
        SoftNav.render(route)
      }
    },

    render: function (route) {
      var mount = document.getElementById("page-content")
      if (!mount) return
      route = route || SoftNav.currentRoute()

      var albumMatch = route.match(/^\/albums\/([^\/]+)$/)
      var playlistMatch = route.match(/^\/playlists\/([^\/]+)$/)

      if (albumMatch) {
        mount.innerHTML = Pages.albumShell(albumMatch[1])
        document.title = "Album — Music App"
      } else if (playlistMatch) {
        mount.innerHTML = Pages.playlistShell(playlistMatch[1])
        document.title = "Playlist — Music App"
      } else {
        mount.innerHTML = Pages.catalogShell()
        document.title = "Music App — Library"
      }

      Pages.renderActive()
      document.documentElement.dataset.route = route
    }
  }

  // --- Android system Back (<) guard ---
  // Pure web: jab app Activity band hoti hai audio KHATAM. Isliye music chal rahi ho to
  // Back se exit mat karo — user ko Home (○) se bahar bhejo (background = music chalti rahe).
  var AndroidBackGuard = {
    armed: false,
    exitArmed: false,
    toastTimer: null,

    isPlaying: function () {
      return !!(AudioPlayer.ready && AudioPlayer.audio && !AudioPlayer.audio.paused)
    },

    seed: function () {
      try {
        history.pushState({ musicGuard: true }, "", window.location.href)
        AndroidBackGuard.armed = true
      } catch (e) {}
    },

    toast: function (message) {
      var el = document.getElementById("app-toast")
      if (!el) {
        el = document.createElement("div")
        el.id = "app-toast"
        el.className = "app-toast"
        el.setAttribute("role", "status")
        document.body.appendChild(el)
      }
      el.textContent = message
      el.classList.add("is-visible")
      clearTimeout(AndroidBackGuard.toastTimer)
      AndroidBackGuard.toastTimer = setTimeout(function () {
        el.classList.remove("is-visible")
      }, 3200)
    },

    goHomeKeepAudio: function () {
      history.replaceState({ musicGuard: true }, "", "/#/")
      SoftNav.render("/")
      AndroidBackGuard.seed()
    },

    onPopState: function () {
      var playing = AndroidBackGuard.isPlaying()
      var route = SoftNav.currentRoute()
      var atHome = route === "/" || route === ""

      // Album/playlist pe Back → Library (music continue)
      if (!atHome) {
        AndroidBackGuard.goHomeKeepAudio()
        if (playing) {
          AndroidBackGuard.toast("Library — music chal rahi hai. Bahar: ○ Home")
        }
        return
      }

      // Library + music playing → app band mat hone do
      if (playing) {
        AndroidBackGuard.seed()
        AndroidBackGuard.toast("Music chal rahi hai — bahar jane ke liye ○ Home dabao")
        return
      }

      // Library + paused → double Back se exit
      if (AndroidBackGuard.exitArmed) {
        AndroidBackGuard.exitArmed = false
        history.back()
        return
      }

      AndroidBackGuard.exitArmed = true
      AndroidBackGuard.seed()
      AndroidBackGuard.toast("Exit: phir se Back dabao")
      setTimeout(function () {
        AndroidBackGuard.exitArmed = false
      }, 2000)
    },

    init: function () {
      if (document.documentElement.dataset.backGuard === "true") return
      document.documentElement.dataset.backGuard = "true"
      AndroidBackGuard.seed()
      window.addEventListener("popstate", AndroidBackGuard.onPopState)

      // Jab play start ho, guard dubara seed karo taaki Back hamesha catch ho.
      document.addEventListener("play", function (event) {
        if (event.target && event.target.id === "audio") AndroidBackGuard.seed()
      }, true)
    }
  }

  // --- Audio player (lives only on #global-player nodes) ---
  var AudioPlayer = {
    queue: [],
    index: 0,
    shuffle: false,
    repeat: REPEAT.ALL,
    seeking: false,
    lastVolume: 0.85,
    speed: 1,
    ready: false,
    storageKey: "music-app-player-v1",

    init: function () {
      if (this.ready) return
      var root = document.getElementById("global-player")
      var audio = document.getElementById("audio")
      if (!root || !audio) return

      this.root = root
      this.audio = audio
      this.els = {
        title: document.getElementById("track-title"),
        artist: document.getElementById("track-artist"),
        art: document.getElementById("track-art"),
        seek: document.getElementById("seek"),
        currentTime: document.getElementById("current-time"),
        duration: document.getElementById("duration"),
        play: document.getElementById("btn-play"),
        prev: document.getElementById("btn-prev"),
        next: document.getElementById("btn-next"),
        shuffle: document.getElementById("btn-shuffle"),
        repeat: document.getElementById("btn-repeat"),
        mute: document.getElementById("btn-mute"),
        volume: document.getElementById("volume"),
        speedOptions: document.getElementById("speed-options"),
        repeatBadge: document.querySelector("#btn-repeat .repeat-badge")
      }

      this.bind()
      this.audio.volume = Number(this.els.volume.value) / 100
      this.setFill(this.els.volume)
      this.setSpeed(1)
      this.updateRepeatUi()
      this.ready = true
      root.classList.add("is-ready")

      // Resume after hard refresh / failed SoftNav fallback.
      this.restoreState()
    },

    saveState: function () {
      if (!this.ready || !this.queue.length) return
      try {
        var track = this.currentTrack()
        sessionStorage.setItem(this.storageKey, JSON.stringify({
          queueIds: this.queue.map(function (t) { return t.id }),
          index: this.index,
          currentTime: this.audio ? this.audio.currentTime : 0,
          playing: this.audio ? !this.audio.paused : false,
          speed: this.speed,
          volume: this.audio ? this.audio.volume : this.lastVolume,
          shuffle: this.shuffle,
          repeat: this.repeat,
          trackId: track && track.id
        }))
      } catch (e) {}
    },

    restoreState: function () {
      var self = this
      var raw
      try {
        raw = sessionStorage.getItem(this.storageKey)
      } catch (e) {
        return
      }
      if (!raw) return

      var data
      try {
        data = JSON.parse(raw)
      } catch (e) {
        return
      }
      if (!data || !data.queueIds || !data.queueIds.length) return

      var tracks = tracksFromIds(data.queueIds)
      if (!tracks.length) return

      this.queue = tracks
      this.shuffle = !!data.shuffle
      this.repeat = data.repeat || REPEAT.ALL
      this.updateRepeatUi()
      if (this.els.shuffle) {
        this.els.shuffle.setAttribute("aria-pressed", this.shuffle ? "true" : "false")
      }
      if (typeof data.volume === "number") {
        this.audio.volume = data.volume
        this.els.volume.value = String(Math.round(data.volume * 100))
        this.setFill(this.els.volume)
      }
      if (data.speed) this.setSpeed(Number(data.speed))

      this.loadTrack(data.index || 0, { autoplay: false })

      var resumeAt = Number(data.currentTime) || 0
      var shouldPlay = !!data.playing

      var onReady = function () {
        self.audio.removeEventListener("loadedmetadata", onReady)
        if (resumeAt > 0 && isFinite(self.audio.duration)) {
          self.audio.currentTime = Math.min(resumeAt, self.audio.duration - 0.25)
        }
        if (shouldPlay) {
          self.play()
        }
      }

      if (this.audio.readyState >= 1) onReady()
      else this.audio.addEventListener("loadedmetadata", onReady)
    },

    bind: function () {
      var self = this
      var audio = this.audio
      var els = this.els

      els.play.addEventListener("click", function () { self.togglePlay() })
      els.next.addEventListener("click", function () { self.next() })
      els.prev.addEventListener("click", function () { self.prev() })

      els.shuffle.addEventListener("click", function () {
        self.shuffle = !self.shuffle
        els.shuffle.setAttribute("aria-pressed", self.shuffle ? "true" : "false")
      })

      els.repeat.addEventListener("click", function () {
        var order = [REPEAT.OFF, REPEAT.ALL, REPEAT.ONE]
        self.repeat = order[(order.indexOf(self.repeat) + 1) % order.length]
        self.updateRepeatUi()
      })

      els.mute.addEventListener("click", function () {
        if (audio.volume > 0 && !audio.muted) {
          self.lastVolume = audio.volume
          audio.muted = true
          els.volume.value = "0"
        } else {
          audio.muted = false
          audio.volume = self.lastVolume || 0.85
          els.volume.value = String(Math.round(audio.volume * 100))
        }
        els.mute.setAttribute("aria-pressed", audio.muted || audio.volume === 0 ? "true" : "false")
        self.setFill(els.volume)
      })

      els.volume.addEventListener("input", function () {
        var value = Number(els.volume.value) / 100
        audio.volume = value
        audio.muted = value === 0
        if (value > 0) self.lastVolume = value
        els.mute.setAttribute("aria-pressed", audio.muted ? "true" : "false")
        self.setFill(els.volume)
      })

      els.speedOptions.addEventListener("click", function (event) {
        var button = event.target.closest("[data-speed]")
        if (!button) return
        self.setSpeed(Number(button.getAttribute("data-speed")))
      })

      els.seek.addEventListener("pointerdown", function () { self.seeking = true })
      els.seek.addEventListener("pointerup", function () { self.seeking = false })
      els.seek.addEventListener("input", function () {
        self.setFill(els.seek)
        if (!isFinite(audio.duration)) return
        var time = (Number(els.seek.value) / 1000) * audio.duration
        els.currentTime.textContent = formatTime(time)
      })
      els.seek.addEventListener("change", function () {
        if (!isFinite(audio.duration)) return
        audio.currentTime = (Number(els.seek.value) / 1000) * audio.duration
        self.seeking = false
      })

      audio.addEventListener("timeupdate", function () {
        self.syncProgress()
        // Throttled-ish persist for hard-navigation recovery.
        if (!self._saveTimer) {
          self._saveTimer = setTimeout(function () {
            self._saveTimer = null
            self.saveState()
          }, 1000)
        }
      })
      audio.addEventListener("ended", function () { self.onEnded() })
      audio.addEventListener("play", function () {
        self.updatePlayUi(true)
        self.saveState()
      })
      audio.addEventListener("pause", function () {
        self.updatePlayUi(false)
        self.saveState()
      })
      audio.addEventListener("loadedmetadata", function () {
        var label = formatTime(audio.duration)
        els.duration.textContent = label
        var track = self.currentTrack()
        if (track) track.durationLabel = label
        self.renderPageLists()
      })

      document.addEventListener("keydown", function (event) {
        if (event.target.matches("input, textarea, button, a")) return
        if (event.code === "Space") {
          event.preventDefault()
          self.togglePlay()
        } else if (event.code === "ArrowRight") {
          audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5)
        } else if (event.code === "ArrowLeft") {
          audio.currentTime = Math.max(0, audio.currentTime - 5)
        }
      })
    },

    currentTrack: function () {
      return this.queue[this.index] || null
    },

    setFill: function (input) {
      var min = Number(input.min) || 0
      var max = Number(input.max) || 100
      var value = Number(input.value) || 0
      var percent = ((value - min) / (max - min)) * 100
      input.style.setProperty("--fill", percent + "%")
    },

    updatePlayUi: function (playing) {
      this.root.classList.toggle("is-playing", playing)
      this.els.play.setAttribute("aria-pressed", playing ? "true" : "false")
      this.els.play.setAttribute("aria-label", playing ? "Pause" : "Play")
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = playing ? "playing" : "paused"
      }
      this.renderPageLists()
    },

    updateRepeatUi: function () {
      var mode = this.repeat
      this.els.repeat.setAttribute("data-mode", mode)
      this.els.repeat.setAttribute("aria-pressed", mode === REPEAT.OFF ? "false" : "true")
      this.els.repeat.setAttribute(
        "aria-label",
        mode === REPEAT.ONE ? "Repeat one" : mode === REPEAT.ALL ? "Repeat all" : "Repeat off"
      )
      if (this.els.repeatBadge) this.els.repeatBadge.hidden = mode !== REPEAT.ONE
    },

    setSpeed: function (rate) {
      this.speed = rate
      this.audio.playbackRate = rate
      var buttons = this.els.speedOptions.querySelectorAll(".speed-btn")
      Array.prototype.forEach.call(buttons, function (button) {
        var active = Number(button.getAttribute("data-speed")) === rate
        button.classList.toggle("is-active", active)
        button.setAttribute("aria-pressed", active ? "true" : "false")
      })
    },

    setupMediaSession: function (track) {
      if (!("mediaSession" in navigator) || !track) return
      var self = this

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: "Music App",
        artwork: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }]
      })

      navigator.mediaSession.setActionHandler("play", function () { self.play() })
      navigator.mediaSession.setActionHandler("pause", function () { self.pause() })
      navigator.mediaSession.setActionHandler("previoustrack", function () { self.prev() })
      navigator.mediaSession.setActionHandler("nexttrack", function () { self.next() })
      navigator.mediaSession.setActionHandler("seekto", function (details) {
        if (details.seekTime == null) return
        self.audio.currentTime = details.seekTime
      })
    },

    playQueue: function (tracks, startIndex) {
      if (!tracks || !tracks.length) return
      this.queue = tracks.slice()
      this.loadTrack(startIndex || 0, { autoplay: true })
    },

    loadTrack: function (index, options) {
      options = options || {}
      if (!this.queue.length) return

      this.index = ((index % this.queue.length) + this.queue.length) % this.queue.length
      var track = this.currentTrack()
      var els = this.els
      var audio = this.audio

      els.title.textContent = track.title
      els.artist.textContent = track.artist
      els.art.src = track.art
      audio.src = track.src
      audio.load()
      audio.playbackRate = this.speed

      els.seek.value = "0"
      this.setFill(els.seek)
      els.currentTime.textContent = "0:00"
      els.duration.textContent = track.durationLabel || "0:00"

      this.setupMediaSession(track)
      this.renderPageLists()

      if (options.autoplay) this.play()
    },

    play: function () {
      var self = this
      return this.audio.play().then(function () {
        self.updatePlayUi(true)
      }).catch(function (error) {
        console.error("Audio playback failed:", error)
        self.updatePlayUi(false)
      })
    },

    pause: function () {
      this.audio.pause()
      this.updatePlayUi(false)
    },

    togglePlay: function () {
      if (this.audio.paused) {
        if (!this.queue.length) {
          this.playQueue(tracksFromIds(["drift"]), 0)
          return
        }
        this.play()
      } else {
        this.pause()
      }
    },

    next: function () {
      if (!this.queue.length) return
      if (this.shuffle && this.queue.length > 1) {
        var nextIndex = this.index
        while (nextIndex === this.index) {
          nextIndex = Math.floor(Math.random() * this.queue.length)
        }
        this.loadTrack(nextIndex, { autoplay: true })
        return
      }
      this.loadTrack(this.index + 1, { autoplay: true })
    },

    prev: function () {
      if (!this.queue.length) return
      if (this.audio.currentTime > 3) {
        this.audio.currentTime = 0
        return
      }
      this.loadTrack(this.index - 1, { autoplay: !this.audio.paused })
    },

    onEnded: function () {
      if (this.repeat === REPEAT.ONE) {
        this.audio.currentTime = 0
        this.play()
        return
      }
      if (this.repeat === REPEAT.OFF && this.index === this.queue.length - 1 && !this.shuffle) {
        this.updatePlayUi(false)
        return
      }
      this.next()
    },

    syncProgress: function () {
      var audio = this.audio
      if (this.seeking || !isFinite(audio.duration)) return
      var ratio = audio.currentTime / audio.duration
      this.els.seek.value = String(Math.round(ratio * 1000))
      this.setFill(this.els.seek)
      this.els.currentTime.textContent = formatTime(audio.currentTime)

      if ("mediaSession" in navigator && navigator.mediaSession.setPositionState) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate,
            position: Math.min(audio.currentTime, audio.duration)
          })
        } catch (e) {}
      }
    },

    renderPageLists: function () {
      Pages.renderActive()
    }
  }

  // --- Page renderers (client-side shells — SoftNav never fetches HTML) ---
  var Pages = {
    catalogShell: function () {
      return (
        '<section class="catalog" data-page="catalog">' +
          '<header class="catalog__header">' +
            '<p class="catalog__brand">Music App</p>' +
            "<h1>Library</h1>" +
            '<p class="catalog__hint">Music play karke bahar jao to ○ <b>Home</b> use karo. Android <b>Back</b> app band karta hai — tab music rukti hai.</p>' +
          "</header>" +
          '<div class="catalog__block"><h2>Albums</h2><div class="catalog__grid" id="albums-grid"></div></div>' +
          '<div class="catalog__block"><h2>Playlists</h2><div class="catalog__grid" id="playlists-grid"></div></div>' +
        "</section>"
      )
    },

    albumShell: function (id) {
      return (
        '<section class="detail" data-page="album" data-id="' + id + '">' +
          '<a class="detail__back" href="#/">← Library</a>' +
          '<div id="album-detail"></div>' +
        "</section>"
      )
    },

    playlistShell: function (id) {
      return (
        '<section class="detail" data-page="playlist" data-id="' + id + '">' +
          '<a class="detail__back" href="#/">← Library</a>' +
          '<div id="playlist-detail"></div>' +
        "</section>"
      )
    },

    renderActive: function () {
      var page = document.querySelector("#page-content [data-page]")
      if (!page) return
      var type = page.getAttribute("data-page")
      if (type === "catalog") this.renderCatalog()
      if (type === "album") this.renderAlbum(page.getAttribute("data-id"))
      if (type === "playlist") this.renderPlaylist(page.getAttribute("data-id"))
    },

    renderCatalog: function () {
      var albumsGrid = document.getElementById("albums-grid")
      var playlistsGrid = document.getElementById("playlists-grid")
      if (!albumsGrid || !playlistsGrid) return

      albumsGrid.innerHTML = Object.keys(ALBUMS).map(function (id) {
        var album = ALBUMS[id]
        return (
          '<a class="card" href="#/albums/' + album.id + '">' +
            '<img src="' + album.art + '" alt="" width="160" height="160">' +
            "<div>" +
              "<p class=\"card__title\">" + album.title + "</p>" +
              "<p class=\"card__sub\">" + album.artist + " · " + album.trackIds.length + " tracks</p>" +
            "</div>" +
          "</a>"
        )
      }).join("")

      playlistsGrid.innerHTML = Object.keys(PLAYLISTS).map(function (id) {
        var playlist = PLAYLISTS[id]
        return (
          '<a class="card" href="#/playlists/' + playlist.id + '">' +
            '<img src="' + playlist.art + '" alt="" width="160" height="160">' +
            "<div>" +
              "<p class=\"card__title\">" + playlist.title + "</p>" +
              "<p class=\"card__sub\">" + playlist.trackIds.length + " tracks</p>" +
            "</div>" +
          "</a>"
        )
      }).join("")
    },

    renderAlbum: function (id) {
      var mount = document.getElementById("album-detail")
      var album = ALBUMS[id]
      if (!mount || !album) {
        if (mount) mount.innerHTML = "<p>Album not found.</p>"
        return
      }

      var tracks = tracksFromIds(album.trackIds)
      mount.innerHTML =
        '<div class="detail__hero">' +
          '<img src="' + album.art + '" alt="" width="180" height="180">' +
          "<div>" +
            "<p class=\"detail__eyebrow\">Album</p>" +
            "<h1>" + album.title + "</h1>" +
            "<p class=\"detail__sub\">" + album.artist + "</p>" +
            '<button type="button" class="btn-primary" data-play-collection="album" data-id="' + album.id + '">Play album</button>' +
          "</div>" +
        "</div>" +
        '<ul class="track-list">' + tracks.map(function (track, index) {
          var active = AudioPlayer.currentTrack() && AudioPlayer.currentTrack().id === track.id
          return (
            "<li>" +
              '<button type="button" class="track-row' + (active ? " is-active" : "") + '" data-play-index="' + index + '" data-collection="album" data-id="' + album.id + '">' +
                "<span>" + (index + 1) + "</span>" +
                "<span>" +
                  "<p class=\"track-row__title\">" + track.title + "</p>" +
                  "<p class=\"track-row__artist\">" + track.artist + "</p>" +
                "</span>" +
                "<span>" + (track.durationLabel || "") + "</span>" +
              "</button>" +
            "</li>"
          )
        }).join("") + "</ul>"
    },

    renderPlaylist: function (id) {
      var mount = document.getElementById("playlist-detail")
      var playlist = PLAYLISTS[id]
      if (!mount || !playlist) {
        if (mount) mount.innerHTML = "<p>Playlist not found.</p>"
        return
      }

      var tracks = tracksFromIds(playlist.trackIds)
      mount.innerHTML =
        '<div class="detail__hero">' +
          '<img src="' + playlist.art + '" alt="" width="180" height="180">' +
          "<div>" +
            "<p class=\"detail__eyebrow\">Playlist</p>" +
            "<h1>" + playlist.title + "</h1>" +
            "<p class=\"detail__sub\">" + tracks.length + " tracks</p>" +
            '<button type="button" class="btn-primary" data-play-collection="playlist" data-id="' + playlist.id + '">Play playlist</button>' +
          "</div>" +
        "</div>" +
        '<ul class="track-list">' + tracks.map(function (track, index) {
          var active = AudioPlayer.currentTrack() && AudioPlayer.currentTrack().id === track.id
          return (
            "<li>" +
              '<button type="button" class="track-row' + (active ? " is-active" : "") + '" data-play-index="' + index + '" data-collection="playlist" data-id="' + playlist.id + '">' +
                "<span>" + (index + 1) + "</span>" +
                "<span>" +
                  "<p class=\"track-row__title\">" + track.title + "</p>" +
                  "<p class=\"track-row__artist\">" + track.artist + "</p>" +
                "</span>" +
                "<span>" + (track.durationLabel || "") + "</span>" +
              "</button>" +
            "</li>"
          )
        }).join("") + "</ul>"
    }
  }

  function collectionTracks(type, id) {
    if (type === "album" && ALBUMS[id]) return tracksFromIds(ALBUMS[id].trackIds)
    if (type === "playlist" && PLAYLISTS[id]) return tracksFromIds(PLAYLISTS[id].trackIds)
    return []
  }

  function bindPageActions() {
    document.addEventListener("click", function (event) {
      var playAll = event.target.closest("[data-play-collection]")
      if (playAll) {
        var type = playAll.getAttribute("data-play-collection")
        var id = playAll.getAttribute("data-id")
        AudioPlayer.playQueue(collectionTracks(type, id), 0)
        return
      }

      var row = event.target.closest("[data-play-index]")
      if (row) {
        var ctype = row.getAttribute("data-collection")
        var cid = row.getAttribute("data-id")
        var index = Number(row.getAttribute("data-play-index"))
        AudioPlayer.playQueue(collectionTracks(ctype, cid), index)
      }
    })
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return

    // Drop old SWs that cached HTML navigations (they caused full reloads / stale JS).
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      return Promise.all(regs.map(function (reg) { return reg.unregister() }))
    }).then(function () {
      return navigator.serviceWorker.register("/service-worker")
    }).catch(function (error) {
      console.error("Service worker registration failed:", error)
    })
  }

  function boot() {
    if (document.documentElement.dataset.appBooted === "true") return
    document.documentElement.dataset.appBooted = "true"

    SoftNav.init()
    AudioPlayer.init()
    AndroidBackGuard.init()
    setupInstallPrompt()
    registerServiceWorker()
    bindPageActions()

    // Sync UI to current hash route — never remount <audio>.
    SoftNav.render(SoftNav.currentRoute())
  }

  function setupInstallPrompt() {
    var installButton = document.getElementById("install-app")
    if (!installButton || installButton.dataset.bound === "true") return
    installButton.dataset.bound = "true"

    var deferredPrompt = null
    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault()
      deferredPrompt = event
      installButton.hidden = false
    })

    installButton.addEventListener("click", function () {
      if (!deferredPrompt) return
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then(function () {
        deferredPrompt = null
        installButton.hidden = true
      })
    })
  }

  function scheduleBoot() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot)
    } else {
      boot()
    }
  }

  scheduleBoot()

  // bfcache restore (browser back from other sites / minimized tab restore)
  window.addEventListener("pageshow", function (event) {
    if (!AudioPlayer.ready) return
    if (event.persisted && AudioPlayer.audio && AudioPlayer.audio.paused) {
      var raw
      try { raw = sessionStorage.getItem(AudioPlayer.storageKey) } catch (e) {}
      if (raw) {
        try {
          var data = JSON.parse(raw)
          if (data && data.playing) AudioPlayer.play()
        } catch (e) {}
      }
    }
  })

  window.addEventListener("pagehide", function () {
    if (AudioPlayer.saveState) AudioPlayer.saveState()
  })

  window.AudioPlayer = AudioPlayer
  window.SoftNav = SoftNav
  window.AndroidBackGuard = AndroidBackGuard
})(window, document)

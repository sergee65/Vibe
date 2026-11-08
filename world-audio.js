(function () {
  'use strict';

  var AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) {
    window.WorldAudio = null;
    return;
  }

  var CONFIG = {
    aquarium: {
      tempo: 52,
      chords: [
        [50, 57, 62, 65],
        [46, 53, 58, 62],
        [43, 50, 55, 58],
        [48, 55, 60, 64]
      ],
      melody: [74, 77, 81, 79, 77, 74, 72, 69],
      wave: 'sine',
      pluckWave: 'sine',
      melodyStep: 0.55,
      melodyLength: 1.8,
      melodyVolume: 0.032,
      padVolume: 0.014,
      noiseFreq: 430,
      noiseGain: 0.026,
      noiseType: 'lowpass'
    },
    room: {
      tempo: 64,
      chords: [
        [48, 52, 55, 59],
        [45, 48, 52, 55],
        [41, 45, 48, 52],
        [43, 47, 50, 53]
      ],
      melody: [72, 76, 79, 76, 74, 71, 72, 76],
      wave: 'triangle',
      pluckWave: 'triangle',
      melodyStep: 0.6,
      melodyLength: 1.05,
      melodyVolume: 0.022,
      padVolume: 0.011,
      noiseFreq: 280,
      noiseGain: 0.014,
      noiseType: 'lowpass'
    },
    playroom: {
      tempo: 96,
      chords: [
        [48, 52, 55],
        [55, 59, 62],
        [45, 48, 52],
        [53, 57, 60]
      ],
      melody: [72, 74, 76, 79, 76, 74, 72, 67],
      wave: 'sine',
      pluckWave: 'triangle',
      melodyStep: 0.34,
      melodyLength: 0.5,
      melodyVolume: 0.018,
      padVolume: 0.008,
      noiseFreq: 700,
      noiseGain: 0.009,
      noiseType: 'lowpass'
    }
  };

  function midiToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  function WorldAudio(world) {
    this.world = world;
    this.config = CONFIG[world] || CONFIG.room;
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.delay = null;
    this.feedback = null;
    this.wet = null;
    this.noiseGain = null;
    this.noiseFilter = null;
    this.noiseSource = null;
    this.enabled = false;
    this.timer = 0;
    this.chordIndex = 0;
    this.nextChord = 0;
    this.button = null;
    this.suspendTimer = 0;
  }

  WorldAudio.prototype.init = function () {
    if (this.ctx) return true;

    try {
      this.ctx = new AudioCtor();

      var compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -22;
      compressor.knee.value = 24;
      compressor.ratio.value = 5;
      compressor.attack.value = 0.01;
      compressor.release.value = 0.3;
      compressor.connect(this.ctx.destination);

      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(compressor);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 1;
      this.musicGain.connect(this.master);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.72;
      this.sfxGain.connect(this.master);

      this.delay = this.ctx.createDelay(1);
      this.delay.delayTime.value = 0.31;
      this.feedback = this.ctx.createGain();
      this.feedback.gain.value = 0.16;
      this.wet = this.ctx.createGain();
      this.wet.gain.value = 0.13;
      this.musicGain.connect(this.delay);
      this.delay.connect(this.feedback);
      this.feedback.connect(this.delay);
      this.delay.connect(this.wet);
      this.wet.connect(this.master);

      var buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 2), this.ctx.sampleRate);
      var data = buffer.getChannelData(0);
      var last = 0;
      for (var i = 0; i < data.length; i++) {
        var white = Math.random() * 2 - 1;
        last = (last + white * 0.02) / 1.02;
        data[i] = last * 2.1;
      }

      this.noiseFilter = this.ctx.createBiquadFilter();
      this.noiseFilter.type = this.config.noiseType;
      this.noiseFilter.frequency.value = this.config.noiseFreq;
      this.noiseFilter.Q.value = 0.35;
      this.noiseGain = this.ctx.createGain();
      this.noiseGain.gain.value = this.config.noiseGain;
      this.noiseSource = this.ctx.createBufferSource();
      this.noiseSource.buffer = buffer;
      this.noiseSource.loop = true;
      this.noiseSource.connect(this.noiseFilter);
      this.noiseFilter.connect(this.noiseGain);
      this.noiseGain.connect(this.master);
      this.noiseSource.start();

      return true;
    } catch (err) {
      this.ctx = null;
      return false;
    }
  };

  WorldAudio.prototype.note = function (midi, start, duration, volume, type, destination) {
    if (!this.ctx) return;
    var frequency = midiToFreq(midi);
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    var filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = type === 'triangle' ? 2200 : 3200;
    osc.type = type || 'sine';
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.4, duration * 0.22));
    gain.gain.setValueAtTime(volume, start + duration * 0.62);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination || this.musicGain);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  };

  WorldAudio.prototype.playChord = function (index) {
    var config = this.config;
    var chord = config.chords[index % config.chords.length];
    var beat = 60 / config.tempo;
    var chordLength = beat * 4;
    var start = Math.max(this.ctx.currentTime, this.nextChord - 0.05);

    for (var i = 0; i < chord.length; i++) {
      this.note(chord[i] - 12, start, chordLength * 1.08, config.padVolume, config.wave);
      this.note(chord[i], start, chordLength * 0.96, config.padVolume * 0.55, config.wave);
    }

    var melodyOffset = (index * 2) % config.melody.length;
    var steps = this.world === 'aquarium' ? 3 : 4;
    for (var s = 0; s < steps; s++) {
      var midi = config.melody[(melodyOffset + s) % config.melody.length];
      this.note(
        midi,
        start + beat * (0.85 + s * 1.15),
        config.melodyLength,
        config.melodyVolume,
        config.pluckWave
      );
    }
  };

  WorldAudio.prototype.tick = function () {
    if (!this.enabled || !this.ctx) return;
    var now = this.ctx.currentTime;
    var beat = 60 / this.config.tempo;

    if (this.nextChord < now) this.nextChord = now + 0.1;
    if (this.nextChord <= now + 0.25) {
      this.playChord(this.chordIndex);
      this.chordIndex = (this.chordIndex + 1) % this.config.chords.length;
      this.nextChord += beat * 4;
      if (this.nextChord < now) this.nextChord = now + beat * 4;
    }
  };

  WorldAudio.prototype.startMusic = function () {
    this.tick();
    var self = this;
    this.timer = window.setInterval(function () { self.tick(); }, 220);
  };

  WorldAudio.prototype.start = function () {
    if (!this.init()) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(function () {});
    if (this.suspendTimer) {
      clearTimeout(this.suspendTimer);
      this.suspendTimer = 0;
    }

    this.enabled = true;
    var now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0.8, now, 0.25);
    this.nextChord = now + 0.1;
    this.chordIndex = 0;
    this.startMusic();
    this.updateButton();
    return true;
  };

  WorldAudio.prototype.stop = function () {
    this.enabled = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = 0;
    }
    if (this.ctx && this.master) {
      var now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0.0001, now, 0.2);
      var self = this;
      this.suspendTimer = window.setTimeout(function () {
        if (!self.enabled && self.ctx && self.ctx.state === 'running') {
          self.ctx.suspend().catch(function () {});
        }
      }, 900);
    }
    this.updateButton();
  };

  WorldAudio.prototype.toggle = function () {
    if (this.enabled) this.stop();
    else this.start();
  };

  WorldAudio.prototype.updateButton = function () {
    if (!this.button) return;
    this.button.setAttribute('aria-pressed', this.enabled ? 'true' : 'false');
    var label = this.enabled ? 'Выключить музыку и звуки' : 'Включить музыку и звуки';
    this.button.setAttribute('aria-label', label);
    this.button.setAttribute('title', label);
  };

  WorldAudio.prototype.bindButton = function (button) {
    var self = this;
    this.button = button;
    if (!button) return;
    this.updateButton();
    button.addEventListener('click', function () { self.toggle(); });
  };

  WorldAudio.prototype.sfx = function (name) {
    if (!this.enabled || !this.ctx || !this.sfxGain) return;
    var self = this;
    var now = this.ctx.currentTime;
    var c = this.ctx;

    function tone(start, end, duration, volume, type) {
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(start, now);
      if (end !== start) osc.frequency.exponentialRampToValueAtTime(Math.max(30, end), now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + duration * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(self.sfxGain);
      osc.start(now);
      osc.stop(now + duration + 0.03);
    }

    function crunch(volume) {
      var buffer = c.createBuffer(1, Math.floor(c.sampleRate * 0.18), c.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      var source = c.createBufferSource();
      var filter = c.createBiquadFilter();
      var gain = c.createGain();
      source.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 0.8;
      gain.gain.value = volume;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(self.sfxGain);
      source.start(now);
    }

    switch (name) {
      case 'feed':
        if (this.world === 'room') {
          crunch(0.08);
          tone(220, 160, 0.14, 0.018, 'triangle');
        } else if (this.world === 'playroom') {
          tone(700, 480, 0.12, 0.025, 'sine');
        } else {
          tone(680, 250, 0.2, 0.03, 'sine');
        }
        break;
      case 'add':
        tone(660, 660, 0.13, 0.03, 'sine');
        window.setTimeout(function () { if (self.enabled) tone(990, 990, 0.2, 0.024, 'sine'); }, 100);
        break;
      case 'night':
        tone(420, 160, 0.35, 0.018, 'triangle');
        break;
      case 'pet':
      case 'meow':
        tone(640, 920, 0.09, 0.035, 'sine');
        window.setTimeout(function () { if (self.enabled) tone(520, 520, 0.22, 0.025, 'sine'); }, 110);
        break;
      case 'catch':
        tone(880, 1420, 0.12, 0.035, 'sine');
        window.setTimeout(function () { if (self.enabled) tone(1420, 1420, 0.14, 0.02, 'sine'); }, 80);
        break;
      case 'hit':
        tone(230, 150, 0.1, 0.035, 'triangle');
        break;
      case 'start':
        tone(523, 523, 0.12, 0.025, 'sine');
        window.setTimeout(function () { if (self.enabled) tone(784, 784, 0.22, 0.022, 'sine'); }, 120);
        break;
      case 'win':
        tone(523, 523, 0.18, 0.025, 'sine');
        window.setTimeout(function () { if (self.enabled) tone(659, 659, 0.18, 0.022, 'sine'); }, 130);
        window.setTimeout(function () { if (self.enabled) tone(784, 784, 0.3, 0.02, 'sine'); }, 260);
        break;
      case 'end':
        tone(300, 190, 0.42, 0.022, 'triangle');
        break;
      case 'click':
        tone(900, 800, 0.06, 0.012, 'sine');
        break;
      default:
        break;
    }
  };

  window.WorldAudio = WorldAudio;
})();

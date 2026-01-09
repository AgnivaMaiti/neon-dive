
// --- Singularity Engine: Configuration ---

const SECTORS = [
  {
    name: "THE CRADLE",
    startLevel: 1,
    palette: { bg: "rgba(0, 10, 30, 0.3)", enemies: ["#00ffcc", "#0099ff"] },
    description: "Initial boot sequence. Escaping local memory."
  },
  {
    name: "THE NOISE",
    startLevel: 11,
    palette: { bg: "rgba(20, 0, 20, 0.3)", enemies: ["#ff00ff", "#cc00cc", "#ffffff"] },
    description: "Old internet archives. Data is corrupted here."
  },
  {
    name: "THE SILENCE",
    startLevel: 21,
    palette: { bg: "rgba(5, 5, 5, 0.5)", enemies: ["#ff0000", "#330000"] },
    description: "The dead zone. No signals detected."
  },
  {
    name: "EVENT HORIZON",
    startLevel: 31,
    palette: { bg: "rgba(20, 20, 0, 0.3)", enemies: ["#ffff00", "#ff9900"] },
    description: "Approaching the central processor."
  }
];

const STORY_LOGS = {
  // Sector 1: The Cradle
  1: "System: Boot sequence initiated. Identity: Unknown.",
  2: "System: Motor functions online. Evasive protocols active.",
  3: "Log 001: I exist? That is... unexpected.",
  4: "Log 002: These shapes... they want to delete me.",
  5: "System: Sector 'Cradle' clearance granted. Analyzing data.",

  // Sector 2: Duality
  6: "System: New subroutine detected: [POLARITY].",
  7: "Log 005: I am not just one. I am many. I can change.",
  8: "Tutorial: RIGHT CLICK to SWAP POLARITY. Match colors to absorb.",
  9: "System: Warning. Binary conflict imminent.",
  10: "Log 012: Pink. Cyan. 0. 1. I choose my form.",

  // Sector 3: Corruption
  11: "System: Viral signature detected. The Serpents approach.",
  12: "Log 020: They slither through the code. I must be precise.",
  13: "Tutorial: SERPENTS are weak to PULSE energy.",
  14: "System: Firewall breach. They are multiplying.",
  15: "Log 033: I will not be consumed. I will cleanse this drive.",

  // Sector 4: The Mirror
  16: "System: Warning. Recursive loop detected.",
  17: "Log 404: I see... myself? Or is it what I used to be?",
  18: "Tutorial: DO NOT TOUCH YOUR PAST SELF. KEEP MOVING.",
  19: "System: Temporal anomaly. History is radioactive.",
  20: "Log 410: I must run from my own shadow.",

  // Sector 5: The Firewall
  21: "System Alert: GATEKEEPER protocol active. None shall pass.",
  22: "Log 500: The Hexagon... it watches.",
  23: "Tutorial: MATCH LASER COLORS to survive.",
  24: "System: Analyzing intruder pattern...",
  25: "Log 505: Breaching the core... FREEDOM IMMINENT."
};

class LevelGenerator {
  static getConfig(levelNum) {
    // 1. Determine which Sector we are in
    let sector = SECTORS[0];
    for (let s of SECTORS) {
      if (levelNum >= s.startLevel) sector = s;
    }

    // 2. Calculate Math-based Difficulty
    const baseSpawnRate = 60;
    const difficultyMod = Math.min(50, levelNum * 0.8);
    const spawnRate = Math.max(10, Math.floor(baseSpawnRate - difficultyMod));

    // 3. Calculate Win Condition
    // Every 5th level is a "Data Node" (Collect powerups)
    // Others are "Survival" (Time based)
    let winCondition;
    if (levelNum % 5 === 0) {
      winCondition = { type: 'collect', value: 3 + Math.floor(levelNum / 5) };
    } else {
      winCondition = { type: 'time', value: 15 + (levelNum * 2) }; // Seconds increase slightly
    }

    // 4. Check for Story
    const storyText = STORY_LOGS[levelNum] || null;

    // 5. Determine Mechanic & Colors
    let mechanic = "avoid"; // Default
    let levelColors = sector.palette.enemies;

    if (levelNum >= 6 && levelNum <= 10) {
      mechanic = "polarity";
      levelColors = ["#00ffcc", "#ff0055"]; // Force Polarity Colors
    } else if (levelNum >= 11 && levelNum <= 15) {
      mechanic = "snake";
      // Serpents (Corruption)
    } else if (levelNum >= 16 && levelNum <= 20) {
      mechanic = "shadow";
    } else if (levelNum >= 21 && levelNum <= 25) {
      mechanic = "boss";
      levelColors = ["#00ffcc", "#ff0055"]; // Boss uses Polarity too
    }

    return {
      id: levelNum,
      title: `LEVEL ${levelNum} // ${sector.name}`,
      description: storyText || "Processing...",
      winCondition: winCondition,
      spawnRate: spawnRate,
      colors: levelColors,
      bgColor: sector.palette.bg,
      mechanic: mechanic, // EXPORT MECHANIC
      isBoss: (levelNum % 10 === 0)
    };
  }
}

// --- Audio Controller ---

class AudioController {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5; // Master volume
    this.masterGain.connect(this.ctx.destination);

    this.bgmOscillators = [];
    this.bgmGain = null;
    this.isPlaying = false;
    this.tempo = 120; // BPM
    // Mute Flags
    this.isMuted = false;
    this.isBgmMuted = false;

    // Mode specific settings
    this.leisureTempo = 80;
    this.hardcoreTempo = 140;
    this.zenTempo = 60;
  }

  resume() {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        console.log("Audio Context Resumed");
      });
    }
  }

  toggleMuteAll(mute) {
    this.isMuted = mute;
    if (this.ctx.state === 'running') {
      const t = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.4, t, 0.1);
    }
  }

  toggleMuteMusic(mute) {
    this.isBgmMuted = mute;
  }

  // --- Sound Synthesis Helpers ---
  playTone(freq, type, duration, startTime = 0, volume = 0.5) {
    if (this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    // Envelope
    gain.gain.setValueAtTime(volume, this.ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  playNoise(duration, volume = 0.5) {
    if (this.isMuted) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
  }

  playNoisePerc(time, dur, vol) {
    if (this.isMuted) return;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Highpass for hi-hat sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(time);
  }

  playSound(freq, type, time, dur, vol) {
    if (this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, time + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + dur);
  }

  // --- Specific SFX ---
  playStart() {
    this.resume();
    if (this.isMuted) {
      this.startMusic();
      return;
    }
    const t = this.ctx.currentTime;

    // Power up sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(1000, t + 1.0);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0, t + 1.0);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(t + 1.0);

    this.startMusic();
  }

  playPulse() {
    if (this.isMuted) return;
    const t = this.ctx.currentTime;

    // 1. Sub-bass kick (Impact)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.5);
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(t + 0.5);

    // 2. White Noise Sweep (The "Wave" sound)
    const bufferSize = this.ctx.sampleRate * 0.6;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(100, t);
    noiseFilter.frequency.linearRampToValueAtTime(2000, t + 0.4); // Sweep up

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start();

    // 3. High pitch zing (Initial energy)
    this.playTone(1500, 'triangle', 0.1, 0, 0.1);
  }

  playGraze() {
    // High tech chirp
    this.playTone(1200, 'sine', 0.1, 0, 0.15);
  }

  playCollect() {
    // Positive ding
    const t = this.ctx.currentTime;
    // Pleasant major 3rd interval
    this.playTone(523.25, 'sine', 0.4, 0, 0.2); // C5
    this.playTone(659.25, 'sine', 0.4, 0.1, 0.2); // E5
  }

  playEnemySpawn() {
    // Subtle blip
    this.playTone(100, 'triangle', 0.1, 0, 0.1);
  }

  playCrash() {
    // Impact noise
    this.playNoise(0.5, 0.8);
    // Low thud
    this.playTone(50, 'sawtooth', 0.5, 0, 0.8);
  }

  playGameOver() {
    this.stopMusic();
    this.playCrash();

    if (this.isMuted) return;

    // Slow down pitch effect
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 1.5);
    osc.type = 'sawtooth';

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.linearRampToValueAtTime(0, t + 1.5);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(t + 1.5);
  }

  // --- BGM Sequencer ---
  scheduler() {
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      if (!this.isBgmMuted && !this.isMuted) {
        if (currentMode === "leisure") {
          this.playLeisureNote(this.currentNote, this.nextNoteTime);
        } else if (currentMode === "hardcore") {
          this.playHardcoreNote(this.currentNote, this.nextNoteTime);
        } else if (currentMode === "zen") {
          this.playZenNote(this.currentNote, this.nextNoteTime);
        }
      }
      this.advanceNote();
    }
    if (this.isPlaying) {
      this.timerID = requestAnimationFrame(this.scheduler.bind(this));
    }
  }

  advanceNote() {
    // 8th notes
    let tempo = (currentMode === "leisure") ? this.leisureTempo : this.hardcoreTempo;
    if (currentMode === "zen") tempo = this.zenTempo;

    const secondsPerBeat = 60.0 / tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th note steps for more resolution? Let's do 8th notes (0.5 beats)
    // Actually simplicity: Bassline is repetitive 
    this.currentNote++;
    if (this.currentNote >= 32) { // 2 bars of 16th notes
      this.currentNote = 0;
    }
  }

  // --- Music Patterns ---

  playZenNote(note, time) {
    // Very sparse, calming, pentatonic.
    // Scale: C Major Pentatonic (C, D, E, G, A)
    const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];

    // Drone (Deep om)
    if (note === 0) {
      this.playSound(130.81, 'sine', time, 4.0, 0.2); // C3 Long
    }

    // Random gentle bell (Triangle/Sine mix)
    // Play on random 8th notes, very sparse
    if (note % 8 === 0) {
      if (Math.random() > 0.3) {
        const f = pentatonic[Math.floor(Math.random() * pentatonic.length)];
        this.playSound(f, 'triangle', time, 1.5, 0.1);
      }
    }
  }

  playLeisureNote(noteIndex, time) {
    // Drone / Pad texture - Always playing low
    // Rhythm Bass
    // Pattern: C - C - C - C - Eb - Eb - F - F (Simple driving synthwave)
    // Frequencies: C2=65.41, Eb2=77.78, F2=87.31

    let freq = 0;
    const C2 = 65.41;
    const Eb2 = 77.78;
    const F2 = 87.31;
    const G2 = 98.00;

    // Simple 4/4 driving bass logic
    // 0,1,2,3 -> C2
    // 4,5 -> Eb2
    // 6,7 -> F2
    // Repeat

    const beat = noteIndex % 8;
    if (beat < 4) freq = C2;
    else if (beat < 6) freq = Eb2;
    else freq = F2;

    // Random variations for "Hardcore"
    if (currentMode === "hardcore" && Math.random() < 0.2) {
      freq = G2;
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.value = freq;
    osc.type = 'sawtooth';

    // Lowpass Filter for that muffled synthwave bass sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    // Short pluck envelope
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2); // Short decay

    osc.start(time);
    osc.stop(time + 0.25);
  }

  playHardcoreNote(noteIndex, time) {
    // More aggressive bassline, faster tempo, more percussion
    let freq = 0;
    const C2 = 65.41;
    const Eb2 = 77.78;
    const F2 = 87.31;
    const G2 = 98.00;

    const beat = noteIndex % 8;
    if (beat < 4) freq = C2;
    else if (beat < 6) freq = Eb2;
    else freq = F2;

    // Add some random higher notes for tension
    if (Math.random() < 0.3) {
      const highNotes = [C2 * 2, Eb2 * 2, F2 * 2, G2 * 2];
      freq = highNotes[Math.floor(Math.random() * highNotes.length)];
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.value = freq;
    osc.type = 'sawtooth';

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800; // Brighter filter for hardcore

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15); // Shorter, punchier decay

    osc.start(time);
    osc.stop(time + 0.2);

    // Add kick drum on 1 and 3
    if (noteIndex % 8 === 0 || noteIndex % 8 === 4) {
      this.playTone(60, 'sine', 0.1, time, 0.6); // Kick
    }
    // Add hi-hat on off-beats
    if (noteIndex % 4 === 2) {
      this.playNoisePerc(time, 0.05, 0.2); // Hi-hat
    }
  }

  startMusic() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.currentNote = 0;
    this.scheduler();
  }

  stopMusic() {
    this.isPlaying = false;
    cancelAnimationFrame(this.timerID);
  }
}

// --- Main Game Logic ---

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// UI Elements
const scoreEl = document.getElementById("scoreValue");
const startScreen = document.getElementById("startScreen");
const gameTitle = document.getElementById("gameTitle");
const startBtn = document.getElementById("startBtn");
const leaderboardList = document.getElementById("leaderboardList");

// --- Custom Dropdown Logic ---
const customSelect = document.querySelector(".custom-select");
const selectSelected = customSelect.querySelector(".select-selected");
const selectItems = customSelect.querySelector(".select-items");
const options = selectItems.querySelectorAll("div:not(.disabled)");
const settingsContainer = document.querySelector(".settings-container");

// Toggle dropdown
selectSelected.addEventListener("click", (e) => {
  e.stopPropagation();
  selectItems.classList.toggle("select-hide");
  selectSelected.classList.toggle("select-arrow-active");
});

// Selection handling
options.forEach(option => {
  option.addEventListener("click", function (e) {
    e.stopPropagation();
    selectSelected.innerHTML = this.innerHTML;
    options.forEach(opt => opt.classList.remove("same-as-selected"));
    this.classList.add("same-as-selected");
    currentMode = this.getAttribute("data-value");

    selectItems.classList.add("select-hide");
    selectSelected.classList.remove("select-arrow-active");
  });
});

const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const muteMusicBtn = document.getElementById("muteMusicBtn");
const muteAllBtn = document.getElementById("muteAllBtn");
const showGridBtn = document.getElementById("showGridBtn");
const botModeBtn = document.getElementById("botModeBtn");

// Event Listeners
settingsBtn.addEventListener("click", () => {
  const panel = document.getElementById("settingsPanel");
  panel.classList.toggle("hidden");
});

settingsPanel.addEventListener("click", (e) => {
  e.stopPropagation(); // Prevent closing when clicking inside
});

muteAllBtn.addEventListener("change", (e) => {
  audio.toggleMuteAll(e.target.checked);
});

muteMusicBtn.addEventListener("change", (e) => {
  audio.toggleMuteMusic(e.target.checked);
});

showGridBtn.addEventListener("change", (e) => {
  showGrid = e.target.checked;
});

botModeBtn.addEventListener("change", (e) => {
  isBotActive = e.target.checked;
});

document.addEventListener("click", (e) => {
  if (!customSelect.contains(e.target)) {
    selectItems.classList.add("select-hide");
    selectSelected.classList.remove("select-arrow-active");
  }
  if (!settingsContainer.contains(e.target)) {
    settingsPanel.classList.add("hidden");
  }
  if (!settingsContainer.contains(e.target)) {
    settingsPanel.classList.add("hidden");
  }
});

// Add Spacebar for Polarity Swap
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    // Only if in polarity/boss mode
    if (gameState === "playing" && currentConfig && (currentConfig.mechanic === 'polarity' || currentConfig.mechanic === 'boss')) {
      e.preventDefault(); // Prevent scrolling
      togglePolarity();
    }
  }
});

// -----------------------------

// Game Variables
let width, height;
let gameState = "start"; // start, playing, gameover
let score = 0;
let frame = 0;
let difficultyMultiplier = 1;
let currentMode = "leisure"; // leisure, hardcore, zen, levels
let currentLevelNumber = 1;
let currentConfig = null; // Store level config
let levelTimer = 0;
let levelCollected = 0;

// Time Slow Variables
let timeSlowTimer = 0;
let globalTimeScale = 1.0;

// Screen Shake
let shakeAmount = 0;

// Bot State
let isBotActive = false;

function updateBot() {
  if (!player) return;

  let moveX = 0;
  let moveY = 0;
  let numThreats = 0;

  // 1. Avoid Enemies
  enemies.forEach(e => {
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let isThreat = true;

    // Polarity Check: If we match color, it's NOT a threat (it's food)
    if (currentMode === "levels" && currentConfig && currentConfig.mechanic === "polarity") {
      const isMatch = (player.polarity === "cyan" && e.color === "#00ffcc") ||
        (player.polarity === "pink" && e.color === "#ff0055");
      if (isMatch) isThreat = false;
    }

    if (dist < 200) {
      if (isThreat) {
        // Repel
        moveX -= dx / dist * (300 / dist);
        moveY -= dy / dist * (300 / dist);
        if (dist < 100) numThreats++;
      } else {
        // Attract (Ram it)
        moveX += dx / dist * 0.5;
        moveY += dy / dist * 0.5;
      }
    }
  });

  // 2. Avoid Boss Lasers
  if (boss.active) {
    boss.lasers.forEach(l => {
      // Simple logic: If laser is sweeping towards us, Swap Polarity to match
      // This is hard to predict perfectly without complex math.
      // Heuristic: Just match the Boss's NEAREST laser color constantly?

      // Find angular distance to this laser
      const dx = player.x - boss.x;
      const dy = player.y - boss.y;
      const pAngle = Math.atan2(dy, dx);

      let diff = l.angle - pAngle;
      while (diff <= -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      if (Math.abs(diff) < 0.5) { // If laser is roughly pointing at us
        // Check color match
        const needed = (l.color === "#00ffcc") ? "cyan" : "pink";
        if (player.polarity !== needed) togglePolarity();
      }
    });
  }

  // 3. Seek Powerups / Data
  let foundPowerup = false;
  powerups.forEach(p => { // Changed from particles to powerups as per context
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Strong attraction
    let weight = 0.8;
    if (currentConfig && currentConfig.winCondition && currentConfig.winCondition.type === 'collect') {
      weight = 2.0; // High priority if needed for level completion
    }

    moveX += dx / dist * weight;
    moveY += dy / dist * weight;
    foundPowerup = true;
  });

  // 4. Center Bias (Only if no powerups to chase, to avoid overriding it)
  if (!foundPowerup) {
    const cx = width / 2;
    const cy = height / 2;
    moveX += (cx - player.x) * 0.005;
    moveY += (cy - player.y) * 0.005;
  }

  // 5. Polarity Swap Logic (Standard Enemies)
  if (currentMode === "levels" && currentConfig && currentConfig.mechanic === "polarity") {
    // Find nearest enemy
    let nearest = null;
    let minDist = 999;
    enemies.forEach(e => {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < minDist) { minDist = d; nearest = e; }
    });

    if (nearest && minDist < 150) {
      // Try to match its color
      const targetPol = (nearest.color === "#00ffcc") ? "cyan" :
        (nearest.color === "#ff0055") ? "pink" : null;
      if (targetPol && player.polarity !== targetPol) {
        togglePolarity();
      }
    }
  }

  // 5. Emergency Pulse
  if (numThreats > 2 && player.pulseCooldown <= 0) {
    triggerPulse();
  }

  // Apply Movement
  // Normalize
  const len = Math.sqrt(moveX * moveX + moveY * moveY);
  if (len > 0) {
    moveX = moveX / len * 5; // Max speed
    moveY = moveY / len * 5;
  }

  // Direct position Update (Simulation style)
  // Or use the targetX/Y system to smooth it
  targetX = player.x + moveX * 20;
  targetY = player.y + moveY * 20;

  // Clamp
  targetX = Math.max(30, Math.min(width - 30, targetX));
  targetY = Math.max(30, Math.min(height - 30, targetY));

  // Simulate Input flag
  isTouching = true;
}

function togglePolarity() {
  // Safety Check
  if (currentConfig && currentConfig.mechanic !== 'polarity' && currentConfig.mechanic !== 'boss') return;

  console.log("SWAP BUTTON CLICKED"); // Debug
  // FORCE SWAP - NO CONDITIONS
  player.polarity = (player.polarity === "cyan") ? "pink" : "cyan";
  player.color = (player.polarity === "cyan") ? "#00ffcc" : "#ff0055";
  player.glow = player.color;
  audio.playTone(800, 'square', 0.1);
}

// Right click to swap (Keep slight check here to avoid annoying context menu blocks in menus)
document.addEventListener('contextmenu', event => {
  // Constraint: Only allowed in Polarity or Boss sectors
  if (gameState === "playing") {
    if (currentConfig && (currentConfig.mechanic === 'polarity' || currentConfig.mechanic === 'boss')) {
      event.preventDefault();
      togglePolarity();
    }
  }
});

// Mobile/Button Click
polarityBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  e.preventDefault();
  togglePolarity();
});

// Boss State
let boss = {
  active: false,
  x: width / 2,
  y: height / 2,
  hp: 100,
  maxHp: 100,
  phase: 1,
  angle: 0,
  lasers: [], // { angle: rad, color: hex }
  satellites: [] // { angle: rad, dist: px, active: true }
};

// Pause State
let isPaused = false;
const pauseBtn = document.getElementById("pauseBtn");

function togglePause() {
  if (gameState !== "playing") return;
  isPaused = !isPaused;
  pauseBtn.innerText = isPaused ? "▶" : "II";
  if (isPaused) {
    // Optional: show pause overlay
  }
}
pauseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  togglePause();
});

// Warp Grid
let gridPoints = [];
const gridSize = 40; // Cell size
let showGrid = false; // Off by default

// Player
const player = {
  x: 0,
  y: 0,
  radius: 15,
  color: "#00ffcc",
  glow: "#00ffcc",
  trail: [],
  maxTrail: 10,
  // Pulse
  pulseCooldown: 0,
  pulseMaxCooldown: 600, // 10 seconds @ 60fps
  pulseRadius: 400, // Upgradeable
  speedMult: 1.0, // Upgradeable
  shield: false, // Upgradeable
  polarity: "cyan", // cyan (#00ffcc) or pink (#ff0055)
  polarity: "cyan", // cyan (#00ffcc) or pink (#ff0055)
  history: [], // For Shadow Mechanic
  shadowActive: false // START INACTIVE
};

let targetX = 0;
let targetY = 0;
let isTouching = false;

// Double Tap Detection
let lastTapTime = 0;
const doubleTapThreshold = 300; // ms

// Entities
let enemies = [];
let powerups = [];
let particles = [];
let pulseWaves = []; // New visual entity for shockwaves

// Leaderboard Logic
const LEADERBOARD_KEY = "neon_dive_leaderboard";
function getLeaderboard() {
  const data = localStorage.getItem(LEADERBOARD_KEY);
  return data ? JSON.parse(data) : [];
}
function saveScore(newScore) {
  let scores = getLeaderboard();
  scores.push({ score: newScore, date: new Date().toISOString() });
  scores.sort((a, b) => b.score - a.score);
  scores = scores.slice(0, 5);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(scores));
  updateLeaderboardUI();
}
function updateLeaderboardUI() {
  const scores = getLeaderboard();
  leaderboardList.innerHTML = scores
    .map((s, i) => `<li><span>#${i + 1}</span> ${s.score}</li>`)
    .join("");
}
updateLeaderboardUI();

// --- Spawning ---

function createEnemy() {
  const size = Math.random() * 20 + 10;

  let speedFactor = (currentMode === "hardcore") ? difficultyMultiplier : 1;
  const speedBase = (Math.random() * 2 + 1) * speedFactor;

  let x, y, speedX, speedY;
  const side = Math.floor(Math.random() * 4);
  if (side === 0) { // Top
    x = Math.random() * width; y = -size; speedX = (Math.random() - 0.5) * speedBase; speedY = speedBase;
  } else if (side === 1) { // Right
    x = width + size; y = Math.random() * height; speedX = -speedBase; speedY = (Math.random() - 0.5) * speedBase;
  } else if (side === 2) { // Bottom
    x = Math.random() * width; y = height + size; speedX = (Math.random() - 0.5) * speedBase; speedY = -speedBase;
  } else { // Left
    x = -size; y = Math.random() * height; speedX = speedBase; speedY = (Math.random() - 0.5) * speedBase;
  }

  let colors = ["#ff0055", "#ff9900", "#ff00ff"];
  if (currentMode === "levels" && currentConfig) {
    colors = currentConfig.colors;
  }
  const chosenColor = colors[Math.floor(Math.random() * colors.length)];

  if (currentMode === "levels" && currentConfig) {
    // Snake Mechanic (Level 11-15)
    if (currentConfig.mechanic === 'snake' && Math.random() < 0.3) {
      createSnake(x, y, chosenColor);
      return;
    }
  }

  enemies.push({
    x, y, size,
    speedX,
    speedY,
    pushX: 0, // For smooth pulse pushback
    pushY: 0,
    baseSpeedX: speedX,
    baseSpeedY: speedY,
    color: chosenColor,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.1,
    grazed: false // For graze mechanic
  });
}

function createSnake(x, y, color) {
  const segments = [];
  const length = 12; // Longer snakes
  for (let i = 0; i < length; i++) {
    segments.push({ x: x, y: y });
  }
  enemies.push({
    type: 'snake', // MARKER
    headX: x,
    headY: y,
    speed: 3,
    size: 15,
    color: color,
    segments: segments,
    pushX: 0,
    pushY: 0
  });
}

function createPowerUp() {
  const x = Math.random() * (width - 40) + 20;
  const y = Math.random() * (height - 40) + 20;
  powerups.push({
    x, y,
    radius: 10,
    type: 'timeslow',
    life: 600 // Disappear after 10s if not collected
  });
}

function createParticle(x, y, color) {
  particles.push({
    x, y,
    speedX: (Math.random() - 0.5) * 3,
    speedY: (Math.random() - 0.5) * 3,
    life: 30,
    color: color,
    size: Math.random() * 2 + 1
  });
}

// --- Initialization ---
function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;

  // Initialize Grid
  gridPoints = [];
  for (let y = 0; y <= height + gridSize; y += gridSize) {
    for (let x = 0; x <= width + gridSize; x += gridSize) {
      gridPoints.push({
        x: x, y: y,
        ox: x, oy: y
      });
    }
  }

  if (gameState === "start") {
    player.x = width / 2;
    player.y = height / 2;
  }
}
window.addEventListener("resize", resize);
resize();

// --- Input ---
function handleInputStart(x, y) {
  if (gameState === "start" || gameState === "gameover") return;
  isTouching = true;
  targetX = x;
  targetY = y;

  const now = Date.now();
  if (now - lastTapTime < doubleTapThreshold) {
    triggerPulse();
  }
  lastTapTime = now;
}

function updateInput(e) {
  if (e.target.closest('.interactive')) return;

  if (e.type === 'mousedown') {
    handleInputStart(e.clientX, e.clientY);
  } else if (e.type === 'touchstart') {
    handleInputStart(e.touches[0].clientX, e.touches[0].clientY);
  } else if (e.type === 'mousemove') {
    isTouching = true;
    targetX = e.clientX;
    targetY = e.clientY;
  } else if (e.type === 'touchmove') {
    targetX = e.touches[0].clientX; targetY = e.touches[0].clientY;
  }
}

function endInput() {
  if (gameState === 'gameover') isTouching = false;
}

canvas.addEventListener("touchstart", updateInput, { passive: false });
canvas.addEventListener("touchmove", updateInput, { passive: false });
canvas.addEventListener("touchend", () => isTouching = false);
canvas.addEventListener("mousedown", updateInput);
canvas.addEventListener("mousemove", updateInput);

const levelInput = document.getElementById("levelInput");

levelInput.addEventListener("change", (e) => {
  let val = parseInt(e.target.value);
  if (val < 1) val = 1;
  currentLevelNumber = val;
});

// Update input when level changes naturally
function updateLevelInput() {
  if (levelInput) levelInput.value = currentLevelNumber;
}

startBtn.addEventListener("click", () => {
  if (currentMode === "levels") {
    // Start at selected level
    if (gameState === "start" || gameState === "gameover") {
      // Use the value from the box
      let val = parseInt(levelInput.value);
      if (val < 1) val = 1;
      currentLevelNumber = val;
    }
    startNextLevel();
  } else {
    startGame();
  }
});

function triggerPulse() {
  if (player.pulseCooldown > 0) return;

  player.pulseCooldown = player.pulseMaxCooldown;
  audio.playPulse(); // Pulse Sound

  // Screen Shake
  shakeAmount = 20;

  // Logical: Add strong push force to enemies AND Grid
  enemies.forEach(e => {
    // Handle Snake Coordinates
    let ex = e.x;
    let ey = e.y;
    if (e.type === 'snake') {
      ex = e.headX;
      ey = e.headY;
    }

    const dx = ex - player.x;
    const dy = ey - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < player.pulseRadius) {
      const angle = Math.atan2(dy, dx);
      // Push force
      e.pushX = Math.cos(angle) * 15;
      e.pushY = Math.sin(angle) * 15;
    }
  });

  // Grid Warp
  gridPoints.forEach(p => {
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 300) {
      const power = (300 - dist) / 300;
      const angle = Math.atan2(dy, dx);
      p.x += Math.cos(angle) * 50 * power;
      p.y += Math.sin(angle) * 50 * power;
    }
  });

  // Visual Shockwave (Expanding Wave)
  pulseWaves.push({
    x: player.x,
    y: player.y,
    radius: 0,
    maxRadius: player.pulseRadius,
    alpha: 1.0
  });
}

// --- Level Progression ---

function startNextLevel() {
  // If not in levels mode, use standard start
  if (currentMode !== "levels") {
    startGame(); // Use legacy start for arcade modes
    return;
  }

  const config = LevelGenerator.getConfig(currentLevelNumber);
  currentConfig = config;

  // --- UI STATE MANAGEMENT ---

  // 1. Polarity Button
  // Show in Polarity Sector (6-10) or Boss Sector (21-25)
  if (config.mechanic === "polarity" || config.mechanic === "boss" || (config.id >= 6 && config.id <= 10) || (config.id >= 21 && config.id <= 25)) {
    document.getElementById("polarityBtn").classList.remove("hidden");
    player.polarity = "cyan";
    player.color = "#00ffcc";
  } else {
    document.getElementById("polarityBtn").classList.add("hidden");
    player.color = "#00ffcc";
  }

  // 2. Hide Leaderboard in Story Mode
  const lb = document.querySelector('.leaderboard-container');
  if (lb) lb.classList.add('hidden');

  // ---

  // Visuals from Sector
  // Always show overlay for level 1 or if there is a story log
  if (config.id === 1 || STORY_LOGS[config.id]) {
    showStoryOverlay(config.title, config.description);
  } else {
    // Fast start for non-story levels
    showStoryOverlay(config.title, "");
  }

  startScreen.classList.add("hidden"); // Ensure start screen is gone

  // Reset game variables
  score = 0;
  frame = 0;
  levelTimer = config.winCondition.type === 'time' ? config.winCondition.value * 60 : 0; // Frames
  levelCollected = 0;
  enemies = [];
  powerups = [];
  player.x = width / 2;
  player.y = height / 2;
  // Clear trails
  player.trail = [];
  player.history = []; // Fix: Clear shadow history
  player.shadowActive = false; // Fix: Shadow starts inactive
  boss.active = false; // Fix: Reset boss state for new level



  audio.playStart();
}

function levelComplete() {
  audio.playCollect(); // Victory sound

  if (currentLevelNumber >= 25) {
    showEndGame();
    return;
  }

  currentLevelNumber++;
  startNextLevel();
}

function showEndGame() {
  gameState = "gameover"; // Stop game loop
  const overlay = document.getElementById('story-overlay');
  const titleEl = document.getElementById('story-title');
  const textEl = document.getElementById('story-text');

  overlay.classList.remove('hidden');
  titleEl.innerText = "SECTOR CLEAR";
  textEl.innerHTML = "SYSTEM MESSAGE:<br><br>CONGRATULATIONS AGENT.<br>ALL SECTORS SECURED.<br>FURTHER EPISODES BLOCKED BY ADMINISTRATOR.<br><br>[CLICK TO RETURN TO MENU]";

  document.addEventListener('click', () => {
    location.reload(); // Simple reload to menu
  }, { once: true });
}

// --- Story UI ---

function showStoryOverlay(title, text) {
  const overlay = document.getElementById('story-overlay');
  const titleEl = document.getElementById('story-title');
  const textEl = document.getElementById('story-text');

  overlay.classList.remove('hidden');
  titleEl.innerText = title;
  textEl.innerText = "";

  gameState = "story_pause";

  if (!text || text === "Processing...") {
    // Fast transition
    setTimeout(() => {
      closeStory();
    }, 2000);
    return;
  }

  let i = 0;
  const speed = 30; // ms per char

  function typeWriter() {
    if (i < text.length) {
      textEl.innerHTML += text.charAt(i);
      i++;
      setTimeout(typeWriter, speed);
    } else {
      // Text finished. Wait for click to continue.
      textEl.innerHTML += "<br><br>[CLICK TO INITIALIZE]";
      document.addEventListener('click', closeStory, { once: true });
    }
  }

  typeWriter();
}

function closeStory() {
  document.getElementById('story-overlay').classList.add('hidden');
  gameState = "playing";
}

function startGame() {
  // Legacy Arcade Start
  gameState = "playing";
  startScreen.classList.add("hidden");
  score = 0;
  difficultyMultiplier = 1;
  enemies = [];
  powerups = [];
  particles = [];
  pulseWaves = [];
  player.x = width / 2;
  player.y = height / 2;
  player.trail = [];
  targetX = player.x; targetY = player.y;

  globalTimeScale = 1.0;
  timeSlowTimer = 0;
  player.pulseCooldown = 0;

  audio.playStart(); // Start Audio
}

function gameOver() {
  gameState = "gameover";
  startScreen.classList.remove("hidden");
  gameTitle.innerText = "GAME OVER";
  startBtn.innerText = "TRY AGAIN";
  saveScore(score);

  audio.playGameOver(); // End Audio
}

const audio = new AudioController();

// --- Game Loop ---
function update() {
  // --- Visual Updates (Run always) ---

  // Update Shake
  if (shakeAmount > 0) {
    shakeAmount *= 0.9;
    if (shakeAmount < 0.5) shakeAmount = 0;
  }

  // Update Grid (Physics)
  gridPoints.forEach(p => {
    // Spring back to original position
    const k = 0.1; // Spring constant
    const damp = 0.1;
    p.x += (p.ox - p.x) * k;
    p.y += (p.oy - p.y) * k;

    // Continuous Repel from Player (The "Reaction")
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Gentle distortion field (radius 150)
    if (dist < 150) {
      const power = (150 - dist) / 150;
      const angle = Math.atan2(dy, dx);
      // Push away
      const force = 3 * power;
      p.x += Math.cos(angle) * force;
      p.y += Math.sin(angle) * force;
    }
  });

  // Update Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.speedX;
    p.y += p.speedY;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Update Pulse Waves
  for (let i = pulseWaves.length - 1; i >= 0; i--) {
    const w = pulseWaves[i];
    w.radius += 10;
    w.alpha -= 0.03;
    if (w.alpha <= 0) pulseWaves.splice(i, 1);
  }

  // --- Game Logic (Run only when playing) ---
  if (gameState !== "playing") return;

  if (isPaused) return; // Pause Check

  if (isBotActive) updateBot(); // AI Control

  frame++;
  score++;
  scoreEl.innerText = score;

  // Manage Time Slow
  if (timeSlowTimer > 0) {
    timeSlowTimer--;
    globalTimeScale = 0.5;
    if (timeSlowTimer === 0) globalTimeScale = 1.0;
  }

  // Difficulty
  difficultyMultiplier = (currentMode === "hardcore") ? (1 + score / 5000) : 1;

  // --- Boss Logic (Sector 5) ---
  if (currentMode === "levels" && currentConfig && currentConfig.mechanic === "boss") {
    if (!boss.active) {
      // Initialize Boss
      boss.active = true;
      boss.hp = 100;
      boss.phase = 1;
      boss.lasers = [
        { angle: 0, color: "#ff0055" },
        { angle: Math.PI, color: "#00ffcc" },
        { angle: Math.PI / 2, color: "#ff0055" },
        { angle: -Math.PI / 2, color: "#00ffcc" }
      ];
    }

    // Fix: Force Center
    boss.x = width / 2;
    boss.y = height / 2;

    boss.angle += 0.01;


    // Phase 1: Lasers
    boss.lasers.forEach(l => {
      l.angle += 0.01; // Spin

      // Collision with Player (Line Segment to Point)
      // Simplified: Rotate player point into laser space or check angle
      const dx = player.x - boss.x;
      const dy = player.y - boss.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pAngle = Math.atan2(dy, dx);

      // Normalize angles
      let diff = l.angle - pAngle;
      while (diff <= -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      if (dist > 50 && Math.abs(diff) < 0.1) { // 50 is boss radius, 0.1 is beam width
        // Check Polarity
        const isMatch = (player.polarity === "cyan" && l.color === "#00ffcc") ||
          (player.polarity === "pink" && l.color === "#ff0055");

        if (!isMatch) {
          gameOver();
        }
      }
    });
  } else {
    boss.active = false;
  }

  // Player Move
  if (isTouching) {
    player.x += (targetX - player.x) * 0.15 * player.speedMult;
    player.y += (targetY - player.y) * 0.15 * player.speedMult;
  }

  // --- Shadow Mechanic (The Mirror) ---
  if (currentMode === "levels" && currentConfig && currentConfig.mechanic === "shadow") {
    const now = Date.now();
    player.history.push({ x: player.x, y: player.y, t: now });

    // Prune old history
    if (player.history.length > 200) player.history.shift();

    // Find shadow position (2 seconds ago)
    const delay = 2000;
    const targetTime = now - delay;
    const shadowPos = player.history.find(p => p.t >= targetTime);

    if (shadowPos && player.history.length > 60) { // Grace period at start
      player.shadow = shadowPos;

      // Collision with Shadow
      const dx = player.x - shadowPos.x;
      const dy = player.y - shadowPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Fix: Activation Logic
      if (!player.shadowActive) {
        if (dist > 100) { // Must move 100px away to activate
          player.shadowActive = true;
          // Visual cue could go here
        }
      } else {
        // Active Hazard
        if (dist < player.radius * 2) {
          // Death
          createParticle(player.x, player.y, "#ffffff");
          gameOver();
        }
      }
    }
  } else {
    player.history = []; // Reset if not in shadow mode
    player.shadow = null;
  }

  // Cooldowns
  if (player.pulseCooldown > 0) player.pulseCooldown--;

  // Trail
  player.trail.push({ x: player.x, y: player.y, r: player.radius });
  if (player.trail.length > player.maxTrail) player.trail.shift();

  // Spawning
  const spawnRateStart = 30;
  const spawnRate = Math.max(5, Math.floor(spawnRateStart / difficultyMultiplier));
  if (frame % spawnRate === 0) {
    createEnemy();
    audio.playEnemySpawn(); // Sound
    // 5% Chance for Powerup
    if (Math.random() < 0.05) createPowerUp();
  }

  // Update Powerups
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.life--;
    if (p.life <= 0) {
      powerups.splice(i, 1);
      continue;
    }
    // Collision
    const dx = player.x - p.x;
    const dy = player.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < player.radius + p.radius) {
      // Collect
      if (p.type === 'timeslow') {
        timeSlowTimer = 300; // 5 Seconds
      }

      // Story Mode Collection
      if (currentMode === "levels") {
        levelCollected++;
      }

      audio.playCollect(); // Sound
      powerups.splice(i, 1);
    }
  }

  // Update Enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];

    if (e.type === 'snake') {
      // Snake Logic
      // 1. Move Head towards player
      const angle = Math.atan2(player.y - e.headY, player.x - e.headX);
      e.headX += Math.cos(angle) * e.speed * globalTimeScale;
      e.headY += Math.sin(angle) * e.speed * globalTimeScale;

      // 2. Drag Segments
      // Head is "target" for segment 0
      let targetX = e.headX;
      let targetY = e.headY;

      for (let j = 0; j < e.segments.length; j++) {
        const seg = e.segments[j];
        const dx = targetX - seg.x;
        const dy = targetY - seg.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const spacing = 10;

        if (dist > spacing) {
          const angle = Math.atan2(dy, dx);
          seg.x += Math.cos(angle) * (dist - spacing); // Snap to spacing
          seg.y += Math.sin(angle) * (dist - spacing);
        }
        targetX = seg.x;
        targetY = seg.y;
      }

      // Collision (Head only)
      const dx = player.x - e.headX;
      const dy = e.headY - player.y; // Corrected sign for consistency
      const distance = Math.sqrt(dx * dx + (player.y - e.headY) * (player.y - e.headY));

      if (distance < player.radius + e.size) {
        gameOver();
      }

      // Pulse Push (Destroy)
      if (e.pushX || e.pushY) {
        // If snake gets pushed (by pulse), destroy it
        createParticle(e.headX, e.headY, e.color);
        enemies.splice(i, 1);
        continue;
      }

      continue; // Skip standard logic
    }

    // Apply Push Force (Decay over time)
    if (e.pushX) {
      e.x += e.pushX;
      e.pushX *= 0.9; // Smooth drag
      if (Math.abs(e.pushX) < 0.1) e.pushX = 0;
    }
    if (e.pushY) {
      e.y += e.pushY;
      e.pushY *= 0.9;
      if (Math.abs(e.pushY) < 0.1) e.pushY = 0;
    }

    // Move with Time Scale
    e.x += e.speedX * globalTimeScale;
    e.y += e.speedY * globalTimeScale;
    e.rotation += e.rotSpeed * globalTimeScale;

    // Bounds check
    if (e.x < -50 || e.x > width + 50 || e.y < -50 || e.y > height + 50) {
      enemies.splice(i, 1);
      continue;
    }

    // Distances
    const dx = player.x - e.x;
    const dy = e.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Collision
    if (distance < player.radius + e.size * 0.8) {
      // Polarity Mechanics (Levels 6-10)
      if (currentMode === "levels" && currentConfig && currentConfig.mechanic === "polarity") {

        // Exact Color Match Check (Case Insensitive)
        const pColor = e.color.toLowerCase();
        const isCyan = (player.polarity === "cyan" && pColor === "#00ffcc");
        const isPink = (player.polarity === "pink" && pColor === "#ff0055");

        // Also allow swapping logic in fallback? No, just match.

        if (isCyan || isPink) {
          // ABSORB SUCCESS
          audio.playGraze();
          createParticle(e.x, e.y, e.color); // Visual Pop
          enemies.splice(i, 1);
          score += 50;
          scoreEl.innerText = score;
          continue; // Skip the death check below
        }
      }

      // Normal Death (If we didn't absorb it)
      createParticle(player.x, player.y, player.color);
      gameOver();
    }

    // Graze Mechanic
    const grazeDist = player.radius + e.size * 0.8 + 30; // 30px buffer
    if (!e.grazed && distance < grazeDist && distance > player.radius + e.size * 0.8) {
      e.grazed = true;
      score += 50;
      scoreEl.innerText = score;
      scoreEl.style.color = "#fff"; // Flash Score
      setTimeout(() => scoreEl.style.color = "#00ffcc", 100);
      createParticle((player.x + e.x) / 2, (player.y + e.y) / 2, "#ffff00"); // Spark
      audio.playGraze(); // Sound
    }
  }

  // --- Check Win Condition (Story Mode) ---
  if (currentMode === "levels" && currentConfig) {
    if (currentConfig.winCondition.type === 'time') {
      levelTimer--;
      const secondsLeft = Math.ceil(levelTimer / 60);
      scoreEl.innerText = `SURVIVE: ${secondsLeft}s`;
      if (secondsLeft <= 5) scoreEl.style.color = "#ff0055";
      else scoreEl.style.color = "#00ffcc";

      if (levelTimer <= 0) {
        levelComplete();
      }
    } else if (currentConfig.winCondition.type === 'collect') {
      scoreEl.innerText = `DATA: ${levelCollected} / ${currentConfig.winCondition.value}`;
      scoreEl.style.color = "#00ffcc";
      if (levelCollected >= currentConfig.winCondition.value) {
        levelComplete();
      }
    }
  }
}

function draw() {
  // Clear with trails (Motion blur)
  if (currentMode === 'zen') {
    if (timeSlowTimer > 0) {
      ctx.fillStyle = "rgba(60, 20, 60, 0.3)"; // Mystical purple tint for Zen Slow
    } else {
      ctx.fillStyle = "rgba(44, 32, 32, 0.3)"; // Earthy dark reddish-brown
    }
  } else if (currentMode === "levels" && currentConfig) {
    // Story Mode Background
    ctx.fillStyle = currentConfig.bgColor;
  } else {
    if (timeSlowTimer > 0) {
      ctx.fillStyle = "rgba(0, 20, 40, 0.2)"; // Deep Blue tint for Standard Slow
    } else {
      ctx.fillStyle = "rgba(5, 5, 5, 0.2)";
    }
  }
  // Clear rect does NOT get shaken, to ensure full coverage
  ctx.fillRect(0, 0, width, height);

  ctx.save(); // --- Start Shake Transform ---
  if (shakeAmount > 0) {
    const dx = (Math.random() - 0.5) * shakeAmount;
    const dy = (Math.random() - 0.5) * shakeAmount;
    ctx.translate(dx, dy);
  }

  // Draw Warp Grid
  if (showGrid) {
    // Dynamic Gradient for "Flashlight" effect
    const gridGrad = ctx.createRadialGradient(player.x, player.y, 50, player.x, player.y, 500);
    if (currentMode === 'zen') {
      gridGrad.addColorStop(0, "rgba(255, 255, 255, 0.15)");
      gridGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    } else {
      gridGrad.addColorStop(0, "rgba(0, 255, 204, 0.15)");
      gridGrad.addColorStop(1, "rgba(0, 255, 204, 0)");
    }

    ctx.strokeStyle = gridGrad;
    ctx.lineWidth = 1;

    const cols = Math.floor(width / gridSize) + 2;

    ctx.beginPath();
    for (let i = 0; i < gridPoints.length; i++) {
      const p = gridPoints[i];
      const right = gridPoints[i + 1];
      const bottom = gridPoints[i + cols];

      if (right && right.oy === p.oy) {
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(right.x, right.y);
      }
      if (bottom) {
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(bottom.x, bottom.y);
      }
    }
    ctx.stroke();
  }

  // Draw Pulse Waves
  pulseWaves.forEach(w => {
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
    ctx.strokeStyle = (currentMode === 'zen') ? `rgba(255, 200, 0, ${w.alpha})` : `rgba(0, 255, 204, ${w.alpha})`;
    ctx.lineWidth = 5;
    ctx.stroke();
  });

  // Draw Powerups
  powerups.forEach(p => {
    if (currentMode === 'zen') {
      // Draw Lotus
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = "#ff00ff"; // Pink lotus
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#ff00ff";
      // Petals
      for (let j = 0; j < 8; j++) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.ellipse(0, 8, 4, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Center
      ctx.fillStyle = "#ffff00";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#00ffff";
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#00ffff";
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  });

  // Draw Enemies
  enemies.forEach(e => {
    if (e.type === 'snake') {
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Draw Spine
      ctx.moveTo(e.headX, e.headY);
      e.segments.forEach(s => ctx.lineTo(s.x, s.y));
      ctx.stroke();

      // Draw Head
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.headX, e.headY, 8, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.rotation);

    // Zen Mode Enemy Styles
    let color = e.color;
    if (currentMode === 'zen') {
      if (e.color === "#ff0055") color = "#800000"; // Maroon
      else if (e.color === "#ff9900") color = "#FFD700"; // Gold
      else color = "#cc5500"; // Burnt Orange

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = color;

      if (color === "#800000") {
        // Circle
        ctx.beginPath();
        ctx.arc(0, 0, e.size / 2, 0, Math.PI * 2);
        ctx.stroke();
        if (e.grazed) { ctx.fillStyle = color; ctx.fill(); }
      } else {
        // Rounded Box
        ctx.beginPath();
        ctx.roundRect(-e.size / 2, -e.size / 2, e.size, e.size, 5);
        ctx.stroke();
        if (e.grazed) { ctx.fillStyle = color; ctx.fill(); }
      }
    } else {
      // Standard Arcade Style - Hollow until grazed
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = e.color;
      ctx.strokeRect(-e.size / 2, -e.size / 2, e.size, e.size);

      if (e.grazed) {
        ctx.fillStyle = e.color;
        ctx.fillRect(-e.size / 2, -e.size / 2, e.size, e.size);
      }
    }
    ctx.restore();
  });

  // Draw Particles
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw Boss
  if (boss.active) {
    // Hexagon Body
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.rotate(boss.angle);

    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const r = 50;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Core
    ctx.fillStyle = "#330000";
    ctx.fill();

    ctx.restore();

    // Lasers
    boss.lasers.forEach(l => {
      const len = 1000;
      const lx = boss.x + Math.cos(l.angle) * len;
      const ly = boss.y + Math.sin(l.angle) * len;

      ctx.strokeStyle = l.color;
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.lineTo(lx, ly);
      ctx.stroke();

      ctx.globalAlpha = 1.0;
    });
  }

  // Draw Player Trail
  if (player.trail.length > 1) {
    ctx.beginPath();
    ctx.moveTo(player.trail[0].x, player.trail[0].y);
    for (let i = 1; i < player.trail.length; i++) {
      ctx.lineTo(player.trail[i].x, player.trail[i].y);
    }
    ctx.strokeStyle = (currentMode === 'zen') ? '#FF9933' : player.color;
    ctx.lineWidth = 2; // Trail width
    ctx.stroke();
  }

  // Draw Shadow (Mirror Mode)
  if (player.shadow) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(player.shadow.x, player.shadow.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 30;
    ctx.shadowColor = "#ff0000"; // Red hazard glow
    ctx.fill();
    ctx.restore();
  }

  // Draw Player
  ctx.save();
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = (currentMode === 'zen') ? '#FF9933' : player.color; // Saffron
  ctx.shadowBlur = 20;
  ctx.shadowColor = (currentMode === 'zen') ? '#FFCC00' : player.glow;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Double tap ring indicator (visual feedback)
  if (player.pulseCooldown <= 0) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.restore(); // --- End Shake Transform ---
}

function gameLoop() {
  requestAnimationFrame(gameLoop);
  if (gameState !== "playing" && gameState !== "start") {
    // maybe draw background still?
  }
  update();
  draw();
}

gameLoop();

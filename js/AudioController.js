export class AudioController {
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

        this.currentMode = 'leisure'; // Default track mode
    }

    setMode(mode) {
        this.currentMode = mode;
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
                if (this.currentMode === "leisure") {
                    this.playLeisureNote(this.currentNote, this.nextNoteTime);
                } else if (this.currentMode === "hardcore") {
                    this.playHardcoreNote(this.currentNote, this.nextNoteTime);
                } else if (this.currentMode === "zen") {
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
        let tempo = (this.currentMode === "leisure") ? this.leisureTempo : this.hardcoreTempo;
        if (this.currentMode === "zen") tempo = this.zenTempo;

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
        if (this.currentMode === "hardcore" && Math.random() < 0.2) {
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

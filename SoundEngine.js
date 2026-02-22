import * as Tone from 'tone';

class SoundEngine {
  constructor() {
    this.isInitialized = false;
    this.drone = null;
    this.synth = null;
    this.kick = null;
  }

  async init() {
    if (this.isInitialized) return;
    await Tone.start();
    
    // 1. Il Drone a 40Hz (The Hum)
    this.drone = new Tone.Oscillator(40, "sine").toDestination();
    this.drone.volume.value = -20; // Basso, subliminale
    
    // 2. Synth per feedback positivi (Armonici)
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.1, release: 1 }
    }).toDestination();
    this.synth.volume.value = -10;

    // 3. Kick per la chiusura (The Thud)
    this.kick = new Tone.MembraneSynth().toDestination();

    this.isInitialized = true;
  }

  startDrone() {
    if (this.drone && this.drone.state !== 'started') {
      this.drone.start();
      this.drone.volume.rampTo(-15, 2); // Fade in lento
    }
  }

  stopDrone() {
    if (this.drone) {
      this.drone.volume.rampTo(-Infinity, 0.5); // Fade out rapido
      setTimeout(() => this.drone.stop(), 500);
    }
  }

  playSuccess(complexityLevel = 0) {
    const notes = ["C4", "E4", "G4", "B4", "D5"];
    const note = notes[complexityLevel % notes.length];
    this.synth.triggerAttackRelease(note, "8n");
    // Aumenta impercettibilmente il pitch del drone per creare tensione
    this.drone.frequency.rampTo(40 + (complexityLevel * 2), 1);
  }

  playError() {
    // Suono "Scrunch" granulare
    const noise = new Tone.NoiseSynth({
      noise: { type: 'brown' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0 }
    }).toDestination();
    noise.triggerAttackRelease("16n");
  }

  playCompletionThud() {
    this.stopDrone();
    this.kick.triggerAttackRelease("C1", "8n"); // Sub-bass thud
  }
}

export const soundEngine = new SoundEngine();

// Mapping input letters to frequencies for the 12 notes (4th octave)
const noteFrequencies = {
    'D': 261.63, // C4
    'd': 277.18, // C♯4
    'R': 293.66, // D4
    'r': 311.13, // D♯4
    'M': 329.63, // E4
    'F': 349.23, // F4
    'f': 369.99, // F♯4
    'S': 392.00, // G4
    's': 415.30, // G♯4
    'L': 440.00, // A4
    'l': 466.16, // A♯4
    'T': 493.88  // B4
  };
  
  // DOM Elements
  const playSequenceBtn = document.getElementById('playSequenceBtn');
  const sequenceInput = document.getElementById('sequenceInput');
  const bpmInput = document.getElementById('bpmInput');
  
  playSequenceBtn.addEventListener('click', function() {
    const sequence = sequenceInput.value;
    const bpm = parseFloat(bpmInput.value) || 120;
    const beatDuration = 60 / bpm;  // Duration in seconds for one beat
  
    // Create a single AudioContext for scheduling the sequence.
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const startTime = audioCtx.currentTime;
  
    // Use an offset (in beats) to schedule each note/rest.
    let offset = 0;
    for (let i = 0; i < sequence.length; i++) {
      const char = sequence[i];
      if (char === ' ') {
        // A rest: simply advance the offset by one beat.
        offset += 1;
      } else if (noteFrequencies[char]) {
        // Schedule the note to play at the calculated time.
        playNoteAtTime(audioCtx, noteFrequencies[char], beatDuration, startTime + offset * beatDuration);
        offset += 1; // Each note occupies one beat.
      } else {
        console.warn(`Unrecognized character "${char}" at position ${i}. Skipping and adding a beat rest.`);
        offset += 1;
      }
    }
  });
  
  /**
   * Schedules a note to play using the Web Audio API.
   * @param {AudioContext} audioCtx - The audio context.
   * @param {number} frequency - Frequency of the note in Hz.
   * @param {number} duration - Duration of the note in seconds.
   * @param {number} startTime - The time (in audioCtx time) when the note should start.
   */
  function playNoteAtTime(audioCtx, frequency, duration, startTime) {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
  
    oscillator.type = 'sine'; // Change to 'square', 'sawtooth', etc. for different timbres.
    oscillator.frequency.setValueAtTime(frequency, startTime);
  
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
  
    oscillator.start(startTime);
    // Set the gain to fade out the note smoothly.
    gainNode.gain.setValueAtTime(1, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
    oscillator.stop(startTime + duration);
  }
  

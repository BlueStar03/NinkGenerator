// Mapping of Nink note symbols to semitone intervals relative to "Do"
const ninkIntervals = {
  'D': 0,
  'd': 1,
  'R': 2,
  'r': 3,
  'M': 4,
  'F': 5,
  'f': 6,
  'S': 7,
  's': 8,
  'L': 9,
  'l': 10,
  'T': 11
};

/**
 * Converts a note string (like "C4" or "A#3") to its frequency in Hz.
 * Uses the formula: frequency = 440 * 2^((n)/12), where n is the number of semitones from A4.
 */
function getFrequency(note) {
  // Match note format: letter (A-G), optional accidental (# or b), and octave (a digit)
  const match = note.match(/^([A-G])([#b]?)(\d)$/);
  if (!match) {
    alert("Invalid note format for natural octave: " + note + ". Please use a format like C4 or A#3.");
    return null;
  }
  const letter = match[1];
  const accidental = match[2];
  const octave = parseInt(match[3], 10);
  
  // Offsets relative to A in the same octave:
  // For natural notes (without accidental): C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2
  const offsets = {
    'C': -9,
    'D': -7,
    'E': -5,
    'F': -4,
    'G': -2,
    'A': 0,
    'B': 2
  };
  let semitoneOffset = offsets[letter];
  if (accidental === '#') {
    semitoneOffset += 1;
  } else if (accidental === 'b') {
    semitoneOffset -= 1;
  }
  // Calculate semitones away from A4
  const n = semitoneOffset + (octave - 4) * 12;
  return 440 * Math.pow(2, n / 12);
}

const playSequenceBtn = document.getElementById('playSequenceBtn');
const sequenceInput = document.getElementById('sequenceInput');
const bpmInput = document.getElementById('bpmInput');
const naturalOctaveInput = document.getElementById('naturalOctaveInput');

playSequenceBtn.addEventListener('click', function () {
  const sequence = sequenceInput.value;
  const bpm = parseFloat(bpmInput.value) || 120;
  const beatDuration = 60 / bpm;
  const baseNote = naturalOctaveInput.value;
  const baseFrequency = getFrequency(baseNote);
  if (!baseFrequency) return;
  
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const startTime = audioCtx.currentTime;
  let offset = 0;
  
  // Process each character in the sequence
  for (let i = 0; i < sequence.length; i++) {
    const char = sequence[i];
    if (char === ' ') {
      // Rest: advance the beat offset
      offset += 1;
    } else if (ninkIntervals.hasOwnProperty(char)) {
      const semitoneInterval = ninkIntervals[char];
      const frequency = baseFrequency * Math.pow(2, semitoneInterval / 12);
      playNoteAtTime(audioCtx, frequency, beatDuration, startTime + offset * beatDuration);
      offset += 1;
    } else {
      console.warn(`Unrecognized character "${char}" at position ${i}. Skipping and adding a beat rest.`);
      offset += 1;
    }
  }
});

/**
 * Schedules a note to play using the Web Audio API.
 *
 * @param {AudioContext} audioCtx - The audio context.
 * @param {number} frequency - Frequency of the note in Hz.
 * @param {number} duration - Duration of the note in seconds.
 * @param {number} startTime - The time (in audioCtx time) when the note should start.
 */
function playNoteAtTime(audioCtx, frequency, duration, startTime) {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.type = 'sine'; // You can experiment with other waveforms.
  oscillator.frequency.setValueAtTime(frequency, startTime);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.start(startTime);
  gainNode.gain.setValueAtTime(1, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
  oscillator.stop(startTime + duration);
}

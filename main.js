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

// Define marker sets (single markers)
const HIGH_MARKERS = ['/', '!'];
const LOW_MARKERS  = ['\\', '¡'];
const NATURAL_MARKER = '~';
// Define double markers (as strings)
const DOUBLE_HIGH_MARKERS = ['//', '!!'];
const DOUBLE_LOW_MARKERS  = ['\\\\', '¡¡']; // Note: "\\" is written as "\\\\" in JS string

// Piano 88-key boundaries
const PIANO_LOW_FREQ = 27.5;    // Frequency of A0
const PIANO_HIGH_FREQ = 4186.01; // Frequency of C8

/**
 * Converts a note string (e.g., "C4" or "A#3") to its frequency in Hz.
 * Uses A4 = 440 Hz as the reference.
 */
function getFrequency(note) {
  const match = note.match(/^([A-G])([#b]?)(\d)$/);
  if (!match) {
    alert("Invalid note format for natural octave: " + note + ". Please use a format like C4 or A#3.");
    return null;
  }
  const letter = match[1];
  const accidental = match[2];
  const octave = parseInt(match[3], 10);
  
  const offsets = { 'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2 };
  let semitoneOffset = offsets[letter];
  if (accidental === '#') semitoneOffset += 1;
  else if (accidental === 'b') semitoneOffset -= 1;
  
  const n = semitoneOffset + (octave - 4) * 12;
  return 440 * Math.pow(2, n / 12);
}

/**
 * Plays an error sound (a burst of white noise) for the specified duration.
 */
function playErrorSound(audioCtx, duration, startTime) {
  const sampleRate = audioCtx.sampleRate;
  const bufferSize = sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = buffer;
  noiseSource.connect(audioCtx.destination);
  noiseSource.start(startTime);
  noiseSource.stop(startTime + duration);
}

const playSequenceBtn = document.getElementById('playSequenceBtn');
const sequenceInput = document.getElementById('sequenceInput');
const bpmInput = document.getElementById('bpmInput');
const naturalOctaveInput = document.getElementById('naturalOctaveInput');
const rangeInput = document.getElementById('rangeInput');

playSequenceBtn.addEventListener('click', function () {
  const sequence = sequenceInput.value;
  const bpm = parseFloat(bpmInput.value) || 120;
  const beatDuration = 60 / bpm;
  const baseNote = naturalOctaveInput.value;
  const baseFrequency = getFrequency(baseNote);
  if (!baseFrequency) return;
  
  // Determine allowed extra octave based on voice range.
  // "normal" allows only single markers.
  // "higher" allows double high markers.
  // "lower" allows double low markers.
  const voiceRange = rangeInput.value; // "normal", "higher", or "lower"
  
  let currentOctaveOffset = 0; // in semitones; 0 = natural
  let beatOffset = 0;
  
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const startTime = audioCtx.currentTime;
  
  // Use a while loop to process tokens (markers may be one or two characters)
  let i = 0;
  while (i < sequence.length) {
    // Check for space (rest)
    if (sequence[i] === ' ') {
      beatOffset += 1;
      i++;
      continue;
    }
    
    // Check for markers. We look ahead to see if a double marker exists.
    let token = null;
    // Attempt to read two characters if available.
    if (i + 1 < sequence.length) {
      token = sequence.substring(i, i + 2);
      if (DOUBLE_HIGH_MARKERS.includes(token) || DOUBLE_LOW_MARKERS.includes(token)) {
        // Double marker token found.
        if (DOUBLE_HIGH_MARKERS.includes(token)) {
          if (voiceRange !== "higher") {
            // Not allowed: error sound.
            playErrorSound(audioCtx, beatDuration, startTime + beatOffset * beatDuration);
            beatOffset += 1;
            i += 2;
            continue;
          }
          currentOctaveOffset = 24;
        } else if (DOUBLE_LOW_MARKERS.includes(token)) {
          if (voiceRange !== "lower") {
            playErrorSound(audioCtx, beatDuration, startTime + beatOffset * beatDuration);
            beatOffset += 1;
            i += 2;
            continue;
          }
          currentOctaveOffset = -24;
        }
        i += 2;
        // Markers do not consume a beat.
        continue;
      }
    }
    
    // If not a double marker, check for a single marker.
    const char = sequence[i];
    if (HIGH_MARKERS.includes(char)) {
      currentOctaveOffset = 12;
      i++;
      continue;
    }
    else if (LOW_MARKERS.includes(char)) {
      currentOctaveOffset = -12;
      i++;
      continue;
    }
    else if (char === NATURAL_MARKER) {
      currentOctaveOffset = 0;
      i++;
      continue;
    }
    
    // At this point, the character should be a note symbol.
    if (ninkIntervals.hasOwnProperty(char)) {
      const semitoneInterval = ninkIntervals[char];
      const totalSemitones = semitoneInterval + currentOctaveOffset;
      const frequency = baseFrequency * Math.pow(2, totalSemitones / 12);
      
      // Check if frequency is within the piano range.
      if (frequency < PIANO_LOW_FREQ || frequency > PIANO_HIGH_FREQ) {
        playErrorSound(audioCtx, beatDuration, startTime + beatOffset * beatDuration);
      } else {
        playNoteAtTime(audioCtx, frequency, beatDuration, startTime + beatOffset * beatDuration);
      }
      beatOffset += 1;
      i++;
    } else {
      console.warn(`Unrecognized character "${char}" at position ${i}. Skipping and adding a beat rest.`);
      beatOffset += 1;
      i++;
    }
  }
});

/**
 * Schedules a note to play using the Web Audio API.
 * @param {AudioContext} audioCtx -*

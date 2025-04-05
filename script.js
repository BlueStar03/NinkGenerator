function showTab(id) {
    const tabs = document.querySelectorAll(".tab-content");
    tabs.forEach(tab => {
      tab.style.display = "none";
      tab.classList.remove("active");
    });
  
    document.getElementById(id).style.display = "block";
    document.getElementById(id).classList.add("active");
  
    const buttons = document.querySelectorAll(".tab-button");
    buttons.forEach(btn => btn.classList.remove("active"));
    document.querySelector(`.tab-button[onclick="showTab('${id}')"]`).classList.add("active");
  }
  
  // Show syntax tab by default
  showTab("syntax");
  
  const solfegeMap = {
    'D': 0, 'd': 1, 'R': 2, 'r': 3,
    'M': 4, 'F': 5, 'f': 6,
    'S': 7, 's': 8, 'L': 9,
    'l': 10, 'T': 11
  };
  
  const noteMap = {};
  let midi = 21;
  const notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
  for (let octave = 0; octave <= 8; octave++) {
    for (let i = 0; i < notes.length; i++) {
      const name = notes[i] + octave;
      if (midi <= 108) noteMap[name] = midi++;
    }
  }
  
  let currentTimeouts = [];
  let audioCtx;
  let bellBuffer, whistleBuffer;
  
  async function loadSamples() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const bellData = await fetch("bell.wav").then(res => res.arrayBuffer());
    const whistleData = await fetch("whistle.wav").then(res => res.arrayBuffer());
    bellBuffer = await audioCtx.decodeAudioData(bellData);
    whistleBuffer = await audioCtx.decodeAudioData(whistleData);
  }
  
  loadSamples();
  
  function midiToDetune(target, base) {
    return (target - base) * 100;
  }
  
  function playSound(buffer, midiNote, duration, sampleMidiBase) {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.detune.value = midiToDetune(midiNote, sampleMidiBase);
  
    const gain = audioCtx.createGain();
    source.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(1, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration / 1000);
  
    source.start();
  }
  
  function playErrorSound(duration = 200) {
    const bufferSize = audioCtx.sampleRate * (duration / 1000);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
  
    const gain = audioCtx.createGain();
    source.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration / 1000);
  
    source.start();
  }
  
  function getVoiceRange(naturalMidi, rangeName) {
    let lowerOffset = 0;
    let upperOffset = 0;
  
    if (rangeName === "normal") {
      lowerOffset = -12;
      upperOffset = 12 + 11;
    } else if (rangeName === "lower") {
      lowerOffset = -24;
      upperOffset = 12 + 11;
    } else if (rangeName === "higher") {
      lowerOffset = -12;
      upperOffset = 24 + 11;
    } else if (rangeName === "full") {
      lowerOffset = -24;
      upperOffset = 24 + 11;
    }
  
    return {
      min: naturalMidi + lowerOffset,
      max: naturalMidi + upperOffset
    };
  }
  
  function parseSequence(input) {
    const tokens = [];
    let voice = "bell";
    let octaveOffset = 0;
  
    let i = 0;
    while (i < input.length) {
      let prefix = "";
      let controlBuffer = "";
      let char = "";
  
      if (input.startsWith("::", i)) {
        prefix = "::";
        i += 2;
      } else if (input.startsWith("__", i)) {
        prefix = "__";
        i += 2;
      } else if (input[i] === ":" || input[i] === "_") {
        prefix = input[i++];
      }
  
      while (i < input.length && "`*/!\\/¡~".includes(input[i])) {
        if ((input[i] === '/' || input[i] === '\\' || input[i] === '!' || input[i] === '¡') && input[i + 1] === input[i]) {
          controlBuffer += input[i] + input[i + 1];
          i += 2;
        } else {
          controlBuffer += input[i++];
        }
      }
  
      if (i < input.length) {
        char = input[i++];
      }
  
      for (let j = 0; j < controlBuffer.length; j++) {
        const c = controlBuffer[j] + (controlBuffer[j + 1] === controlBuffer[j] ? controlBuffer[++j] : "");
        if (c === '`') voice = "bell";
        else if (c === '*') voice = "whistle";
        else if (c === '/' || c === '!') octaveOffset = 12;
        else if (c === '\\' || c === '¡') octaveOffset = -12;
        else if (c === '//' || c === '!!') octaveOffset = 24;
        else if (c === '\\\\' || c === '¡¡') octaveOffset = -24;
        else if (c === '~') octaveOffset = 0;
      }
  
      let multiplier = 1;
      if (prefix === ":") multiplier = 0.5;
      else if (prefix === "::") multiplier = 0.25;
      else if (prefix === "_") multiplier = 2;
      else if (prefix === "__") multiplier = 4;
  
      if (char) {
        tokens.push({ char, multiplier, voice, octaveOffset });
      }
    }
  
    return tokens;
  }
  
  function playSequence() {
    stopSequence();
  
    const input = document.getElementById("sequenceInput").value.trim();
    const bpm = parseInt(document.getElementById("paceInput").value);
    const bellToneName = document.getElementById("bellTone").value.trim();
    const whistleToneName = document.getElementById("whistleTone").value.trim();
    let voiceOffset = parseInt(document.getElementById("voiceOffset").value) || 0;
    voiceOffset = Math.max(-8, Math.min(8, voiceOffset));
    const range = document.getElementById("rangeSelect").value;
  
    const bellNatural = noteMap[bellToneName] || 60;
    const whistleNatural = noteMap[whistleToneName] || 60;
    const beatMs = (60 / bpm) * 1000;
  
    const bellRange = getVoiceRange(bellNatural, range);
    const whistleRange = getVoiceRange(whistleNatural, range);
  
    const sequence = parseSequence(input);
    let timeOffset = 0;
  
    sequence.forEach(({ char, multiplier, voice, octaveOffset }) => {
      const isRest = char === " " || char === ".";
      const semitone = solfegeMap[char];
      const duration = beatMs * multiplier;
  
      currentTimeouts.push(setTimeout(() => {
        if (!isRest && semitone !== undefined) {
          const isWhistle = voice === "whistle";
          const natural = isWhistle ? whistleNatural : bellNatural;
          const voiceRange = isWhistle ? whistleRange : bellRange;
          const fullNote = natural + voiceOffset + semitone + octaveOffset;
  
          if (fullNote < 21 || fullNote > 108 || fullNote < voiceRange.min || fullNote > voiceRange.max) {
            playErrorSound(duration);
            return;
          }
  
          const buffer = isWhistle ? whistleBuffer : bellBuffer;
          playSound(buffer, fullNote, duration, natural);
        }
      }, timeOffset));
  
      timeOffset += duration;
    });
  }
  
  function stopSequence() {
    currentTimeouts.forEach(clearTimeout);
    currentTimeouts = [];
  }
  
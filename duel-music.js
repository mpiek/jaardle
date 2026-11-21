// 🎵 Achtergrondmuziek bij duels (21/11/2026, zijn vraag "soort melodie tijdens spelen, net zoals bij geoguessr dat je soort ambient
// achtergrond hebt"; op de luisterpagina koos hij "Zelf" op 50%). Alleen met de luidspreker op "alles" (effecten + muziek); /duel.js laadt
// dit pas als hij moet klinken en zet hem aan en uit (MUS / musicKick): om de beurt tijdens een ronde, ⚡ knock-out het hele spel.
// Geen bestand: alles komt uit Web Audio, elke keer net anders. Een zachte akkoordenbodem D – Bm – G – A (elke 8 s, glijdend), af en toe
// een glinsterende noot uit D-pentatonisch met een echo. tense (de klok van een knock-out loopt) = een zachte hartslag op D2, twee keer per
// seconde, en een iets opener klank. Hij gaat via dezelfde uitgang als de effecten (de compressor duwt hem vanzelf weg onder een klap).
window.DuelMusic = (() => {
  const VOL = 0.625;   // 50% op de schuif van de luisterpagina: 0,5² × 2,5
  let run = null, tense = false;

  function start(x, dest) {
    if (run && run.x === x) {   // speelt al (of was aan het uitfaden): gewoon door
      clearTimeout(run.kill); run.kill = null; run.stopping = false;
      run.g.gain.setTargetAtTime(VOL, x.currentTime, 0.6);
      return;
    }
    stopNow();
    const g = x.createGain();
    g.gain.value = 0; g.connect(dest); g.gain.setTargetAtTime(VOL, x.currentTime, 0.8);
    run = { x, g, kill: null, stopping: false, end: play(x, g) };
  }
  function stop() {   // zacht weg (±1 s), daarna alles opruimen
    if (!run || run.stopping) return;
    const r = run;
    r.stopping = true;
    r.g.gain.cancelScheduledValues(r.x.currentTime);
    r.g.gain.setTargetAtTime(0, r.x.currentTime, 0.35);
    r.kill = setTimeout(() => { if (run === r) stopNow(); }, 2000);
  }
  function stopNow() {
    if (!run) return;
    clearTimeout(run.kill);
    try { run.end(); run.g.disconnect(); } catch (e) {}
    run = null;
  }

  function play(x, out) {
    const t0 = x.currentTime, nodes = [];
    // de echo van de glinsternoten
    const dly = x.createDelay(1), fb = x.createGain(), dlp = x.createBiquadFilter(), wet = x.createGain();
    dly.delayTime.value = 0.42; fb.gain.value = 0.32; dlp.type = "lowpass"; dlp.frequency.value = 2400; wet.gain.value = 0.5;
    dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(wet); wet.connect(out);
    // de bodem: drie stemmen, elk twee zaagtanden iets verstemd, door een langzaam ademend laagdoorlaatfilter
    const padF = x.createBiquadFilter(), padG = x.createGain(), lfo = x.createOscillator(), lfoG = x.createGain();
    padF.type = "lowpass"; padF.frequency.value = 650; padF.Q.value = 0.6;
    lfo.frequency.value = 0.06; lfoG.gain.value = 200; lfo.connect(lfoG); lfoG.connect(padF.frequency); lfo.start(); nodes.push(lfo);
    padG.gain.value = 0; padG.gain.setTargetAtTime(1, t0, 1.2); padF.connect(padG); padG.connect(out);
    const CH = [[146.83, 220.0, 329.63], [123.47, 185.0, 293.66], [98.0, 146.83, 246.94], [110.0, 164.81, 277.18]];   // D, Bm, G, A
    const voices = CH[0].map((f) => [-7, 7].map((det) => {
      const o = x.createOscillator(), g = x.createGain();
      o.type = "sawtooth"; o.frequency.value = f; o.detune.value = det; g.gain.value = 0.035;
      o.connect(g); g.connect(padF); o.start(); nodes.push(o);
      return o;
    }));
    const PENTA = [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66];   // D5 E5 F#5 A5 B5 D6
    function pluck(f, t, g = 0.06) {
      const e = x.createGain(), send = x.createGain();
      e.gain.value = 0; e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + 0.004); e.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      send.gain.value = 0.6; e.connect(out); e.connect(send); send.connect(dly);
      for (const [r, a] of [[1, 1], [2, 0.25], [3, 0.08]]) {
        const o = x.createOscillator(), og = x.createGain();
        o.frequency.value = f * r; og.gain.value = a; o.connect(og); og.connect(e); o.start(t); o.stop(t + 1.85);
      }
    }
    function beat(t) {
      const o = x.createOscillator(), e = x.createGain();
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(73.42, t + 0.08);
      e.gain.value = 0; e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(0.18, t + 0.008); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(e); e.connect(out); o.start(t); o.stop(t + 0.25);
    }
    // plannen met 0,3 s vooruitkijken, elke 100 ms
    let ci = 0, nextChord = t0 + 8, nextNote = t0 + 1.5, nextBeat = t0 + 0.5, wasTense = null;
    const iv = setInterval(() => {
      const now = x.currentTime, ahead = now + 0.3;
      if (wasTense !== tense) { wasTense = tense; padF.frequency.setTargetAtTime(tense ? 1050 : 650, now, 0.8); nextBeat = Math.max(nextBeat, now + 0.05); }
      while (nextChord < ahead) { ci = (ci + 1) % CH.length; CH[ci].forEach((f, i) => voices[i].forEach((o) => o.frequency.setTargetAtTime(f, nextChord, 0.35))); nextChord += 8; }
      while (nextNote < ahead) {
        pluck(PENTA[Math.floor(Math.random() * PENTA.length)], nextNote);
        if (Math.random() < 0.3) pluck(PENTA[Math.floor(Math.random() * PENTA.length)], nextNote + 0.21, 0.04);
        nextNote += 1.2 + Math.random() * 2.6;
      }
      if (tense) while (nextBeat < ahead) { beat(nextBeat); nextBeat += 0.5; }
      else nextBeat = Math.max(nextBeat, now);
    }, 100);
    return () => { clearInterval(iv); nodes.forEach((o) => { try { o.stop(); } catch (e) {} }); try { wet.disconnect(); padG.disconnect(); } catch (e) {} };
  }

  return { start, stop, tense: (on) => { tense = !!on; }, get on() { return !!run && !run.stopping; } };
})();

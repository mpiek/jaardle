// 🎵 Achtergrondmuziek bij duels (21/11/2026, zijn vraag "soort melodie tijdens spelen, net zoals bij geoguessr dat je soort ambient
// achtergrond hebt"; op de luisterpagina koos hij "Zelf" op 50%). Alleen met de luidspreker op "alles" (standaard); /duel.js laadt dit pas
// als hij moet klinken en zet hem aan en uit (MUS / musicKick): om de beurt tijdens een ronde, ⚡ knock-out het hele spel.
// Geen bestand: alles komt uit Web Audio, elke keer net anders. Een zachte akkoordenbodem D – Bm – G – A (elke 8 s, glijdend), af en toe
// een glinsterende noot uit D-pentatonisch met een echo. Hij gaat via dezelfde uitgang als de effecten (de compressor duwt hem vanzelf weg
// onder een klap).
//
// De klok van een knock-out (21/11, zijn "hoe kunnen we het nog intenser maken als je nog 15 seconde hebt"; zijn keuze op de luisterpagina:
// Ostinato v2, laatste 5 s "Versnellen"): tense(ms) = de klok loopt nog ms. Dan loopt er een loopje op precies de tonen van de bodem
// (achtsten, 120 bpm, vastgezet aan de akkoordwissels, droog), met een zachte bas en hartslag op de tellen; de bodem zakt naar 60% en het
// loopje wordt steeds harder. De laatste 5 s zakt de bodem naar 30% en versnelt het loopje van 120 naar ±200 bpm: het overstemt alles.
window.DuelMusic = (() => {
  const VOL = 0.625;   // 50% op de schuif van de luisterpagina: 0,5² × 2,5
  const SPAN = 15;     // de klok van een knock-out (ko.js armClock: 15 s)
  let run = null;

  function start(x, dest) {
    if (run && run.x === x) {   // speelt al (of was aan het uitfaden): gewoon door
      clearTimeout(run.kill); run.kill = null; run.stopping = false;
      run.g.gain.setTargetAtTime(VOL, x.currentTime, 0.6);
      return;
    }
    stopNow();
    const g = x.createGain();
    g.gain.value = 0; g.connect(dest); g.gain.setTargetAtTime(VOL, x.currentTime, 0.8);
    run = { x, g, kill: null, stopping: false, clockAt: null, end: null };
    run.end = play(x, g, run);
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
  // de klok: ms = hoe lang hij nog loopt (true = een hele klok), 0/false = geen klok. Elke aanroep zet hem opnieuw gelijk met de server.
  function tense(v) {
    const ms = v === true ? SPAN * 1000 : Number(v) || 0;
    if (!run) return;
    run.clockAt = ms > 0 ? run.x.currentTime + ms / 1000 - SPAN : null;
  }

  function play(x, out, r) {
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
    function pluck(f, t, g = 0.06, dec = 1.8, echo = 0.6) {   // grondtoon + twee boventonen; echo = hoeveel er naar de echo gaat
      const e = x.createGain(), send = x.createGain();
      e.gain.value = 0; e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + 0.004); e.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      send.gain.value = echo; e.connect(out); e.connect(send); send.connect(dly);
      for (const [rr, a] of [[1, 1], [2, 0.25], [3, 0.08]]) {
        const o = x.createOscillator(), og = x.createGain();
        o.frequency.value = f * rr; og.gain.value = a; o.connect(og); og.connect(e); o.start(t); o.stop(t + dec + 0.05);
      }
    }
    function beat(t, g) {   // zachte hartslag op D2
      const o = x.createOscillator(), e = x.createGain();
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(73.42, t + 0.08);
      e.gain.value = 0; e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + 0.008); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(e); e.connect(out); o.start(t); o.stop(t + 0.25);
    }
    function bass(t, f, g, dur) {   // zaagtand door een laagdoorlaatfilter
      const o = x.createOscillator(), lp = x.createBiquadFilter(), e = x.createGain();
      o.type = "sawtooth"; o.frequency.value = f; lp.type = "lowpass"; lp.frequency.value = 480;
      e.gain.value = 0; e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + 0.008); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(lp); lp.connect(e); e.connect(out); o.start(t); o.stop(t + dur + 0.02);
    }
    // plannen met 0,3 s vooruitkijken, elke 100 ms
    let ci = 0, nextChord = t0 + 8, nextNote = t0 + 1.5, step = 0, nextStep = t0, lastKey = "";
    const iv = setInterval(() => {
      const now = x.currentTime, ahead = now + 0.3;
      const c = r.clockAt != null ? now - r.clockAt : -1, on = c >= 0 && c < SPAN, last = on && c >= SPAN - 5, key = `${on}|${last}`;
      if (key !== lastKey) {   // de klok begint, gaat de laatste 5 s in of stopt: klank bijstellen, het loopje uitlijnen op de akkoorden
        lastKey = key;
        padF.frequency.setTargetAtTime(!on ? 650 : last ? 1400 : 950, now, 0.5);
        if (!on) padG.gain.setTargetAtTime(1, now, 0.8);
        // een akkoordwissel (elke 8 s = 4 maten van 120 bpm) valt altijd op de eerste tel
        const k = Math.floor((nextChord - (now + 0.05)) / 0.25);
        nextStep = nextChord - 0.25 * k; step = (8 - (k % 8)) % 8;
      }
      if (on) padG.gain.setTargetAtTime(last ? 0.3 : 0.6, now, last ? 0.25 : 0.6);   // de bodem zakt weg: het loopje neemt het over
      while (nextChord < ahead) {   // tijdens de klok springen de akkoorden (glijden botst met het loopje)
        ci = (ci + 1) % CH.length;
        CH[ci].forEach((f, i) => voices[i].forEach((o) => o.frequency.setTargetAtTime(f, nextChord, on ? 0.03 : 0.35)));
        nextChord += 8;
      }
      while (nextNote < ahead) {   // de losse glinsternoten; niet tijdens de klok (die vallen buiten de maat)
        if (!on) {
          pluck(PENTA[Math.floor(Math.random() * PENTA.length)], nextNote);
          if (Math.random() < 0.3) pluck(PENTA[Math.floor(Math.random() * PENTA.length)], nextNote + 0.21, 0.04);
        }
        nextNote += 1.2 + Math.random() * 2.6;
      }
      if (on) {
        while (nextStep < ahead) {
          const cc = nextStep - r.clockAt;
          if (cc >= SPAN) break;   // niets na 0
          const v = CH[ci], L = cc >= SPAN - 5, k5 = Math.min(1, Math.max(0, (cc - (SPAN - 5)) / 5));
          const g = L ? 0.09 + 0.04 * k5 : 0.06 + 0.03 * Math.min(1, Math.max(0, cc) / 10);
          pluck([v[0] * 2, v[1] * 2, v[2] * 2, v[1] * 2][step % 4], nextStep, g, L ? 0.35 : 0.45, 0.12);
          if (step % 2 === 0) { beat(nextStep, L ? 0.17 : 0.11); bass(nextStep, v[0] / 2, L ? 0.1 : 0.07, 0.3); }
          step++;
          nextStep += L ? 0.25 - 0.1 * k5 : 0.25;   // de laatste 5 s: versnellen van 120 naar ±200 bpm
        }
      } else nextStep = Math.max(nextStep, now);
    }, 100);
    return () => { clearInterval(iv); nodes.forEach((o) => { try { o.stop(); } catch (e) {} }); try { wet.disconnect(); padG.disconnect(); } catch (e) {} };
  }

  return { start, stop, tense, get on() { return !!run && !run.stopping; } };
})();

/*
 * Composizione Algoritmo Boids - Sintesi Additiva Diretta
 * Durata totale: 3'20" (200 secondi) — struttura formale a più sezioni
 * Comunicazione: OSC via WebSocket su ws://localhost:8081
 *
 * Ogni sezione ha un parametro "reverb" (0-1), inviato una volta per
 * frame come messaggio OSC globale separato da quelli dei singoli boid:
 * /reverb <valore>. Qui i valori sono volutamente molto contrastati
 * (quasi 0 nelle sezioni veloci/secche, quasi 1 in quelle ferme/sospese)
 * perché in Max il riverbero/shimmer si somma al secco invece di
 * sostituirlo: più alto è il valore, più "nuvola" si sente sopra il
 * suono pulito, non al posto suo.
 */

let boids = [];
const NUM_BOIDS = 24; // Numero ideale di oscillatori per sintesi additiva
const DURATION_SECONDS = 228;
let startTime;
let oscPort;
let isOscConnected = false;

// Range di frequenze per la mappatura additiva. Sia il minimo che il
// massimo sono ora dinamici per sezione (vedi "fmin"/"fmax" nelle singole
// sezioni sotto, e params.freqMin/params.freqMax); le costanti *_DEFAULT
// servono solo come fallback per una sezione che non li specificasse.
const FREQ_MIN_DEFAULT = 80;
const FREQ_MAX_DEFAULT = 1046;

// Range di ampiezza (sinusoide e quadra) usati quando una sezione non
// specifica "ampSineMin/Max"/"ampSquareMin/Max". Il range sinusoidale di
// default [0.1, 1.0] riproduce esattamente il comportamento originale
// (un solo oscillatore sinusoidale, nessuna quadra).
const AMP_SINE_MIN_DEFAULT = 0.1;
const AMP_SINE_MAX_DEFAULT = 1.0;
const AMP_SQUARE_MIN_DEFAULT = 0.0;
const AMP_SQUARE_MAX_DEFAULT = 0.0;

// Parametri dinamici di simulazione
let params = {
  raggioVisuale: 40,
  massimaVelocita: 4.5,
  minimaVelocita: 2.5,
  forzaDiSeparazione: 3.0,
  forzaDiAllineamento: 0.15,
  forzaDiCoesione: 0.1,
  reverb: 0.1,
  fade: 0.08,
  // Frequenza minima e massima della mappatura additiva (Hz): variano per
  // sezione (vedi "fmin"/"fmax" nelle singole sezioni sotto), interpolate
  // esattamente come gli altri parametri formali durante le transizioni —
  // cosi' tutto il registro si allarga/restringe o si sposta in alto/basso
  // gradualmente da una sezione all'altra invece di scattare.
  freqMin: FREQ_MIN_DEFAULT,
  freqMax: FREQ_MAX_DEFAULT,
  // Min/max di ampiezza per la sinusoide e per l'onda quadra di ogni boid
  // (vedi Boid.sendOsc() per come vengono usati): TUTTI i boid emettono
  // sempre entrambe le forme d'onda alla stessa altezza, non alcuni l'una
  // e alcuni l'altra. Ogni boid si posiziona dentro la finestra [min,max]
  // della sezione corrente in base alla propria velocita' (esattamente
  // come avveniva prima per l'unica ampiezza sinusoidale), e la finestra
  // stessa varia da sezione a sezione.
  ampSineMin: AMP_SINE_MIN_DEFAULT,
  ampSineMax: AMP_SINE_MAX_DEFAULT,
  ampSquareMin: AMP_SQUARE_MIN_DEFAULT,
  ampSquareMax: AMP_SQUARE_MAX_DEFAULT,
  // Bias orizzontale (0 = nessun effetto, ~0.05 = convergenza morbida
  // verso una rotta orizzontale in 1-2s, valori alti tendono a creare
  // un equilibrio oscillante invece di un vero allineamento: vedi
  // Boid.update() per come viene applicato)
  biasOrizzontale: 0,
  // Direzione orizzontale imposta (0 = nessuna preferenza di verso,
  // 1 = da sinistra a destra, -1 = da destra a sinistra). Agisce sulla
  // componente orizzontale della velocità esattamente come biasOrizzontale
  // agisce su quella verticale: non è un verso "assoluto" per ogni singolo
  // boid ma una convergenza morbida, quindi il pan (mappato da X) scorre
  // in un'unica direzione invece di andare avanti e indietro a caso —
  // è questo scorrimento monotono del pan a creare l'effetto "campanellini"
  // (glissando stereo continuo invece di un tremolio stereo).
  direzioneOrizzontale: 0
};

// Limite massimo della "forza di sterzata" per fotogramma (classico
// maxForce di Reynolds). Senza questo limite, un peso alto come quello
// dell'allineamento nelle sezioni "Paralleli" genera accelerazioni molto
// più grandi della velocità massima consentita, e il gruppo entra in un
// ciclo di retroazione instabile invece di convergere stabilmente.
const MAX_FORCE = 0.4;

// Velocità di convergenza del bias di direzione orizzontale (quanto
// rapidamente vx si avvicina al bersaglio +-massimaVelocita ogni frame).
// Stessa scala di grandezza di un valore tipico di "horiz", scelta per
// dare una convergenza morbida in 1-2s senza essere percepita come uno
// scatto improvviso.
const HORIZ_DIR_RATE = 0.05;

// ---------------------------------------------------------------
// Struttura formale. Ogni sezione ha un target di parametri; "trans" è
// la durata (in secondi) della transizione morbida verso quel target,
// che parte sempre da dove i parametri si trovano realmente nell'istante
// in cui la sezione inizia (non dal bersaglio teorico della sezione
// precedente): così anche sezioni brevi incatenate producono
// un'evoluzione continua invece di scatti.
// "bounce: true" attiva il rimbalzo ai bordi invece del wrap toroidale
// (usato nelle sezioni "Caos"); dove manca resta il wrap toroidale,
// necessario per l'allineamento totale in "Paralleli" e per "Rotante".
// ---------------------------------------------------------------
const sections = [
    //{ name: 'Rotante',                      t0: 0,  t1: 4,

   // trans: 0,  p: { sep: 0, ali: 0.10, coh: 12.70, raggio: 10000, maxVel: 5.3, minVel: 4.7, reverb: 0.50, fmax: 1200, fmin: 70, ampSineMin: 0.1, ampSineMax: 0.9, ampSquareMin: 0.05, ampSquareMax: 0.6 } },
   { name: 'Quasi immobile',               t0: 0.0,   t1: 4,
     reseed: true, bounce: true,
  trans: 0.0,  p: { sep: 0.3, ali: 0.10, coh: 0.00, raggio: 65,  maxVel: 0.1, minVel: 0.05, reverb: 0.00, fmax: 400, fmin: 100, ampSineMin: 0.05, ampSineMax: 0.5, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
  { name: 'Caos',                         t0: 4,   t1: 10,   bounce: true,
    trans: 8.0,  p: { sep: 3.0, ali: 0.15, coh: 0.10, raggio: 35,  maxVel: 4.5, minVel: 3.5, reverb: 0.00, fmax: 1300, fmin: 90, ampSineMin: 0.1, ampSineMax: 1.0, ampSquareMin: 0.0, ampSquareMax: 0.00 } },
  { name: 'Quasi immobile',               t0: 10,  t1: 18,
    trans: 5.0,  p: { sep: 1.5, ali: 0.10, coh: 0.40, raggio: 315, maxVel: 2.6, minVel: 0.95, reverb: 0.05, fmax: 1000, fmin: 160, ampSineMin: 0.05, ampSineMax: 0.5, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
  { name: 'Paralleli',                    t0: 18,  t1: 30,
    trans: 0.5,  p: { sep: 0.4, ali: 7.00, coh: 0.0,  raggio: 450, maxVel: 5.0, minVel: 4.2, reverb: 0.05, horiz: 0.05, dir: 1, fmax: 1550, fmin: 110, ampSineMin: 0.1, ampSineMax: 1.0, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
  { name: 'Quasi immobile',               t0: 30,  t1: 36,
    trans: 5.0,  p: { sep: 0.8, ali: 0.10, coh: 0.40, raggio: 25,  maxVel: 0.6, minVel: 0.05, reverb: 0.10, fmax: 1000, fmin: 90, ampSineMin: 0.05, ampSineMax: 0.5, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
  { name: 'Caos',                         t0: 36,  t1: 58,   bounce: true,
    trans: 4.5,  p: { sep: 3.0, ali: 0.15, coh: 0.10, raggio: 35,  maxVel: 6.5, minVel: 2.5, reverb: 0.05, fmax: 1300, fmin: 90, ampSineMin: 0.1, ampSineMax: 1.0, ampSquareMin: 0.0, ampSquareMax: 0.10 } },
  { name: 'Rotante',                      t0: 58,  t1: 64,   recenter: true,
    trans: 6.5,  p: { sep: 0.0, ali: 0.10, coh: 12.90, raggio: 1050, maxVel: 3.3, minVel: 2.7, reverb: 0.40, fmax: 1000, fmin: 170, ampSineMin: 0.1, ampSineMax: 0.9, ampSquareMin: 0.05, ampSquareMax: 0.2 } },
   { name: 'Esplosivo',                    t0: 64,  t1: 66,
    trans: 0.3,  p: { sep: 5.0, ali: 0.10, coh: 0.05, raggio: 70,  maxVel: 5.5, minVel: 3.0, reverb: 0.02, fmax: 1300, fmin: 80, ampSineMin: 0.15, ampSineMax: 1.0, ampSquareMin: 0.1, ampSquareMax: 0.8 } },
  { name: 'Rotante',                      t0: 66,  t1: 68,   recenter: true,

    trans: 1.5,  p: { sep: 0.0, ali: 0.10, coh: 12.70, raggio: 1000, maxVel: 3.3, minVel: 2.7, reverb: 0.20, fmax: 1200, fmin: 170, ampSineMin: 0.1, ampSineMax: 0.9, ampSquareMin: 0.05, ampSquareMax: 0.4 } },
  { name: 'Rotante',                      t0: 68,  t1: 72,   recenter: true,

    trans: 1.5,  p: { sep: 0.3, ali: 0.10, coh: 0.70, raggio: 1000, maxVel: 1.3, minVel: 0.7, reverb: 0.50, fmax: 1600, fmin: 170, ampSineMin: 0.1, ampSineMax: 0.9, ampSquareMin: 0.05, ampSquareMax: 0.0 } },
  { name: 'Esplosivo',                    t0: 72,  t1: 88, bounce: true,
    trans: 0.3,  p: { sep: 5.0, ali: 0.10, coh: 0.05, raggio: 70,  maxVel: 7.5, minVel: 6.0, reverb: 0.02, fmax: 1300, fmin: 100, ampSineMin: 0.15, ampSineMax: 0.3, ampSquareMin: 0.5, ampSquareMax: 1 } },
  { name: 'Paralleli',                    t0: 88,  t1: 98,
    trans: 0.5,  p: { sep: 0.4, ali: 7.00, coh: 0.0,  raggio: 450, maxVel: 5.0, minVel: 4.2, reverb: 0.05, horiz: 0.05, dir: 1, fmax: 2050, fmin: 80, ampSineMin: 0.1, ampSineMax: 1.0, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
  { name: 'Allineamento Spaziale / Glissandi di Massa', t0: 99, t1: 119,
    trans: 1.0,  p: { sep: 1.2, ali: 1.50, coh: 2.00, raggio: 100, maxVel: 6.0, minVel: 4.5, reverb: 0.40, horiz: 0.001, dir: 1, fmax: 2200, fmin: 80, ampSineMin: 0.1, ampSineMax: 1.0, ampSquareMin: 0.0, ampSquareMax: 0.3 } },
 
  { name: 'Caos (ripresa)',               t0: 119, t1: 122,  bounce: true,
    trans: 0.2,  p: { sep: 3.0, ali: 0.15, coh: 0.10, raggio: 35,  maxVel: 4.5, minVel: 2.5, reverb: 0.05, fmax: 1300, fmin: 90, ampSineMin: 0.1, ampSineMax: 1.0, ampSquareMin: 0.0, ampSquareMax: 0.35 } },
  { name: 'Immobile',                     t0: 122, t1: 126,
    trans: 0.2,  p: { sep: 0.2, ali: 0.05, coh: 0.10, raggio: 20,  maxVel: 0.25, minVel: 0.02, reverb: 0.45, fmax: 1050, fmin: 50, ampSineMin: 0.05, ampSineMax: 0.4, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
  { name: 'Esplosivo',                    t0: 127, t1: 133,  recenter: true, reseed: { fraction: 0.5 },
    trans: 0.3,  p: { sep: 5.0, ali: 0.10, coh: 0.05, raggio: 70,  maxVel: 5.5, minVel: 3.0, reverb: 0.02, fmax: 1300, fmin: 100, ampSineMin: 0.15, ampSineMax: 1.0, ampSquareMin: 0.1, ampSquareMax: 0.8 } },
  { name: 'Velocissimo paralleli',        t0: 133, t1: 143,
    trans: 1.0,  p: { sep: 0.25, ali: 7.50, coh: 0.0, raggio: 450, maxVel: 8.0, minVel: 7.0, reverb: 0.15, horiz: 0.05, dir: 1, fmax: 2250, fmin: 80, ampSineMin: 0.15, ampSineMax: 1.0, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
  { name: 'Immobile',                     t0: 143, t1: 145,
    trans: 0.2,  p: { sep: 0.2, ali: 0.02, coh: 2.10, raggio: 190, maxVel: 0.25, minVel: 0.02, reverb: 1.00, fmax: 1050, fmin: 50, ampSineMin: 0.05, ampSineMax: 0.4, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
  { name: 'Caos (ripresa)',               t0: 145, t1: 146,  bounce: true, reseed: true,
    trans: 0.2,  p: { sep: 3.0, ali: 0.15, coh: 0.10, raggio: 35,  maxVel: 4.5, minVel: 2.5, reverb: 0.05, fmax: 1300, fmin: 90, ampSineMin: 0.1, ampSineMax: 1.0, ampSquareMin: 0.0, ampSquareMax: 0.35 } },
  { name: 'Immobile',                     t0: 146, t1: 146.5,
    reseed: true,
    trans: 0.2,  p: { sep: 0.2, ali: 0.05, coh: 3.10, raggio: 200, maxVel: 0.25, minVel: 0.02, reverb: 0.55, fmax: 1050, fmin: 70, ampSineMin: 0.05, ampSineMax: 0.4, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
   { name: 'Immobile',                     t0: 146.5, t1: 147,
    reseed: true,
    trans: 0.2,  p: { sep: 0.2, ali: 0.05, coh: 3.10, raggio: 200, maxVel: 0.25, minVel: 0.02, reverb: 0.95, fmax: 1050, fmin: 80, ampSineMin: 0.05, ampSineMax: 0.4, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
  { name: 'Immobile',                     t0: 147, t1: 148,
    reseed: true,
    trans: 0.2,  p: { sep: 0.2, ali: 0.05, coh: 3.10, raggio: 200, maxVel: 0.25, minVel: 0.02, reverb: 0.05, fmax: 1050, fmin: 150, ampSineMin: 0.05, ampSineMax: 0.4, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
  { name: 'Caos (ripresa)',               t0: 148, t1: 150,  bounce: true, reseed: true,
    trans: 0.2,  p: { sep: 3.0, ali: 0.15, coh: 1.10, raggio: 35,  maxVel: 4.5, minVel: 2.5, reverb: 0.05, fmax: 1300, fmin: 80, ampSineMin: 0.1, ampSineMax: 1.0, ampSquareMin: 0.0, ampSquareMax: 0.35 } },
  { name: 'Immobile',                     t0: 150, t1: 150.5,
    trans: 0.2,  p: { sep: 0.2, ali: 0.05, coh: 0.40, raggio: 200, maxVel: 0.25, minVel: 0.02, reverb: 0.35, fmax: 1050, fmin: 250, ampSineMin: 0.05, ampSineMax: 0.4, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
   { name: 'Quasi immobile',               t0: 150.5,   t1: 151,
     reseed: true,
    trans: 0.0,  p: { sep: 0.3, ali: 0.10, coh: 0.00, raggio: 65,  maxVel: 0.1, minVel: 0.05, reverb: 0.00, fmax: 1000, fmin: 160, ampSineMin: 0.05, ampSineMax: 0.5, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
  { name: 'Quasi immobile',               t0: 151,   t1: 151.3,
     reseed: true,
    trans: 0.0,  p: { sep: 0.3, ali: 0.10, coh: 0.00, raggio: 65,  maxVel: 0.1, minVel: 0.05, reverb: 0.00, fmax: 1000, fmin: 90, ampSineMin: 0.05, ampSineMax: 0.5, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
  { name: 'Quasi immobile',               t0: 151.3,   t1: 151.7,
     reseed: true,
    trans: 0.0,  p: { sep: 0.3, ali: 0.10, coh: 0.00, raggio: 65,  maxVel: 0.1, minVel: 0.05, reverb: 0.00, fmax: 1000, fmin: 160, ampSineMin: 0.05, ampSineMax: 0.5, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
{ name: 'Quasi immobile',               t0: 151.7,   t1: 152,
     reseed: true,
    trans: 0.0,  p: { sep: 0.3, ali: 0.10, coh: 0.00, raggio: 65,  maxVel: 0.1, minVel: 0.05, reverb: 0.00, fmax: 1000, fmin: 90, ampSineMin: 0.05, ampSineMax: 0.5, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
  { name: 'Quasi immobile',               t0: 151.7,   t1: 152,
     reseed: true,
    trans: 0.0,  p: { sep: 0.3, ali: 0.10, coh: 0.00, raggio: 65,  maxVel: 0.1, minVel: 0.05, reverb: 0.00, fmax: 1000, fmin: 80, ampSineMin: 0.05, ampSineMax: 0.5, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
  { name: 'Quasi immobile',               t0: 152,   t1: 152.2,
     reseed: true,
    trans: 0.0,  p: { sep: 0.3, ali: 0.10, coh: 0.00, raggio: 65,  maxVel: 0.1, minVel: 0.05, reverb: 0.00, fmax: 1000, fmin: 60, ampSineMin: 0.05, ampSineMax: 0.5, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
  { name: 'Quasi immobile',               t0: 152.2,   t1: 153.4,
     reseed: true,
    trans: 0.0,  p: { sep: 0.3, ali: 0.10, coh: 0.00, raggio: 65,  maxVel: 0.1, minVel: 0.05, reverb: 0.00, fmax: 1000, fmin: 160, ampSineMin: 0.05, ampSineMax: 0.5, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
  { name: 'Quasi immobile',               t0: 152.4,   t1: 154,
     reseed: true,
    trans: 0.0,  p: { sep: 0.3, ali: 0.10, coh: 0.00, raggio: 65,  maxVel: 0.1, minVel: 0.05, reverb: 0.00, fmax: 1000, fmin: 80, ampSineMin: 0.05, ampSineMax: 0.5, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
   { name: 'Quasi immobile',               t0: 153.5,   t1: 154,
     reseed: true,
    trans: 0.0,  p: { sep: 0.3, ali: 0.10, coh: 0.00, raggio: 65,  maxVel: 0.1, minVel: 0.05, reverb: 0.00, fmax: 1000, fmin: 80, ampSineMin: 0.05, ampSineMax: 0.5, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
   { name: 'Quasi immobile',               t0: 154,   t1: 154.5,
     reseed: true,
    trans: 0.0,  p: { sep: 0.3, ali: 0.10, coh: 0.00, raggio: 65,  maxVel: 0.1, minVel: 0.05, reverb: 0.00, fmax: 1000, fmin: 360, ampSineMin: 0.05, ampSineMax: 0.5, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
  { name: 'Quasi immobile',               t0: 154.5,   t1: 155,
     reseed: true,
    trans: 0.0,  p: { sep: 0.3, ali: 0.10, coh: 0.00, raggio: 65,  maxVel: 0.1, minVel: 0.05, reverb: 0.00, fmax: 1000, fmin: 80, ampSineMin: 0.05, ampSineMax: 0.5, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
    { name: 'Quasi immobile',               t0: 155,   t1: 155.5,
     reseed: true,
    trans: 0.0,  p: { sep: 0.3, ali: 0.10, coh: 0.00, raggio: 65,  maxVel: 0.1, minVel: 0.05, reverb: 0.00, fmax: 1000, fmin: 70, ampSineMin: 0.05, ampSineMax: 0.5, ampSquareMin: 0.0, ampSquareMax: 0.0 } },
   { name: 'Paralleli',                    t0: 155.5,  t1: 160, 
    trans: 0.5,  p: { sep: 0.4, ali: 7.00, coh: 0.0,  raggio: 450, maxVel: 5.0, minVel: 4.2, reverb: 0.45, horiz: 0.05, dir: 1, fmax: 1150, fmin: 80, ampSineMin: 0.1, ampSineMax: 1.0, ampSquareMin: 0.0, ampSquareMax: 0.3 } },
   { name: 'Rotante',                      t0: 160,  t1: 166,   recenter: true,
    trans: 6.5,  p: { sep: 0.0, ali: 0.10, coh: 12.90, raggio: 1050, maxVel: 3.3, minVel: 2.7, reverb: 0.40, fmax: 1000, fmin: 170, ampSineMin: 0.1, ampSineMax: 0.9, ampSquareMin: 0.05, ampSquareMax: 0.2 } },
   { name: 'Esplosivo',                    t0: 166,  t1: 168,
    trans: 0.3,  p: { sep: 5.0, ali: 0.10, coh: 0.05, raggio: 70,  maxVel: 5.5, minVel: 3.0, reverb: 0.02, fmax: 1300, fmin: 80, ampSineMin: 0.15, ampSineMax: 1.0, ampSquareMin: 0.1, ampSquareMax: 0.8 } },
  { name: 'Rotante',                      t0: 168,  t1: 170,   recenter: true,

    trans: 1.5,  p: { sep: 0.0, ali: 0.10, coh: 12.70, raggio: 1000, maxVel: 3.3, minVel: 2.7, reverb: 0.20, fmax: 1200, fmin: 170, ampSineMin: 0.1, ampSineMax: 0.9, ampSquareMin: 0.05, ampSquareMax: 0.4 } },
  { name: 'Rotante',                      t0: 170,  t1: 172,   recenter: true,

    trans: 1.5,  p: { sep: 0.3, ali: 0.10, coh: 0.70, raggio: 1000, maxVel: 1.3, minVel: 0.7, reverb: 0.50, fmax: 1600, fmin: 170, ampSineMin: 0.1, ampSineMax: 0.9, ampSquareMin: 0.05, ampSquareMax: 0.0 } },
  { name: 'Esplosivo',                    t0: 172,  t1: 188, bounce: true,
    trans: 0.3,  p: { sep: 5.0, ali: 0.10, coh: 0.05, raggio: 70,  maxVel: 7.5, minVel: 6.0, reverb: 0.02, fmax: 1300, fmin: 100, ampSineMin: 0.15, ampSineMax: 0.3, ampSquareMin: 0.5, ampSquareMax: 1 } },
  { name: 'Paralleli',                    t0: 188,  t1: 193, 
    trans: 0.5,  p: { sep: 0.4, ali: 7.00, coh: 0.0,  raggio: 450, maxVel: 5.0, minVel: 4.2, reverb: 0.35, horiz: 0.05, dir: 1, fmax: 1150, fmin: 80, ampSineMin: 0.1, ampSineMax: 1.0, ampSquareMin: 0.0, ampSquareMax: 0.3 } },
  { name: 'Allineamento Spaziale / Glissandi di Massa', t0: 193, t1: 195, recenter: true,
    trans: 3.0,  p: { sep: 1.2, ali: 1.50, coh: 2.00, raggio: 100, maxVel: 9.0, minVel: 4.5, reverb: 0.55, horiz: 0.001, dir: 1, fmax: 2200, fmin: 90, ampSineMin: 0.1, ampSineMax: 1.0, ampSquareMin: 0.0, ampSquareMax: 0.3 } },
  { name: 'Allineamento Spaziale / Glissandi di Massa', t0: 195, t1: 213,
    trans: 3.0,  p: { sep: 1.2, ali: 1.50, coh: 2.00, raggio: 100, maxVel: 6.0, minVel: 4.5, reverb: 0.55, fmax: 1100, fmin: 80, ampSineMin: 0.1, ampSineMax: 1.0, ampSquareMin: 0.0, ampSquareMax: 0.3 } },
  { name: 'Rotante',                      t0: 213,  t1: 213.3,   recenter: true, recenterRate: 0.08,
    trans: .5,  p: { sep: 0.0, ali: 0.10, coh: 12.90, raggio: 1050, maxVel: 3.3, minVel: 2.7, reverb: 0.40, fmax: 400, fmin: 375, ampSineMin: 0.1, ampSineMax: 0.9, ampSquareMin: 0.05, ampSquareMax: 0.6 } },
   { name: 'Esplosivo',                    t0: 213.3,  t1: 215,
    trans: 0.3,  p: { sep: 5.0, ali: 0.10, coh: 0.05, raggio: 70,  maxVel: 5.5, minVel: 3.0, reverb: 0.12, fmax: 1300, fmin: 100, ampSineMin: 0.00, ampSineMax: 0.0, ampSquareMin: 0.0, ampSquareMax: 1.0 } },
   { name: 'Velocissimo paralleli',        t0: 215, t1: 228,
    // All'inizio della sezione (p) i boid NON hanno ancora un bias/verso
    // orizzontale imposto: si muovono come un normale "Paralleli" ad alta
    // velocita', con una direzione comune ma non necessariamente verso
    // destra. horiz/dir crescono poi gradualmente per tutta la sezione
    // (vedi finalRamp sotto) fino al pieno "paralleli verso destra"
    // esattamente alla fine del brano: il finale e' un arrivo, non uno
    // stato gia' raggiunto nei primi secondi.
    trans: 1.0,  p: { sep: 0.25, ali: 7.50, coh: 0.0, raggio: 450, maxVel: 4.0, minVel: 2.0, reverb: 0.45, fmax: 2250, fmin: 90, ampSineMin: 0.15, ampSineMax: 1.0, ampSquareMin: 0.0, ampSquareMax: 0.3 },
    // rampa interna sul finale: horiz e dir (oltre a reverb) crescono con
    // la stessa progressione lineare 0->1 sull'intera sezione (180-200s),
    // cosi' che il moto orizzontale verso destra si costruisca durante
    // tutto il finale invece di scattare nei primi 1-2s e restare statico.
    // ampSquareMax cresce anch'esso da 0.7 a 1.0: la quadra diventa un
    // po' piu' presente proprio nell'ultimo tratto, per dare mordente
    // timbrico all'arrivo del finale.
    finalRamp: { ali: 7.50, coh: 0.0, reverb: 0.05, horiz: 0.05, dir: 1, ampSineMax: 1.0 } },
];

function lerpP(a, b, t) {
  return {
    sep: lerp(a.sep, b.sep, t),
    ali: lerp(a.ali, b.ali, t),
    coh: lerp(a.coh, b.coh, t),
    raggio: lerp(a.raggio, b.raggio, t),
    maxVel: lerp(a.maxVel, b.maxVel, t),
    minVel: lerp(a.minVel, b.minVel, t),
    reverb: lerp(a.reverb, b.reverb, t),
    // horiz e dir sono opzionali nelle sezioni: assenti = 0 (nessun bias,
    // nessuna direzione imposta)
    horiz: lerp(a.horiz || 0, b.horiz || 0, t),
    dir: lerp(a.dir || 0, b.dir || 0, t),
    // fmin/fmax sono presenti in tutte le sezioni correnti, ma il fallback
    // alle costanti *_DEFAULT protegge una eventuale sezione futura che non
    // li specificasse (nullish coalescing: 0 non è un valore plausibile
    // qui, ma ?? e' comunque corretto anche se lo fosse)
    fmin: lerp(a.fmin ?? FREQ_MIN_DEFAULT, b.fmin ?? FREQ_MIN_DEFAULT, t),
    fmax: lerp(a.fmax ?? FREQ_MAX_DEFAULT, b.fmax ?? FREQ_MAX_DEFAULT, t),
    // Ampiezze sinusoide/quadra: stesso schema di fallback.
    ampSineMin: lerp(a.ampSineMin ?? AMP_SINE_MIN_DEFAULT, b.ampSineMin ?? AMP_SINE_MIN_DEFAULT, t),
    ampSineMax: lerp(a.ampSineMax ?? AMP_SINE_MAX_DEFAULT, b.ampSineMax ?? AMP_SINE_MAX_DEFAULT, t),
    ampSquareMin: lerp(a.ampSquareMin ?? AMP_SQUARE_MIN_DEFAULT, b.ampSquareMin ?? AMP_SQUARE_MIN_DEFAULT, t),
    ampSquareMax: lerp(a.ampSquareMax ?? AMP_SQUARE_MAX_DEFAULT, b.ampSquareMax ?? AMP_SQUARE_MAX_DEFAULT, t),
  };
}

function setup() {
  createCanvas(1080, 1080);

  // Inizializzazione della connessione OSC (WebSocket client)
  oscPort = new OSC({
    plugin: new OSC.WebsocketClientPlugin({
      host: 'localhost',
      port: 8081
    })
  });

  oscPort.on('open', () => {
    isOscConnected = true;
    console.log("Connessione OSC WebSocket aperta su porta 8081");
  });

  try {
    oscPort.open();
  } catch (e) {
    console.warn("Server WebSocket OSC non rilevato su ws://localhost:8081. Esecuzione solo grafica.");
  }

  // Popolazione iniziale dei boids
  for (let i = 0; i < NUM_BOIDS; i++) {
    boids.push(new Boid(i));
  }

  startTime = millis();
}

function draw() {
  // Gestione scia visiva (fade background)
  background(15, 15, 20, 255 * params.fade);

  // 1. Calcolo del tempo e della struttura formale (200 secondi)
  let elapsedTime = (millis() - startTime) / 1000;
  updateFormalPhases(min(elapsedTime, DURATION_SECONDS));

  // 2. Aggiornamento, rendering e invio dati dei Boids
  for (let boid of boids) {
    boid.update();
    boid.draw();
    if (isOscConnected) {
      boid.sendOsc();
    }
  }

  // 2b. Invio del parametro globale di riverbero/shimmer, una volta per
  // frame (non per ogni boid: è un parametro della sezione, non del
  // singolo agente)
  if (isOscConnected) {
    oscPort.send(new OSC.Message('/reverb', params.reverb));
  }

  // 3. Visualizzazione Info a schermo
  drawHUD(elapsedTime);
}

/**
 * Trova la sezione corrente (l'ultima con t0 <= t: se c'è un buco tra
 * due sezioni, questo estende semplicemente la precedente, invece di
 * saltare per errore ai parametri dell'ultima sezione della lista).
 */
function currentSectionIndex(t) {
  let idx = 0;
  for (let i = 0; i < sections.length; i++) {
    if (t >= sections[i].t0) idx = i;
    else break;
  }
  return idx;
}

let lastSectionIdx = -1;
let blendStartParams = null;
let currentSectionName = '';
let bounceMode = false; // true nelle sezioni "Caos": rimbalzo ai bordi invece del wrap toroidale

/**
 * Riposiziona una frazione dei boid in punti casuali del canvas, con una
 * nuova velocità casuale coerente con la sezione che sta iniziando — lo
 * stesso effetto che si ottiene premendo "play" da capo (nuove posizioni Y
 * = nuove frequenze = un "accordo" diverso), ma innescato a comando in un
 * punto preciso della timeline invece che solo all'avvio dello sketch.
 * fraction=1 rimescola tutti i 24 boid, fraction=0.3 solo una parte di essi
 * (alcune "note" nuove si aggiungono a quelle già in corso).
 */
function reseedBoids(fraction, maxVel) {
  const n = Math.round(boids.length * constrain(fraction, 0, 1));
  const indices = [];
  while (indices.length < n && indices.length < boids.length) {
    const i = Math.floor(random(boids.length));
    if (!indices.includes(i)) indices.push(i);
  }
  for (const i of indices) {
    const b = boids[i];
    b.posizione = createVector(random(width), random(height));
    b.velocita = p5.Vector.random2D().mult(random(1, Math.max(1, maxVel)));
    b.accelerazione = createVector(0, 0);
  }
}

/**
 * Trasla tutto lo stormo (solo le posizioni, le velocità restano intatte)
 * in modo che il suo centro di massa coincida con il centro del canvas.
 * Usato DURANTE le sezioni "Rotante", a ogni frame (non solo all'inizio):
 * con un raggio di visione così alto (>1000, più del massimo possibile
 * sul toro) ogni boid considera tutti gli altri come vicini, e la
 * coesione calcolata boid-per-boid con offset toroidali non fissa un
 * centro di massa globale stabile — in pratica il centroide del gruppo
 * va alla deriva (anche di centinaia di pixel in pochi secondi), quindi
 * una correzione singola all'inizio della sezione non basta. Richiamando
 * questa funzione a ogni frame il centro resta "agganciato" al centro
 * del canvas per tutta la sezione: la correzione è una traslazione
 * rigida che non cambia le posizioni relative né le velocità, quindi non
 * altera la dinamica della rotazione, sposta solo il punto attorno al
 * quale avviene.
 *
 * La media va calcolata come media circolare (su un cerchio, non su una
 * retta) perché lo spazio è toroidale: una semplice media aritmetica di
 * due boid ai lati opposti del canvas (es. x=5 e x=1075) darebbe un
 * centro sbagliato a x=540 (il mezzo "esterno"), mentre quei due boid
 * sono in realtà vicini tra loro attraverso il bordo, e il loro centro
 * reale è vicino a x=1080/0.
 */
// Quanta parte dello spostamento necessario viene corretta ad ogni frame
// quando una sezione non specifica il proprio "recenterRate". 1 = i boid
// saltano istantaneamente al centro esatto ogni frame (il comportamento
// originale, tuttora usato dove gia' verificato andar bene). Un valore
// piu' basso rende la correzione un'"attrazione" morbida verso il centro
// invece di un teletrasporto rigido ad ogni frame.
const RECENTER_RATE_DEFAULT = 1;

function recenterBoids(rate = RECENTER_RATE_DEFAULT) {
  let sumSinX = 0, sumCosX = 0, sumSinY = 0, sumCosY = 0;
  for (const b of boids) {
    const ax = (b.posizione.x / width) * Math.PI * 2;
    const ay = (b.posizione.y / height) * Math.PI * 2;
    sumSinX += Math.sin(ax); sumCosX += Math.cos(ax);
    sumSinY += Math.sin(ay); sumCosY += Math.cos(ay);
  }
  const meanAx = Math.atan2(sumSinX, sumCosX);
  const meanAy = Math.atan2(sumSinY, sumCosY);
  const meanX = (((meanAx / (Math.PI * 2)) * width) + width) % width;
  const meanY = (((meanAy / (Math.PI * 2)) * height) + height) % height;
  // Solo una frazione ("rate") dello spostamento necessario viene
  // applicata questo frame: con rate=1 equivale esattamente al
  // comportamento originale (correzione totale e istantanea); con rate
  // piu' basso il centro si avvicina gradualmente nell'arco di diversi
  // frame invece di scattarci sopra in un colpo.
  const shiftX = (width / 2 - meanX) * rate;
  const shiftY = (height / 2 - meanY) * rate;
  for (const b of boids) {
    b.posizione.x = (b.posizione.x + shiftX + width) % width;
    b.posizione.y = (b.posizione.y + shiftY + height) % height;
  }
}

/**
 * Applica la sezione corrente. Quando la sezione cambia, congela i
 * parametri correnti come punto di partenza della nuova transizione:
 * così, anche se la transizione precedente non aveva fatto in tempo a
 * completarsi, non c'è nessuno scatto. Il finale ha in più una rampa
 * interna su allineamento, coesione e riverbero.
 */
function updateFormalPhases(t) {
  const idx = currentSectionIndex(t);
  const cur = sections[idx];

  if (idx !== lastSectionIdx) {
    blendStartParams = {
      sep: params.forzaDiSeparazione,
      ali: params.forzaDiAllineamento,
      coh: params.forzaDiCoesione,
      raggio: params.raggioVisuale,
      maxVel: params.massimaVelocita,
      minVel: params.minimaVelocita,
      reverb: params.reverb,
      horiz: params.biasOrizzontale,
      dir: params.direzioneOrizzontale,
      fmin: params.freqMin,
      fmax: params.freqMax,
      ampSineMin: params.ampSineMin,
      ampSineMax: params.ampSineMax,
      ampSquareMin: params.ampSquareMin,
      ampSquareMax: params.ampSquareMax,
    };
    lastSectionIdx = idx;

    // Reseed: scatta una volta sola, esattamente all'inizio della sezione
    if (cur.reseed) {
      const fraction = cur.reseed === true ? 1.0 : (cur.reseed.fraction ?? 1.0);
      reseedBoids(fraction, cur.p.maxVel);
    }
  }

  // Recenter: a ogni frame, non solo all'inizio della sezione (vedi
  // recenterBoids() sopra per il perché) — usato dalle sezioni "Rotante"
  // per garantire che la rotazione sia sempre visibile al centro del
  // canvas invece di andare alla deriva verso un bordo. "recenterRate"
  // e' opzionale: se assente la correzione resta istantanea (rate 1,
  // comportamento originale); una sezione puo' specificarne uno piu'
  // basso per una correzione piu' lenta e morbida.
  if (cur.recenter) {
    recenterBoids(cur.recenterRate ?? RECENTER_RATE_DEFAULT);
  }

  let target = cur.p;

  // Rampa interna del finale (Allineamento Spaziale / Glissandi di Massa;
  // Velocissimo paralleli finale). horiz/dir sono opzionali come altrove
  // (|| 0 di default) cosi' una sezione con finalRamp puo' scegliere di
  // ramparli (es. il finale, verso il pieno "paralleli verso destra")
  // senza che le altre sezioni con finalRamp debbano specificarli.
  if (cur.finalRamp) {
    const p3 = constrain((t - cur.t0) / (cur.t1 - cur.t0), 0, 1);
    target = {
      ...cur.p,
      ali: lerp(cur.p.ali, cur.finalRamp.ali, p3),
      coh: lerp(cur.p.coh, cur.finalRamp.coh, p3),
      reverb: lerp(cur.p.reverb, cur.finalRamp.reverb, p3),
      horiz: lerp(cur.p.horiz || 0, cur.finalRamp.horiz || 0, p3),
      dir: lerp(cur.p.dir || 0, cur.finalRamp.dir || 0, p3),
      fmin: lerp(cur.p.fmin ?? FREQ_MIN_DEFAULT, cur.finalRamp.fmin ?? cur.p.fmin ?? FREQ_MIN_DEFAULT, p3),
      fmax: lerp(cur.p.fmax ?? FREQ_MAX_DEFAULT, cur.finalRamp.fmax ?? cur.p.fmax ?? FREQ_MAX_DEFAULT, p3),
      ampSineMin: lerp(cur.p.ampSineMin ?? AMP_SINE_MIN_DEFAULT, cur.finalRamp.ampSineMin ?? cur.p.ampSineMin ?? AMP_SINE_MIN_DEFAULT, p3),
      ampSineMax: lerp(cur.p.ampSineMax ?? AMP_SINE_MAX_DEFAULT, cur.finalRamp.ampSineMax ?? cur.p.ampSineMax ?? AMP_SINE_MAX_DEFAULT, p3),
      ampSquareMin: lerp(cur.p.ampSquareMin ?? AMP_SQUARE_MIN_DEFAULT, cur.finalRamp.ampSquareMin ?? cur.p.ampSquareMin ?? AMP_SQUARE_MIN_DEFAULT, p3),
      ampSquareMax: lerp(cur.p.ampSquareMax ?? AMP_SQUARE_MAX_DEFAULT, cur.finalRamp.ampSquareMax ?? cur.p.ampSquareMax ?? AMP_SQUARE_MAX_DEFAULT, p3),
    };
  }

  // Transizione morbida dal valore reale al momento del cambio sezione
  const dt = t - cur.t0;
  const blend = cur.trans > 0 ? constrain(dt / cur.trans, 0, 1) : 1;
  const eff = blend < 1 ? lerpP(blendStartParams, target, blend) : target;

  params.forzaDiSeparazione = eff.sep;
  params.forzaDiAllineamento = eff.ali;
  params.forzaDiCoesione = eff.coh;
  params.raggioVisuale = eff.raggio;
  params.massimaVelocita = eff.maxVel;
  params.minimaVelocita = eff.minVel;
  params.reverb = eff.reverb;
  // fallback a 0: "target" puo' arrivare direttamente da cur.p (quando non
  // c'e' transizione in corso), che per la maggior parte delle sezioni non
  // specifica affatto "horiz"/"dir" (campi opzionali, vedi lerpP sopra)
  params.biasOrizzontale = eff.horiz || 0;
  params.direzioneOrizzontale = eff.dir || 0;
  params.freqMin = eff.fmin ?? FREQ_MIN_DEFAULT;
  params.freqMax = eff.fmax ?? FREQ_MAX_DEFAULT;
  params.ampSineMin = eff.ampSineMin ?? AMP_SINE_MIN_DEFAULT;
  params.ampSineMax = eff.ampSineMax ?? AMP_SINE_MAX_DEFAULT;
  params.ampSquareMin = eff.ampSquareMin ?? AMP_SQUARE_MIN_DEFAULT;
  params.ampSquareMax = eff.ampSquareMax ?? AMP_SQUARE_MAX_DEFAULT;

  currentSectionName = cur.name;
  bounceMode = !!cur.bounce;
}

/**
 * Classe Boid estesa con mappatura additiva diretta
 */
class Boid {
  constructor(id) {
    this.id = id;
    this.posizione = createVector(random(width), random(height));
    this.velocita = p5.Vector.random2D().mult(random(1, params.massimaVelocita));
    this.accelerazione = createVector(0, 0);
    this.colore = color(random(100, 255), random(150, 255), random(200, 255));
  }

  update() {
    this.flock();
    this.accelerazione.limit(MAX_FORCE); // taglia la sterzata: vedi MAX_FORCE sopra
    this.velocita.add(this.accelerazione);

    // Limita la velocità massima
    this.velocita.limit(params.massimaVelocita);

    // Velocità minima di crociera (variabile per sezione formale)
    if (this.velocita.mag() < params.minimaVelocita) {
      this.velocita.setMag(params.minimaVelocita || 0.0001);
    }

    // Bias orizzontale: smorza la componente verticale della velocita' ogni
    // frame (decadimento esponenziale verso vy=0), cosi' nelle sezioni
    // "Paralleli" i boid convergono verso una rotta orizzontale invece che
    // verso una direzione comune casuale. E' deliberatamente separato dal
    // budget di sterzata (MAX_FORCE) sopra: agendo direttamente sulla
    // velocita' invece che come forza aggiuntiva, non compete con
    // separazione/allineamento/coesione per lo stesso "budget" e il suo
    // effetto resta prevedibile indipendentemente dagli altri pesi.
    if (params.biasOrizzontale > 0) {
      this.velocita.y *= (1 - params.biasOrizzontale);
    }

    // Direzione orizzontale imposta: avvicina vx al bersaglio
    // +-massimaVelocita (stesso meccanismo del bias orizzontale, applicato
    // all'asse X). Dato che X e' mappato a pan, questo fa scorrere il pan
    // in un'unica direzione (sinistra->destra o viceversa) in modo
    // continuo e monotono invece che a caso: e' questo scorrimento
    // regolare, non la sola orizzontalita', a dare l'effetto "campanellini".
    if (params.direzioneOrizzontale !== 0) {
      const targetVx = params.direzioneOrizzontale * params.massimaVelocita;
      this.velocita.x = lerp(this.velocita.x, targetVx, HORIZ_DIR_RATE);
    }

    this.posizione.add(this.velocita);
    this.accelerazione.mult(0); // Reset accelerazione

    if (bounceMode) {
      // Rimbalzo elastico ai bordi (sezioni "Caos"): il boid resta dentro
      // il canvas e la componente di velocità perpendicolare al bordo
      // si inverte, invece di ricomparire dal lato opposto.
      if (this.posizione.x < 0)      { this.posizione.x = 0;     this.velocita.x *= -1; }
      if (this.posizione.x > width)  { this.posizione.x = width; this.velocita.x *= -1; }
      if (this.posizione.y < 0)      { this.posizione.y = 0;      this.velocita.y *= -1; }
      if (this.posizione.y > height) { this.posizione.y = height; this.velocita.y *= -1; }
    } else {
      // Bordi toroidali (torus wrapping), usati in tutte le altre sezioni:
      // ci si affida al wrap per l'allineamento totale in "Paralleli" e
      // per la rotazione in "Rotante". Quando e' impostata una direzione
      // orizzontale, e' proprio questo wrap a far "rientrare" ogni boid
      // dal lato opposto quando esce, cosi' lo scorrimento di pan sinistra
      // -> destra riparte da capo invece di fermarsi al bordo.
      this.posizione.x = (this.posizione.x + width) % width;
      this.posizione.y = (this.posizione.y + height) % height;
    }
  }

  applyForce(force) {
    this.accelerazione.add(force);
  }

  flock() {
    let sep = this.separazione();
    let ali = this.allineamento();
    let coh = this.coesione();

    sep.mult(params.forzaDiSeparazione);
    ali.mult(params.forzaDiAllineamento);
    coh.mult(params.forzaDiCoesione);

    this.applyForce(sep);
    this.applyForce(ali);
    this.applyForce(coh);
  }

  // Distanza e direzione più corte su un piano toroidale: dato che i
  // boid escono da un bordo e rientrano dall'altro, due boid vicini
  // ai lati opposti dello schermo sono in realtà vicini. Senza questo,
  // "separazione", "allineamento" e "coesione" si spezzano in gruppi
  // isolati che non si vedono a vicenda attraverso i bordi.
  toroidalDelta(other) {
    let dx = this.posizione.x - other.posizione.x;
    let dy = this.posizione.y - other.posizione.y;
    if (!bounceMode) {
      // Nelle sezioni toroidali, due boid ai lati opposti dello schermo
      // sono in realtà vicini. In modalità rimbalzo lo spazio non è più
      // un toro, quindi questa correzione va disattivata.
      if (dx > width / 2) dx -= width;
      if (dx < -width / 2) dx += width;
      if (dy > height / 2) dy -= height;
      if (dy < -height / 2) dy += height;
    }
    return createVector(dx, dy);
  }

  separazione() {
    let steer = createVector(0, 0);
    let count = 0;
    for (let other of boids) {
      if (other === this) continue;
      let diff = this.toroidalDelta(other);
      let d = diff.mag();
      if (d < params.raggioVisuale && d > 0) {
        diff.normalize();
        diff.div(d);
        steer.add(diff);
        count++;
      }
    }
    if (count > 0) steer.div(count);
    if (steer.mag() > 0) {
      steer.normalize().mult(params.massimaVelocita).sub(this.velocita);
    }
    return steer;
  }

  allineamento() {
    let sum = createVector(0, 0);
    let count = 0;
    for (let other of boids) {
      if (other === this) continue;
      let d = this.toroidalDelta(other).mag();
      if (d < params.raggioVisuale) {
        sum.add(other.velocita);
        count++;
      }
    }
    if (count > 0) {
      sum.div(count).normalize().mult(params.massimaVelocita);
      let steer = p5.Vector.sub(sum, this.velocita);
      return steer;
    }
    return createVector(0, 0);
  }

  coesione() {
    let sumOffset = createVector(0, 0);
    let count = 0;
    for (let other of boids) {
      if (other === this) continue;
      let offset = other.toroidalDelta(this); // vettore da "this" a "other", corretto sul toro
      let d = offset.mag();
      if (d < params.raggioVisuale) {
        sumOffset.add(offset);
        count++;
      }
    }
    if (count > 0) {
      sumOffset.div(count);
      let target = p5.Vector.add(this.posizione, sumOffset);
      return this.seek(target);
    }
    return createVector(0, 0);
  }

  seek(target) {
    let desired = p5.Vector.sub(target, this.posizione);
    desired.normalize().mult(params.massimaVelocita);
    return p5.Vector.sub(desired, this.velocita);
  }

  draw() {
    fill(this.colore);
    noStroke();
    let theta = this.velocita.heading() + HALF_PI;
    push();
    translate(this.posizione.x, this.posizione.y);
    rotate(theta);
    beginShape();
    vertex(0, -6);
    vertex(-4, 6);
    vertex(4, 6);
    endShape(CLOSE);
    pop();
  }

  /**
   * Mappatura dei dati audio e invio via OSC a Max/MSP
   */
  sendOsc() {
    // Y mapped a frequenza logaritmica (in alto frequenze acute, in basso gravi)
    // -- sia il fondo (params.freqMin) che il tetto (params.freqMax) ora
    // variano per sezione, vedi "fmin"/"fmax" nelle sezioni e
    // params.freqMin/params.freqMax sopra
    let normY = 1.0 - (this.posizione.y / height);
    let freq = params.freqMin * Math.pow(params.freqMax / params.freqMin, normY);

    // X mapped a Panpot (0.0 = Left, 1.0 = Right)
    let pan = constrain(this.posizione.x / width, 0.0, 1.0);

    // Modulo della velocità mapped ad ampiezza/gain degli oscillatori.
    // Ogni boid emette SEMPRE sia la sinusoide che la quadra (non e' una
    // scelta per-boid): ciascuna ha la propria finestra [min,max], che
    // varia per sezione (vedi params.ampSineMin/Max e ampSquareMin/Max
    // sopra). Con i default (ampSineMin=0.1, ampSineMax=1.0,
    // ampSquareMin=ampSquareMax=0) questo riproduce esattamente il
    // comportamento originale a sola sinusoide.
    let speed = this.velocita.mag() / params.massimaVelocita;
    let ampSine = constrain(speed, params.ampSineMin, params.ampSineMax);
    let ampSquare = constrain(speed, params.ampSquareMin, params.ampSquareMax);

    // Compensazione approssimata delle curve isofoniche (Fletcher-Munson):
    // l'orecchio è più sensibile verso i medio-acuti, quindi le voci sopra
    // 300 Hz vengono leggermente attenuate e quelle sotto leggermente
    // rinforzate, per percepire tutte le voci a un livello più uniforme.
    // Si applica identicamente a entrambe le forme d'onda, dato che
    // condividono la stessa frequenza.
    let isoFactor = Math.pow(300 / freq, 0.15);
    ampSine *= isoFactor;
    ampSquare *= isoFactor;

    // Invio messaggio OSC strutturato per Max:
    // /boid [id] [freq] [ampSine] [ampSquare] [pan]
    let message = new OSC.Message('/boid', this.id, freq, ampSine, ampSquare, pan);
    oscPort.send(message);
  }
}

function drawHUD(elapsedTime) {
  fill(255);
  textSize(12);
  textFont('monospace');
  text(`Tempo: ${formatTime(elapsedTime)} / ${formatTime(DURATION_SECONDS)}`, 20, 30);
  text(`Sezione: ${currentSectionName}`, 20, 48);
  text(`Riverbero/shimmer: ${params.reverb.toFixed(2)}`, 20, 66);
  text(`OSC WebSocket: ${isOscConnected ? "CONNESSO" : "NON CONNESSO (ws://localhost:8081)"}`, 20, 84);
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}'${sec.toString().padStart(2, '0')}"`;
}
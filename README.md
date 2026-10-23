# Comporre condizioni

Sistema Boids in p5.js per sintesi additiva a 24 voci in Max/MSP.

Ventiquattro agenti, guidati dall'algoritmo Boids di Craig Reynolds (separazione, allineamento, coesione), sono simulati in p5.js. Ogni agente è una voce di sintesi additiva in Max/MSP. Il compositore non scrive eventi ma condizioni: la forma è composta, mentre accordi e percorsi delle singole voci emergono dal comportamento dello stormo e cambiano a ogni esecuzione.

**Video:** https://youtu.be/m9askKgihQM

## Mappatura

Ogni boid invia a Max, a ogni frame, il messaggio OSC:

```
/boid <id> <freq> <ampSine> <ampSquare> <pan>
```

| Parametro del boid | Parametro sonoro |
|---|---|
| Posizione verticale | Frequenza, su scala logaritmica (in alto acuto, in basso grave). Il registro varia per sezione, da un minimo di 50 Hz a un massimo di 2250 Hz |
| Posizione orizzontale | Pan stereo |
| Velocità | Ampiezza di una sinusoide e di un'onda quadra alla stessa frequenza, ciascuna con una finestra di ampiezza propria per sezione |

Le ampiezze sono compensate in modo approssimato secondo le curve isofoniche. Un messaggio globale `/reverb <0–1>` controlla, per sezione, la quantità di riverbero/shimmer sommata al suono secco.

## Forma

Il brano dura 3′48″. La forma è una successione di sezioni che ritornano: *Caos*, *Quasi immobile*, *Paralleli*, *Rotante*, *Esplosivo*, *Allineamento spaziale / Glissandi di massa*. Ogni sezione definisce i pesi delle forze, il raggio di percezione, la velocità minima e massima, il registro e le ampiezze; il passaggio tra una sezione e l'altra è interpolato.

Due meccanismi inseriscono gesti formali deliberati nel processo:

- **recenter:** forza il centro di massa dello stormo verso il centro dello spazio. È usato nelle sezioni *Rotante*, prima delle esplosioni.
- **reseed:** riposiziona istantaneamente tutti gli agenti, o una parte di essi, in punti casuali dello spazio, producendo salti di frequenza.

L'intera struttura è definita nell'array `sections` in `sketch.js`.

## File

| File | Contenuto |
|---|---|
| `index.html`, `sketch.js`, `style.css` | Simulazione e visualizzazione in p5.js |
| `Gameti Riot.maxpat` | Patch principale Max |
| `voice_boid.maxpat` | Voce di sintesi caricata da `[poly~ voice_boid 24]` |
| `boids_bridge.js` | Bridge Node for Max: riceve via WebSocket (porta 8081) e inoltra via UDP (porta 9000) |

## Requisiti

- Max 9 (la patch usa `abl.dsp.prism~` per il riverbero/shimmer)
- Un browser recente
- Connessione internet al primo avvio di `index.html`, che carica p5.js e osc-js da CDN

## Avvio

1. Tieni tutti i file nella stessa cartella.
2. Apri `Gameti Riot.maxpat`.
3. Solo la prima volta: clicca il messaggio `script npm install ws`.
4. Clicca `script start`. Nella finestra Max compare `WebSocket ws://localhost:8081 -> UDP 127.0.0.1:9000`.
5. Attiva l'audio con `ezdac~`.
6. Apri `index.html` nel browser. Nella finestra Max compare `p5.js connesso`.

Il brano parte all'apertura della pagina: per ricominciare da capo, ricarica la pagina.

## Licenza

Codice rilasciato con licenza MIT.

© Cristiano Riccardi

Original prompt: bikin yang berhubungan dengan wnaita yang bermain dengan kelinci sama kasih aku fotonya kira2 seperti apa bentuk game nya

## Progress

- Created a new standalone canvas game project in `rabbit-meadow-gm`.
- Concept: cozy AI Game Master game about a woman playing with rabbits in a meadow.
- Implemented canvas scene, rabbit interactions, inventory, quest progress, rule-based GM narration, `render_game_to_text`, `advanceTime`, and a `?showcase=1` screenshot mode.
- Added `?autotest=1` mode that performs sample actions and writes state to the DOM for headless verification when Playwright is unavailable.
- Localized action labels and expanded the GM panel to show two lines of narration in screenshots.
- Verified `node --check game.js`.
- Verified headless browser `?autotest=1` state: Mira can be near Momo, feed/play changes inventory, quest progress, mood, and GM narration.
- Captured desktop showcase screenshot at `output/bunny-meadow-showcase.png`.
- Mobile screenshot capture was attempted but the escalation request was rejected, so desktop screenshot is the verified visual artifact.

## TODO

- Optional next step: add real LLM integration for the GM narration.
- Optional next step: add save/load campaign state.

## Rabbit Market Extraction 3D Update

- Added a new no-dependency WebGL prototype in `market3d.js`.
- Updated `index.html` to boot `Rabbit Market Extraction 3D` from the repo root.
- Reworked `style.css` into a full-viewport 3D game shell with low-chrome HUD, backpack slots, status strip, prompt, and win/loss modal.
- Gameplay loop: move the rabbit through a low-poly night market, collect loot, avoid guard vision cones, hide near stalls, and extract at the glowing gate.
- Controls: WASD or arrow keys to move, Shift to sprint, Space to hide near stalls, R to restart.
- Kept the original 2D `game.js` file in place as legacy work.
- Verified syntax with `node --check market3d.js`.
- Captured desktop WebGL screenshot at `output/rabbit-market-extraction-3d-webgl.png`.
- Captured mobile WebGL screenshot at `output/rabbit-market-extraction-3d-mobile.png`.
- Improved the rabbit model with a more natural 3D silhouette: haunch, head, muzzle, nose, eyes, eye highlights, tilted ears, inner ears, paws, tail, whiskers, backpack strap, and subtle hop/breathing animation.
- Added 3-axis transform support for small model parts in `market3d.js`.
- Captured updated rabbit render at `output/rabbit-market-realistic-rabbit.png`.
- Converted all visible game wording to English.
- Removed the top-left objective chip so the scene no longer shows the Rabbit Market Extraction / objective box.
- Captured updated English HUD screenshot at `output/rabbit-market-english-no-objective.png`.
- Made the rabbit more brainrot/cartoon-meme styled with oversized wobbling eyes, buck teeth, blush dots, a tiny crown, neon aura rings, a bright tail dot, and orbiting carrots.
- Captured updated brainrot rabbit screenshot at `output/rabbit-market-brainrot-rabbit.png`.
- Reworked the player character into a reference-inspired goofy white rabbit: oversized blue eyes, huge dark mouth, two square front teeth, tall ears, and a simpler rounded body.
- Set the initial character angle so the face is visible when the game opens.
- Captured updated reference-style rabbit screenshot at `output/rabbit-market-reference-rabbit.png`.
- Rebuilt the body toward the plush reference: upright rounded white body, flat pink belly patch with border, raised arms and paws, oversized pink feet, tall pink inner-ear panels, and a visible plush tail/backpack.
- Captured updated plush body screenshot at `output/rabbit-market-plush-body-v2.png`.

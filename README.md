# Market Escape 3D

A browser-based 3D stealth prototype built with WebGL. Navigate the environment, collect items, and reach the exit before time runs out while avoiding detection.

## Play locally

From the project folder, start a local server with Python 3.

```sh
python3 -m http.server 5173 --bind 127.0.0.1
```

Open [localhost:5173](http://localhost:5173) in a browser with WebGL support. The game starts when the page loads.

## Controls

| Action | Input |
| --- | --- |
| Move | `WASD` or arrow keys |
| Sprint | Hold `Shift` while moving |
| Hide | Hold `Space` near a stall |
| Restart | `R` |

## Original 2D prototype

The repository also includes an earlier Canvas 2D prototype with a rule-based narration system that responds to player actions. The main page launches the 3D prototype. See [game.js](game.js) for the earlier implementation.

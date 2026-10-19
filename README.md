# Typing Dojo

A small typing game that runs entirely in your browser. You are a ninja; each word you type lands a strike on your rival, but they strike back on a timer. Win the trial before your health runs out.

- Static site: plain HTML, CSS and JavaScript. No build step, no dependencies, no network calls.
- Canvas-drawn dojo with animated fighters, slash effects and floating damage numbers.
- 8 trials of rising difficulty, 1 to 3 stars each, plus a **Daily Challenge** that uses the same words for everyone on a given day.
- Progress and the sound setting are saved in your browser (`localStorage`).
- Works with a physical keyboard or a phone's on-screen keyboard (tap the dojo to bring it up).
- Respects `prefers-reduced-motion`.

## How to play

1. Pick a trial from the menu. Trial 1 is open; winning a trial unlocks the next.
2. Type the word shown on screen, one letter at a time. Finishing a word strikes your rival.
3. Consecutive clean words build a **combo**, which multiplies your damage (up to +100%).
4. A wrong key breaks your combo and lets the rival strike sooner. Watch the bar under the dojo: when it fills, they attack.
5. Reduce the rival's health to zero before yours runs out.

Stars (win required):

| Stars | Condition |
| --- | --- |
| 1 | Win the fight |
| 2 | Accuracy of at least 92% |
| 3 | Finish with at least 50 health left |

Press `Esc` during a fight to retreat to the menu.

## Run locally

The game uses ES modules, which browsers will not load from `file://`, so serve the folder with any static server:

```bash
# Python (already installed on most machines)
python3 -m http.server 8080

# or Node
npx serve .
```

Then open <http://localhost:8080>.

## Run with Docker

The image is a small unprivileged nginx serving the static files with a strict Content-Security-Policy.

```bash
docker build -t typing-dojo .
docker run --rm -p 8080:8080 typing-dojo
```

Then open <http://localhost:8080>.

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings, Pages**, choose **Deploy from a branch**, select your default branch and the `/ (root)` folder.
3. Your game will be live at `https://<your-user>.github.io/<repo-name>/`.

All asset paths are relative, so it works from a sub-path without changes.

## Project layout

```
.
├── index.html        Page shell (menu, fight screen, result modal)
├── style.css         All styling (no inline styles, CSP-friendly)
├── favicon.svg
├── src/
│   ├── engine.js     Pure game logic: fights, damage, stars, progress, daily seed
│   ├── words.js      Word bank
│   ├── scene.js      Canvas renderer for the dojo and fighters
│   ├── sound.js      Synthesized sound effects (WebAudio, no audio files)
│   └── main.js       Controller: input, game loop, HUD, menu, storage
├── Dockerfile
├── nginx.conf        Static hosting plus security headers
└── .dockerignore
```

`engine.js` has no DOM, timers or globals. It takes keystrokes (`typeChar`) and elapsed time (`tick`), which keeps it easy to test and tune.

## Tuning the game

Difficulty lives at the top of `src/engine.js`:

- `TRIALS`: per-trial rival health, how often they strike (`attackEvery`, seconds), damage per strike, and the word length range.
- `BASE_DAMAGE`, `COMBO_CAP`: how much each letter is worth and how far combos scale.
- `STUMBLE_SECONDS`: how much sooner the rival strikes after a typo.
- `STAR_ACCURACY`, `STAR_HP`: the star thresholds.

Add or remove words in `src/words.js` (lowercase `a-z` only). Each trial picks from words within its length range.

## Security notes

The app uses no inline scripts or styles, loads nothing from other origins and makes no network requests, so it runs under this policy (set in `nginx.conf`):

```
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:;
connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
```

If you host it elsewhere, apply an equivalent header if your host allows it.

## License

Add a license of your choice (for example MIT) as a `LICENSE` file before publishing.

## Site
https://typingdojo.onrender.com/

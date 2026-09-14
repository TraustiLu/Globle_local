# Worldly

Worldly is a static geography game inspired by Globle. Guess countries on an interactive map; each guess shows its great-circle distance and the compass direction toward a hidden country. The map gets warmer as you get closer.

The project is designed for GitHub Pages. It uses only HTML, CSS, JavaScript, Leaflet, and local Natural Earth map data—there is no Python backend or server to manage.

## Features

- A new shared mystery country at the start of every UTC hour
- A live countdown to the next hourly challenge
- 195 playable countries and common aliases
- Unlimited practice games
- Interactive Leaflet map with local country boundaries
- Map-centered country reference points, center markers, and visual compass clues
- Intuitive flat-map directions with date-line handling and great-circle distances
- Side-by-side map and scrollable guess history on larger screens
- Duplicate and invalid-guess handling
- Progress saved across refreshes in browser storage
- Winning summary with an answer-free emoji result and copy button
- Responsive layout, keyboard support, labels, and live status announcements

## Publish with GitHub Pages

1. Push this repository to GitHub.
2. Open the repository on GitHub.
3. Select **Settings**, then **Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select your main branch and the **`/ (root)`** folder.
6. Select **Save**.

GitHub will display the published address when deployment finishes. It is normally:

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/
```

Relative asset paths are used throughout the project, so it works from a project subdirectory without configuration.

## Local preview

Local previewing is optional and only needed while developing. Because browsers restrict JavaScript from loading local data via `file://`, use any basic static web server rather than opening `index.html` directly.

For example, with Python installed:

```bash
python -m http.server 8000
```

Then open <http://127.0.0.1:8000>.

## Tests

The test suite uses Node's built-in test runner and has no package dependencies:

```bash
npm test
```

## Project structure

```text
index.html                       Page structure and dialogs
static/css/style.css             Responsive visual design
static/js/core.js                Country, distance, and hourly game logic
static/js/game.js                Map, saved state, and interactions
static/data/countries.geojson    Country borders and label coordinates
tests/core.test.mjs              Automated game-logic tests
.nojekyll                        Disables unnecessary Jekyll processing
```

## How the hourly challenge works

The browser creates a UTC hour identifier such as `2026-09-14T13:00Z`. A stable hash of that identifier selects one country from the sorted answer pool. This gives every visitor the same answer for that hour without requiring a server.

Because GitHub Pages is static, a technically determined player can inspect the JavaScript and calculate the answer. The answer is not displayed during normal gameplay or included in copied results.

## Data and license

Country boundaries and label coordinates come from [Natural Earth](https://www.naturalearthdata.com/), a public-domain dataset. The included GeoJSON is the 1:50m Admin 0 Countries layer. The answer pool filters dependencies and unrecognized breakaway territories while including Israel, Kosovo, and Palestine.

The original application code is available under the MIT License; see `LICENSE`. “Globle” is referenced only to describe the gameplay style. This project is not affiliated with the original game.

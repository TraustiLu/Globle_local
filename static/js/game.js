import {
  buildCountryLookup,
  countriesFromGeoJSON,
  guessResult,
  hourlyCountry,
  hourlyKey,
  normalizeName,
} from "./core.js";

const elements = {
  form: document.querySelector("#guess-form"), input: document.querySelector("#guess-input"),
  button: document.querySelector("#guess-button"), datalist: document.querySelector("#country-list"),
  status: document.querySelector("#status"), list: document.querySelector("#guess-list"),
  count: document.querySelector("#guess-count"), hourlyButton: document.querySelector("#hourly-button"),
  practiceButton: document.querySelector("#practice-button"), newGameButton: document.querySelector("#new-game-button"),
  modeLabel: document.querySelector("#mode-label"), roundLabel: document.querySelector("#round-label"),
  resetTimer: document.querySelector("#reset-timer"), helpDialog: document.querySelector("#help-dialog"),
  winDialog: document.querySelector("#win-dialog"), winMessage: document.querySelector("#win-message"),
  shareResult: document.querySelector("#share-result"), shareButton: document.querySelector("#share-button"),
};

function readPractice() {
  try {
    const saved = JSON.parse(localStorage.getItem("worldly:practice:active") || "null");
    return saved?.id && saved?.answerId ? saved : null;
  } catch { return null; }
}

const app = {
  mode: "hourly", hourKey: hourlyKey(), countries: [], countryLookup: new Map(),
  hourlyAnswer: null, practice: readPractice(), guesses: [], guessedIds: new Set(),
  won: false, layers: new Map(), centerMarkers: [],
};

const map = L.map("map", {
  center: [18, 5], zoom: 2, minZoom: 1, maxZoom: 6, zoomSnap: 0.25,
  worldCopyJump: true, attributionControl: false, scrollWheelZoom: false,
}).setView([18, 5], 2);
map.setMaxBounds([[-85, -240], [90, 240]]);

function fitWorld() {
  map.setView([16, 0], 1.25, { animate: false });
}

function countryId(feature) { return feature.properties.ADM0_A3 || feature.properties.ISO_A3; }

function temperatureColor(heat, won = false) {
  if (won) return "#18a558";
  const hue = 215 - Math.max(0, Math.min(1, heat)) * 207;
  return `hsl(${hue} 70% 51%)`;
}

function currentAnswer() {
  if (app.mode === "hourly") return app.hourlyAnswer;
  return app.countries.find((country) => country.id === app.practice?.answerId);
}

function storageKey() {
  return app.mode === "hourly" ? `worldly:hourly:${app.hourKey}` : `worldly:practice:${app.practice.id}`;
}

function saveState() {
  localStorage.setItem(storageKey(), JSON.stringify({ guesses: app.guesses.map((guess) => guess.country.name) }));
}

function resetBoard() {
  app.guesses = [];
  app.guessedIds = new Set();
  app.won = false;
  elements.list.innerHTML = '<li class="empty-state" id="empty-state">Your first guess will appear here.</li>';
  elements.button.disabled = false;
  elements.input.disabled = false;
  elements.status.className = "status";
  elements.status.textContent = "";
  for (const layer of app.layers.values()) {
    layer.setStyle({ fillColor: "#f6f4ea", fillOpacity: 0.92, color: "#aebdb4", weight: 0.65 });
  }
  for (const marker of app.centerMarkers) marker.remove();
  app.centerMarkers = [];
  fitWorld();
  updateCount();
}

function updateCount() {
  const amount = app.guesses.length;
  elements.count.textContent = `${amount} ${amount === 1 ? "guess" : "guesses"}`;
}

function directionArrow(direction) {
  return ({ north: "↑", northeast: "↗", east: "→", southeast: "↘", south: "↓", southwest: "↙", west: "←", northwest: "↖" })[direction] || "✓";
}

function renderGuess(result) {
  document.querySelector("#empty-state")?.remove();
  const color = temperatureColor(result.heat, result.won);
  const item = document.createElement("li");
  item.className = "guess-item";
  item.innerHTML = '<span class="color-dot" aria-hidden="true"></span><span class="country-name"></span><span class="distance"></span><span class="direction"><span class="mini-compass" aria-hidden="true"><span class="compass-n">N</span><span class="compass-needle"></span></span><span class="direction-text"></span></span>';
  item.querySelector(".color-dot").style.background = color;
  item.querySelector(".country-name").textContent = result.country.name;
  item.querySelector(".distance").textContent = result.won ? "Found!" : `${result.distanceKm.toLocaleString()} km`;
  const compass = item.querySelector(".mini-compass");
  const directionText = item.querySelector(".direction-text");
  if (result.won) {
    compass.classList.add("correct");
    directionText.textContent = "Correct";
  } else {
    item.querySelector(".compass-needle").style.transform = `translateX(-50%) rotate(${result.bearing}deg)`;
    directionText.textContent = `${directionArrow(result.direction)} ${result.direction}`;
  }
  elements.list.prepend(item);

  const layer = app.layers.get(result.country.id);
  if (layer) {
    layer.setStyle({ fillColor: color, fillOpacity: 0.9, color: "#263c30", weight: 1.2 });
    layer.bindTooltip(`${result.country.name}: ${result.won ? "correct" : `${result.distanceKm.toLocaleString()} km`}`);
    if (result.won) map.fitBounds(layer.getBounds(), { maxZoom: 4, padding: [35, 35] });
  }
  const country = app.countries.find(({ id }) => id === result.country.id);
  if (country) {
    const marker = L.circleMarker([country.latitude, country.longitude], {
      radius: result.won ? 6 : 4.5,
      color: "#ffffff",
      weight: 2,
      fillColor: result.won ? "#146c3c" : "#17251d",
      fillOpacity: 1,
      interactive: false,
    }).addTo(map);
    app.centerMarkers.push(marker);
  }
  updateCount();
}

function shareText() {
  const blocks = app.guesses.map((guess) => {
    if (guess.won) return "🟩";
    if (guess.heat > 0.75) return "🟥";
    if (guess.heat > 0.5) return "🟧";
    if (guess.heat > 0.25) return "🟨";
    return "🟦";
  }).join("");
  const label = app.mode === "hourly" ? app.hourKey : "Practice";
  const pageUrl = location.protocol.startsWith("http") ? `\n${location.origin}${location.pathname}` : "";
  return `Worldly ${label} — ${app.guesses.length} ${app.guesses.length === 1 ? "guess" : "guesses"}\n${blocks}${pageUrl}`;
}

function showWin(result) {
  app.won = true;
  elements.input.disabled = true;
  elements.button.disabled = true;
  elements.status.className = "status success";
  elements.status.textContent = `You found ${result.answer}!`;
  elements.winMessage.textContent = `You found ${result.answer} in ${app.guesses.length} ${app.guesses.length === 1 ? "guess" : "guesses"}.`;
  elements.shareResult.textContent = shareText();
  elements.shareButton.textContent = "Copy result";
  if (!elements.winDialog.open) elements.winDialog.showModal();
}

function submitGuess(countryName, { restore = false } = {}) {
  const country = app.countryLookup.get(normalizeName(countryName));
  if (!country) throw new Error("That country is not in the game. Check the spelling and try again.");
  if (app.guessedIds.has(country.id)) {
    if (restore) return;
    throw new Error(`You already guessed ${country.name}.`);
  }
  const result = guessResult(country, currentAnswer());
  app.guessedIds.add(country.id);
  app.guesses.push(result);
  renderGuess(result);
  saveState();
  elements.status.textContent = result.won ? "" : `${result.country.name} is ${result.distanceKm.toLocaleString()} km away — head ${result.direction}.`;
  elements.status.className = result.won ? "status success" : "status";
  if (result.won) showWin(result);
}

function restoreState() {
  resetBoard();
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey()) || "{}"); } catch { saved = {}; }
  for (const countryName of saved.guesses || []) submitGuess(countryName, { restore: true });
  if (!app.won) {
    elements.status.textContent = app.guesses.length ? "Your game has been restored." : "";
    elements.input.focus();
  }
}

function showMode(mode) {
  app.mode = mode;
  const hourly = mode === "hourly";
  elements.hourlyButton.classList.toggle("active", hourly);
  elements.practiceButton.classList.toggle("active", !hourly);
  elements.hourlyButton.setAttribute("aria-pressed", String(hourly));
  elements.practiceButton.setAttribute("aria-pressed", String(!hourly));
  elements.newGameButton.hidden = hourly;
  elements.modeLabel.textContent = hourly ? "THIS HOUR'S MYSTERY COUNTRY" : "PRACTICE MODE";
  elements.roundLabel.textContent = hourly ? "Hourly challenge" : "Unlimited practice";
  elements.resetTimer.hidden = !hourly;
}

function randomIndex(length) {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % length;
}

function createPractice() {
  const answer = app.countries[randomIndex(app.countries.length)];
  app.practice = { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, answerId: answer.id };
  localStorage.setItem("worldly:practice:active", JSON.stringify(app.practice));
}

function startPractice(forceNew = false) {
  if (forceNew || !app.practice || !app.countries.some((country) => country.id === app.practice.answerId)) createPractice();
  showMode("practice");
  restoreState();
}

function updateClock() {
  const newKey = hourlyKey();
  if (newKey !== app.hourKey) {
    app.hourKey = newKey;
    app.hourlyAnswer = hourlyCountry(app.countries, app.hourKey);
    if (app.mode === "hourly") {
      restoreState();
      elements.status.textContent = "A new hourly country has arrived!";
      elements.status.className = "status success";
    }
  }
  const remainingSeconds = 3600 - (Math.floor(Date.now() / 1000) % 3600);
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const seconds = String(remainingSeconds % 60).padStart(2, "0");
  elements.resetTimer.textContent = `Next country in ${minutes}:${seconds}`;
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = elements.input.value.trim();
  if (!value) {
    elements.status.textContent = "Enter a country first.";
    elements.input.focus();
    return;
  }
  try { submitGuess(value); elements.input.value = ""; }
  catch (error) { elements.status.className = "status"; elements.status.textContent = error.message; }
  if (!app.won) elements.input.focus();
});

elements.hourlyButton.addEventListener("click", () => { showMode("hourly"); restoreState(); });
elements.practiceButton.addEventListener("click", () => startPractice(false));
elements.newGameButton.addEventListener("click", () => startPractice(true));
document.querySelector("#help-button").addEventListener("click", () => elements.helpDialog.showModal());
document.querySelector("#close-help").addEventListener("click", () => elements.helpDialog.close());
document.querySelector("#close-win").addEventListener("click", () => elements.winDialog.close());
document.querySelector("#reset-map-button").addEventListener("click", fitWorld);
elements.shareButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareText());
    elements.shareButton.textContent = "Copied!";
    elements.status.textContent = "Result copied — send it to your friends!";
    elements.status.className = "status success";
  } catch {
    elements.shareResult.focus();
    elements.status.textContent = "Select and copy the result from the box.";
  }
});

async function initialize() {
  try {
    const response = await fetch("./static/data/countries.geojson");
    if (!response.ok) throw new Error("Country map data failed to load.");
    const geoData = await response.json();
    app.countries = countriesFromGeoJSON(geoData.features);
    app.countryLookup = buildCountryLookup(app.countries);
    app.hourlyAnswer = hourlyCountry(app.countries, app.hourKey);
    elements.datalist.replaceChildren(...app.countries.map((country) => {
      const option = document.createElement("option"); option.value = country.name; return option;
    }));
    L.geoJSON(geoData, {
      style: { fillColor: "#f6f4ea", fillOpacity: 0.92, color: "#aebdb4", weight: 0.65 },
      onEachFeature(feature, layer) { app.layers.set(countryId(feature), layer); },
    }).addTo(map);
    fitWorld();
    showMode("hourly");
    restoreState();
    updateClock();
    setInterval(updateClock, 1000);
  } catch (error) {
    elements.status.textContent = `${error.message} Refresh the page to try again.`;
    elements.button.disabled = true;
  }
}

initialize();

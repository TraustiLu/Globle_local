import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildCountryLookup, compassDirection, countriesFromGeoJSON, guessResult, haversineDistance, hourlyCountry, hourlyKey, initialBearing, normalizeName } from "../static/js/core.js";

const paris = { id: "PAR", name: "Paris", latitude: 48.8566, longitude: 2.3522 };
const london = { id: "LON", name: "London", latitude: 51.5074, longitude: -0.1278 };

test("country data produces 195 playable countries and aliases", async () => {
  const data = JSON.parse(await readFile(new URL("../static/data/countries.geojson", import.meta.url), "utf8"));
  const countries = countriesFromGeoJSON(data.features);
  const lookup = buildCountryLookup(countries);
  assert.equal(countries.length, 195);
  assert.equal(new Set(countries.map(({ id }) => id)).size, countries.length);
  assert.ok(countries.every(({ latitude, longitude }) => Number.isFinite(latitude) && Number.isFinite(longitude)));
  assert.equal(lookup.get("usa").name, "United States of America");
  assert.equal(lookup.get("cote d ivoire").name, "Ivory Coast");
});

test("country names normalize consistently", () => {
  assert.equal(normalizeName("  Côte-d'Ivoire "), "cote d ivoire");
});

test("distance, bearing, and direction are accurate", () => {
  assert.ok(Math.abs(haversineDistance(paris, london) - 344) < 2);
  assert.ok(Math.abs(initialBearing(paris, london) - 330) < 2);
  assert.equal(compassDirection(initialBearing(paris, london)), "northwest");
});

test("map directions use the shortest route across the date line", () => {
  const westOfLine = { latitude: 0, longitude: 170 };
  const eastOfLine = { latitude: 0, longitude: -170 };
  assert.equal(compassDirection(initialBearing(westOfLine, eastOfLine)), "east");
});

test("the hourly key uses UTC and changes on the hour", () => {
  assert.equal(hourlyKey(new Date("2026-09-14T13:02:01Z")), "2026-09-14T13:00Z");
  assert.equal(hourlyKey(new Date("2026-09-14T13:59:59Z")), "2026-09-14T13:00Z");
  assert.notEqual(hourlyKey(new Date("2026-09-14T14:00:00Z")), "2026-09-14T13:00Z");
});

test("everyone receives the same answer for the same hour", () => {
  const countries = Array.from({ length: 195 }, (_, index) => ({ id: String(index) }));
  assert.equal(hourlyCountry(countries, "2026-09-14T13:00Z"), hourlyCountry(countries, "2026-09-14T13:00Z"));
  assert.notEqual(hourlyCountry(countries, "2026-09-14T13:00Z"), hourlyCountry(countries, "2026-09-14T14:00Z"));
});

test("a correct result reveals the answer", () => {
  const miss = guessResult(paris, london);
  const win = guessResult(paris, paris);
  assert.equal("answer" in miss, false);
  assert.equal(win.answer, "Paris");
  assert.equal(win.distanceKm, 0);
});

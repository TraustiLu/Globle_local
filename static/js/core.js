export const MAX_DISTANCE_KM = Math.PI * 6371.0088;
export const GRADIENT_DISTANCE_KM = 3000;

export const ALIASES = {
  america: "United States of America",
  bahamas: "The Bahamas",
  bolivia: "Bolivia",
  bosnia: "Bosnia and Herzegovina",
  brunei: "Brunei",
  burma: "Myanmar",
  "cape verde": "Cabo Verde",
  congo: "Republic of the Congo",
  "cote d ivoire": "Ivory Coast",
  "czech republic": "Czechia",
  "democratic republic of congo": "Democratic Republic of the Congo",
  "dr congo": "Democratic Republic of the Congo",
  drc: "Democratic Republic of the Congo",
  "east timor": "East Timor",
  eswatini: "eSwatini",
  "ivory coast": "Ivory Coast",
  macedonia: "North Macedonia",
  micronesia: "Federated States of Micronesia",
  "republic of congo": "Republic of the Congo",
  serbia: "Republic of Serbia",
  swaziland: "eSwatini",
  "the gambia": "Gambia",
  "timor leste": "East Timor",
  tanzania: "United Republic of Tanzania",
  uae: "United Arab Emirates",
  uk: "United Kingdom",
  "united states": "United States of America",
  usa: "United States of America",
  "vatican city": "Vatican",
};

export function normalizeName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function countriesFromGeoJSON(features) {
  return features
    .filter(({ properties: props }) => {
      const normal = props.ADMIN === props.SOVEREIGNT && ["Sovereign country", "Country"].includes(props.TYPE);
      const included = ["Israel", "Kosovo", "Palestine"].includes(props.ADMIN);
      return (normal || included) && !["Antarctica", "Northern Cyprus", "Somaliland"].includes(props.ADMIN);
    })
    .map(({ properties: props }) => ({
      id: props.ADM0_A3 || props.ISO_A3,
      name: props.ADMIN,
      latitude: Number(props.LABEL_Y),
      longitude: Number(props.LABEL_X),
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

export function buildCountryLookup(countries) {
  const lookup = new Map(countries.map((country) => [normalizeName(country.name), country]));
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    const country = lookup.get(normalizeName(canonical));
    if (country) lookup.set(normalizeName(alias), country);
  }
  return lookup;
}

export function haversineDistance(first, second) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const lat1 = radians(first.latitude);
  const lat2 = radians(second.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = radians(second.longitude - first.longitude);
  const value = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function initialBearing(first, second) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const lat1 = radians(first.latitude);
  const lat2 = radians(second.latitude);
  const deltaLon = radians(second.longitude - first.longitude);
  const eastWest = Math.sin(deltaLon) * Math.cos(lat2);
  const northSouth = Math.cos(lat1) * Math.sin(lat2)
    - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return (Math.atan2(eastWest, northSouth) * 180 / Math.PI + 360) % 360;
}

export function compassDirection(bearing) {
  const directions = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
  return directions[Math.floor((bearing + 22.5) / 45) % 8];
}

export function distanceColor(distanceKm) {
  const progress = 1 - Math.max(0, Math.min(GRADIENT_DISTANCE_KM, distanceKm)) / GRADIENT_DISTANCE_KM;
  const hue = 4 + progress * 46;
  return `hsl(${hue.toFixed(1)} 82% 52%)`;
}

export function hourlyKey(moment = new Date()) {
  return `${moment.toISOString().slice(0, 13)}:00Z`;
}

export function stableHash(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function hourlyCountry(countries, key, seed = "worldly-hourly-v1") {
  return countries[stableHash(`${seed}:${key}`) % countries.length];
}

export function guessResult(guess, answer) {
  const won = guess.id === answer.id;
  const distance = haversineDistance(guess, answer);
  const bearing = won ? null : initialBearing(guess, answer);
  return {
    country: { id: guess.id, name: guess.name },
    distanceKm: Math.round(distance),
    direction: won ? null : compassDirection(bearing),
    bearing: won ? null : Math.round(bearing),
    heat: Math.max(0, 1 - distance / GRADIENT_DISTANCE_KM),
    won,
    ...(won ? { answer: answer.name } : {}),
  };
}

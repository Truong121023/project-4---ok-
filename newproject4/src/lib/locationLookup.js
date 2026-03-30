const GEOCODER_SEARCH_URL = import.meta.env.VITE_GEOCODER_URL ??
  "https://nominatim.openstreetmap.org/search";

function toCoordinate(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

export async function geocodeAddress(address) {
  const normalizedAddress = String(address ?? "").trim();

  if (!normalizedAddress) {
    throw new Error("Please enter an address to calculate the distance.");
  }

  const searchParams = new URLSearchParams({
    q: normalizedAddress,
    format: "jsonv2",
    limit: "1",
    addressdetails: "1",
  });

  const response = await fetch(`${GEOCODER_SEARCH_URL}?${searchParams.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error("Unable to find that address right now.");
  }

  const payload = await response.json();
  const firstMatch = Array.isArray(payload) ? payload[0] : null;

  if (!firstMatch) {
    throw new Error("No matching address was found.");
  }

  const latitude = toCoordinate(firstMatch.lat);
  const longitude = toCoordinate(firstMatch.lon);

  if (latitude === null || longitude === null) {
    throw new Error("Could not read coordinates from that address.");
  }

  return {
    latitude,
    longitude,
    label: String(firstMatch.display_name ?? normalizedAddress),
  };
}

export async function requestCurrentLocation() {
  if (!window.isSecureContext) {
    throw new Error("Geolocation requires HTTPS or localhost to request permission.");
  }

  if (!navigator.geolocation) {
    throw new Error("This browser does not support the Geolocation API.");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: "Current location",
        });
      },
      (error) => {
        reject(new Error(`Unable to get location: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  });
}

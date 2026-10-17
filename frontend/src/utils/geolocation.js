const MESSAGES = {
  1: 'Location permission was denied. Allow location access for this site in your browser settings, then try again.',
  2: 'Your device could not determine its location. Turn on GPS / location services and try again.',
  3: 'Getting your location took too long. Move to an open area or near a window and try again.',
};

// Resolves { latitude, longitude, accuracy } or rejects with a user-friendly Error.
// maximumAge: 0 forces a fresh reading instead of a cached position.
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('This browser does not support location services.'));
    }
    if (!window.isSecureContext) {
      return reject(new Error('Location access requires a secure (HTTPS) connection.'));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(new Error(MESSAGES[err.code] || 'Could not get your location.')),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
}

export const mapLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

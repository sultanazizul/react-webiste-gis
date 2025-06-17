// src/utils/helpers.js

/**
 * Calculates the distance between two points on Earth using the Haversine formula.
 * @param {Array<number>} latlng1 - [latitude, longitude] of the first point.
 * @param {Array<number>} latlng2 - [latitude, longitude] of the second point.
 * @returns {number} Distance in meters.
 */
function haversineDistance(latlng1, latlng2) {
    const R = 6371e3; // metres (Earth's mean radius)
    const φ1 = latlng1[0] * Math.PI / 180; // φ, λ in radians
    const φ2 = latlng2[0] * Math.PI / 180;
    const Δφ = (latlng2[0] - latlng1[0]) * Math.PI / 180;
    const Δλ = (latlng2[1] - latlng1[1]) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
}

/**
 * Calculates the total length of a polyline in meters.
 * @param {Array<Array<number>>} polylineCoords - An array of [lat, lng] pairs.
 * @returns {number} Total length in meters.
 */
export const calculatePolylineLength = (polylineCoords) => {
    if (!polylineCoords || polylineCoords.length < 2) {
        return 0;
    }
    let totalLength = 0;
    for (let i = 0; i < polylineCoords.length - 1; i++) {
        totalLength += haversineDistance(polylineCoords[i], polylineCoords[i+1]);
    }
    return totalLength; // returns in meters
};


/**
 * Helper function to find a name by ID from a list.
 * Assumes list items have 'id' and a 'value' or specific name property.
 * @param {Array<Object>} list - The list to search in (e.g., provinsiList, eksistingList).
 * @param {string|number} id - The ID to look for.
 * @param {string} nameKey - The key for the name property (e.g., 'provinsi', 'eksisting', 'value').
 * @returns {string} The name corresponding to the ID, or 'N/A' if not found.
 */
export const getNameById = (list, id, nameKey) => {
  const item = list.find(item => String(item.id) === String(id));
  return item ? item[nameKey] : 'N/A';
};
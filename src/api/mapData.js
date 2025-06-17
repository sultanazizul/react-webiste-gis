// src/api/mapData.js
import { ref, set, remove, update } from "firebase/database"; // Hapus onValue dan push
import { database } from "../firebaseConfig";

// Markers
const getMarkersRef = () => ref(database, "markers");
const setMarkerData = async (markerId, data) => await set(ref(database, "markers/" + markerId), data);
const updateMarkerData = async (markerId, data) => await update(ref(database, "markers/" + markerId), data);
const removeMarkerData = async (markerId) => await remove(ref(database, "markers/" + markerId));
const clearAllMarkersData = async () => await set(ref(database, "markers"), null);

// Polylines
const getPolylinesRef = () => ref(database, "polylines");
const setPolylineData = async (polylineId, data) => await set(ref(database, "polylines/" + polylineId), data);
const updatePolylineData = async (polylineId, data) => await update(ref(database, "polylines/" + polylineId), data);
const removePolylineData = async (polylineId) => await remove(ref(database, "polylines/" + polylineId));
const clearAllPolylinesData = async () => await set(ref(database, "polylines"), null);

// Polygons
const getPolygonsRef = () => ref(database, "polygons");
const setPolygonData = async (polygonId, data) => await set(ref(database, "polygons/" + polygonId), data);
const updatePolygonData = async (polygonId, data) => await update(ref(database, "polygons/" + polygonId), data);
const removePolygonData = async (polygonId) => await remove(ref(database, "polygons/" + polygonId));
const clearAllPolygonsData = async () => await set(ref(database, "polygons"), null);

// Circles
const getCirclesRef = () => ref(database, "circles");
const setCircleData = async (circleId, data) => await set(ref(database, "circles/" + circleId), data);
const updateCircleData = async (circleId, data) => await update(ref(database, "circles/" + circleId), data);
const removeCircleData = async (circleId) => await remove(ref(database, "circles/" + circleId));
const clearAllCirclesData = async () => await set(ref(database, "circles"), null);


export {
  getMarkersRef,
  setMarkerData,
  updateMarkerData,
  removeMarkerData,
  clearAllMarkersData,
  getPolylinesRef,
  setPolylineData,
  updatePolylineData,
  removePolylineData,
  clearAllPolylinesData,
  getPolygonsRef,
  setPolygonData,
  updatePolygonData,
  removePolygonData,
  clearAllPolygonsData,
  getCirclesRef,
  setCircleData,
  updateCircleData,
  removeCircleData,
  clearAllCirclesData,
};

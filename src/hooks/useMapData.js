// src/hooks/useMapData.js
import { useState, useEffect } from "react";
import { onValue } from "firebase/database";
import {
  getMarkersRef, setMarkerData, updateMarkerData, removeMarkerData, clearAllMarkersData,
  getPolylinesRef, setPolylineData, updatePolylineData, removePolylineData, clearAllPolylinesData,
  getPolygonsRef, setPolygonData, updatePolygonData, removePolygonData, clearAllPolygonsData,
  getCirclesRef, setCircleData, updateCircleData, removeCircleData, clearAllCirclesData,
} from "../api/mapData";

const useMapData = () => {
  const [markers, setMarkers] = useState([]);
  const [polylines, setPolylines] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const [circles, setCircles] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentLocationDetails, setCurrentLocationDetails] = useState(null);
  const [mapCenter, setMapCenter] = useState([-6.200000, 106.816666]); // Default center

  // Fetch location details using Nominatim
  const fetchLocationDetails = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
      );
      const data = await response.json();
      return {
        city: data.address.city || data.address.town || data.address.village || data.address.hamlet || "Unknown",
        country: data.address.country || "Unknown",
      };
    } catch (error) {
      console.error("Location fetch error:", error);
      return { city: "Unknown", country: "Unknown" };
    }
  };

  useEffect(() => {
    // Get current geolocation
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation([latitude, longitude]);
          setMapCenter([latitude, longitude]); // Set map center to current location
          try {
            const details = await fetchLocationDetails(latitude, longitude);
            setCurrentLocationDetails(details);
          } catch (error) {
            console.error("Error fetching current location details:", error);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          // Fallback to default center if geolocation fails
          setMapCenter([-6.200000, 106.816666]);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      // Fallback to default center if geolocation is not supported
      setMapCenter([-6.200000, 106.816666]);
    }

    // Firebase listeners
    const unsubscribeMarkers = onValue(getMarkersRef(), (snapshot) => {
      const data = snapshot.val();
      setMarkers(data ? Object.values(data) : []);
      setDataLoading(false);
    });

    const unsubscribePolylines = onValue(getPolylinesRef(), (snapshot) => {
      const data = snapshot.val();
      setPolylines(data ? Object.values(data) : []);
    });

    const unsubscribePolygons = onValue(getPolygonsRef(), (snapshot) => {
      const data = snapshot.val();
      setPolygons(data ? Object.values(data) : []);
    });

    const unsubscribeCircles = onValue(getCirclesRef(), (snapshot) => {
      const data = snapshot.val();
      setCircles(data ? Object.values(data) : []);
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeMarkers();
      unsubscribePolylines();
      unsubscribePolygons();
      unsubscribeCircles();
    };
  }, []); // Empty dependency array means this runs once on mount

  const addMarker = async (lat, lng, name = "") => {
    setDataLoading(true);
    try {
      const locationDetails = await fetchLocationDetails(lat, lng);
      const newMarker = {
        id: Date.now().toString(),
        lat,
        lng,
        name: name || `Marker at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        ...locationDetails,
        timestamp: new Date().toISOString(),
        type: 'marker'
      };
      await setMarkerData(newMarker.id, newMarker);
      return newMarker;
    } catch (error) {
      console.error("Error adding marker:", error);
      throw new Error("Failed to add marker.");
    } finally {
      setDataLoading(false);
    }
  };

  const updateMarker = async (markerId, updatedData) => {
    setDataLoading(true);
    try {
      await updateMarkerData(markerId, updatedData);
    } catch (error) {
      console.error("Error updating marker:", error);
      throw new Error("Failed to update marker.");
    } finally {
      setDataLoading(false);
    }
  };

  const deleteMarker = async (markerId) => {
    setDataLoading(true);
    try {
      await removeMarkerData(markerId);
    } catch (error) {
      console.error("Error deleting marker:", error);
      throw new Error("Failed to delete marker.");
    } finally {
      setDataLoading(false);
    }
  };

  const clearAllMarkers = async () => {
    setDataLoading(true);
    try {
      await clearAllMarkersData();
    } catch (error) {
      console.error("Error clearing all markers:", error);
      throw new Error("Failed to clear all markers.");
    } finally {
      setDataLoading(false);
    }
  };

  const addPolyline = async (points) => {
    setDataLoading(true);
    try {
      const newPolyline = {
        id: Date.now().toString(),
        points,
        timestamp: new Date().toISOString(),
        type: 'polyline'
      };
      await setPolylineData(newPolyline.id, newPolyline);
      return newPolyline;
    } catch (error) {
      console.error("Error adding polyline:", error);
      throw new Error("Failed to add polyline.");
    } finally {
      setDataLoading(false);
    }
  };

  const updatePolyline = async (polylineId, updatedData) => {
    setDataLoading(true);
    try {
      await updatePolylineData(polylineId, updatedData);
    } catch (error) {
      console.error("Error updating polyline:", error);
      throw new Error("Failed to update polyline.");
    } finally {
      setDataLoading(false);
    }
  };

  const deletePolyline = async (polylineId) => {
    setDataLoading(true);
    try {
      await removePolylineData(polylineId);
    } catch (error) {
      console.error("Error deleting polyline:", error);
      throw new Error("Failed to delete polyline.");
    } finally {
      setDataLoading(false);
    }
  };

  const clearAllPolylines = async () => {
    setDataLoading(true);
    try {
      await clearAllPolylinesData();
    } catch (error) {
      console.error("Error clearing all polylines:", error);
      throw new Error("Failed to clear all polylines.");
    } finally {
      setDataLoading(false);
    }
  };

  const addPolygon = async (points) => {
    setDataLoading(true);
    try {
      const newPolygon = {
        id: Date.now().toString(),
        points,
        timestamp: new Date().toISOString(),
        type: 'polygon'
      };
      await setPolygonData(newPolygon.id, newPolygon);
      return newPolygon;
    } catch (error) {
      console.error("Error adding polygon:", error);
      throw new Error("Failed to add polygon.");
    } finally {
      setDataLoading(false);
    }
  };

  const updatePolygon = async (polygonId, updatedData) => {
    setDataLoading(true);
    try {
      await updatePolygonData(polygonId, updatedData);
    } catch (error) {
      console.error("Error updating polygon:", error);
      throw new Error("Failed to update polygon.");
    } finally {
      setDataLoading(false);
    }
  };

  const deletePolygon = async (polygonId) => {
    setDataLoading(true);
    try {
      await removePolygonData(polygonId);
    } catch (error) {
      console.error("Error deleting polygon:", error);
      throw new Error("Failed to delete polygon.");
    } finally {
      setDataLoading(false);
    }
  };

  const clearAllPolygons = async () => {
    setDataLoading(true);
    try {
      await clearAllPolygonsData();
    } catch (error) {
      console.error("Error clearing all polygons:", error);
      throw new Error("Failed to clear all polygons.");
    } finally {
      setDataLoading(false);
    }
  };

  const addCircle = async (center, radius) => {
    setDataLoading(true);
    try {
      const newCircle = {
        id: Date.now().toString(),
        center,
        radius,
        timestamp: new Date().toISOString(),
        type: 'circle'
      };
      await setCircleData(newCircle.id, newCircle);
      return newCircle;
    } catch (error) {
      console.error("Error adding circle:", error);
      throw new Error("Failed to add circle.");
    } finally {
      setDataLoading(false);
    }
  };

  const updateCircle = async (circleId, updatedData) => {
    setDataLoading(true);
    try {
      await updateCircleData(circleId, updatedData);
    } catch (error) {
      console.error("Error updating circle:", error);
      throw new Error("Failed to update circle.");
    } finally {
      setDataLoading(false);
    }
  };

  const deleteCircle = async (circleId) => {
    setDataLoading(true);
    try {
      await removeCircleData(circleId);
    } catch (error) {
      console.error("Error deleting circle:", error);
      throw new Error("Failed to delete circle.");
    } finally {
      setDataLoading(false);
    }
  };

  const clearAllCircles = async () => {
    setDataLoading(true);
    try {
      await clearAllCirclesData();
    } catch (error) {
      console.error("Error clearing all circles:", error);
      throw new Error("Failed to clear all circles.");
    } finally {
      setDataLoading(false);
    }
  };

  return {
    markers,
    polylines,
    polygons,
    circles,
    dataLoading,
    currentLocation,
    currentLocationDetails,
    mapCenter,
    setMapCenter,
    addMarker,
    updateMarker,
    deleteMarker,
    clearAllMarkers,
    addPolyline,
    updatePolyline,
    deletePolyline,
    clearAllPolylines,
    addPolygon,
    updatePolygon,
    deletePolygon,
    clearAllPolygons,
    addCircle,
    updateCircle,
    deleteCircle,
    clearAllCircles,
    fetchLocationDetails // Expose for external use (e.g., manual marker add)
  };
};

export default useMapData;
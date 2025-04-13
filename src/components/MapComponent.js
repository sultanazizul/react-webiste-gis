import React, { useState, useRef, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
  Polyline,
  Polygon,
  Circle,
  FeatureGroup,
  useMap,
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import L from "leaflet";
import { ref, set, onValue, push, remove, update } from "firebase/database";
import { database } from "../firebaseConfig";
import { FaMapMarkerAlt, FaUser } from "react-icons/fa";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const { BaseLayer, Overlay } = LayersControl;

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapControls = ({ map }) => {
  const mapInstance = useMap();

  useEffect(() => {
    if (map.current) {
      map.current.leafletElement = mapInstance;
    }
  }, [mapInstance, map]);

  return null;
};

const CustomMapComponent = () => {
  const [markers, setMarkers] = useState([]);
  const [polylines, setPolylines] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const [circles, setCircles] = useState([]);
  const [manualCoords, setManualCoords] = useState({ lat: "", lng: "" });
  const [markerName, setMarkerName] = useState("");
  const [currentLocation, setCurrentLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([-6.200000, 106.816666]);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSearchResults, setLocationSearchResults] = useState([]);
  const [currentLocationDetails, setCurrentLocationDetails] = useState(null);
  const [selectedShape, setSelectedShape] = useState(null);
  const [selectedShapeType, setSelectedShapeType] = useState(null);

  const mapRef = useRef();
  const sidebarRef = useRef();

  const markersRef = ref(database, "markers");
  const polylinesRef = ref(database, "polylines");
  const polygonsRef = ref(database, "polygons");
  const circlesRef = ref(database, "circles");

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation([latitude, longitude]);
          setMapCenter([latitude, longitude]); // Set map center saat lokasi didapatkan

          try {
            const details = await fetchLocationDetails(latitude, longitude);
            setCurrentLocationDetails(details);
          } catch (error) {
            console.error("Error fetching location details:", error);
          }
        },
        (error) => {
          console.error("Error getting location", error);
          setMapCenter([-6.200000, 106.816666]); // Default center jika gagal mendapatkan lokasi
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 } // Opsi tambahan
      );
    } else {
      setMapCenter([-6.200000, 106.816666]); // Default center jika geolocation tidak tersedia
    }

    onValue(markersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMarkers(Object.values(data));
      } else {
        setMarkers([]);
      }
      setLoading(false);
    });

    onValue(polylinesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPolylines(Object.values(data));
      } else {
        setPolylines([]);
      }
    });

    onValue(polygonsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPolygons(Object.values(data));
      } else {
        setPolygons([]);
      }
    });

    onValue(circlesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCircles(Object.values(data));
      } else {
        setCircles([]);
      }
    });
  }, []);

  const fetchLocationDetails = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=<span class="math-inline">\{lat\}&lon\=</span>{lng}&zoom=10&addressdetails=1`
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

  const addManualMarker = async () => {
    if (!manualCoords.lat || !manualCoords.lng) {
      alert("Please enter valid coordinates");
      return;
    }

    setLoading(true);
    try {
      const lat = parseFloat(manualCoords.lat);
      const lng = parseFloat(manualCoords.lng);

      const locationDetails = await fetchLocationDetails(lat, lng);
      const newMarker = {
        id: Date.now().toString(),
        lat,
        lng,
        name: markerName || `Marker at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        ...locationDetails,
        timestamp: new Date().toISOString(),
      };

      const markerRef = ref(database, "markers/" + newMarker.id);
      await set(markerRef, newMarker);

      setMarkers((prev) => [...prev, newMarker]);
      setManualCoords({ lat: "", lng: "" });
      setMarkerName("");

      if (mapRef.current && mapRef.current.leafletElement) {
        mapRef.current.leafletElement.setView([lat, lng], 13);
      }
    } catch (error) {
      console.error("Error adding marker:", error);
      alert("Failed to add marker. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = async (e) => {
    setLoading(true);
    try {
      const { lat, lng } = e.latlng;
      const locationDetails = await fetchLocationDetails(lat, lng);
      const newMarker = {
        id: Date.now().toString(),
        lat,
        lng,
        name: `Marker at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        ...locationDetails,
        timestamp: new Date().toISOString(),
      };

      const markerRef = ref(database, "markers/" + newMarker.id);
      await set(markerRef, newMarker);

      setMarkers((prev) => [...prev, newMarker]);
    } catch (error) {
      console.error("Error adding marker:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerEdit = async (e, markerId) => {
    setLoading(true);
    try {
      const { lat, lng } = e.target.getLatLng();
      const locationDetails = await fetchLocationDetails(lat, lng);
      const updatedMarker = {
        ...markers.find((m) => m.id === markerId),
        lat,
        lng,
        ...locationDetails,
        timestamp: new Date().toISOString(),
      };

      const markerRef = ref(database, "markers/" + markerId);
      await update(markerRef, updatedMarker);

      setMarkers((prev) => prev.map((m) => (m.id === markerId ? updatedMarker : m)));
    } catch (error) {
      console.error("Error updating marker:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteMarker = async (markerId) => {
    setLoading(true);
    try {
      await remove(ref(database, "markers/" + markerId));
      setMarkers((prev) => prev.filter((m) => m.id !== markerId));
    } catch (error) {
      console.error("Error deleting marker:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearAllMarkers = async () => {
    if (window.confirm("Are you sure you want to delete all markers?")) {
      setLoading(true);
      try {
        await set(ref(database, "markers"), null);
        setMarkers([]);
      } catch (error) {
        console.error("Error clearing markers:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const clearAllPolylines = async () => {
    if (window.confirm("Are you sure you want to delete all polylines?")) {
      setLoading(true);
      try {
        await set(ref(database, "polylines"), null);
        setPolylines([]);
      } catch (error) {
        console.error("Error clearing polylines:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const clearAllPolygons = async () => {
    if (window.confirm("Are you sure you want to delete all polygons?")) {
      setLoading(true);
      try {
        await set(ref(database, "polygons"), null);
        setPolygons([]);
      } catch (error) {
        console.error("Error clearing polygons:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const clearAllCircles = async () => {
    if (window.confirm("Are you sure you want to delete all circles?")) {
      setLoading(true);
      try {
        await set(ref(database, "circles"), null);
        setCircles([]);
      } catch (error) {
        console.error("Error clearing circles:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleShapeCreated = async (e) => {
    setLoading(true);
    try {
      const { layer, layerType } = e;

      if (layerType === "marker") {
        const { lat, lng } = layer.getLatLng();
        const locationDetails = await fetchLocationDetails(lat, lng);
        const newMarker = {
          id: Date.now().toString(),
          lat,
          lng,
          name: `Marker at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          ...locationDetails,
          timestamp: new Date().toISOString(),
        };

        const markerRef = ref(database, "markers/" + newMarker.id);
        await set(markerRef, newMarker);

        setMarkers((prev) => [...prev, newMarker]);
      } else if (layerType === "polyline") {
        const points = layer.getLatLngs().map((latlng) => [latlng.lat, latlng.lng]);
        const newPolyline = {
          id: Date.now().toString(),
          points,
          timestamp: new Date().toISOString(),
        };

        await set(ref(database, "polylines/" + newPolyline.id), newPolyline);
        setPolylines((prev) => [...prev, newPolyline]);
      } else if (layerType === "polygon") {
        const points = layer.getLatLngs()[0].map((latlng) => [latlng.lat, latlng.lng]);
        const newPolygon = {
          id: Date.now().toString(),
          points,
          timestamp: new Date().toISOString(),
        };

        await set(ref(database, "polygons/" + newPolygon.id), newPolygon);
        setPolygons((prev) => [...prev, newPolygon]);
      } else if (layerType === "circle") {
        const center = [layer.getLatLng().lat, layer.getLatLng().lng];
        const radius = layer.getRadius();
        const newCircle = {
          id: Date.now().toString(),
          center,
          radius,
          timestamp: new Date().toISOString(),
        };

        await set(ref(database, "circles/" + newCircle.id), newCircle);
        setCircles((prev) => [...prev, newCircle]);
      }
    } catch (error) {
      console.error("Error saving shape:", error);
    } finally {
      setLoading(false);
    }
  };

  const goToCurrentLocation = () => {
    if (currentLocation && mapRef.current && mapRef.current.leafletElement) {
      mapRef.current.leafletElement.setView(currentLocation, 13);
    }
  };

  const handleLocationSearch = async (query) => {
    if (!query) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setLocationSearchResults(data);
    } catch (error) {
      console.error("Location search error:", error);
    }
  };

  const handleLocationSelect = (lat, lon) => {
    setMapCenter([lat, lon]);
    if (mapRef.current && mapRef.current.leafletElement) {
      mapRef.current.leafletElement.setView([lat, lon], 13);
    }
    setLocationSearchResults([]);
  };

  const currentLocationIcon = L.divIcon({
    html: `<i class="fa fa-user fa-2x" style="color: #3b82f6;"></i>`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  const handleEditShape = (layer, type) => {
    setSelectedShape(layer);
    setSelectedShapeType(type);
  };

  const handlePolylineEdit = async (e, polylineId) => {
    setLoading(true);
    try {
      const points = e.layer.getLatLngs().map((latlng) => [latlng.lat, latlng.lng]);
      const updatedPolyline = {
        ...polylines.find((p) => p.id === polylineId),
        points,
        timestamp: new Date().toISOString(),
      };

      await update(ref(database, "polylines/" + polylineId), updatedPolyline);
      setPolylines((prev) => prev.map((p) => (p.id === polylineId ? updatedPolyline : p)));
    } catch (error) {
      console.error("Error updating polyline:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePolygonEdit = async (e, polygonId) => {
    setLoading(true);
    try {
      const points = e.layer.getLatLngs()[0].map((latlng) => [latlng.lat, latlng.lng]);
      const updatedPolygon = {
        ...polygons.find((p) => p.id === polygonId),
        points,
        timestamp: new Date().toISOString(),
      };

      await update(ref(database, "polygons/" + polygonId), updatedPolygon);
      setPolygons((prev) => prev.map((p) => (p.id === polygonId ? updatedPolygon : p)));
    } catch (error) {
      console.error("Error updating polygon:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCircleEdit = async (e, circleId) => {
    setLoading(true);
    try {
      const center = [e.layer.getLatLng().lat, e.layer.getLatLng().lng];
      const radius = e.layer.getRadius();
      const updatedCircle = {
        ...circles.find((c) => c.id === circleId),
        center,
        radius,
        timestamp: new Date().toISOString(),
      };

      await update(ref(database, "circles/" + circleId), updatedCircle);
      setCircles((prev) => prev.map((c) => (c.id === circleId ? updatedCircle : c)));
    } catch (error) {
      console.error("Error updating circle:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ display: "flex", height: "100vh" }}>
        <div
          ref={sidebarRef}
          style={{
            width: showSidebar ? "280px" : "40px",
            padding: showSidebar ? "20px" : "10px 0",
            borderRight: showSidebar ? "1px solid #e0e0e0" : "none",
            backgroundColor: "#ffffff",
            overflowY: showSidebar ? "auto" : "hidden",
            transition: "width 0.3s ease",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
          onMouseEnter={() => setShowSidebar(true)}
          onMouseLeave={() => setShowSidebar(false)}
        >
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              backgroundColor: "#ddd",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            {showSidebar ? "☰" : "☰"}
          </div>

          {showSidebar && (
            <>
              {loading && (
                <div style={{ marginBottom: "15px", textAlign: "center" }}>
                  <span style={{ color: "#666" }}>Loading...</span>
                </div>
              )}

              <div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "px" }}>
                    Add Marker
                  </label>
                  <input
                    type="text"
                    placeholder="Marker Name (optional)"
                    value={markerName}
                    onChange={(e) => setMarkerName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      marginBottom: "8px",
                    }}
                  />
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <input
                      type="text"
                      placeholder="Latitude"
                      value={manualCoords.lat}
                      onChange={(e) => setManualCoords((prev) => ({ ...prev, lat: e.target.value }))}
                      style={{
                        width: "50%",
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Longitude"
                      value={manualCoords.lng}
                      onChange={(e) => setManualCoords((prev) => ({ ...prev, lng: e.target.value }))}
                      style={{
                        width: "50%",
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                      }}
                    />
                  </div>
                  <button
                    onClick={addManualMarker}
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "10px",
                      backgroundColor: "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    Add Marker
                  </button>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>
                    Saved Markers
                  </label>
                  {markers.length === 0 ? (
                    <p style={{ color: "#666", fontSize: "14px" }}>No markers saved yet.</p>
                  ) : (
                    <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #eee", borderRadius: "4px" }}>
                      {markers.map((marker) => (
                        <div
                          key={marker.id}
                          style={{
                            padding: "10px",
                            borderBottom: "1px solid #eee",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <p style={{ margin: "0 0 3px 0", fontWeight: "bold", fontSize: "14px" }}>
                              {marker.name || `Marker ${marker.id}`}
                            </p>
                            <p style={{ margin: "0 0 3px 0", fontSize: "12px", color: "#666" }}>
                              {marker.city}, {marker.country}
                            </p>
                            <p style={{ margin: 0, fontSize: "11px", color: "#999" }}>
                              Lat: {marker.lat.toFixed(4)}, Lng: {marker.lng.toFixed(4)}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteMarker(marker.id)}
                            style={{
                              backgroundColor: "transparent",
                              border: "none",
                              color: "#ff4d4d",
                              fontSize: "18px",
                              cursor: "pointer",
                              padding: "5px 10px",
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={clearAllMarkers}
                    disabled={loading || markers.length === 0}
                    style={{
                      width: "100%",
                      marginTop: "10px",
                      padding: "8px",
                      backgroundColor: "#ff4d4d",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      opacity: loading || markers.length === 0 ? 0.7 : 1,
                      fontSize: "13px",
                    }}
                  >
                    Clear All Markers
                  </button>
                </div>
              </div>

              <div>
                <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
                  Use the drawing tools on the map to create shapes. All shapes will be automatically saved.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  <div>
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "bold" }}>
                      Polylines ({polylines.length})
                    </h3>
                    <button
                      onClick={clearAllPolylines}
                      disabled={loading || polylines.length === 0}
                      style={{
                        width: "100%",
                        padding: "8px",
                        backgroundColor: "#ff4d4d",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        opacity: loading || polylines.length === 0 ? 0.7 : 1,
                        fontSize: "13px",
                      }}
                    >
                      Clear All Polylines
                    </button>
                  </div>

                  <div>
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "bold" }}>
                      Polygons ({polygons.length})
                    </h3>
                    <button
                      onClick={clearAllPolygons}
                      disabled={loading || polygons.length === 0}
                      style={{
                        width: "100%",
                        padding: "8px",
                        backgroundColor: "#ff4d4d",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        opacity: loading || polygons.length === 0 ? 0.7 : 1,
                        fontSize: "13px",
                      }}
                    >
                      Clear All Polygons
                    </button>
                  </div>

                  <div>
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "bold" }}>
                      Circles ({circles.length})
                    </h3>
                    <button
                      onClick={clearAllCircles}
                      disabled={loading || circles.length === 0}
                      style={{
                        width: "100%",
                        padding: "8px",
                        backgroundColor: "#ff4d4d",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        opacity: loading || circles.length === 0 ? 0.7 : 1,
                        fontSize: "13px",
                      }}
                    >
                      Clear All Circles
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
                  Map data is saved automatically to your Firebase database.
                </p>
              </div>
            </>
          )}
        </div>

        <div style={{ flex: 1, height: "100%" }}>
          <MapContainer
            center={mapCenter} // Gunakan mapCenter atau default jika null
            zoom={mapCenter ? 13 : 6} // zoom sesuai dengan center yang ada atau default
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
            whenCreated={(map) => {
              map.on("click", handleMapClick);
            }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            <LayersControl position="bottomright">
              <BaseLayer name="OpenStreetMap">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              </BaseLayer>
              <BaseLayer name="Google Roadmap">
                <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" />
              </BaseLayer>
              <BaseLayer name="Google Satellite">
                <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" />
              </BaseLayer>
              <BaseLayer name="Google Terrain">
                <TileLayer url="https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}" />
              </BaseLayer>
              <BaseLayer name="Google Hybrid">
                <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" />
              </BaseLayer>
              <BaseLayer name="Esri World Imagery">
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              </BaseLayer>
              <BaseLayer checked name="CartoDB Positron">
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              </BaseLayer>
            </LayersControl>

            {markers.map((marker) => (
              <Marker
                key={marker.id}
                position={[marker.lat, marker.lng]}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => handleMarkerEdit(e, marker.id),
                }}
              >
                <Popup>
                  <div style={{ textAlign: "center" }}>
                    <h3 style={{ margin: "0 0 5px 0", fontSize: "16px", fontWeight: "bold" }}>
                      {marker.name || `Marker ${marker.id}`}
                    </h3>
                    <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>
                      {marker.city}, {marker.country}
                    </p>
                    <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666" }}>
                      Lat: {marker.lat.toFixed(6)}, Lng: {marker.lng.toFixed(6)}
                    </p>
                    <button
                      onClick={() => handleEditShape(marker, "marker")}
                      style={{
                        backgroundColor: "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "3px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        cursor: "pointer",
                        marginRight: "5px",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMarker(marker.id)}
                      style={{
                        backgroundColor: "#ff4d4d",
                        color: "white",
                        border: "none",
                        borderRadius: "3px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {currentLocation && (
              <Marker position={currentLocation} icon={currentLocationIcon}>
                <Popup>
                  <div style={{ textAlign: "center" }}>
                    <h3 style={{ margin: "0 0 5px 0", fontSize: "16px", fontWeight: "bold" }}>You're here! </h3>
                    {currentLocationDetails && (
                      <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>
                        {currentLocationDetails.city}, {currentLocationDetails.country}
                      </p>
                    )}
                    <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666" }}>
                      Lat: {currentLocation[0].toFixed(6)}, Lng: {currentLocation[1].toFixed(6)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {polylines.map((polyline) => (
              <Polyline key={polyline.id} positions={polyline.points} color="blue" weight={3} opacity={0.7} eventHandlers={{
                click: (e) => handleEditShape(e.target, "polyline"),
              }}>
                <Popup>
                  <div style={{ textAlign: "center" }}>
                    <button
                      onClick={() => handleEditShape(polyline, "polyline")}
                      style={{
                        backgroundColor: "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "3px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        cursor: "pointer",
                        marginRight: "5px",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        remove(ref(database, "polylines/" + polyline.id));
                        setPolylines((prev) => prev.filter((p) => p.id !== polyline.id));
                      }}
                      style={{
                        backgroundColor: "#ff4d4d",
                        color: "white",
                        border: "none",
                        borderRadius: "3px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </Popup>
              </Polyline>
            ))}

            {polygons.map((polygon) => (
              <Polygon
                key={polygon.id}
                positions={polygon.points}
                color="green"
                weight={2}
                opacity={0.5}
                fillOpacity={0.2}
                eventHandlers={{
                  click: (e) => handleEditShape(e.target, "polygon"),
                }}
              >
                <Popup>
                  <div style={{ textAlign: "center" }}>
                    <button
                      onClick={() => handleEditShape(polygon, "polygon")}
                      style={{
                        backgroundColor: "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "3px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        cursor: "pointer",
                        marginRight: "5px",
                      }}
                      >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        remove(ref(database, "polygons/" + polygon.id));
                        setPolygons((prev) => prev.filter((p) => p.id !== polygon.id));
                      }}
                      style={{
                        backgroundColor: "#ff4d4d",
                        color: "white",
                        border: "none",
                        borderRadius: "3px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </Popup>
              </Polygon>
            ))}

            {circles.map((circle) => (
              <Circle
                key={circle.id}
                center={circle.center}
                radius={circle.radius}
                color="red"
                weight={2}
                opacity={0.7}
                fillOpacity={0.2}
                eventHandlers={{
                  click: (e) => handleEditShape(e.target, "circle"),
                }}
              >
                <Popup>
                  <div style={{ textAlign: "center" }}>
                    <button
                      onClick={() => handleEditShape(circle, "circle")}
                      style={{
                        backgroundColor: "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "3px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        cursor: "pointer",
                        marginRight: "5px",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        remove(ref(database, "circles/" + circle.id));
                        setCircles((prev) => prev.filter((c) => c.id !== circle.id));
                      }}
                      style={{
                        backgroundColor: "#ff4d4d",
                        color: "white",
                        border: "none",
                        borderRadius: "3px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </Popup>
              </Circle>
            ))}

            <FeatureGroup>
              <EditControl
                position="topright"
                onEdited={(e) => {
                  if (selectedShapeType === "marker") {
                    handleMarkerEdit(e, selectedShape.id);
                  } else if (selectedShapeType === "polyline") {
                    handlePolylineEdit(e, selectedShape.id);
                  } else if (selectedShapeType === "polygon") {
                    handlePolygonEdit(e, selectedShape.id);
                  } else if (selectedShapeType === "circle") {
                    handleCircleEdit(e, selectedShape.id);
                  }
                  setSelectedShape(null);
                  setSelectedShapeType(null);
                }}
                onCreated={handleShapeCreated}
                draw={{
                  rectangle: false,
                  circlemarker: false,
                  marker: true,
                  polyline: {
                    shapeOptions: {
                      color: "blue",
                      weight: 3,
                    },
                  },
                  polygon: {
                    shapeOptions: {
                      color: "green",
                      weight: 2,
                    },
                    allowIntersection: false,
                  },
                  circle: {
                    shapeOptions: {
                      color: "red",
                      weight: 2,
                    },
                  },
                }}
              />
            </FeatureGroup>
            <MapControls map={mapRef} />

            {currentLocation && (
              <div
                style={{
                  position: "absolute",
                  top: "210px",
                  right: "11px",
                  zIndex: 1000,
                }}
              >
                <button
                  onClick={goToCurrentLocation}
                  style={{
                    backgroundColor: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "8px",
                    cursor: "pointer",
                    boxShadow: "0 0px 8px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <FaMapMarkerAlt />
                </button>
              </div>
            )}
          </MapContainer>

          <div
            style={{
              position: "absolute",
              bottom: "30px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "90%",
              height:"7%",
              maxWidth: "600px",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.15)",
              zIndex: 1000,
            }}
          >
            <input
              type="text"
              placeholder="Search location..."
              value={locationSearch}
              onChange={(e) => {
                setLocationSearch(e.target.value);
                handleLocationSearch(e.target.value);
              }}
              style={{
                padding: "10px",
                border: "none",
                borderBottom: "1px solid #eee",
                borderRadius: "8px 8px 0 0",
                fontSize: "16px",
              }}
            />
            {locationSearchResults.length > 0 && (
              <div
                style={{
                  maxHeight: "200px",
                  overflowY: "auto",
                  borderTop: "1px solid #eee",
                  borderRadius: "0 0 8px 8px",
                }}
              >
                {locationSearchResults.map((result) => (
                  <div
                    key={result.place_id}
                    onClick={() => handleLocationSelect(result.lat, result.lon)}
                    style={{
                      padding: "10px",
                      cursor: "pointer",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    {result.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomMapComponent;
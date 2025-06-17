import React, { useEffect } from "react"; 
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

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

import { getNameById } from "../utils/helpers"; 


const { BaseLayer } = LayersControl;

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom pink marker icon for current location
const PinkIcon = L.icon({
  iconUrl: icon, 
  shadowUrl: iconShadow, 
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'huechange-pink' 
});


// Helper component to pass map instance to parent ref
const MapControls = ({ mapRef }) => {
  const mapInstance = useMap();

  useEffect(() => {
    if (mapRef && mapRef.current) {
      mapRef.current.leafletElement = mapInstance;
    }
  }, [mapInstance, mapRef]);

  return null;
};

// eslint-disable-next-line no-unused-vars
const CustomMapComponent = ({ 
  mapRef,
  mapCenter,
  markers,
  polylines,
  polygons,
  circles,
  ruasJalan, 
  currentLocation,
  currentLocationDetails,
  onMapClick,
  onShapeCreated,
  onMarkerEdit,
  onPolylineEdit,
  onPolygonEdit,
  onCircleEdit,
  onDeleteMarker, 
  onDeletePolyline, 
  onDeletePolygon, 
  onDeleteCircle, 
  onEditShape, 
  selectedShape, 
  selectedShapeType, 
  eksistingList,
  jenisJalanList,
  kondisiList,
  provinsiList,
  kabupatenList,
  kecamatanList,
  desaList,
  isDrawingForRuasJalan,
  onShapeClickForDetails 
}) => {

  // Map kondisi_id to colors
  const kondisiColors = {
    '1': 'green', // Baik
    '2': 'orange', // Sedang
    '3': 'red',    // Rusak
    'default': 'gray'
  };

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapCenter ? 13 : 6}
      style={{ height: "100%", width: "100%" }}
      ref={mapRef}
      whenCreated={(map) => {
        map.on("click", onMapClick);
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

      {/* Render Markers from Firebase */}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          draggable={true}
          eventHandlers={{
            dragend: (e) => onMarkerEdit(e, marker.id), 
            onClick: () => onShapeClickForDetails(marker, 'marker') 
          }}
        >
          <Popup>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ margin: "0 0 5px 0", fontSize: "16px", fontWeight: "bold" }}>
                {marker.name || `Marker ${marker.id}`}
              </h3>
              {marker.city && marker.country && (
                  <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>
                      {marker.city}, {marker.country}
                  </p>
              )}
              <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666" }}>
                Lat: {marker.lat.toFixed(6)}, Lng: {marker.lng.toFixed(6)}
              </p>
              <button
                onClick={() => onEditShape(marker, "marker")} 
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
                  if (window.confirm("Apakah Anda yakin ingin menghapus marker ini?")) {
                      onDeleteMarker(marker.id); 
                  }
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
                Hapus
              </button>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Render Current Location Marker */}
      {currentLocation && (
        <Marker position={currentLocation} icon={PinkIcon}> 
          <Popup>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ margin: "0 0 5px 0", fontSize: "16px", fontWeight: "bold" }}>Anda di sini! </h3>
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

      {/* Render Polylines from Firebase */}
      {polylines.map((polyline) => (
        <Polyline key={polyline.id} positions={polyline.points} color="blue" weight={3} opacity={0.7} eventHandlers={{
          click: (e) => onShapeClickForDetails(polyline, 'polyline'), 
        }}>
          <Popup>
            <div style={{ textAlign: "center" }}>
              <button
                 onClick={() => onShapeClickForDetails(polyline, 'polyline')} 
                style={{ backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "3px", padding: "5px 8px", fontSize: "11px", cursor: "pointer", marginRight: "5px" }}
              >
                Detail
              </button>
              <button
                onClick={() => {
                  if (window.confirm("Apakah Anda yakin ingin menghapus polyline ini?")) {
                      onDeletePolyline(polyline.id); 
                  }
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
                Hapus
              </button>
            </div>
          </Popup>
        </Polyline>
      ))}

      {/* Render Polygons from Firebase */}
      {polygons.map((polygon) => (
        <Polygon
          key={polygon.id}
          positions={polygon.points}
          color="green"
          weight={2}
          opacity={0.5}
          fillOpacity={0.2}
          eventHandlers={{
            click: (e) => onShapeClickForDetails(polygon, 'polygon'), 
          }}
        >
          <Popup>
            <div style={{ textAlign: "center" }}>
              <button
                 onClick={() => onShapeClickForDetails(polygon, 'polygon')} 
                style={{ backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "3px", padding: "5px 8px", fontSize: "11px", cursor: "pointer", marginRight: "5px" }}
              >
                Detail
              </button>
              <button
                onClick={() => {
                  if (window.confirm("Apakah Anda yakin ingin menghapus polygon ini?")) {
                      onDeletePolygon(polygon.id); 
                  }
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
                Hapus
              </button>
            </div>
          </Popup>
        </Polygon>
      ))}

      {/* Render Circles from Firebase */}
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
            click: (e) => onShapeClickForDetails(circle, 'circle'), 
          }}
        >
          <Popup>
            <div style={{ textAlign: "center" }}>
              <button
                 onClick={() => onShapeClickForDetails(circle, 'circle')} 
                style={{ backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "3px", padding: "5px 8px", fontSize: "11px", cursor: "pointer", marginRight: "5px" }}
              >
                Detail
              </button>
              <button
                onClick={() => {
                  if (window.confirm("Apakah Anda yakin ingin menghapus lingkaran ini?")) {
                      onDeleteCircle(circle.id); 
                  }
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
                Hapus
              </button>
            </div>
          </Popup>
        </Circle>
      ))}

      {/* Render Ruas Jalan from API */}
      {ruasJalan && ruasJalan.map((rj) => {
        const polylineColor = kondisiColors[rj.kondisi_id] || kondisiColors.default;

        return (
          <Polyline 
              key={rj.id} 
              positions={rj.decodedPaths} 
              color={polylineColor} 
              weight={4} 
              opacity={0.8}
              eventHandlers={{
                  click: () => {
                      // Ini bisa memicu tampilan detail di sidebar jika diperlukan
                  }
              }}
          >
              <Popup>
                  <div style={{ textAlign: "left", fontSize: '12px' }}>
                      <h3 style={{ margin: "0 0 5px 0", fontSize: "16px", fontWeight: "bold" }}>{rj.nama_ruas}</h3>
                      <p style={{ margin: "0 0 3px 0" }}><strong>Kode Ruas:</strong> {rj.kode_ruas}</p>
                      <p style={{ margin: "0 0 3px 0" }}><strong>Panjang:</strong> {rj.panjang} m</p>
                      <p style={{ margin: "0 0 3px 0" }}><strong>Lebar:</strong> {rj.lebar} m</p>
                      <p style={{ margin: "0 0 3px 0" }}><strong>Desa:</strong> {rj.desa_name || 'N/A'}</p>
                      <p style={{ margin: "0 0 3px 0" }}><strong>Kecamatan:</strong> {rj.kecamatan_name || 'N/A'}</p>
                      <p style={{ margin: "0 0 3px 0" }}><strong>Kabupaten:</strong> {rj.kabupaten_name || 'N/A'}</p>
                      <p style={{ margin: "0 0 3px 0" }}><strong>Provinsi:</strong> {rj.provinsi_name || 'N/A'}</p>
                      
                      <p style={{ margin: "0 0 3px 0" }}><strong>Eksisting:</strong> {getNameById(eksistingList, rj.eksisting_id, 'eksisting')}</p>
                      <p style={{ margin: "0 0 3px 0" }}><strong>Kondisi:</strong> {getNameById(kondisiList, rj.kondisi_id, 'kondisi')}</p>
                      <p style={{ margin: "0 0 3px 0" }}><strong>Jenis Jalan:</strong> {getNameById(jenisJalanList, rj.jenisjalan_id, 'jenisjalan')}</p>
                      <p style={{ margin: "0 0 8px 0" }}><strong>Keterangan:</strong> {rj.keterangan || 'Tidak ada keterangan.'}</p>
                  </div>
              </Popup>
          </Polyline>
        );
      })}


      <FeatureGroup>
        <EditControl
          position="topright"
          onEdited={(e) => {
            if (selectedShapeType === "marker") {
              onMarkerEdit(e, selectedShape.id);
            } else if (selectedShapeType === "polyline") {
              onPolylineEdit(e, selectedShape.id);
            } else if (selectedShapeType === "polygon") {
              onPolygonEdit(e, selectedShape.id);
            } else if (selectedShapeType === "circle") {
              onCircleEdit(e, selectedShape.id);
            }
            onEditShape(null, null); 
          }}
          onCreated={onShapeCreated} 
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
      <MapControls mapRef={mapRef} />
    </MapContainer>
  );
};

export default CustomMapComponent;
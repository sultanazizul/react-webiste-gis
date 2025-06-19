// src/components/map/MapComponent.js

import React, { useEffect, useRef } from "react";
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
import L from "leaflet"; // Penting: import L untuk digunakan dengan Leaflet object
import { FaEdit, FaTrash } from "react-icons/fa"; // Tetap di sini karena digunakan di dalam Popup JSX

// PASTIKAN FILE-FILE INI ADA DI LOKASI BERIKUT: src/assets/images/
import icon from "../../assets/images/marker-icon.png"; // Path benar setelah dikoreksi: keluar dari map/, keluar dari components/, lalu masuk ke assets/images/
import iconShadow from "../../assets/images/marker-shadow.png"; // Path benar setelah dikoreksi

import { getNameById } from "../../utils/helpers"; // Path benar setelah dikoreksi

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

const PinkIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'huechange-pink'
});

// MapControls component definition moved back inside MapComponent.js
const MapControls = ({ mapRef, featureGroupRef, selectedShape, selectedShapeType, isEditingMapShape, handleDeleteClickFromMapPopup }) => {
    const mapInstance = useMap();

    useEffect(() => {
        if (mapRef && mapRef.current) {
            mapRef.current.leafletElement = mapInstance;
        }
    }, [mapInstance, mapRef]);

    useEffect(() => {
        if (isEditingMapShape && selectedShape && featureGroupRef.current && mapInstance) {
            const editableLayers = featureGroupRef.current.getLayers();
            let foundLayer = null;

            // Cari layer yang sesuai di dalam FeatureGroup
            editableLayers.forEach(layer => {
                if (String(layer.options.id) === String(selectedShape.id)) {
                    foundLayer = layer;
                } else {
                    // Disable editing for other layers if they were enabled
                    if (layer.editing && layer.editing.enabled()) {
                        layer.editing.disable();
                    }
                }
            });

            if (foundLayer && foundLayer.editing) {
                if (!foundLayer.editing.enabled()) {
                    foundLayer.editing.enable();
                    if (!(foundLayer instanceof L.Marker)) {
                        mapInstance.fitBounds(foundLayer.getBounds(), { padding: [50, 50] });
                    } else {
                        mapInstance.setView(foundLayer.getLatLng(), 15);
                    }
                }
                mapInstance.closePopup();
            }
        } else if (!isEditingMapShape && featureGroupRef.current) {
            featureGroupRef.current.eachLayer(layer => {
                if (layer.editing && layer.editing.enabled()) {
                    layer.editing.disable();
                }
            });
        }
    }, [isEditingMapShape, selectedShape, featureGroupRef, mapInstance]);

    useEffect(() => {
        if (!featureGroupRef.current || !mapInstance) return;

        const handleDeleted = (e) => {
            e.layers.eachLayer((layer) => {
                if (layer.options.id) {
                    let type;
                    if (layer instanceof L.Marker) type = 'marker';
                    else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) type = 'polyline';
                    else if (layer instanceof L.Polygon) type = 'polygon';
                    else if (layer instanceof L.Circle) type = 'circle';
                    
                    if (type) {
                        handleDeleteClickFromMapPopup(layer.options.id, type);
                    }
                }
            });
        };

        const drawControl = mapInstance.editTools;
        if (drawControl) {
            mapInstance.on(L.Draw.Event.DELETED, handleDeleted);
        }

        return () => {
            if (drawControl) {
                mapInstance.off(L.Draw.Event.DELETED, handleDeleted);
            }
        };
    }, [mapInstance, featureGroupRef, handleDeleteClickFromMapPopup]);


    return null;
};

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
  onEditShape,
  selectedShape,
  selectedShapeType,
  isEditingMapShape,
  eksistingList,
  jenisJalanList,
  kondisiList,
  provinsiList,
  kabupatenList,
  kecamatanList,
  desaList,
  isDrawingForRuasJalan, // Prop ini mengontrol mode gambar ruas jalan
  handleEditClickFromMapPopup,
  handleDeleteClickFromMapPopup,
  openShapePopupAndCenterMap
}) => {
  const featureGroupRef = useRef();

  const kondisiColors = {
    '1': 'green', // Baik
    '2': 'orange', // Sedang
    '3': 'red',    // Rusak
    'default': 'gray'
  };

  const handleEdited = (e) => {
    e.layers.eachLayer((layer) => {
        if (!layer.options.id) {
            console.warn('Edited layer does not have an ID in its options:', layer);
            return;
        }

        if (layer instanceof L.Marker) {
            onMarkerEdit(e, layer.options.id);
        } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
            onPolylineEdit(e, layer.options.id);
        } else if (layer instanceof L.Polygon) {
            onPolygonEdit(e, layer.options.id);
        } else if (layer instanceof L.Circle) {
            onCircleEdit(e, layer.options.id);
        }
    });
    onEditShape(null, null);
  };

  const handleDeleted = (e) => {
    e.layers.eachLayer((layer) => {
        if (layer.options.id) {
            let type;
            if (layer instanceof L.Marker) type = 'marker';
            else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) type = 'polyline';
            else if (layer instanceof L.Polygon) type = 'polygon';
            else if (layer instanceof L.Circle) type = 'circle';
            
            if (type) {
                handleDeleteClickFromMapPopup(layer.options.id, type);
            }
        }
    });
    onEditShape(null, null);
  };

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapCenter ? 13 : 6}
      style={{ height: "100%", width: "100%" }}
      ref={mapRef}
      whenCreated={(map) => {
        map.on('click', onMapClick);
      }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
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
        <BaseLayer checked name="Google Hybrid">
          <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" />
        </BaseLayer>
        <BaseLayer name="Esri World Imagery">
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
        </BaseLayer>
        <BaseLayer name="CartoDB Positron">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        </BaseLayer>
      </LayersControl>

      <MapControls 
        mapRef={mapRef} 
        featureGroupRef={featureGroupRef} 
        selectedShape={selectedShape} 
        selectedShapeType={selectedShapeType} 
        isEditingMapShape={isEditingMapShape}
        handleDeleteClickFromMapPopup={handleDeleteClickFromMapPopup}
      />

      <FeatureGroup ref={featureGroupRef}>
        <EditControl
          position="topright"
          onEdited={handleEdited}
          onCreated={onShapeCreated}
          onDeleted={handleDeleted}
          draw={{
            rectangle: false,
            circlemarker: false,
            // Logika baru untuk menampilkan tool draw:
            // Jika sedang mengedit shape yang ada (isEditingMapShape), sembunyikan semua tool gambar.
            // Jika sedang dalam mode "Tambah Ruas Jalan" (isDrawingForRuasJalan), hanya tampilkan polyline.
            // Jika tidak dalam mode khusus, tampilkan semua tool gambar.
            marker: (isEditingMapShape || isDrawingForRuasJalan) ? false : { icon: DefaultIcon },
            polyline: isEditingMapShape ? false : { shapeOptions: { color: "blue", weight: 3 } }, // polyline tetap tampil jika isDrawingForRuasJalan
            polygon: (isEditingMapShape || isDrawingForRuasJalan) ? false : { shapeOptions: { color: "green", weight: 2 }, allowIntersection: false },
            circle: (isEditingMapShape || isDrawingForRuasJalan) ? false : { shapeOptions: { color: "red", weight: 2 } },
          }}
          edit={{
            featureGroup: featureGroupRef.current,
            edit: isEditingMapShape,
            remove: true,
            poly: { allowIntersection: false }
          }}
        />

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            draggable={true}
            options={{ id: marker.id }} 
          >
            <Popup>
              <div style={{ textAlign: "center" }}>
                <h3 style={{ margin: "0 0 5px 0", fontSize: "16px", fontWeight: "bold" }}>
                  {marker.name || `Marker ${marker.id.substring(0, 5)}...`}
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
                  onClick={() => handleEditClickFromMapPopup({ ...marker, type: 'marker' }, "marker")}
                  style={{
                    backgroundColor: "#007bff",
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
                  onClick={() => handleDeleteClickFromMapPopup(marker.id, 'marker')}
                  style={{
                    backgroundColor: "#dc3545",
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

        {polylines.map((polyline) => (
          <Polyline
            key={polyline.id}
            positions={polyline.points}
            color="blue"
            weight={3}
            opacity={0.7}
            options={{ id: polyline.id }} 
          >
            <Popup>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>Polyline {polyline.id.substring(0, 5)}...</p>
                <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666" }}>Titik: {polyline.points.length}</p>
                <button
                   onClick={() => handleEditClickFromMapPopup({ ...polyline, type: 'polyline' }, 'polyline')}
                  style={{ backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "3px", padding: "5px 8px", fontSize: "11px", cursor: "pointer", marginRight: "5px" }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClickFromMapPopup(polyline.id, 'polyline')}
                  style={{
                    backgroundColor: "#dc3545",
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

        {polygons.map((polygon) => (
          <Polygon
            key={polygon.id}
            positions={polygon.points}
            color="green"
            weight={2}
            opacity={0.5}
            fillOpacity={0.2}
            options={{ id: polygon.id }} 
          >
            <Popup>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>Polygon {polygon.id.substring(0, 5)}...</p>
                <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666" }}>Titik: {polygon.points.length}</p>
                <button
                   onClick={() => handleEditClickFromMapPopup({ ...polygon, type: 'polygon' }, 'polygon')}
                  style={{ backgroundColor: "#007bff", color: "white", border: "none", padding: "5px 8px", borderRadius: "3px", cursor: "pointer", marginRight: "5px" }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClickFromMapPopup(polygon.id, 'polygon')}
                  style={{
                    backgroundColor: "#dc3545",
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

        {circles.map((circle) => (
          <Circle
            key={circle.id}
            center={circle.center}
            radius={circle.radius}
            color="red"
            weight={2}
            opacity={0.7}
            fillOpacity={0.2}
            options={{ id: circle.id }} 
          >
            <Popup>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>Circle {circle.id.substring(0, 5)}...</p>
                <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666" }}>Radius: {circle.radius.toFixed(2)}m</p>
                <button
                   onClick={() => handleEditClickFromMapPopup({ ...circle, type: 'circle' }, 'circle')}
                  style={{ backgroundColor: "#007bff", color: "white", border: "none", padding: "5px 8px", borderRadius: "3px", cursor: "pointer", marginRight: "5px" }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClickFromMapPopup(circle.id, 'circle')}
                  style={{
                    backgroundColor: "#dc3545",
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
      </FeatureGroup>

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
                        // This can trigger sidebar details if needed
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
    </MapContainer>
  );
};

export default CustomMapComponent;
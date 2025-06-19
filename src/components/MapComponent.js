// src/components/MapComponent.js

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
  useMap, // Import useMap
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

const PinkIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'huechange-pink'
});

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
                // Pastikan popup tertutup saat mode edit diaktifkan
                mapInstance.closePopup();
            }
        } else if (!isEditingMapShape && featureGroupRef.current) {
            // Disable editing for all layers if not in editing mode
            featureGroupRef.current.eachLayer(layer => {
                if (layer.editing && layer.editing.enabled()) {
                    layer.editing.disable();
                }
            });
        }
    }, [isEditingMapShape, selectedShape, featureGroupRef, mapInstance]);

    // Handle when a shape is deleted via Leaflet.draw's internal delete tool
    // This is important because the EditControl's remove tool only removes from the map,
    // not from your Firebase data. You need to handle it.
    useEffect(() => {
        if (!featureGroupRef.current || !mapInstance) return;

        const handleDeleted = (e) => {
            e.layers.eachLayer((layer) => {
                if (layer.options.id) {
                    // Panggil fungsi delete dari props Dashboard
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

        const drawControl = mapInstance.editTools; // Access the draw control from the map instance
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
  onMapClick, // Ini hanya akan dipicu jika tidak ada drawing tool yang aktif
  onShapeCreated,
  onMarkerEdit,
  onPolylineEdit,
  onPolygonEdit,
  onCircleEdit,
  onDeleteMarker, // Masih digunakan untuk hapus dari sidebar
  onDeletePolyline, // Masih digunakan untuk hapus dari sidebar
  onDeletePolygon, // Masih digunakan untuk hapus dari sidebar
  onDeleteCircle, // Masih digunakan untuk hapus dari sidebar
  onEditShape, // Ini digunakan untuk mereset selectedShape di Dashboard setelah edit selesai
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
  isDrawingForRuasJalan,
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

  // Callback for when Leaflet.draw finishes an edit.
  // This is called AFTER the shape has been visually updated on the map by Leaflet.draw.
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
    // Penting: Setelah edit selesai, reset state di Dashboard
    onEditShape(null, null); // Ini akan mereset selectedShape dan selectedShapeType, serta isEditingMapShape
  };

  // Callback for when Leaflet.draw finishes a delete.
  // This is crucial to keep your Firebase data in sync.
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
    // Setelah penghapusan, pastikan mode edit di peta dinonaktifkan
    onEditShape(null, null);
  };

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapCenter ? 13 : 6}
      style={{ height: "100%", width: "100%" }}
      ref={mapRef}
      whenCreated={(map) => {
        // Ini memastikan `onMapClick` dipanggil saat klik di peta tanpa menggambar
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

      {/* MapControls harus berada di dalam MapContainer untuk menggunakan useMap */}
      <MapControls 
        mapRef={mapRef} 
        featureGroupRef={featureGroupRef} 
        selectedShape={selectedShape} 
        selectedShapeType={selectedShapeType} 
        isEditingMapShape={isEditingMapShape}
        handleDeleteClickFromMapPopup={handleDeleteClickFromMapPopup} // Pass this down
      />

      <FeatureGroup ref={featureGroupRef}>
        <EditControl
          position="topright"
          onEdited={handleEdited} // Gunakan handler yang telah didefinisikan
          onCreated={onShapeCreated}
          onDeleted={handleDeleted} // Tambahkan handler untuk event penghapusan
          draw={{
            rectangle: false,
            circlemarker: false,
            // Nonaktifkan alat gambar jika sedang dalam mode edit atau menggambar ruas jalan
            marker: (isEditingMapShape || isDrawingForRuasJalan) ? false : { icon: DefaultIcon },
            polyline: (isEditingMapShape || isDrawingForRuasJalan) ? false : { shapeOptions: { color: "blue", weight: 3 } },
            polygon: (isEditingMapShape || isDrawingForRuasJalan) ? false : { shapeOptions: { color: "green", weight: 2 }, allowIntersection: false },
            circle: (isEditingMapShape || isDrawingForRuasJalan) ? false : { shapeOptions: { color: "red", weight: 2 } },
          }}
          edit={{
            featureGroup: featureGroupRef.current,
            edit: isEditingMapShape, // Aktifkan/nonaktifkan tombol edit berdasarkan state isEditingMapShape
            remove: true,
            poly: { allowIntersection: false }
          }}
        />

        {/* Render Markers, Polylines, Polygons, Circles from Firebase inside FeatureGroup */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            draggable={true}
            // Penting: Simpan ID di options layer agar bisa ditemukan oleh EditControl
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
            // Penting: Simpan ID di options layer agar bisa ditemukan oleh EditControl
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
            // Penting: Simpan ID di options layer agar bisa ditemukan oleh EditControl
            options={{ id: polygon.id }} 
          >
            <Popup>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>Polygon {polygon.id.substring(0, 5)}...</p>
                <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666" }}>Titik: {polygon.points.length}</p>
                <button
                   onClick={() => handleEditClickFromMapPopup({ ...polygon, type: 'polygon' }, 'polygon')}
                  style={{ backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "3px", padding: "5px 8px", fontSize: "11px", cursor: "pointer", marginRight: "5px" }}
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
            // Penting: Simpan ID di options layer agar bisa ditemukan oleh EditControl
            options={{ id: circle.id }} 
          >
            <Popup>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: "0 0 5px 0", fontSize: "14px" }}>Circle {circle.id.substring(0, 5)}...</p>
                <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666" }}>Radius: {circle.radius.toFixed(2)}m</p>
                <button
                   onClick={() => handleEditClickFromMapPopup({ ...circle, type: 'circle' }, 'circle')}
                  style={{ backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "3px", padding: "5px 8px", fontSize: "11px", cursor: "pointer", marginRight: "5px" }}
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

      {/* Render Current Location Marker (tetap di luar FeatureGroup jika tidak ingin diedit) */}
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

      {/* Render Ruas Jalan from API (tetap di luar FeatureGroup jika tidak ingin diedit menggunakan EditControl) */}
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
    </MapContainer>
  );
};

export default CustomMapComponent;
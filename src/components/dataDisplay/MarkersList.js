// src/components/dataDisplay/MarkersList.js
import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { FaEdit, FaTrash } from "react-icons/fa";

const MarkersList = ({ markers, dataLoading, openShapePopupAndCenterMap, handleShapeClickForDetails, handleDeleteClickFromMapPopup, clearAllMarkers }) => {
  return (
    <>
      <h4 style={{ margin: "20px 0 10px 0", fontSize: "14px", fontWeight: "bold" }}>
        Daftar Markers ({markers.length})
      </h4>
      {dataLoading && <LoadingSpinner />}
      {!dataLoading && markers.length === 0 ? (
        <p style={{ color: "#666", fontSize: "14px" }}>Belum ada marker tersimpan.</p>
      ) : (
        <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #eee", borderRadius: "4px", width: "100%" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f2f2f2" }}>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Nama/ID</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Lat, Lng</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {markers.map((marker) => (
                <tr key={marker.id} onClick={() => openShapePopupAndCenterMap(marker.id, 'marker', marker.lat, marker.lng)} style={{ cursor: 'pointer' }}>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{marker.name || `Marker ${marker.id.substring(0, 5)}...`}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px", whiteSpace: 'nowrap' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShapeClickForDetails(marker, 'marker'); }}
                      style={{ backgroundColor: "#ffc107", color: "white", border: "none", padding: "5px 8px", borderRadius: "3px", cursor: "pointer", marginRight: "5px", fontSize: "11px" }}
                    >
                      <FaEdit /> Detail
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteClickFromMapPopup(marker.id, 'marker'); }}
                      style={{ backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "3px", padding: "5px 8px", fontSize: "11px", cursor: "pointer" }}
                    >
                      <FaTrash /> Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button
        onClick={clearAllMarkers}
        disabled={dataLoading || markers.length === 0}
        style={{ width: "100%", marginTop: "10px", padding: "8px", backgroundColor: "#ff4d4d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", opacity: dataLoading || markers.length === 0 ? 0.7 : 1, fontSize: "13px" }}
      >
        Hapus Semua Markers
      </button>
    </>
  );
};

export default MarkersList;
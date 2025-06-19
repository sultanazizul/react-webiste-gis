// src/components/dataDisplay/PolygonsList.js
import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { FaEdit, FaTrash } from "react-icons/fa"; // Tetap di sini karena digunakan di tombol aksi

const PolygonsList = ({ polygons, dataLoading, openShapePopupAndCenterMap, handleShapeClickForDetails, handleDeleteClickFromMapPopup, clearAllPolygons }) => {
  return (
    <>
      <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '15px 0' }} />
      <h3 style={{ margin: "20px 0 10px 0", fontSize: "16px", fontWeight: "bold" }}>Manajemen Polygons</h3>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
        Gambarkan polygon di peta menggunakan alat gambar. Semua polygon akan disimpan secara otomatis ke Firebase.
      </p>
      <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "bold" }}>
        Daftar Polygons ({polygons.length})
      </h4>
      {dataLoading && <LoadingSpinner />}
      {!dataLoading && polygons.length === 0 ? (
        <p style={{ color: "#666", fontSize: "14px" }}>Belum ada polygon tersimpan.</p>
      ) : (
        <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #eee", borderRadius: "4px", width: "100%" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f2f2f2" }}>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>ID</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Titik</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {polygons.map((polygon) => (
                <tr key={polygon.id} onClick={() => openShapePopupAndCenterMap(polygon.id, 'polygon', polygon.points[0][0], polygon.points[0][1], true)} style={{ cursor: 'pointer' }}>
                  <td style={{ border: "19x solid #ddd", padding: "8px", fontSize: "12px" }}>{polygon.id.substring(0, 5)}...</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{polygon.points.length}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px", whiteSpace: 'nowrap' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShapeClickForDetails(polygon, 'polygon'); }}
                      style={{ backgroundColor: "#ffc107", color: "white", border: "none", padding: "5px 8px", borderRadius: "3px", cursor: "pointer", marginRight: "5px", fontSize: "11px"}}
                    >
                      <FaEdit /> Detail
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteClickFromMapPopup(polygon.id, 'polygon'); }}
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
        onClick={clearAllPolygons}
        disabled={dataLoading || polygons.length === 0}
        style={{ width: "100%", marginTop: "10px", padding: "8px", backgroundColor: "#ff4d4d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", opacity: dataLoading || polygons.length === 0 ? 0.7 : 1, fontSize: "13px" }}
      >
        Hapus Semua Polygons
      </button>
    </>
  );
};

export default PolygonsList;
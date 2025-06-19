// src/components/dataDisplay/PolylinesList.js
import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { FaEdit, FaTrash } from "react-icons/fa";

const PolylinesList = ({ polylines, dataLoading, openShapePopupAndCenterMap, handleShapeClickForDetails, handleDeleteClickFromMapPopup, clearAllPolylines }) => {
  return (
    <>
      <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '15px 0' }} />
      <h3 style={{ margin: "20px 0 10px 0", fontSize: "16px", fontWeight: "bold" }}>Manajemen Polylines</h3>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
        Gambarkan polyline di peta menggunakan alat gambar. Semua polyline akan disimpan secara otomatis ke Firebase.
      </p>
      <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "bold" }}>
        Daftar Polylines ({polylines.length})
      </h4>
      {dataLoading && <LoadingSpinner />}
      {!dataLoading && polylines.length === 0 ? (
        <p style={{ color: "#666", fontSize: "14px" }}>Belum ada polyline tersimpan.</p>
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
              {polylines.map((polyline) => (
                <tr key={polyline.id} onClick={() => openShapePopupAndCenterMap(polyline.id, 'polyline', polyline.points[0][0], polyline.points[0][1], true)} style={{ cursor: 'pointer' }}>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{polyline.id.substring(0, 5)}...</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{polyline.points.length}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px", whiteSpace: 'nowrap' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShapeClickForDetails(polyline, 'polyline'); }}
                      style={{  backgroundColor: "#ffc107", color: "white", border: "none", padding: "5px 8px", borderRadius: "3px", cursor: "pointer", marginRight: "5px", fontSize: "11px"}}
                    >
                      <FaEdit /> Detail
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteClickFromMapPopup(polyline.id, 'polyline'); }}
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
        onClick={clearAllPolylines}
        disabled={dataLoading || polylines.length === 0}
        style={{ width: "100%", marginTop: "10px", padding: "8px", backgroundColor: "#ff4d4d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", opacity: dataLoading || polylines.length === 0 ? 0.7 : 1, fontSize: "13px" }}
      >
        Hapus Semua Polylines
      </button>
    </>
  );
};

export default PolylinesList;
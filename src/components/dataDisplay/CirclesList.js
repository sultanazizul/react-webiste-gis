// src/components/dataDisplay/CirclesList.js
import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { FaEdit, FaTrash } from "react-icons/fa"; // Tetap di sini karena digunakan di tombol aksi

const CirclesList = ({ circles, dataLoading, openShapePopupAndCenterMap, handleShapeClickForDetails, handleDeleteClickFromMapPopup, clearAllCircles }) => {
  return (
    <>
      <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '15px 0' }} />
      <h3 style={{ margin: "20px 0 10px 0", fontSize: "16px", fontWeight: "bold" }}>Manajemen Circles</h3>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
        Gambarkan lingkaran di peta menggunakan alat gambar. Semua lingkaran akan disimpan secara otomatis ke Firebase.
      </p>
      <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "bold" }}>
        Daftar Circles ({circles.length})
      </h4>
      {dataLoading && <LoadingSpinner />}
      {!dataLoading && circles.length === 0 ? (
        <p style={{ color: "#666", fontSize: "14px" }}>Belum ada lingkaran tersimpan.</p>
      ) : (
        <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #eee", borderRadius: "4px", width: "100%" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f2f2f2" }}>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>ID</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Lat, Lng</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Radius (m)</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {circles.map((circle) => (
                <tr key={circle.id} onClick={() => openShapePopupAndCenterMap(circle.id, 'circle', circle.center[0], circle.center[1])} style={{ cursor: 'pointer' }}>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{circle.id.substring(0, 5)}...</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{circle.center[0].toFixed(4)}, {circle.center[1].toFixed(4)}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{circle.radius.toFixed(2)}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px", whiteSpace: 'nowrap' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShapeClickForDetails(circle, 'circle'); }}
                      style={{ backgroundColor: "#ffc107", color: "white", border: "none", padding: "5px 8px", borderRadius: "3px", cursor: "pointer", marginRight: "5px", fontSize: "11px"}}
                    >
                      <FaEdit /> Detail
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteClickFromMapPopup(circle.id, 'circle'); }}
                      style={{
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "3px",
                        padding: "5px 10px",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
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
        onClick={clearAllCircles}
        disabled={dataLoading || circles.length === 0}
        style={{ width: "100%", marginTop: "10px", padding: "8px", backgroundColor: "#ff4d4d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", opacity: dataLoading || circles.length === 0 ? 0.7 : 1, fontSize: "13px" }}
      >
        Hapus Semua Circles
      </button>
    </>
  );
};

export default CirclesList;
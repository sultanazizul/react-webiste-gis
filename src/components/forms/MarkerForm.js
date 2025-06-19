// src/components/forms/MarkerForm.js
import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';

const MarkerForm = ({ manualCoords, setManualCoords, markerName, setMarkerName, addManualMarker, dataLoading }) => {
  return (
    <div style={{ marginTop:"20px", marginBottom: "20px", width: "88%", border: "1px solid #eee", padding: "15px", borderRadius: "8px" }}>
      <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>
        Tambah Marker Manual
      </label>
      <input
        type="text"
        placeholder="Nama Marker (opsional)"
        value={markerName}
        onChange={(e) => setMarkerName(e.target.value)}
        style={{
          width: "90%",
          padding: "10px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          marginBottom: "8px",
        }}
      />
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px", width: "100%" }}>
        <input
          type="text"
          placeholder="Latitude"
          value={manualCoords.lat}
          onChange={(e) => setManualCoords((prev) => ({ ...prev, lat: e.target.value }))}
          required
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
          required
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
        disabled={dataLoading}
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: "#3b82f6",
          color: "white",
          fontSize:"13px",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          opacity: dataLoading ? 0.7 : 1,
        }}
      >
        {dataLoading ? <LoadingSpinner /> : "Tambah Marker"}
      </button>
    </div>
  );
};

export default MarkerForm;
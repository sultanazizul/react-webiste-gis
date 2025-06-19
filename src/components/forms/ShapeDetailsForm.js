// src/components/forms/ShapeDetailsForm.js
import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
// Hapus import FaEdit dan FaTrash jika ada, karena tidak digunakan di sini.
// import { FaEdit, FaTrash } from "react-icons/fa";

const ShapeDetailsForm = ({
  selectedShapeDetails,
  shapeForm,
  handleShapeFormChange,
  handleUpdateShape,
  shapeFormLoading,
  handleDeleteShapeFromSidebar,
  setIsShapeDetailsFormVisible,
  setIsEditingMapShape,
  setSelectedShape,
  setSelectedShapeType
}) => {
  if (!selectedShapeDetails) return null;

  return (
    <div style={{ marginTop: "20px", width: "88%", border: "1px solid #eee", padding: "15px", borderRadius: "8px" }}>
      <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
        Detail & Edit {selectedShapeDetails.type.charAt(0).toUpperCase() + selectedShapeDetails.type.slice(1)} ({selectedShapeDetails.id.substring(0, 5)}...)
      </h4>
      <form onSubmit={handleUpdateShape}>
        {selectedShapeDetails.type === 'marker' && (
          <>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Nama Marker:</label>
              <input type="text" name="name" value={shapeForm.name} onChange={handleShapeFormChange} style={{ width: "66%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }} />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Latitude:</label>
              <input type="text" name="lat" value={shapeForm.lat} onChange={handleShapeFormChange} required style={{ width: "66%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }} />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Longitude:</label>
              <input type="text" name="lng" value={shapeForm.lng} onChange={handleShapeFormChange} required style={{ width: "66%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }} />
            </div>
          </>
        )}
        {(selectedShapeDetails.type === 'polyline' || selectedShapeDetails.type === 'polygon') && (
          <>
            <p style={{ fontSize: "12px", color: "#666", marginBottom: "10px" }}>
              Koordinat {selectedShapeDetails.type === 'polyline' ? 'Polyline' : 'Polygon'} (Edit di Peta):
            </p>
            <textarea
              value={JSON.stringify(shapeForm.points)}
              readOnly
              style={{ width: "66%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc", minHeight: "100px", backgroundColor: '#f0f0f0' }}
            />
          </>
        )}
        {selectedShapeDetails.type === 'circle' && (
          <>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Center (Lat):</label>
              <input type="text" name="center_lat" value={shapeForm.center[0]} readOnly style={{ width: "66%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc", backgroundColor: '#f0f0f0' }} />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Center (Lng):</label>
              <input type="text" name="center_lng" value={shapeForm.center[1]} readOnly style={{ width: "66%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc", backgroundColor: '#f0f0f0' }} />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Radius (m):</label>
              <input type="number" name="radius" value={shapeForm.radius} onChange={handleShapeFormChange} required style={{ width: "66%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }} />
            </div>
          </>
        )}
        <button type="submit" disabled={shapeFormLoading} style={{
          width: "70%", padding: "10px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", opacity: shapeFormLoading ? 0.7 : 1, fontSize:'13px'
        }}>
          {shapeFormLoading ? <LoadingSpinner /> : "Perbarui Shape"}
        </button>
        <button type="button" onClick={() => handleDeleteShapeFromSidebar(shapeForm.id, shapeForm.type)} disabled={shapeFormLoading} style={{
          width: "70%", padding: "10px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginTop: '10px', fontSize:'13px'
        }}>
          Hapus Shape
        </button>
        <button type="button" onClick={() => {
          setIsShapeDetailsFormVisible(false);
          setIsEditingMapShape(false);
          setSelectedShape(null);
          setSelectedShapeType(null);
        }} style={{
          width: "70%", padding: "10px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginTop: '10px', fontSize:'13px'
        }}>
          Batal
        </button>
      </form>
    </div>
  );
};

export default ShapeDetailsForm;
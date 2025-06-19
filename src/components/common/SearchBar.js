// src/components/common/SearchBar.js
import React from 'react';
import { FaMapMarkerAlt } from "react-icons/fa";

const SearchBar = ({
  locationSearch,
  handleLocationSearch,
  locationSearchResults,
  handleLocationSelect,
  goToCurrentLocation
}) => {
  return (
    <div style={{
        position: "absolute",
        bottom: "30px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "90%",
        maxWidth: "600px",
        display: "flex",
        alignItems: "center",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.15)",
        zIndex: 1000,
        padding: "10px",
        boxSizing: 'border-box'
    }}>
      <input
        type="text"
        placeholder="Cari lokasi..."
        value={locationSearch}
        onChange={(e) => handleLocationSearch(e.target.value)}
        style={{
          flexGrow: 1,
          padding: "10px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          fontSize: "16px",
          marginRight: "10px",
        }}
      />
      <button
        onClick={goToCurrentLocation}
        style={{
          backgroundColor: "#10b981",
          color: "white",
          border: "none",
          borderRadius: "4px",
          padding: "10px 15px",
          cursor: "pointer",
          boxShadow: "0 0px 8px rgba(0, 0, 0, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "5px",
          height: '42px',
          margin:'5px'
        }}
      >
        <FaMapMarkerAlt />
      </button>
      {locationSearchResults.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 5px)',
            left: '0',
            width: '100%',
            maxHeight: "200px",
            overflowY: "auto",
            border: "1px solid #eee",
            borderRadius: "4px",
            backgroundColor: 'white',
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
            zIndex: 1001,
          }}
        >
          {locationSearchResults.map((result) => (
            <div
              key={result.place_id}
              onClick={() => handleLocationSelect(result.lat, result.lon)}
              style={{
                padding: "8px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
                fontSize: "13px",
              }}
            >
              {result.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
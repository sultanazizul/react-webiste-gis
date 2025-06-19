// src/components/common/LoadingSpinner.js
import React from 'react';

const LoadingSpinner = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      color: '#666',
      fontSize: '14px'
    }}>
      <div className="spinner"></div> {/* Anda bisa menambahkan CSS untuk spinner ini di index.css */}
      <span>Memuat...</span>
    </div>
  );
};

export default LoadingSpinner;

// Tambahkan gaya berikut ke src/styles/index.css
/*
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
  margin-right: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
*/
// src/components/common/Sidebar.js
import React from 'react';
import '../../styles/index.css'; // Pastikan CSS dimuat

const Sidebar = ({ showSidebar, setShowSidebar, children, onLogout, authLoading, userName }) => {
  return (
    <div className={`map-sidebar ${showSidebar ? "" : "collapsed"}`}>
      <div className="sidebar-toggle-button" onClick={() => setShowSidebar(!showSidebar)}>
        {showSidebar ? "☰" : "☰"}
      </div>

      {showSidebar && (
        <>
          <div className="greetings-section">
            <h2 style={{ margin: '0', fontSize: '20px' }}>Halo, {userName || 'Pengguna'} 👋🏻</h2>
            <p style={{ margin: '5px 0 15px', fontSize: '14px', color: '#666' }}>
              Yuk, jelajahi peta dan kelola data geografis dengan mudah!
            </p>
          </div>

          {children} {/* Konten menu dan form akan dirender di sini */}

          <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '15px 0' }} />

          <div style={{ marginTop: "20px", width: "100%" }}>
          </div>
        </>
      )}
    </div>
  );
};

export default Sidebar;
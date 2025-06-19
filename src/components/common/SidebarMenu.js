// src/components/common/SidebarMenu.js
import React from 'react';
import { FaMapMarkerAlt, FaRoute, FaDrawPolygon, FaCircle, FaPlusSquare, FaInfoCircle } from "react-icons/fa";

const SidebarMenu = ({ selectedMenu, setSelectedMenu, setIsRuasJalanFormVisible, setIsDrawingForRuasJalan, setIsShapeDetailsFormVisible, setIsEditingMapShape }) => {
  const handleMenuClick = (menuName) => {
    setSelectedMenu(menuName);
    setIsShapeDetailsFormVisible(false); // Selalu tutup form detail shape generik

    // Logika untuk Ruas Jalan vs Shape lainnya
    if (menuName === 'ruasJalan') {
      setIsRuasJalanFormVisible(true); // Tampilkan form ruas jalan
      setIsDrawingForRuasJalan(true); // Aktifkan mode gambar untuk ruas jalan
      setIsEditingMapShape(false); // Nonaktifkan edit shape peta umum
    } else {
      setIsRuasJalanFormVisible(false); // Sembunyikan form ruas jalan
      setIsDrawingForRuasJalan(false); // Nonaktifkan mode gambar ruas jalan
      setIsEditingMapShape(false); // Nonaktifkan edit shape peta umum
    }
  };

  return (
    <div className="sidebar-menu-grid">
      <button
        className={`menu-grid-item ${selectedMenu === 'ruasJalan' ? 'active' : ''}`}
        onClick={() => handleMenuClick('ruasJalan')}
      >
        <FaPlusSquare className="menu-grid-icon" />
        <span>Ruas Jalan</span>
      </button>
      <button
        className={`menu-grid-item ${selectedMenu === 'markers' ? 'active' : ''}`}
        onClick={() => handleMenuClick('markers')}
      >
        <FaMapMarkerAlt className="menu-grid-icon" />
        <span>Markers</span>
      </button>
      <button
        className={`menu-grid-item ${selectedMenu === 'polylines' ? 'active' : ''}`}
        onClick={() => handleMenuClick('polylines')}
      >
        <FaRoute className="menu-grid-icon" />
        <span>Polylines</span>
      </button>
      <button
        className={`menu-grid-item ${selectedMenu === 'polygons' ? 'active' : ''}`}
        onClick={() => handleMenuClick('polygons')}
      >
        <FaDrawPolygon className="menu-grid-icon" />
        <span>Polygons</span>
      </button>
      <button
        className={`menu-grid-item ${selectedMenu === 'circles' ? 'active' : ''}`}
        onClick={() => handleMenuClick('circles')}
      >
        <FaCircle className="menu-grid-icon" />
        <span>Circles</span>
      </button>
      <button
        className={`menu-grid-item ${selectedMenu === 'about' ? 'active' : ''}`}
        onClick={() => handleMenuClick('about')}
      >
        <FaInfoCircle className="menu-grid-icon" />
        <span>About</span>
      </button>
    </div>
  );
};

export default SidebarMenu;
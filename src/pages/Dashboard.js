// src/pages/Dashboard.js
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MapComponent from "../components/map/MapComponent";
import Sidebar from "../components/common/Sidebar";
import SidebarMenu from "../components/common/SidebarMenu";
import SearchBar from "../components/common/SearchBar";
import MarkersList from "../components/dataDisplay/MarkersList";
import PolylinesList from "../components/dataDisplay/PolylinesList";
import PolygonsList from "../components/dataDisplay/PolygonsList";
import CirclesList from "../components/dataDisplay/CirclesList";
import RuasJalanTable from "../components/dataDisplay/RuasJalanTable";
import RuasJalanForm from "../components/forms/RuasJalanForm";
import MarkerForm from "../components/forms/MarkerForm";
import ShapeDetailsForm from "../components/forms/ShapeDetailsForm";
import LoadingSpinner from "../components/common/LoadingSpinner";

import useAuth from "../hooks/useAuth";
import useMapData from "../hooks/useMapData";
import useRuasJalanData from "../hooks/useRuasJalanData";
import useRegionData from "../hooks/useRegionData";
import useMasterData from "../hooks/useMasterData";

import "../styles/index.css";
import { getNameById } from "../utils/helpers";
import L from 'leaflet'; // Import L untuk digunakan dengan objek Leaflet

const Dashboard = () => {
    const { user, loading: authLoading, logout } = useAuth();
    const navigate = useNavigate();

    // Hooks for data and logic
    const {
        markers, polylines, polygons, circles, dataLoading,
        currentLocation, currentLocationDetails, mapCenter, setMapCenter,
        addMarker, updateMarker, deleteMarker, clearAllMarkers,
        addPolyline, updatePolyline, deletePolyline, clearAllPolylines,
        addPolygon, updatePolygon, deletePolygon, clearAllPolygons,
        addCircle, updateCircle, deleteCircle, clearAllCircles,
        fetchLocationDetails
    } = useMapData();

    const {
        ruasJalanList, ruasJalanLoading, editingRuasJalan, isRuasJalanFormVisible,
        lastDrawnPolylineCoords, isDrawingForRuasJalan, ruasJalanForm,
        provinsiListForm, kabupatenListForm, kecamatanListForm, desaListForm,
        handleRuasJalanFormChange, handleSetLastDrawnPolyline, handleAddOrUpdateRuasJalan,
        handleEditRuasJalanClick, handleDeleteRuasJalanClick, toggleRuasJalanFormVisibility,
        cancelRuasJalanForm
    } = useRuasJalanData(user, navigate);

    const {
        allProvinsi, filterProvinsiId, filterKabupatenList, filterKabupatenId,
        filterKecamatanList, filterKecamatanId, filterDesaList, filterDesaId,
        handleFilterChange
    } = useRegionData(user);

    const { eksistingList, jenisJalanList, kondisiList } = useMasterData(user);

    // Local UI states
    const [showSidebar, setShowSidebar] = useState(true);
    const [selectedMenu, setSelectedMenu] = useState('ruasJalan');

    // Map-related states and refs
    const mapRef = useRef();
    const [locationSearch, setLocationSearch] = useState(""); // State untuk search bar lokasi
    const [ruasJalanSearchTerm, setRuasJalanSearchTerm] = useState(''); // State BARU untuk search bar ruas jalan
    const [locationSearchResults, setLocationSearchResults] = useState([]);
    const [manualCoords, setManualCoords] = useState({ lat: "", lng: "" });
    const [markerName, setMarkerName] = useState("");

    // States for Leaflet.draw internal editing (used by MapComponent)
    const [selectedShape, setSelectedShape] = useState(null);
    const [selectedShapeType, setSelectedShapeType] = useState(null);
    const [isEditingMapShape, setIsEditingMapShape] = useState(false);

    // State for Generic Shape Details/Edit Form in sidebar
    const [selectedShapeDetails, setSelectedShapeDetails] = useState(null);
    const [isShapeDetailsFormVisible, setIsShapeDetailsFormVisible] = useState(false);
    const [shapeForm, setShapeForm] = useState({ id: '', name: '', lat: '', lng: '', points: [], center: [], radius: '', type: '' });
    const [shapeFormLoading, setShapeFormLoading] = useState(false);

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/login");
        }
    }, [user, authLoading, navigate]);

    // Handle Logout
    const handleLogout = async () => {
        // Tambahkan konfirmasi sebelum logout
        if (window.confirm("Apakah Anda yakin ingin logout?")) {
            await logout();
            navigate("/");
        }
    };

    // --- Map Interactions (passed to MapComponent) ---
    const handleMapClick = async (e) => {
        // Jangan menambahkan marker jika form detail shape/ruas jalan aktif atau sedang editing
        if (isShapeDetailsFormVisible || isDrawingForRuasJalan || isEditingMapShape) {
            return;
        }
        try {
            await addMarker(e.latlng.lat, e.latlng.lng);
        } catch (error) {
            alert(error.message);
        }
    };

    const handleShapeCreated = async (e) => {
        const { layer, layerType } = e;
        try {
            if (layerType === "marker") {
                await addMarker(layer.getLatLng().lat, layer.getLatLng().lng, `Marker baru`);
            } else if (layerType === "polyline") {
                const points = layer.getLatLngs().map((latlng) => [latlng.lat, latlng.lng]);
                if (isDrawingForRuasJalan) {
                    handleSetLastDrawnPolyline(points);
                } else {
                    await addPolyline(points);
                }
            } else if (layerType === "polygon") {
                const points = layer.getLatLngs()[0].map((latlng) => [latlng.lat, latlng.lng]);
                await addPolygon(points);
            } else if (layerType === "circle") {
                const center = [layer.getLatLng().lat, layer.getLatLng().lng];
                const radius = layer.getRadius();
                await addCircle(center, radius);
            }
        } catch (error) {
            alert(error.message);
        }
    };

    const handleMarkerEdit = async (e, markerId) => {
        try {
            const { lat, lng } = e.layer.getLatLng();
            const existingMarker = markers.find((m) => m.id === markerId);
            const updatedMarker = {
                ...existingMarker,
                lat,
                lng,
                ...(await fetchLocationDetails(lat, lng)),
                timestamp: new Date().toISOString(),
            };
            await updateMarker(markerId, updatedMarker);
            if (selectedShapeDetails?.id === markerId && selectedShapeDetails?.type === 'marker') {
                setSelectedShapeDetails(updatedMarker);
                setShapeForm(prev => ({ ...prev, lat: updatedMarker.lat, lng: updatedMarker.lng, name: updatedMarker.name }));
            }
        } catch (error) {
            alert(error.message);
        } finally {
            handleMapShapeEditOrDeleteFinished();
        }
    };

    const handlePolylineEdit = async (e, polylineId) => {
        try {
            const points = e.layer.getLatLngs().map((latlng) => [latlng.lat, latlng.lng]);
            const existingPolyline = polylines.find((p) => p.id === polylineId);
            const updatedPolyline = {
                ...existingPolyline,
                points,
                timestamp: new Date().toISOString(),
            };
            await updatePolyline(polylineId, updatedPolyline);
            if (selectedShapeDetails?.id === polylineId && selectedShapeDetails?.type === 'polyline') {
                setSelectedShapeDetails(updatedPolyline);
                setShapeForm(prev => ({ ...prev, points: updatedPolyline.points }));
            }
        } catch (error) {
            alert(error.message);
        } finally {
            handleMapShapeEditOrDeleteFinished();
        }
    };

    const handlePolygonEdit = async (e, polygonId) => {
        try {
            const points = e.layer.getLatLngs()[0].map((latlng) => [latlng.lat, latlng.lng]);
            const existingPolygon = polygons.find((p) => p.id === polygonId);
            const updatedPolygon = {
                ...existingPolygon,
                points,
                timestamp: new Date().toISOString(),
            };
            await updatePolygon(polygonId, updatedPolygon);
            if (selectedShapeDetails?.id === polygonId && selectedShapeDetails?.type === 'polygon') {
                setSelectedShapeDetails(updatedPolygon);
                setShapeForm(prev => ({ ...prev, points: updatedPolygon.points }));
            }
        } catch (error) {
            alert(error.message);
        } finally {
            handleMapShapeEditOrDeleteFinished();
        }
    };

    const handleCircleEdit = async (e, circleId) => {
        try {
            const { layer } = e;
            const center = [layer.getLatLng().lat, layer.getLatLng().lng];
            const radius = layer.getRadius();
            const existingCircleRef = circles.find((c) => c.id === circleId);
            const updatedCircle = {
                ...existingCircleRef,
                center,
                radius,
                timestamp: new Date().toISOString(),
            };
            await updateCircle(circleId, updatedCircle);
            if (selectedShapeDetails?.id === circleId && selectedShapeDetails?.type === 'circle') {
                setSelectedShapeDetails(updatedCircle);
                setShapeForm(prev => ({ ...prev, center: updatedCircle.center, radius: updatedCircle.radius }));
            }
        } catch (error) {
            alert(error.message);
        } finally {
            handleMapShapeEditOrDeleteFinished();
        }
    };

    const handleDeleteClickFromMapPopup = async (shapeId, shapeType) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus ${shapeType} ini?`)) {
            try {
                if (shapeType === 'marker') await deleteMarker(shapeId);
                else if (shapeType === 'polyline') await deletePolyline(shapeId);
                else if (shapeType === 'polygon') await deletePolygon(shapeId);
                else if (shapeType === 'circle') await deleteCircle(shapeId);
                alert(`${shapeType} berhasil dihapus!`);
                setSelectedShapeDetails(null);
                setIsShapeDetailsFormVisible(false);
                handleMapShapeEditOrDeleteFinished();
            } catch (error) {
                alert(`Gagal menghapus ${shapeType}: ${error.message}`);
            }
        }
    };

    const handleEditClickFromMapPopup = (shape, type) => {
        setShowSidebar(true);
        setSelectedMenu(type + 's');
        cancelRuasJalanForm(); // Panggil fungsi dari hook untuk mereset form ruas jalan

        setSelectedShapeDetails({ ...shape, type });
        setIsShapeDetailsFormVisible(true);
        setShapeForm({
            id: shape.id,
            name: shape.name || '',
            lat: shape.lat || (shape.center ? shape.center[0] : ''),
            lng: shape.lng || (shape.center ? shape.center[1] : ''),
            points: shape.points || [],
            center: shape.center || [],
            radius: shape.radius || '',
            type: type
        });

        setSelectedShape(shape);
        setSelectedShapeType(type);
        setIsEditingMapShape(true);
        if (mapRef.current && mapRef.current.leafletElement) {
            mapRef.current.leafletElement.closePopup();
        }
    };

    const handleMapShapeEditOrDeleteFinished = () => {
        setIsEditingMapShape(false);
        setSelectedShape(null);
        setSelectedShapeType(null);
    };

    const openShapePopupAndCenterMap = (shapeId, shapeType, lat, lng, isGeom = false) => {
        if (mapRef.current && mapRef.current.leafletElement) {
            const map = mapRef.current.leafletElement;
            const featureGroup = mapRef.current.leafletElement._layers;

            let foundLayer = null;
            for (const layerId in featureGroup) {
                const layer = featureGroup[layerId];
                if (layer.options && String(layer.options.id) === String(shapeId)) {
                    foundLayer = layer;
                    break;
                }
            }

            if (foundLayer && foundLayer.openPopup) {
                foundLayer.openPopup();
                if (foundLayer.getCenter) {
                    map.setView(foundLayer.getCenter(), 15);
                } else if (foundLayer.getBounds) {
                    map.fitBounds(foundLayer.getBounds(), { padding: [50, 50] });
                } else {
                    map.setView(foundLayer.getLatLng(), 15);
                }
            } else if (lat && lng) {
                map.setView([lat, lng], 15);
            }
        }
    };

    // Go to current location on map
    const goToCurrentLocation = () => {
        if (currentLocation && mapRef.current && mapRef.current.leafletElement) {
            mapRef.current.leafletElement.setView(currentLocation, 13);
        }
    };

    // --- Manual Marker Add (moved to Dashboard state/logic to pass to MarkerForm) ---
    const handleAddManualMarker = async () => {
        if (!manualCoords.lat || !manualCoords.lng) {
            alert("Please enter valid coordinates");
            return;
        }
        try {
            // Ketika addManualMarker dipanggil, langsung tambahkan marker
            const lat = parseFloat(manualCoords.lat);
            const lng = parseFloat(manualCoords.lng);
            const newMarker = await addMarker(lat, lng, markerName);
            // Setelah berhasil ditambahkan, Anda bisa memilih untuk menampilkan detailnya atau tidak
            // Saat ini, kita menampilkan detailnya di sidebar
            setSelectedShapeDetails(newMarker);
            setIsShapeDetailsFormVisible(true);
            setSelectedMenu('markers');
            setManualCoords({ lat: "", lng: "" }); // Bersihkan form setelah submit
            setMarkerName(""); // Bersihkan form setelah submit
        } catch (error) {
            alert(`Gagal menambahkan marker: ${error.message}`);
            console.error("Error adding manual marker:", error);
        }
    };


    // --- Generic Shape Form/Details Logic ---
    const handleShapeClickForDetails = (shape, type) => {
        setShowSidebar(true);
        setSelectedMenu(type + 's');
        cancelRuasJalanForm(); // Panggil fungsi dari hook untuk mereset form ruas jalan
        
        setSelectedShapeDetails({ ...shape, type });
        setIsShapeDetailsFormVisible(true);
        setShapeForm({
            id: shape.id,
            name: shape.name || '',
            lat: shape.lat || (shape.center ? shape.center[0] : ''),
            lng: shape.lng || (shape.center ? shape.center[1] : ''),
            points: shape.points || [],
            center: shape.center || [],
            radius: shape.radius || '',
            type: type
        });
        setIsEditingMapShape(false);
        setSelectedShape(null);
        setSelectedShapeType(null);
    };

    const handleShapeFormChange = (e) => {
        const { name, value } = e.target;
        setShapeForm(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateShape = async (e) => {
        e.preventDefault();
        setShapeFormLoading(true);
        try {
            const { id, type, name, lat, lng, radius } = shapeForm;
            let existingShapeRef; 
            let updatedData = { timestamp: new Date().toISOString() };

            if (type === 'marker') {
                existingShapeRef = markers.find(m => m.id === id);
                updatedData = {
                    ...existingShapeRef,
                    name: name,
                    lat: lat ? parseFloat(lat) : existingShapeRef.lat,
                    lng: lng ? parseFloat(lng) : existingShapeRef.lng, 
                    ...(await fetchLocationDetails(lat || existingShapeRef.lat, lng || existingShapeRef.lng))
                };
                await updateMarker(id, updatedData);
            } else if (type === 'polyline') {
                existingShapeRef = polylines.find(p => p.id === id);
                updatedData = { ...existingShapeRef, name: name || existingShapeRef.name };
                await updatePolyline(id, updatedData);
            } else if (type === 'polygon') {
                existingShapeRef = polygons.find(p => p.id === id);
                updatedData = { ...existingShapeRef, name: name || existingShapeRef.name };
                await updatePolygon(id, updatedData);
            } else if (type === 'circle') {
                existingShapeRef = circles.find(c => c.id === id);
                updatedData = {
                    ...existingShapeRef,
                    radius: parseFloat(radius)
                };
                await updateCircle(id, updatedData);
            }
            alert(`${type} berhasil diperbarui!`);
            setSelectedShapeDetails(null);
            setIsShapeDetailsFormVisible(false);
            setIsEditingMapShape(false);
            setSelectedShape(null);
            setSelectedShapeType(null);
        } catch (error) {
            alert(`Gagal memperbarui ${shapeForm.type}: ${error.message}`);
            console.error(`Error updating ${shapeForm.type}:`, error);
        } finally {
            setShapeFormLoading(false);
        }
    };

    const handleDeleteShapeFromSidebar = async (id, type) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus ${type} ini?`)) {
            setShapeFormLoading(true);
            try {
                if (type === 'marker') await deleteMarker(id);
                else if (type === 'polyline') await deletePolyline(id);
                else if (type === 'polygon') await deletePolygon(id);
                else if (type === 'circle') await deleteCircle(id);
                alert(`${type} berhasil dihapus!`);
                setSelectedShapeDetails(null);
                setIsShapeDetailsFormVisible(false);
                setIsEditingMapShape(false);
                setSelectedShape(null);
                setSelectedShapeType(null);
            } catch (error) {
                alert(`Gagal menghapus ${type}: ${error.message}`);
                console.error(`Error deleting ${type}:`, error);
            } finally {
                setShapeFormLoading(false);
            }
        }
    };

    // Fungsionalitas baru: Zoom ke ruas jalan saat diklik di daftar
    const handleRuasJalanListClick = (ruasJalan) => {
        if (mapRef.current && mapRef.current.leafletElement && ruasJalan.decodedPaths && ruasJalan.decodedPaths.length > 0) {
            // Gunakan L.polyline untuk membuat objek polyline sementara dari koordinat, lalu dapatkan batasnya
            const polylineLayer = L.polyline(ruasJalan.decodedPaths);
            mapRef.current.leafletElement.fitBounds(polylineLayer.getBounds(), { padding: [50, 50] });
        }
    };


    // Filtered Ruas Jalan List (Use useMemo for performance)
    const filteredRuasJalanList = useMemo(() => {
        // Gunakan ruasJalanSearchTerm yang baru
        return ruasJalanList.filter(rj => {
            const lowerCaseSearchTerm = ruasJalanSearchTerm.toLowerCase(); // Menggunakan ruasJalanSearchTerm yang baru

            const kondisiName = getNameById(kondisiList, rj.kondisi_id, 'kondisi')?.toLowerCase() || '';
            const eksistingName = getNameById(eksistingList, rj.eksisting_id, 'eksisting')?.toLowerCase() || '';

            const matchesSearchTerm =
                (rj.nama_ruas?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
                (rj.kode_ruas?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
                (rj.keterangan?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
                (rj.provinsi_name?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
                (rj.kabupaten_name?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
                (rj.kecamatan_name?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
                (rj.desa_name?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
                kondisiName.includes(lowerCaseSearchTerm) ||
                eksistingName.includes(lowerCaseSearchTerm);

            const matchesProvinsi = filterProvinsiId ? String(rj.provinsi_id) === String(filterProvinsiId) : true;
            const matchesKabupaten = filterKabupatenId ? String(rj.kabupaten_id) === String(filterKabupatenId) : true;
            const matchesKecamatan = filterKecamatanId ? String(rj.kecamatan_id) === String(filterKecamatanId) : true;
            const matchesDesa = filterDesaId ? String(rj.desa_id) === String(filterDesaId) : true;

            return matchesSearchTerm && matchesProvinsi && matchesKabupaten && matchesKecamatan && matchesDesa;
        });
    }, [ruasJalanList, ruasJalanSearchTerm, filterProvinsiId, filterKabupatenId, filterKecamatanId, filterDesaId, kondisiList, eksistingList]);

    // Handle CSV Download
    const handleDownloadCsv = () => {
        const headers = [
            "ID", "Nama Ruas", "Kode Ruas", "Panjang (m)", "Lebar (m)",
            "Desa", "Kecamatan", "Kabupaten", "Provinsi",
            "Eksisting", "Kondisi", "Jenis Jalan", "Keterangan", "Paths (Encoded)"
        ];

        const rows = filteredRuasJalanList.map(rj => {
            const escapeCsv = (value) => {
                if (value === null || value === undefined) return '';
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            };

            return [
                escapeCsv(rj.id),
                escapeCsv(rj.nama_ruas),
                escapeCsv(rj.kode_ruas),
                escapeCsv(rj.panjang),
                escapeCsv(rj.lebar),
                escapeCsv(rj.desa_name),
                escapeCsv(rj.kecamatan_name),
                escapeCsv(rj.kabupaten_name),
                escapeCsv(rj.provinsi_name),
                escapeCsv(getNameById(eksistingList, rj.eksisting_id, 'eksisting')),
                escapeCsv(getNameById(kondisiList, rj.kondisi_id, 'kondisi')),
                escapeCsv(getNameById(jenisJalanList, rj.jenisjalan_id, 'jenisjalan')),
                escapeCsv(rj.keterangan),
                escapeCsv(rj.paths)
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'data_ruas_jalan.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (authLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="dashboard-container">
            <Sidebar
                showSidebar={showSidebar}
                setShowSidebar={setShowSidebar}
                onLogout={handleLogout}
                userName={user?.name}
                selectedMenu={selectedMenu} // Teruskan selectedMenu ke Sidebar untuk mengontrol tombol logout
            >
                <SidebarMenu
                    selectedMenu={selectedMenu}
                    setSelectedMenu={setSelectedMenu}
                    setIsRuasJalanFormVisible={toggleRuasJalanFormVisibility}
                    setIsDrawingForRuasJalan={() => { /* Dihandle oleh toggleRuasJalanFormVisibility atau cancelRuasJalanForm */ }}
                    setIsShapeDetailsFormVisible={setIsShapeDetailsFormVisible}
                    setIsEditingMapShape={setIsEditingMapShape}
                />
                <div style={{ padding: '10px 20px', width: '100%', boxSizing: 'border-box' }}>
                    {selectedMenu === 'about' && (
                        <>
                            <div style={{ fontSize: '14px', color: '#333' }}>
                                <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '20px 0' }} />
                                <h3>Tentang Aplikasi GIS Ini</h3>
                                <p>Aplikasi ini dirancang untuk memudahkan pengelolaan data geografis, khususnya ruas jalan, marker, polyline, polygon, dan circle. Anda dapat menambahkan, melihat, mengedit, dan menghapus data dengan antarmuka yang intuitif.</p>
                                <p>Dikembangkan dengan ReactJS untuk frontend, Firebase Realtime Database untuk data peta, dan API eksternal untuk data ruas jalan dan informasi wilayah.</p>
                                <p>Nikmati pengalaman memetakan dunia Anda!</p>
                            </div>
                            <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '20px 0' }} />
                            <button className="logout-btn-sidebar" onClick={handleLogout} disabled={authLoading}>
                                Logout
                            </button>
                        </>
                    )}
                    {selectedMenu === 'markers' && (
                        <>
                            <MarkerForm
                                manualCoords={manualCoords}
                                setManualCoords={setManualCoords}
                                markerName={markerName}
                                setMarkerName={setMarkerName}
                                addManualMarker={handleAddManualMarker}
                                dataLoading={dataLoading}
                            />
                            <MarkersList
                                markers={markers}
                                dataLoading={dataLoading}
                                openShapePopupAndCenterMap={openShapePopupAndCenterMap}
                                handleShapeClickForDetails={handleShapeClickForDetails}
                                handleDeleteClickFromMapPopup={handleDeleteClickFromMapPopup}
                                clearAllMarkers={clearAllMarkers}
                            />
                        </>
                    )}
                    {selectedMenu === 'polylines' && (
                        <PolylinesList
                            polylines={polylines}
                            dataLoading={dataLoading}
                            openShapePopupAndCenterMap={openShapePopupAndCenterMap}
                            handleShapeClickForDetails={handleShapeClickForDetails}
                            handleDeleteClickFromMapPopup={handleDeleteClickFromMapPopup}
                            clearAllPolylines={clearAllPolylines}
                        />
                    )}
                    {selectedMenu === 'polygons' && (
                        <PolygonsList
                            polygons={polygons}
                            dataLoading={dataLoading}
                            openShapePopupAndCenterMap={openShapePopupAndCenterMap}
                            handleShapeClickForDetails={handleShapeClickForDetails}
                            handleDeleteClickFromMapPopup={handleDeleteClickFromMapPopup}
                            clearAllPolygons={clearAllPolygons}
                        />
                    )}
                    {selectedMenu === 'circles' && (
                        <CirclesList
                            circles={circles}
                            dataLoading={dataLoading}
                            openShapePopupAndCenterMap={openShapePopupAndCenterMap}
                            handleShapeClickForDetails={handleShapeClickForDetails}
                            handleDeleteClickFromMapPopup={handleDeleteClickFromMapPopup}
                            clearAllCircles={clearAllCircles}
                        />
                    )}
                    {selectedMenu === 'ruasJalan' && (
                        <>
                            <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '15px 0' }} />
                            <h3 style={{ margin: "20px 0 10px 0", fontSize: "16px", fontWeight: "bold" }}>Manajemen Ruas Jalan</h3>
                            <button
                                onClick={toggleRuasJalanFormVisibility}
                                style={{
                                    width: "100%", padding: "10px", backgroundColor: "#28a745", color: "white",
                                    border: "none", borderRadius: "4px", cursor: "pointer", marginBottom: "15px", fontSize:'13px',
                                }}
                                disabled={ruasJalanLoading}
                            >
                                {isRuasJalanFormVisible ? "Sembunyikan Form" : "Tambah Ruas Jalan Baru"}
                            </button>

                            {isRuasJalanFormVisible && (
                                <RuasJalanForm
                                    ruasJalanForm={ruasJalanForm}
                                    handleRuasJalanFormChange={handleRuasJalanFormChange}
                                    handleAddOrUpdateRuasJalan={handleAddOrUpdateRuasJalan}
                                    ruasJalanLoading={ruasJalanLoading}
                                    editingRuasJalan={editingRuasJalan}
                                    lastDrawnPolylineCoords={lastDrawnPolylineCoords}
                                    isDrawingForRuasJalan={isDrawingForRuasJalan}
                                    handleSetLastDrawnPolyline={handleSetLastDrawnPolyline}
                                    provinsiListForm={provinsiListForm}
                                    kabupatenListForm={kabupatenListForm}
                                    kecamatanListForm={kecamatanListForm}
                                    desaListForm={desaListForm}
                                    eksistingList={eksistingList}
                                    jenisJalanList={jenisJalanList}
                                    kondisiList={kondisiList}
                                    cancelRuasJalanForm={cancelRuasJalanForm}
                                />
                            )}

                            <RuasJalanTable
                                ruasJalanList={filteredRuasJalanList}
                                ruasJalanLoading={ruasJalanLoading}
                                ruasJalanSearchTerm={ruasJalanSearchTerm} // Menggunakan state ruasJalanSearchTerm
                                setRuasJalanSearchTerm={setRuasJalanSearchTerm} // Menggunakan setter ruasJalanSearchTerm
                                filterProvinsiId={filterProvinsiId}
                                filterKabupatenList={filterKabupatenList}
                                filterKabupatenId={filterKabupatenId}
                                filterKecamatanList={filterKecamatanList}
                                filterKecamatanId={filterKecamatanId}
                                filterDesaList={filterDesaList}
                                filterDesaId={filterDesaId}
                                handleFilterChange={handleFilterChange}
                                handleDownloadCsv={handleDownloadCsv}
                                handleEditRuasJalanClick={handleEditRuasJalanClick}
                                handleDeleteRuasJalanClick={handleDeleteRuasJalanClick}
                                eksistingList={eksistingList}
                                jenisJalanList={jenisJalanList}
                                kondisiList={kondisiList}
                                allProvinsi={allProvinsi}
                                handleRuasJalanListClick={handleRuasJalanListClick}
                            />
                        </>
                    )}

                    {isShapeDetailsFormVisible && selectedShapeDetails && (
                        <ShapeDetailsForm
                            selectedShapeDetails={selectedShapeDetails}
                            shapeForm={shapeForm}
                            handleShapeFormChange={handleShapeFormChange}
                            handleUpdateShape={handleUpdateShape}
                            shapeFormLoading={shapeFormLoading}
                            handleDeleteShapeFromSidebar={handleDeleteShapeFromSidebar}
                            setIsShapeDetailsFormVisible={setIsShapeDetailsFormVisible}
                            setIsEditingMapShape={setIsEditingMapShape}
                            setSelectedShape={setSelectedShape}
                            setSelectedShapeType={setSelectedShapeType}
                        />
                    )}
                </div>
            </Sidebar>

            <div className="map-content">
                <SearchBar
                    locationSearch={locationSearch}
                    handleLocationSearch={async (query) => {
                        setLocationSearch(query);
                        if (query) {
                            try {
                                const response = await fetch(
                                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
                                );
                                const data = await response.json();
                                setLocationSearchResults(data);
                            } catch (error) {
                                console.error("Location search error:", error);
                            }
                        } else {
                            setLocationSearchResults([]);
                        }
                    }}
                    locationSearchResults={locationSearchResults}
                    handleLocationSelect={(lat, lon) => {
                        setMapCenter([lat, lon]);
                        if (mapRef.current && mapRef.current.leafletElement) {
                            mapRef.current.leafletElement.setView([lat, lon], 13);
                        }
                        setLocationSearchResults([]);
                    }}
                    goToCurrentLocation={goToCurrentLocation}
                />

                <MapComponent
                    mapRef={mapRef}
                    mapCenter={mapCenter}
                    markers={markers}
                    polylines={polylines}
                    polygons={polygons}
                    circles={circles}
                    ruasJalan={ruasJalanList}
                    currentLocation={currentLocation}
                    currentLocationDetails={currentLocationDetails}
                    onMapClick={handleMapClick}
                    onShapeCreated={handleShapeCreated}
                    onMarkerEdit={handleMarkerEdit}
                    onPolylineEdit={handlePolylineEdit}
                    onPolygonEdit={handlePolygonEdit}
                    onCircleEdit={handleCircleEdit}
                    onEditShape={handleMapShapeEditOrDeleteFinished}
                    selectedShape={selectedShape}
                    selectedShapeType={selectedShapeType}
                    isEditingMapShape={isEditingMapShape}
                    eksistingList={eksistingList}
                    jenisJalanList={jenisJalanList}
                    kondisiList={kondisiList}
                    provinsiList={allProvinsi}
                    isDrawingForRuasJalan={isDrawingForRuasJalan}
                    handleEditClickFromMapPopup={handleEditClickFromMapPopup}
                    handleDeleteClickFromMapPopup={handleDeleteClickFromMapPopup}
                    openShapePopupAndCenterMap={openShapePopupAndCenterMap}
                />
            </div>
        </div>
    );
};

export default Dashboard;
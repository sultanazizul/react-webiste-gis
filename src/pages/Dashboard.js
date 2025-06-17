import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MapComponent from "../components/MapComponent";
import useAuth from "../hooks/useAuth"; // Import custom hook
import "../styles/index.css"; // Pastikan CSS dimuat
import { FaMapMarkerAlt, FaRoute, FaDrawPolygon, FaCircle, FaPlusSquare, FaInfoCircle, FaFileDownload, FaEdit, FaTrash } from "react-icons/fa"; // Tambahkan FaEdit, FaTrash

// Import semua fungsi API mapData
import {
  getMarkersRef,
  setMarkerData,
  updateMarkerData,
  removeMarkerData, 
  clearAllMarkersData,
  getPolylinesRef,
  setPolylineData, 
  updatePolylineData,
  removePolylineData, 
  clearAllPolylinesData,
  getPolygonsRef,
  setPolygonData,
  updatePolygonData,
  removePolygonData, 
  clearAllPolygonsData,
  getCirclesRef,
  setCircleData,
  updateCircleData,
  removeCircleData, 
  clearAllCirclesData,
} from "../api/mapData";
import { onValue } from "firebase/database"; // onValue tetap diimpor karena digunakan di sini untuk listener

// Import Ruas Jalan API
import {
  getAllRuasJalan,
  addRuasJalan,
  editRuasJalan,
  deleteRuasJalan,
} from "../api/ruasJalan";

// Import Region API
import {
  getAllRegions,
  getKabupatenByProvinsiId,
  getKecamatanByKabupatenId,
  getDesaByKecamatanId,
  getKecamatanByDesaId 
} from "../api/region";

// Import Master Data API
import {
  getMasterEksistingJalan,
  getMasterJenisJalan,
  getMasterKondisiJalan,
} from "../api/masterData";

// Import Helpers
import { calculatePolylineLength, getNameById } from "../utils/helpers";


const Dashboard = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(true); 
  const [selectedMenu, setSelectedMenu] = useState('ruasJalan'); 

  // State untuk data peta (Firebase)
  const [markers, setMarkers] = useState([]);
  const [polylines, setPolylines] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const [circles, setCircles] = useState([]);
  const [manualCoords, setManualCoords] = useState({ lat: "", lng: "" });
  const [markerName, setMarkerName] = useState("");
  const [currentLocation, setCurrentLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([-6.200000, 106.816666]); 
  const [dataLoading, setDataLoading] = useState(true); 
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSearchResults, setLocationSearchResults] = useState([]);
  const [currentLocationDetails, setCurrentLocationDetails] = useState(null);
  const [selectedShape, setSelectedShape] = useState(null);
  const [selectedShapeType, setSelectedShapeType] = useState(null);

  // State untuk data Ruas Jalan (API)
  const [ruasJalanList, setRuasJalanList] = useState([]); 
  const [editingRuasJalan, setEditingRuasJalan] = useState(null); 
  const [ruasJalanForm, setRuasJalanForm] = useState({ 
    paths: [], 
    desa_id: '',
    kode_ruas: '',
    nama_ruas: '',
    panjang: '', 
    lebar: '',
    eksisting_id: '',
    kondisi_id: '',
    jenisjalan_id: '',
    keterangan: '',
    provinsi_id: '',
    kabupaten_id: '',
    kecamatan_id: '',
  });
  const [isRuasJalanFormVisible, setIsRuasJalanFormVisible] = useState(false);
  const [ruasJalanLoading, setRuasJalanLoading] = useState(false);
  const [lastDrawnPolylineCoords, setLastDrawnPolylineCoords] = useState(null); 
  const [isDrawingForRuasJalan, setIsDrawingForRuasJalan] = useState(false); 

  // State untuk detail dan edit Shape Generic (Marker, Polyline, Polygon, Circle)
  const [selectedShapeDetails, setSelectedShapeDetails] = useState(null); // Item yang dipilih dari peta/daftar untuk dilihat/diedit
  const [isShapeDetailsFormVisible, setIsShapeDetailsFormVisible] = useState(false); // Visibilitas form detail/edit
  const [shapeForm, setShapeForm] = useState({ id: '', name: '', lat: '', lng: '', points: [], center: [], radius: '', type: '' }); // Form untuk shape generic
  const [shapeFormLoading, setShapeFormLoading] = useState(false);


  // State untuk Dropdown Wilayah
  const [provinsiList, setProvinsiList] = useState([]);
  const [kabupatenList, setKabupatenList] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaList, setDesaList] = useState([]);

  // State untuk Dropdown Master Data
  const [eksistingList, setEksistingList] = useState([]);
  const [jenisJalanList, setJenisJalanList] = useState([]);
  const [kondisiList, setKondisiList] = useState([]);

  // State untuk Filter dan Search
  const [ruasJalanSearchTerm, setRuasJalanSearchTerm] = useState('');
  const [filterProvinsiId, setFilterProvinsiId] = useState('');
  const [filterKabupatenId, setFilterKabupatenId] = useState('');
  const [filterKecamatanId, setFilterKecamatanId] = useState('');
  const [filterDesaId, setFilterDesaId] = useState('');


  const mapRef = useRef(); 

  // Redirect jika tidak login
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  // Handle Logout
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // --- Geolocation dan Listeners Data Firebase ---
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation([latitude, longitude]);
          setMapCenter([latitude, longitude]); 
          try {
            const details = await fetchLocationDetails(latitude, longitude);
            setCurrentLocationDetails(details);
          } catch (error) {
            console.error("Error fetching location details:", error);
          }
        },
        (error) => {
          console.error("Error getting location", error);
          setMapCenter([-6.200000, 106.816666]); 
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      setMapCenter([-6.200000, 106.816666]); 
    }

    // NEW: Listeners Firebase agar terupdate secara real-time
    const unsubscribeMarkers = onValue(getMarkersRef(), (snapshot) => {
      const data = snapshot.val();
      setMarkers(data ? Object.values(data) : []);
      setDataLoading(false);
    });

    const unsubscribePolylines = onValue(getPolylinesRef(), (snapshot) => {
      const data = snapshot.val();
      setPolylines(data ? Object.values(data) : []);
    });

    const unsubscribePolygons = onValue(getPolygonsRef(), (snapshot) => {
      const data = snapshot.val();
      setPolygons(data ? Object.values(data) : []);
    });

    const unsubscribeCircles = onValue(getCirclesRef(), (snapshot) => {
      const data = snapshot.val();
      setCircles(data ? Object.values(data) : []);
    });

    return () => { // Cleanup listeners on unmount
      unsubscribeMarkers();
      unsubscribePolylines();
      unsubscribePolygons();
      unsubscribeCircles();
    };
  }, []); 

  // --- Ruas Jalan CRUD Operations ---
  useEffect(() => {
    const fetchRuasJalanData = async () => { 
      const token = localStorage.getItem("authToken"); 
      if (user && token) { 
        setRuasJalanLoading(true);
        try {
          let data = await getAllRuasJalan(token);
          setRuasJalanList(data); 
        } catch (error) {
          alert(`Error fetching ruas jalan: ${error.message}`);
          console.error("Error fetching ruas jalan:", error);
        } finally {
          setRuasJalanLoading(false);
        }
      }
    };
    fetchRuasJalanData();
  }, [user]); 

  // --- Fetch Region Data for Dropdowns ---
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (user && token) {
      const fetchRegions = async () => {
        try {
          const { provinsi } = await getAllRegions(token);
          setProvinsiList(provinsi);
        } catch (error) {
          console.error("Error fetching provinces:", error);
        }
      };
      const fetchMasterData = async () => {
        try {
          const eksisting = await getMasterEksistingJalan(token);
          setEksistingList(eksisting);
          const jenisJalan = await getMasterJenisJalan(token);
          setJenisJalanList(jenisJalan);
          const kondisi = await getMasterKondisiJalan(token);
          setKondisiList(kondisi);
        } catch (error) {
          console.error("Error fetching master data:", error);
        }
      };
      fetchRegions();
      fetchMasterData();
    }
  }, [user]);

  // Fetch Kabupatens when Provinsi changes (for form and filter dropdown selection)
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const currentProvinsiId = ruasJalanForm.provinsi_id || filterProvinsiId; 
    if (currentProvinsiId && token) {
      const fetchKabupatens = async () => {
        try {
          const kabupatens = await getKabupatenByProvinsiId(currentProvinsiId, token);
          setKabupatenList(kabupatens);
        } catch (error) {
          console.error("Error fetching kabupatens:", error);
        }
      };
      fetchKabupatens();
    } else {
      setKabupatenList([]);
    }
  }, [ruasJalanForm.provinsi_id, filterProvinsiId, user]); 

  // Fetch Kecamatans when Kabupaten changes (for form and filter dropdown selection)
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const currentKabupatenId = ruasJalanForm.kabupaten_id || filterKabupatenId; 
    if (currentKabupatenId && token) {
      const fetchKecamatans = async () => {
        try {
          const kecamatans = await getKecamatanByKabupatenId(currentKabupatenId, token);
          setKecamatanList(kecamatans);
        } catch (error) {
          console.error("Error fetching kecamatans:", error);
        }
      };
      fetchKecamatans();
    } else {
      setKecamatanList([]);
    }
  }, [ruasJalanForm.kabupaten_id, filterKabupatenId, user]); 

  // Fetch Desas when Kecamatan changes (for form and filter dropdown selection)
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const currentKecamatanId = ruasJalanForm.kecamatan_id || filterKecamatanId; 
    if (currentKecamatanId && token) {
      const fetchDesas = async () => {
        try {
          const desas = await getDesaByKecamatanId(currentKecamatanId, token);
          setDesaList(desas);
        } catch (error) {
          console.error("Error fetching desas:", error);
        }
      };
      fetchDesas();
    } else {
      setDesaList([]);
    }
  }, [ruasJalanForm.kecamatan_id, filterKecamatanId, user]); 


  const handleRuasJalanFormChange = (e) => {
    const { name, value } = e.target;
    setRuasJalanForm(prev => {
      const newForm = { ...prev, [name]: value };

      if (name === 'provinsi_id') {
        newForm.kabupaten_id = '';
        newForm.kecamatan_id = '';
        newForm.desa_id = '';
        setKabupatenList([]); 
        setKecamatanList([]);
        setDesaList([]);
      } else if (name === 'kabupaten_id') {
        newForm.kecamatan_id = '';
        newForm.desa_id = '';
        setKecamatanList([]);
        setDesaList([]);
      } else if (name === 'kecamatan_id') {
        newForm.desa_id = '';
        setDesaList([]);
      }
      return newForm;
    });
  };

  // Handle Filter Changes for dropdowns
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (name === 'filterProvinsiId') {
      setFilterProvinsiId(value);
      setFilterKabupatenId('');
      setFilterKecamatanId('');
      setFilterDesaId('');
    } else if (name === 'filterKabupatenId') {
      setFilterKabupatenId(value);
      setFilterKecamatanId('');
      setFilterDesaId('');
    } else if (name === 'filterKecamatanId') {
      setFilterKecamatanId(value);
      setFilterDesaId('');
    } else if (name === 'filterDesaId') {
      setFilterDesaId(value);
    }
  };


  const handleAddOrUpdateRuasJalan = async (e) => {
    e.preventDefault();
    setRuasJalanLoading(true);
    try {
      const token = localStorage.getItem("authToken"); 
      if (!token) {
        alert("Authentication token not found. Please login again.");
        navigate("/login");
        return;
      }

      const dataToSend = {
        ...ruasJalanForm,
        desa_id: String(ruasJalanForm.desa_id), 
        panjang: String(ruasJalanForm.panjang), 
        lebar: String(ruasJalanForm.lebar),   
        eksisting_id: String(ruasJalanForm.eksisting_id), 
        kondisi_id: String(ruasJalanForm.kondisi_id), 
        jenisjalan_id: String(ruasJalanForm.jenisjalan_id), 
        user_id: Number(user.id) 
      };

      console.log("Sending data to API:", dataToSend); 

      if (editingRuasJalan) {
        await editRuasJalan(editingRuasJalan.id, dataToSend, token);
        alert("Ruas Jalan updated successfully!");
      } else {
        await addRuasJalan(dataToSend, token);
        alert("Ruas Jalan added successfully!");
      }
      setEditingRuasJalan(null);
      setIsRuasJalanFormVisible(false);
      setRuasJalanForm({ // Reset form
        paths: [], 
        desa_id: '',
        kode_ruas: '',
        nama_ruas: '',
        panjang: '',
        lebar: '',
        eksisting_id: '',
        kondisi_id: '',
        jenisjalan_id: '',
        keterangan: '',
        provinsi_id: '', 
        kabupaten_id: '',
        kecamatan_id: '',
      });
      setLastDrawnPolylineCoords(null); 
      setIsDrawingForRuasJalan(false); 

      const fetchedRuasJalanData = await getAllRuasJalan(token);
      setRuasJalanList(fetchedRuasJalanData); 
    } catch (error) {
      console.error("Full error object:", error); 
      alert(`Error saving ruas jalan: ${error.response?.data?.message || JSON.stringify(error.response?.data) || error.message || "Unknown error"}`);
    } finally {
      setRuasJalanLoading(false);
    }
  };

  const handleEditRuasJalanClick = async (ruasJalan) => { 
    setEditingRuasJalan(ruasJalan);
    setIsRuasJalanFormVisible(true);
    setLastDrawnPolylineCoords(ruasJalan.decodedPaths || null); 
    setIsDrawingForRuasJalan(true); 

    const initialFormState = {
      paths: ruasJalan.decodedPaths || [], 
      desa_id: ruasJalan.desa_id,
      kode_ruas: ruasJalan.kode_ruas,
      nama_ruas: ruasJalan.nama_ruas,
      panjang: ruasJalan.panjang,
      lebar: ruasJalan.lebar,
      eksisting_id: ruasJalan.eksisting_id,
      kondisi_id: ruasJalan.kondisi_id,
      jenisjalan_id: ruasJalan.jenisjalan_id,
      keterangan: ruasJalan.keterangan,
      provinsi_id: '', 
      kabupaten_id: '',
      kecamatan_id: '',
    };
    setRuasJalanForm(initialFormState); 

    const token = localStorage.getItem("authToken");
    if (ruasJalan.desa_id && token) {
      try {
        const regionData = await getKecamatanByDesaId(ruasJalan.desa_id, token);
        const { provinsi, kabupaten, kecamatan, desa } = regionData;

        // Set form state with fetched IDs
        setRuasJalanForm(prev => ({
          ...prev,
          provinsi_id: provinsi?.id || '',
          kabupaten_id: kabupaten?.id || '',
          kecamatan_id: kecamatan?.id || '',
          desa_id: desa?.id || '', 
        }));

        // Manually fetch and set dropdown lists to ensure options are available for the selected path
        if (provinsi?.id) {
          const fetchedKabupatens = await getKabupatenByProvinsiId(provinsi.id, token);
          setKabupatenList(fetchedKabupatens);
          if (kabupaten?.id) { 
            const fetchedKecamatans = await getKecamatanByKabupatenId(kabupaten.id, token);
            setKecamatanList(fetchedKecamatans);
            if (kecamatan?.id) { 
              const fetchedDesas = await getDesaByKecamatanId(kecamatan.id, token);
              setDesaList(fetchedDesas);
            } else {
              setDesaList([]);
            }
          } else {
            setKecamatanList([]);
            setDesaList([]);
          }
        } else {
          setProvinsiList([]); 
          setKabupatenList([]);
          setKecamatanList([]);
          setDesaList([]);
        }

      } catch (error) {
        console.error("Error looking up region by desa ID during edit:", error);
        alert("Failed to load full region data for editing. Please select region manually.");
        setKabupatenList([]);
        setKecamatanList([]);
        setDesaList([]);
      }
    } else {
        setProvinsiList([]);
        setKabupatenList([]);
        setKecamatanList([]);
        setDesaList([]);
    }
  };

  const handleDeleteRuasJalanClick = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus Ruas Jalan ini?")) {
      setRuasJalanLoading(true);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          alert("Token autentikasi tidak ditemukan. Silakan login kembali.");
          navigate("/login");
          return;
        }
        await deleteRuasJalan(id, token);
        alert("Ruas Jalan berhasil dihapus!");
        const fetchedRuasJalanData = await getAllRuasJalan(token);
        setRuasJalanList(fetchedRuasJalanData); 
      } catch (error) {
        alert(`Error menghapus ruas jalan: ${error.response?.data?.message || JSON.stringify(error.response?.data) || error.message || "Unknown error"}`);
        console.error("Error deleting ruas jalan:", error);
      } finally {
        setRuasJalanLoading(false);
      }
    }
  };
  
  // --- Fungsi untuk CRUD Firebase Shapes (Marker, Polyline, Polygon, Circle) ---

  // Handle click on a shape from map to display details/edit form
  const handleShapeClickForDetails = (shape, type) => {
    setSelectedMenu(type + 's'); // Pindah ke menu yang sesuai
    setIsRuasJalanFormVisible(false); // Sembunyikan form ruas jalan jika aktif

    setSelectedShapeDetails({ ...shape, type }); // Simpan detail shape yang diklik
    setIsShapeDetailsFormVisible(true); // Tampilkan form detail shape
    
    // Isi form dengan data shape
    setShapeForm({ 
      id: shape.id,
      name: shape.name || '',
      lat: shape.lat || (shape.center ? shape.center[0] : ''), // Untuk marker atau circle
      lng: shape.lng || (shape.center ? shape.center[1] : ''), // Untuk marker atau circle
      points: shape.points || [], // Untuk polyline/polygon
      center: shape.center || [], // Untuk circle
      radius: shape.radius || '', // Untuk circle
      type: type
    });
  };

  // Handle form change for generic shapes
  const handleShapeFormChange = (e) => {
    const { name, value } = e.target;
    setShapeForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle update for generic shapes
  const handleUpdateShape = async (e) => {
    e.preventDefault();
    setShapeFormLoading(true);
    try {
      const { id, type, name, lat, lng, points, center, radius } = shapeForm;

      if (type === 'marker') {
        const existingMarker = markers.find(m => m.id === id);
        const updatedMarker = { 
            ...existingMarker, // Pertahankan data lokasi jika tidak diedit di form
            name: name, 
            lat: parseFloat(lat), 
            lng: parseFloat(lng) 
        };
        await updateMarkerData(id, updatedMarker);
      } else if (type === 'polyline') {
        const updatedPolyline = { ...selectedShapeDetails, points }; // Assuming points are already correctly structured
        await updatePolylineData(id, updatedPolyline);
      } else if (type === 'polygon') {
        const updatedPolygon = { ...selectedShapeDetails, points }; 
        await updatePolygonData(id, updatedPolygon);
      } else if (type === 'circle') {
        const updatedCircle = { ...selectedShapeDetails, center, radius: parseFloat(radius) };
        await updateCircleData(id, updatedCircle);
      }
      alert(`${type} berhasil diperbarui!`);
      setSelectedShapeDetails(null);
      setIsShapeDetailsFormVisible(false);
    } catch (error) {
      alert(`Gagal memperbarui ${shapeForm.type}: ${error.message}`);
      console.error(`Error updating ${shapeForm.type}:`, error);
    } finally {
      setShapeFormLoading(false);
    }
  };

  // Handle delete for generic shapes from sidebar
  const handleDeleteShapeFromSidebar = async (id, type) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus ${type} ini?`)) {
      setShapeFormLoading(true);
      try {
        if (type === 'marker') {
          await removeMarkerData(id);
        } else if (type === 'polyline') {
          await removePolylineData(id);
        } else if (type === 'polygon') {
          await removePolygonData(id);
        } else if (type === 'circle') {
          await removeCircleData(id);
        }
        alert(`${type} berhasil dihapus!`);
        setSelectedShapeDetails(null); 
        setIsShapeDetailsFormVisible(false); 
      } catch (error) {
        alert(`Gagal menghapus ${type}: ${error.message}`);
        console.error(`Error deleting ${type}:`, error);
      } finally {
        setShapeFormLoading(false);
      }
    }
  };

  // --- Fungsi Lokasi ---
  const fetchLocationDetails = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
      );
      const data = await response.json();
      return {
        city: data.address.city || data.address.town || data.address.village || data.address.hamlet || "Unknown",
        country: data.address.country || "Unknown",
      };
    } catch (error) {
      console.error("Location fetch error:", error);
      return { city: "Unknown", country: "Unknown" };
    }
  };

  const addManualMarker = async () => {
    if (!manualCoords.lat || !manualCoords.lng) {
      alert("Please enter valid coordinates");
      return;
    }
    setDataLoading(true);
    try {
      const lat = parseFloat(manualCoords.lat);
      const lng = parseFloat(manualCoords.lng);
      const locationDetails = await fetchLocationDetails(lat, lng);
      const newMarker = {
          id: Date.now().toString(),
          lat,
          lng,
          name: markerName || `Marker at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          ...locationDetails,
          timestamp: new Date().toISOString(),
          type: 'marker' 
      };
      await setMarkerData(newMarker.id, newMarker);
      setSelectedShapeDetails(newMarker); 
      setIsShapeDetailsFormVisible(true);
      setSelectedMenu('markers'); 
    } catch (error) {
      console.error("Error adding marker:", error);
      alert("Failed to add marker. Please try again.");
    } finally {
      setDataLoading(false);
    }
  };

  const handleMapClick = async (e) => {
    setDataLoading(true);
    try {
      const { lat, lng } = e.latlng;
      const locationDetails = await fetchLocationDetails(lat, lng);
      const newMarker = {
        id: Date.now().toString(),
        lat,
        lng,
        name: `Marker at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        ...locationDetails,
        timestamp: new Date().toISOString(),
      };
      await setMarkerData(newMarker.id, newMarker);
    } catch (error) {
      console.error("Error adding marker:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleMarkerEdit = async (e, markerId) => {
    setDataLoading(true);
    try {
      const { lat, lng } = e.target.getLatLng();
      const locationDetails = await fetchLocationDetails(lat, lng);
      const updatedMarker = {
        ...markers.find((m) => m.id === markerId),
        lat,
        lng,
        ...locationDetails,
        timestamp: new Date().toISOString(),
      };
      await updateMarkerData(markerId, updatedMarker);
    } catch (error) {
      console.error("Error updating marker:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const deleteMarker = async (markerId) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus marker ini?")) { 
        setDataLoading(true);
        try {
            await removeMarkerData(markerId);
        } catch (error) {
            console.error("Error deleting marker:", error);
        } finally {
            setDataLoading(false);
        }
    }
  };

  const clearAllMarkers = async () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus semua marker?")) {
      setDataLoading(true);
      try {
        await clearAllMarkersData();
      } catch (error) {
        console.error("Error clearing markers:", error);
      } finally {
        setDataLoading(false);
      }
    }
  };

  const clearAllPolylines = async () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus semua polyline?")) {
      setDataLoading(true);
      try {
        await clearAllPolylinesData();
      } catch (error) {
        console.error("Error clearing polylines:", error);
      } finally {
        setDataLoading(false);
      }
    }
  };

  const deletePolyline = async (polylineId) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus polyline ini?")) { 
        setDataLoading(true);
        try {
            await removePolylineData(polylineId);
        } catch (error) {
            console.error("Error deleting polyline:", error);
        } finally {
            setDataLoading(false);
        }
    }
  };


  const clearAllPolygons = async () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus semua polygon?")) {
      setDataLoading(true);
      try {
        await clearAllPolygonsData();
      } catch (error) {
        console.error("Error clearing polygons:", error);
      } finally {
        setDataLoading(false);
      }
    }
  };

  const deletePolygon = async (polygonId) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus polygon ini?")) { 
        setDataLoading(true);
        try {
            await removePolygonData(polygonId);
        } catch (error) {
            console.error("Error deleting polygon:", error);
        } finally {
            setDataLoading(false);
        }
    }
  };

  const clearAllCircles = async () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus semua lingkaran?")) {
      setDataLoading(true);
      try {
        await clearAllCirclesData();
      } catch (error) {
        console.error("Error clearing circles:", error);
      } finally {
        setDataLoading(false);
      }
    }
  };

  const deleteCircle = async (circleId) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus lingkaran ini?")) { 
        setDataLoading(true);
        try {
            await removeCircleData(circleId);
        } catch (error) {
            console.error("Error deleting circle:", error);
        } finally {
            setDataLoading(false);
        }
    }
  };

  const handleShapeCreated = async (e) => {
    setDataLoading(true);
    try {
      const { layer, layerType } = e;
      if (layerType === "marker") {
        const { lat, lng } = layer.getLatLng();
        const locationDetails = await fetchLocationDetails(lat, lng);
        const newMarker = {
          id: Date.now().toString(),
          lat,
          lng,
          name: `Marker at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          ...locationDetails,
          timestamp: new Date().toISOString(),
          type: 'marker' 
        };
        await setMarkerData(newMarker.id, newMarker);
        setSelectedShapeDetails(newMarker); 
        setIsShapeDetailsFormVisible(true);
        setSelectedMenu('markers'); 
      } else if (layerType === "polyline") {
        const points = layer.getLatLngs().map((latlng) => [latlng.lat, latlng.lng]);
        const newPolyline = {
          id: Date.now().toString(),
          points,
          timestamp: new Date().toISOString(),
          type: 'polyline' 
        };

        if (!isDrawingForRuasJalan) { 
            await setPolylineData(newPolyline.id, newPolyline); 
        }
        
        setLastDrawnPolylineCoords(points); 
        setRuasJalanForm(prev => ({
          ...prev,
          panjang: calculatePolylineLength(points).toFixed(2) 
        }));
        setSelectedShapeDetails(newPolyline); 
        setIsShapeDetailsFormVisible(true);
        setSelectedMenu('polylines'); 
      } else if (layerType === "polygon") {
        const points = layer.getLatLngs()[0].map((latlng) => [latlng.lat, latlng.lng]);
        const newPolygon = {
          id: Date.now().toString(),
          points,
          timestamp: new Date().toISOString(),
          type: 'polygon' 
        };
        await setPolygonData(newPolygon.id, newPolygon);
        setSelectedShapeDetails(newPolygon); 
        setIsShapeDetailsFormVisible(true);
        setSelectedMenu('polygons'); 
      } else if (layerType === "circle") {
        const center = [layer.getLatLng().lat, layer.getLatLng().lng];
        const radius = layer.getRadius();
        const newCircle = {
          id: Date.now().toString(),
          center,
          radius,
          timestamp: new Date().toISOString(),
          type: 'circle' 
        };
        await setCircleData(newCircle.id, newCircle);
        setSelectedShapeDetails(newCircle); 
        setIsShapeDetailsFormVisible(true);
        setSelectedMenu('circles'); 
      }
    } catch (error) {
      console.error("Error saving shape:", error);
    } finally {
      setDataLoading(false);
    }
  };

  // Go to current location on map
  const goToCurrentLocation = () => {
    if (currentLocation && mapRef.current && mapRef.current.leafletElement) {
      mapRef.current.leafletElement.setView(currentLocation, 13);
    }
  };

  // Handle location search via Nominatim
  const handleLocationSearch = async (query) => {
    if (!query) return;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setLocationSearchResults(data);
    } catch (error) {
      console.error("Location search error:", error);
    }
  };

  // Select location from search results
  const handleLocationSelect = (lat, lon) => {
    setMapCenter([lat, lon]);
    if (mapRef.current && mapRef.current.leafletElement) {
      mapRef.current.leafletElement.setView([lat, lon], 13);
    }
    setLocationSearchResults([]);
  };

  // Set selected shape for editing
  const handleEditShape = (layer, type) => {
    setSelectedShape(layer);
    setSelectedShapeType(type);
  };

  // Handle polyline edit
  const handlePolylineEdit = async (e, polylineId) => {
    setDataLoading(true);
    try {
      const points = e.layer.getLatLngs().map((latlng) => [latlng.lat, latlng.lng]);
      const updatedPolyline = {
        ...polylines.find((p) => p.id === polylineId),
        points,
        timestamp: new Date().toISOString(),
      };
      await updatePolylineData(polylineId, updatedPolyline);
      if (selectedShapeDetails?.id === polylineId && selectedShapeDetails?.type === 'polyline') {
        setSelectedShapeDetails(updatedPolyline);
        setShapeForm(prev => ({ ...prev, points: updatedPolyline.points }));
      }
    } catch (error) {
      console.error("Error updating polyline:", error);
    } finally {
      setDataLoading(false);
    }
  };

  // Handle polygon edit
  const handlePolygonEdit = async (e, polygonId) => {
    setDataLoading(true);
    try {
      const points = e.layer.getLatLngs()[0].map((latlng) => [latlng.lat, latlng.lng]);
      const updatedPolygon = {
        ...polygons.find((p) => p.id === polygonId),
        points,
        timestamp: new Date().toISOString(),
      };
      await updatePolygonData(polygonId, updatedPolygon);
      if (selectedShapeDetails?.id === polygonId && selectedShapeDetails?.type === 'polygon') {
        setSelectedShapeDetails(updatedPolygon);
        setShapeForm(prev => ({ ...prev, points: updatedPolygon.points }));
      }
    } catch (error) {
      console.error("Error updating polygon:", error);
    } finally {
      setDataLoading(false);
    }
  };

  // Handle circle edit
  const handleCircleEdit = async (e, circleId) => {
    setDataLoading(true);
    try {
      const { layer } = e;
      const center = [layer.getLatLng().lat, layer.getLatLng().lng];
      const radius = layer.getRadius();
      const updatedCircle = {
        ...circles.find((c) => c.id === circleId),
        center,
        radius,
        timestamp: new Date().toISOString(),
      };
      await updateCircleData(circleId, updatedCircle);
      if (selectedShapeDetails?.id === circleId && selectedShapeDetails?.type === 'circle') {
        setSelectedShapeDetails(updatedCircle);
        setShapeForm(prev => ({ ...prev, center: updatedCircle.center, radius: updatedCircle.radius }));
      }
    } catch (error) {
      console.error("Error updating circle:", error);
    } finally {
      setDataLoading(false);
    }
  };

  // Filtered Ruas Jalan List (Use useMemo for performance)
  const filteredRuasJalanList = useMemo(() => {
    return ruasJalanList.filter(rj => {
      const lowerCaseSearchTerm = ruasJalanSearchTerm.toLowerCase();

      // Get names for filtering by text search
      const kondisiName = getNameById(kondisiList, rj.kondisi_id, 'kondisi').toLowerCase();
      const eksistingName = getNameById(eksistingList, rj.eksisting_id, 'eksisting').toLowerCase();
      
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
    return <h2>Memuat autentikasi...</h2>;
  }

  return (
    <div className="dashboard-container">
      <div
        className={`map-sidebar ${showSidebar ? "" : "collapsed"}`}
        onMouseEnter={() => setShowSidebar(true)}
        onMouseLeave={() => setShowSidebar(false)}
      >
        <div className="sidebar-toggle-button">
          {showSidebar ? "☰" : "☰"}
        </div>

        {showSidebar && (
          <>
            {/* Greetings Section */}
            <div className="greetings-section">
                <h2 style={{ margin: '0', fontSize: '20px' }}>Halo, {user?.name || 'Pengguna'} 👋🏻</h2>
                <p style={{ margin: '5px 0 15px', fontSize: '14px', color: '#666' }}>
                    Yuk, jelajahi peta dan kelola data geografis dengan mudah!
                </p>
            </div>

            {/* Menu Navigasi Sidebar Baru - GRID LAYOUT */}
            <div className="sidebar-menu-grid">
              <button 
                className={`menu-grid-item ${selectedMenu === 'about' ? 'active' : ''}`}
                onClick={() => { setSelectedMenu('about'); setIsRuasJalanFormVisible(false); setIsDrawingForRuasJalan(false); setIsShapeDetailsFormVisible(false);}}
              >
                <FaInfoCircle className="menu-grid-icon" />
                <span>Tentang Kami</span>
              </button>
              <button 
                className={`menu-grid-item ${selectedMenu === 'markers' ? 'active' : ''}`}
                onClick={() => { setSelectedMenu('markers'); setIsRuasJalanFormVisible(false); setIsDrawingForRuasJalan(false); setIsShapeDetailsFormVisible(false);}}
              >
                <FaMapMarkerAlt className="menu-grid-icon" />
                <span>Markers</span>
              </button>
              <button 
                className={`menu-grid-item ${selectedMenu === 'polylines' ? 'active' : ''}`}
                onClick={() => { setSelectedMenu('polylines'); setIsRuasJalanFormVisible(false); setIsDrawingForRuasJalan(false); setIsShapeDetailsFormVisible(false);}}
              >
                <FaRoute className="menu-grid-icon" />
                <span>Polylines</span>
              </button>
              <button 
                className={`menu-grid-item ${selectedMenu === 'ruasJalan' ? 'active' : ''}`}
                onClick={() => { setSelectedMenu('ruasJalan'); setIsDrawingForRuasJalan(true); setIsShapeDetailsFormVisible(false);}} 
              >
                <FaPlusSquare className="menu-grid-icon" />
                <span>Ruas Jalan</span>
              </button>
              <button 
                className={`menu-grid-item ${selectedMenu === 'polygons' ? 'active' : ''}`}
                onClick={() => { setSelectedMenu('polygons'); setIsRuasJalanFormVisible(false); setIsDrawingForRuasJalan(false); setIsShapeDetailsFormVisible(false);}}
              >
                <FaDrawPolygon className="menu-grid-icon" />
                <span>Polygons</span>
              </button>
              <button 
                className={`menu-grid-item ${selectedMenu === 'circles' ? 'active' : ''}`}
                onClick={() => { setSelectedMenu('circles'); setIsRuasJalanFormVisible(false); setIsDrawingForRuasJalan(false); setIsShapeDetailsFormVisible(false);}}
              >
                <FaCircle className="menu-grid-icon" />
                <span>Circles</span>
              </button>
            </div>
            
            <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '15px 0' }}/> {/* Pembatas */}

            {dataLoading && (
              <div style={{ marginBottom: "15px", textAlign: "center" }}>
                <span style={{ color: "#666" }}>Memuat Data Peta...</span>
              </div>
            )}

            {/* Konten berdasarkan menu yang dipilih */}
            {selectedMenu === 'about' && (
              <div style={{ padding: '10px', fontSize: '14px', color: '#333' }}>
                <h3>Tentang Aplikasi GIS Ini</h3>
                <p>Aplikasi ini dirancang untuk memudahkan pengelolaan data geografis, khususnya ruas jalan, marker, polyline, polygon, dan circle. Anda dapat menambahkan, melihat, mengedit, dan menghapus data dengan antarmuka yang intuitif.</p>
                <p>Dikembangkan dengan ReactJS untuk frontend, Firebase Realtime Database untuk data peta, dan API eksternal untuk data ruas jalan dan informasi wilayah.</p>
                <p>Nikmati pengalaman memetakan dunia Anda!</p>
              </div>
            )}

            {selectedMenu === 'markers' && (
              <>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", fontWeight: "bold" }}>Manajemen Markers</h3>
                {/* Form Tambah Marker */}
                <div style={{ marginBottom: "20px", width: "100%", border: "1px solid #eee", padding: "15px", borderRadius: "8px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>
                    Tambah Marker Manual
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Marker (opsional)"
                    value={markerName}
                    onChange={(e) => setMarkerName(e.target.value)}
                    style={{
                      width: "100%", 
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
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      opacity: dataLoading ? 0.7 : 1,
                    }}
                  >
                    Tambah Marker
                  </button>
                </div>

                {/* Saved Markers List */}
                <h4 style={{ margin: "20px 0 10px 0", fontSize: "16px", fontWeight: "bold" }}>
                    Daftar Markers ({markers.length})
                </h4>
                {markers.length === 0 ? (
                    <p style={{ color: "#666", fontSize: "14px" }}>Belum ada marker tersimpan.</p>
                ) : (
                    <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #eee", borderRadius: "4px", width: "100%" }}>
                        {markers.map((marker) => (
                            <div
                                key={marker.id}
                                style={{
                                    padding: "10px",
                                    borderBottom: "1px solid #eee",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    fontSize: "13px"
                                }}
                            >
                                <div>
                                    <p style={{ margin: "0 0 3px 0", fontWeight: "bold" }}>{marker.name || `Marker ${marker.id.substring(0, 5)}...`}</p>
                                    <p style={{ margin: "0", color: "#666" }}>{marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}</p>
                                </div>
                                <div style={{display: 'flex', gap: '5px'}}>
                                  <button
                                      onClick={() => handleShapeClickForDetails(marker, 'marker')}
                                      style={{ backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "3px", padding: "5px 8px", fontSize: "11px", cursor: "pointer" }}
                                  >
                                      <FaEdit /> Detail
                                  </button>
                                  <button
                                      onClick={() => deleteMarker(marker.id)}
                                      style={{ backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "3px", padding: "5px 8px", fontSize: "11px", cursor: "pointer" }}
                                  >
                                      <FaTrash /> Hapus
                                  </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <button
                    onClick={clearAllMarkers}
                    disabled={dataLoading || markers.length === 0}
                    style={{ width: "100%", marginTop: "10px", padding: "8px", backgroundColor: "#ff4d4d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", opacity: dataLoading || markers.length === 0 ? 0.7 : 1, fontSize: "13px" }}
                >
                    Hapus Semua Markers
                </button>
              </>
            )}

            {selectedMenu === 'polylines' && (
              <>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", fontWeight: "bold" }}>Manajemen Polylines</h3>
                <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
                  Gambarkan polyline di peta menggunakan alat gambar. Semua polyline akan disimpan secara otomatis ke Firebase.
                </p>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "bold" }}>
                  Daftar Polylines ({polylines.length})
                </h4>
                {polylines.length === 0 ? (
                    <p style={{ color: "#666", fontSize: "14px" }}>Belum ada polyline tersimpan.</p>
                ) : (
                    <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #eee", borderRadius: "4px", width: "100%" }}>
                        {polylines.map((polyline) => (
                            <div
                                key={polyline.id}
                                style={{
                                    padding: "10px",
                                    borderBottom: "1px solid #eee",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    fontSize: "13px"
                                }}
                            >
                                <div>
                                    <p style={{ margin: "0 0 3px 0", fontWeight: "bold" }}>Polyline {polyline.id.substring(0, 5)}...</p>
                                    <p style={{ margin: "0", color: "#666" }}>{polyline.points.length} titik</p>
                                </div>
                                <div style={{display: 'flex', gap: '5px'}}>
                                  <button
                                      onClick={() => handleShapeClickForDetails(polyline, 'polyline')}
                                      style={{ backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "3px", padding: "5px 8px", fontSize: "11px", cursor: "pointer" }}
                                  >
                                      <FaEdit /> Detail
                                  </button>
                                  <button
                                      onClick={() => deletePolyline(polyline.id)}
                                      style={{ backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "3px", padding: "5px 8px", fontSize: "11px", cursor: "pointer" }}
                                  >
                                      <FaTrash /> Hapus
                                  </button>
                                </div>
                            </div>
                        ))}
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
            )}

            {selectedMenu === 'polygons' && (
              <>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", fontWeight: "bold" }}>Manajemen Polygons</h3>
                <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
                  Gambarkan polygon di peta menggunakan alat gambar. Semua polygon akan disimpan secara otomatis ke Firebase.
                </p>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "bold" }}>
                  Daftar Polygons ({polygons.length})
                </h4>
                {polygons.length === 0 ? (
                    <p style={{ color: "#666", fontSize: "14px" }}>Belum ada polygon tersimpan.</p>
                ) : (
                    <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #eee", borderRadius: "4px", width: "100%" }}>
                        {polygons.map((polygon) => (
                            <div
                                key={polygon.id}
                                style={{
                                    padding: "10px",
                                    borderBottom: "1px solid #eee",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    fontSize: "13px"
                                }}
                            >
                                <div>
                                    <p style={{ margin: "0 0 3px 0", fontWeight: "bold" }}>Polygon {polygon.id.substring(0, 5)}...</p>
                                    <p style={{ margin: "0", color: "#666" }}>{polygon.points.length} titik</p>
                                </div>
                                <div style={{display: 'flex', gap: '5px'}}>
                                  <button
                                      onClick={() => handleShapeClickForDetails(polygon, 'polygon')}
                                      style={{ backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "3px", padding: "5px 8px", fontSize: "11px", cursor: "pointer" }}
                                  >
                                      <FaEdit /> Detail
                                  </button>
                                  <button
                                      onClick={() => deletePolygon(polygon.id)}
                                      style={{ backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "3px", padding: "5px 8px", fontSize: "11px", cursor: "pointer" }}
                                  >
                                      <FaTrash /> Hapus
                                  </button>
                                </div>
                            </div>
                        ))}
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
            )}

            {selectedMenu === 'circles' && (
              <>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", fontWeight: "bold" }}>Manajemen Circles</h3>
                <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
                  Gambarkan lingkaran di peta menggunakan alat gambar. Semua lingkaran akan disimpan secara otomatis ke Firebase.
                </p>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "bold" }}>
                  Daftar Circles ({circles.length})
                </h4>
                {circles.length === 0 ? (
                    <p style={{ color: "#666", fontSize: "14px" }}>Belum ada lingkaran tersimpan.</p>
                ) : (
                    <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #eee", borderRadius: "4px", width: "100%" }}>
                        {circles.map((circle) => (
                            <div
                                key={circle.id}
                                style={{
                                    padding: "10px",
                                    borderBottom: "1px solid #eee",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    fontSize: "13px"
                                }}
                            >
                                <div>
                                    <p style={{ margin: "0 0 3px 0", fontWeight: "bold" }}>Circle {circle.id.substring(0, 5)}...</p>
                                    <p style={{ margin: "0", color: "#666" }}>Radius: {circle.radius.toFixed(2)}m</p>
                                </div>
                                <div style={{display: 'flex', gap: '5px'}}>
                                  <button
                                      onClick={() => handleShapeClickForDetails(circle, 'circle')}
                                      style={{ backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "3px", padding: "5px 8px", fontSize: "11px", cursor: "pointer" }}
                                  >
                                      <FaEdit /> Detail
                                  </button>
                                  <button
                                      onClick={() => deleteCircle(circle.id)}
                                      style={{ backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "3px", padding: "5px 8px", fontSize: "11px", cursor: "pointer" }}
                                  >
                                      <FaTrash /> Hapus
                                  </button>
                                </div>
                            </div>
                        ))}
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
            )}

            {selectedMenu === 'ruasJalan' && (
              <>
                {/* Ruas Jalan Management Section */}
                <div style={{ marginTop: "20px", width: "100%" }}>
                  <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", fontWeight: "bold" }}>
                    Manajemen Ruas Jalan
                  </h3>
                  <button
                    onClick={() => {
                      setIsRuasJalanFormVisible(!isRuasJalanFormVisible);
                      setEditingRuasJalan(null); // Reset editing state
                      setRuasJalanForm({ // Clear form
                        paths: [], 
                        desa_id: '',
                        kode_ruas: '',
                        nama_ruas: '',
                        panjang: '',
                        lebar: '',
                        eksisting_id: '',
                        kondisi_id: '',
                        jenisjalan_id: '',
                        keterangan: '',
                        provinsi_id: '', 
                        kabupaten_id: '',
                        kecamatan_id: '',
                      });
                      setLastDrawnPolylineCoords(null); 
                      setIsDrawingForRuasJalan(true); // Aktifkan mode menggambar ruas jalan saat form dibuka
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      backgroundColor: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      marginBottom: "15px",
                    }}
                    disabled={ruasJalanLoading}
                  >
                    {isRuasJalanFormVisible ? "Sembunyikan Form" : "Tambah Ruas Jalan Baru"}
                  </button>

                  {isRuasJalanFormVisible && (
                    <form onSubmit={handleAddOrUpdateRuasJalan} style={{ marginBottom: "20px", border: "1px solid #eee", padding: "15px", borderRadius: "8px", width: "100%" }}> 
                      <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
                        {editingRuasJalan ? "Edit Ruas Jalan" : "Tambah Ruas Jalan"}
                      </h4>
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Nama Ruas:</label>
                        <input type="text" name="nama_ruas" value={ruasJalanForm.nama_ruas} onChange={handleRuasJalanFormChange} required style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }} /> 
                      </div>
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Kode Ruas:</label>
                        <input type="text" name="kode_ruas" value={ruasJalanForm.kode_ruas} onChange={handleRuasJalanFormChange} required style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }} /> 
                      </div>
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Panjang:</label>
                        <input type="number" name="panjang" value={ruasJalanForm.panjang} onChange={handleRuasJalanFormChange} required readOnly style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc", backgroundColor: '#f0f0f0' }} /> 
                      </div>
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Lebar:</label>
                        <input type="number" name="lebar" value={ruasJalanForm.lebar} onChange={handleRuasJalanFormChange} required style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }} /> 
                      </div>
                      
                      {/* Dropdown for Provinsi */}
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Provinsi:</label>
                        <select name="provinsi_id" value={ruasJalanForm.provinsi_id} onChange={handleRuasJalanFormChange} required style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }}>
                          <option value="">Pilih Provinsi</option>
                          {provinsiList.map(prov => (
                            <option key={prov.id} value={prov.id}>{prov.provinsi}</option>
                          ))}
                        </select>
                      </div>
                      {/* Dropdown for Kabupaten */}
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Kabupaten:</label>
                        <select name="kabupaten_id" value={ruasJalanForm.kabupaten_id} onChange={handleRuasJalanFormChange} required disabled={!ruasJalanForm.provinsi_id} style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }}>
                          <option value="">Pilih Kabupaten</option>
                          {kabupatenList.map(kab => (
                            <option key={kab.id} value={kab.id}>{kab.value}</option>
                          ))}
                        </select>
                      </div>
                      {/* Dropdown for Kecamatan */}
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Kecamatan:</label>
                        <select name="kecamatan_id" value={ruasJalanForm.kecamatan_id} onChange={handleRuasJalanFormChange} required disabled={!ruasJalanForm.kabupaten_id} style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }}>
                          <option value="">Pilih Kecamatan</option>
                          {kecamatanList.map(kec => (
                            <option key={kec.id} value={kec.id}>{kec.value}</option>
                          ))}
                        </select>
                      </div>
                      {/* Dropdown for Desa */}
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Desa:</label>
                        <select name="desa_id" value={ruasJalanForm.desa_id} onChange={handleRuasJalanFormChange} required disabled={!ruasJalanForm.kecamatan_id} style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }}>
                          <option value="">Pilih Desa</option>
                          {desaList.map(desa => (
                            <option key={desa.id} value={desa.id}>{desa.value}</option>
                          ))}
                        </select>
                      </div>


                      {/* Dropdown for Eksisting */}
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Eksisting Jalan:</label>
                        <select name="eksisting_id" value={ruasJalanForm.eksisting_id} onChange={handleRuasJalanFormChange} required style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }}>
                          <option value="">Pilih Eksisting</option>
                          {eksistingList.map(eks => (
                            <option key={eks.id} value={eks.id}>{eks.eksisting}</option>
                          ))}
                        </select>
                      </div>
                      {/* Dropdown for Kondisi */}
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Kondisi Jalan:</label>
                        <select name="kondisi_id" value={ruasJalanForm.kondisi_id} onChange={handleRuasJalanFormChange} required style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }}>
                          <option value="">Pilih Kondisi</option>
                          {kondisiList.map(kond => (
                            <option key={kond.id} value={kond.id}>{kond.kondisi}</option>
                          ))}
                        </select>
                      </div>
                      {/* Dropdown for Jenis Jalan */}
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Jenis Jalan:</label>
                        <select name="jenisjalan_id" value={ruasJalanForm.jenisjalan_id} onChange={handleRuasJalanFormChange} required style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }}>
                          <option value="">Pilih Jenis Jalan</option>
                          {jenisJalanList.map(jenis => (
                            <option key={jenis.id} value={jenis.id}>{jenis.jenisjalan}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Keterangan:</label>
                        <textarea name="keterangan" value={ruasJalanForm.keterangan} onChange={handleRuasJalanFormChange} style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc", minHeight: "60px" }} /> 
                      </div>
                      
                      {/* Capture Paths from Map */}
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>
                          Paths (Digambar di Peta):
                        </label>
                        <div style={{ border: "1px solid #ccc", padding: "8px", borderRadius: "3px", minHeight: "50px", fontSize: "12px", wordBreak: "break-all" }}>
                          {ruasJalanForm.paths && ruasJalanForm.paths.length > 0
                            ? `Terambil ${ruasJalanForm.paths.length} titik.`
                            : "Belum ada jalur yang digambar atau diambil. Gambarlah polyline di peta."}
                        </div>
                        {lastDrawnPolylineCoords && lastDrawnPolylineCoords.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setRuasJalanForm(prev => ({
                                ...prev,
                                paths: lastDrawnPolylineCoords,
                                panjang: calculatePolylineLength(lastDrawnPolylineCoords).toFixed(2) // Update length automatically
                              }));
                            }}
                            style={{
                              width: "100%", padding: "8px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginTop: "10px", fontSize: "12px"
                            }}
                          >
                            Gunakan Polyline Terakhir Digambar ({calculatePolylineLength(lastDrawnPolylineCoords).toFixed(2)} m)
                          </button>
                        )}
                         {editingRuasJalan && editingRuasJalan.decodedPaths && editingRuasJalan.decodedPaths.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setRuasJalanForm(prev => ({
                                ...prev,
                                paths: editingRuasJalan.decodedPaths,
                                panjang: calculatePolylineLength(editingRuasJalan.decodedPaths).toFixed(2) // Update length automatically
                              }));
                            }}
                            style={{
                              width: "100%", padding: "8px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginTop: "10px", fontSize: "12px"
                            }}
                          >
                            Gunakan Jalur Ruas Jalan Saat Ini ({calculatePolylineLength(editingRuasJalan.decodedPaths).toFixed(2)} m)
                          </button>
                        )}
                        <p style={{ fontSize: "10px", color: "#888", marginTop: "5px" }}>
                          Gambarkan polyline di peta menggunakan alat gambar, lalu klik tombol di atas untuk menetapkannya ke Ruas Jalan ini.
                        </p>
                      </div>

                      <button type="submit" disabled={ruasJalanLoading} style={{
                        width: "100%", padding: "10px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", opacity: ruasJalanLoading ? 0.7 : 1
                      }}>
                        {ruasJalanLoading ? "Menyimpan..." : (editingRuasJalan ? "Perbarui Ruas Jalan" : "Tambah Ruas Jalan")}
                      </button>
                    </form>
                  )}

                  <h4 style={{ margin: "20px 0 10px 0", fontSize: "16px", fontWeight: "bold" }}>
                    Daftar Ruas Jalan ({filteredRuasJalanList.length})
                  </h4>
                  {/* Filter dan Search Bar Ruas Jalan */}
                  <div style={{ marginBottom: "15px", width: "100%", border: "1px solid #eee", padding: "10px", borderRadius: "8px" }}>
                    <input
                      type="text"
                      placeholder="Cari berdasarkan Nama/Kode/Keterangan/Kondisi/Eksisting..."
                      value={ruasJalanSearchTerm}
                      onChange={(e) => setRuasJalanSearchTerm(e.target.value)}
                      style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: "10px", fontSize: "13px" }}
                    />
                    <select name="filterProvinsiId" value={filterProvinsiId} onChange={handleFilterChange} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: "5px", fontSize: "13px" }}>
                      <option value="">Filter Provinsi</option>
                      {provinsiList.map(prov => (
                        <option key={prov.id} value={prov.id}>{prov.provinsi}</option>
                      ))}
                    </select>
                    <select name="filterKabupatenId" value={filterKabupatenId} onChange={handleFilterChange} disabled={!filterProvinsiId} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: "5px", fontSize: "13px" }}>
                      <option value="">Filter Kabupaten</option>
                      {kabupatenList.map(kab => (
                        <option key={kab.id} value={kab.id}>{kab.value}</option>
                      ))}
                    </select>
                    <select name="filterKecamatanId" value={filterKecamatanId} onChange={handleFilterChange} disabled={!filterKabupatenId} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: "5px", fontSize: "13px" }}>
                      <option value="">Filter Kecamatan</option>
                      {kecamatanList.map(kec => (
                        <option key={kec.id} value={kec.id}>{kec.value}</option>
                      ))}
                    </select>
                    <select name="filterDesaId" value={filterDesaId} onChange={handleFilterChange} disabled={!filterKecamatanId} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: "10px", fontSize: "13px" }}>
                      <option value="">Filter Desa</option>
                      {desaList.map(desa => (
                        <option key={desa.id} value={desa.id}>{desa.value}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleDownloadCsv}
                      style={{
                        width: "100%",
                        padding: "8px",
                        backgroundColor: "#17a2b8", 
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "13px",
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                      disabled={ruasJalanLoading || filteredRuasJalanList.length === 0}
                    >
                      <FaFileDownload /> Unduh CSV
                    </button>
                  </div>
                  
                  {ruasJalanLoading && <p style={{ color: "#666" }}>Memuat Ruas Jalan...</p>}
                  {!ruasJalanLoading && filteredRuasJalanList.length === 0 ? (
                    <p style={{ color: "#666", fontSize: "14px" }}>Tidak ada Ruas Jalan ditemukan sesuai filter.</p>
                  ) : (
                    <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #eee", borderRadius: "4px", width: "100%" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#f2f2f2" }}>
                            <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Nama Ruas</th>
                            <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Kode Ruas</th>
                            <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Panjang (m)</th>
                            <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Lebar (m)</th>
                            <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Kondisi</th>
                            <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Jenis</th>
                            <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Eksisting</th>
                            <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Desa</th>
                            <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Kecamatan</th>
                            <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Kabupaten</th>
                            <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Provinsi</th>
                            <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Keterangan</th>
                            <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRuasJalanList.map((rj) => (
                            <tr key={rj.id}>
                              <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{rj.nama_ruas}</td>
                              <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{rj.kode_ruas}</td>
                              <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{rj.panjang}</td>
                              <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{rj.lebar}</td>
                              <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{getNameById(kondisiList, rj.kondisi_id, 'kondisi')}</td>
                              <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{getNameById(jenisJalanList, rj.jenisjalan_id, 'jenisjalan')}</td>
                              <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{getNameById(eksistingList, rj.eksisting_id, 'eksisting')}</td>
                              <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{rj.desa_name || 'N/A'}</td>
                              <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{rj.kecamatan_name || 'N/A'}</td>
                              <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{rj.kabupaten_name || 'N/A'}</td>
                              <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{rj.provinsi_name || 'N/A'}</td>
                              <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{rj.keterangan}</td>
                              <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px", whiteSpace: 'nowrap' }}>
                                <button
                                  onClick={() => handleEditRuasJalanClick(rj)}
                                  style={{
                                    backgroundColor: "#ffc107", color: "white", border: "none", padding: "5px 8px", borderRadius: "3px", cursor: "pointer", marginRight: "5px", fontSize: "11px"
                                  }}>Edit</button>
                                <button
                                  onClick={() => handleDeleteRuasJalanClick(rj.id)}
                                  style={{
                                    backgroundColor: "#dc3545", color: "white", border: "none", padding: "5px 8px", borderRadius: "3px", cursor: "pointer", fontSize: "11px"
                                  }}>Hapus</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Generic Shape Details/Edit Form (muncul di sidebar) */}
            {isShapeDetailsFormVisible && selectedShapeDetails && (
              <div style={{ marginTop: "20px", width: "100%", border: "1px solid #eee", padding: "15px", borderRadius: "8px" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
                  Edit {selectedShapeDetails.type.charAt(0).toUpperCase() + selectedShapeDetails.type.slice(1)} ({selectedShapeDetails.id.substring(0,5)}...)
                </h4>
                <form onSubmit={handleUpdateShape}>
                  {selectedShapeDetails.type === 'marker' && (
                    <>
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Nama Marker:</label>
                        <input type="text" name="name" value={shapeForm.name} onChange={handleShapeFormChange} style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }} />
                      </div>
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Latitude:</label>
                        <input type="text" name="lat" value={shapeForm.lat} onChange={handleShapeFormChange} required style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }} />
                      </div>
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Longitude:</label>
                        <input type="text" name="lng" value={shapeForm.lng} onChange={handleShapeFormChange} required style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }} />
                      </div>
                    </>
                  )}
                  {(selectedShapeDetails.type === 'polyline' || selectedShapeDetails.type === 'polygon') && (
                    <>
                      <p style={{ fontSize: "12px", color: "#666", marginBottom: "10px" }}>
                        Koordinat {selectedShapeDetails.type === 'polyline' ? 'Polyline' : 'Polygon'} (Baca Saja - Edit di Peta):
                      </p>
                      <textarea
                        value={JSON.stringify(shapeForm.points)}
                        readOnly
                        style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc", minHeight: "100px", backgroundColor: '#f0f0f0' }}
                      />
                    </>
                  )}
                   {selectedShapeDetails.type === 'circle' && (
                    <>
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Center (Lat):</label>
                        <input type="text" name="center_lat" value={shapeForm.center[0]} readOnly style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc", backgroundColor: '#f0f0f0' }} />
                      </div>
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Center (Lng):</label>
                        <input type="text" name="center_lng" value={shapeForm.center[1]} readOnly style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc", backgroundColor: '#f0f0f0' }} />
                      </div>
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Radius (m):</label>
                        <input type="number" name="radius" value={shapeForm.radius} onChange={handleShapeFormChange} required style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }} />
                      </div>
                    </>
                  )}
                  <button type="submit" disabled={shapeFormLoading} style={{
                    width: "100%", padding: "10px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", opacity: shapeFormLoading ? 0.7 : 1
                  }}>
                    {shapeFormLoading ? "Menyimpan..." : "Perbarui Shape"}
                  </button>
                  <button type="button" onClick={() => handleDeleteShapeFromSidebar(shapeForm.id, shapeForm.type)} disabled={shapeFormLoading} style={{
                    width: "100%", padding: "10px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", opacity: shapeFormLoading ? 0.7 : 1, marginTop: '10px'
                  }}>
                    Hapus Shape
                  </button>
                  <button type="button" onClick={() => setIsShapeDetailsFormVisible(false)} style={{
                    width: "100%", padding: "10px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginTop: '10px'
                  }}>
                    Batal
                  </button>
                </form>
              </div>
            )}

            <div style={{ marginTop: "20px", width: "100%" }}>
                <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
                    Data peta disimpan otomatis ke database Firebase Anda.
                </p>
                {/* Logout button moved here */}
                <button className="logout-btn-sidebar" onClick={handleLogout} disabled={authLoading}>
                    Logout
                </button>
            </div>
          </>
        )}
      </div>

      <div className="map-content">
        {/* Search Location and Current Location Button - Di Luar Sidebar */}
        <div style={{
            position: "absolute",
            bottom: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "90%",
            maxWidth: "600px",
            display: "flex",
            alignItems: "center",
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.15)",
            zIndex: 1000,
            padding: "10px",
            boxSizing: 'border-box'
          }}
        >
          <input
            type="text"
            placeholder="Cari lokasi..."
            value={locationSearch}
            onChange={(e) => {
              setLocationSearch(e.target.value);
              handleLocationSearch(e.target.value);
            }}
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
              height: '42px' 
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
          // Pass event handlers as props
          onMapClick={handleMapClick}
          onShapeCreated={handleShapeCreated} 
          onMarkerEdit={handleMarkerEdit}
          onPolylineEdit={handlePolylineEdit}
          onPolygonEdit={handlePolygonEdit}
          onCircleEdit={handleCircleEdit}
          // Pass specific delete handlers
          onDeleteMarker={deleteMarker} 
          onDeletePolyline={deletePolyline} 
          onDeletePolygon={deletePolygon} 
          onDeleteCircle={deleteCircle} 
          onEditShape={handleEditShape}
          selectedShape={selectedShape}
          selectedShapeType={selectedShapeType}
          // Pass master data and region lists for lookups in MapComponent
          eksistingList={eksistingList}
          jenisJalanList={jenisJalanList}
          kondisiList={kondisiList}
          provinsiList={provinsiList}
          kabupatenList={kabupatenList}
          kecamatanList={kecamatanList}
          desaList={desaList}
          isDrawingForRuasJalan={isDrawingForRuasJalan}
          onShapeClickForDetails={handleShapeClickForDetails} 
        />
      </div>
    </div>
  );
};

export default Dashboard;
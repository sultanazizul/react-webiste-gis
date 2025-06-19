// src/pages/Dashboard.js
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

    // States for Leaflet.draw internal editing (used by MapComponent)
    // selectedShape sekarang akan menyimpan DATA shape (dari Firebase) yang sedang diedit
    const [selectedShape, setSelectedShape] = useState(null); 
    const [selectedShapeType, setSelectedShapeType] = useState(null);
    // isEditingMapShape menandakan apakah ada shape yang dipilih untuk diedit di peta
    const [isEditingMapShape, setIsEditingMapShape] = useState(false); 

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


    // State untuk Dropdown Wilayah (untuk Form)
    const [provinsiList, setProvinsiList] = useState([]);
    const [kabupatenList, setKabupatenList] = useState([]);
    const [kecamatanList, setKecamatanList] = useState([]);
    const [desaList, setDesaList] = useState([]);

    // NEW: State untuk Dropdown Wilayah (khusus untuk Filter)
    const [filterKabupatenList, setFilterKabupatenList] = useState([]);
    const [filterKecamatanList, setFilterKecamatanList] = useState([]);
    const [filterDesaList, setFilterDesaList] = useState([]);

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


    const mapRef = useRef(); // Ref to MapContainer for direct map access

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

    // === useEffects untuk Form Ruas Jalan ===
    // Fetch Kabupatens for RUAS JALAN FORM when Provinsi changes
    useEffect(() => {
        const token = localStorage.getItem("authToken");
        if (ruasJalanForm.provinsi_id && token) {
            const fetchKabupatens = async () => {
                try {
                    const kabupatens = await getKabupatenByProvinsiId(ruasJalanForm.provinsi_id, token);
                    setKabupatenList(kabupatens);
                } catch (error) {
                    console.error("Error fetching kabupatens for form:", error);
                }
            };
            fetchKabupatens();
        } else {
            setKabupatenList([]);
        }
    }, [ruasJalanForm.provinsi_id, user]);

    // Fetch Kecamatans for RUAS JALAN FORM when Kabupaten changes
    useEffect(() => {
        const token = localStorage.getItem("authToken");
        if (ruasJalanForm.kabupaten_id && token) {
            const fetchKecamatans = async () => {
                try {
                    const kecamatans = await getKecamatanByKabupatenId(ruasJalanForm.kabupaten_id, token);
                    setKecamatanList(kecamatans);
                } catch (error) {
                    console.error("Error fetching kecamatans for form:", error);
                }
            };
            fetchKecamatans();
        } else {
            setKecamatanList([]);
        }
    }, [ruasJalanForm.kabupaten_id, user]);

    // Fetch Desas for RUAS JALAN FORM when Kecamatan changes
    useEffect(() => {
        const token = localStorage.getItem("authToken");
        if (ruasJalanForm.kecamatan_id && token) {
            const fetchDesas = async () => {
                try {
                    const desas = await getDesaByKecamatanId(ruasJalanForm.kecamatan_id, token);
                    setDesaList(desas);
                } catch (error) {
                    console.error("Error fetching desas for form:", error);
                }
            };
            fetchDesas();
        } else {
            setDesaList([]);
        }
    }, [ruasJalanForm.kecamatan_id, user]);


    // === useEffects untuk Filter Pencarian Ruas Jalan ===
    // NEW: Fetch Kabupatens for FILTER when filterProvinsiId changes
    useEffect(() => {
        const token = localStorage.getItem("authToken");
        if (filterProvinsiId && token) {
            const fetchFilterKabupatens = async () => {
                try {
                    const kabupatens = await getKabupatenByProvinsiId(filterProvinsiId, token);
                    setFilterKabupatenList(kabupatens);
                } catch (error) {
                    console.error("Error fetching filter kabupatens:", error);
                }
            };
            fetchFilterKabupatens();
        } else {
            setFilterKabupatenList([]);
        }
    }, [filterProvinsiId, user]); // Dependency on filterProvinsiId only

    // NEW: Fetch Kecamatans for FILTER when filterKabupatenId changes
    useEffect(() => {
        const token = localStorage.getItem("authToken");
        if (filterKabupatenId && token) {
            const fetchFilterKecamatans = async () => {
                try {
                    const kecamatans = await getKecamatanByKabupatenId(filterKabupatenId, token);
                    setFilterKecamatanList(kecamatans);
                } catch (error) {
                    console.error("Error fetching filter kecamatans:", error);
                }
            };
            fetchFilterKecamatans();
        } else {
            setFilterKecamatanList([]);
        }
    }, [filterKabupatenId, user]); // Dependency on filterKabupatenId only

    // NEW: Fetch Desas for FILTER when filterKecamatanId changes
    useEffect(() => {
        const token = localStorage.getItem("authToken");
        if (filterKecamatanId && token) {
            const fetchFilterDesas = async () => {
                try {
                    const desas = await getDesaByKecamatanId(filterKecamatanId, token);
                    setFilterDesaList(desas);
                } catch (error) {
                    console.error("Error fetching filter desas:", error);
                }
            };
            fetchFilterDesas();
        } else {
            setFilterDesaList([]);
        }
    }, [filterKecamatanId, user]); // Dependency on filterKecamatanId only


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
            setFilterKabupatenId(''); // Reset ID filter Kabupaten
            setFilterKecamatanId(''); // Reset ID filter Kecamatan
            setFilterDesaId('');     // Reset ID filter Desa
            setFilterKabupatenList([]); // KOSONGKAN daftar opsi Kabupaten filter
            setFilterKecamatanList([]); // KOSONGKAN daftar opsi Kecamatan filter
            setFilterDesaList([]);       // KOSONGKAN daftar opsi Desa filter
        } else if (name === 'filterKabupatenId') {
            setFilterKabupatenId(value);
            setFilterKecamatanId(''); // Reset ID filter Kecamatan
            setFilterDesaId('');     // Reset ID filter Desa
            setFilterKecamatanList([]); // KOSONGKAN daftar opsi Kecamatan filter
            setFilterDesaList([]);       // KOSONGKAN daftar opsi Desa filter
        } else if (name === 'filterKecamatanId') {
            setFilterKecamatanId(value);
            setFilterDesaId('');     // Reset ID filter Desa
            setFilterDesaList([]);       // KOSONGKAN daftar opsi Desa filter
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
        setIsDrawingForRuasJalan(true); // Aktifkan mode menggambar saat edit

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

    // Handle click on a shape from sidebar table to display details/edit form
    // This function WILL NOT activate map editing mode. It just opens the sidebar and form.
    const handleShapeClickForDetails = (shape, type) => {
        setShowSidebar(true); // Pastikan sidebar terbuka
        setSelectedMenu(type + 's'); // Pindah ke menu yang sesuai
        setIsRuasJalanFormVisible(false); // Sembunyikan form ruas jalan jika aktif
        setIsDrawingForRuasJalan(false); // Nonaktifkan mode gambar ruas jalan

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

        // Pastikan mode edit peta nonaktif saat hanya melihat detail dari sidebar
        setIsEditingMapShape(false);
        setSelectedShape(null);
        setSelectedShapeType(null);
    };

    // NEW: Handle edit button click from map popup to activate map editing
    // This function WILL activate map editing mode and open sidebar to the form.
    const handleEditClickFromMapPopup = (shape, type) => {
        setShowSidebar(true); // Pastikan sidebar terbuka
        setSelectedMenu(type + 's'); // Pindah ke menu yang sesuai
        setIsRuasJalanFormVisible(false); // Sembunyikan form ruas jalan jika aktif
        setIsDrawingForRuasJalan(false); // Nonaktifkan mode gambar ruas jalan

        setSelectedShapeDetails({ ...shape, type }); // Simpan detail shape yang diklik
        setIsShapeDetailsFormVisible(true); // Tampilkan form detail shape

        // Isi form dengan data shape
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

        // Activate map editing for this specific shape
        // Penting: selectedShape sekarang berisi data shape dari Firebase, bukan layer Leaflet.
        // MapControls akan mencari layer Leaflet yang sesuai berdasarkan ID ini.
        setSelectedShape(shape); 
        setSelectedShapeType(type); 
        setIsEditingMapShape(true); // Activate edit mode in MapComponent
        // Setelah tombol edit diklik, pastikan popup di peta tertutup
        if (mapRef.current && mapRef.current.leafletElement) {
            mapRef.current.leafletElement.closePopup();
        }
    };

    // NEW: Handler yang dipanggil oleh MapComponent ketika sebuah shape selesai diedit atau dihapus
    // Melalui EditControl di peta. Ini akan mereset state pengeditan di Dashboard.
    const handleMapShapeEditOrDeleteFinished = (updatedShapeData = null, type = null) => {
        // Jika ada updatedShapeData, Anda bisa update state yang relevan (opsional, karena onValue listener sudah menangani)
        if (updatedShapeData) {
            // Contoh: Jika Anda ingin memperbarui form secara real-time setelah edit di peta
            // if (selectedShapeDetails?.id === updatedShapeData.id && selectedShapeDetails?.type === type) {
            //     setSelectedShapeDetails(updatedShapeData);
            //     setShapeForm(prev => ({ ...prev, ...updatedShapeData }));
            // }
        }
        setIsEditingMapShape(false); // Nonaktifkan mode edit peta
        setSelectedShape(null); // Bersihkan shape yang dipilih
        setSelectedShapeType(null); // Bersihkan tipe shape yang dipilih
        // Jika Anda ingin form detail/edit otomatis tertutup setelah edit di peta:
        // setIsShapeDetailsFormVisible(false); 
        // setSelectedShapeDetails(null);
    };

    // NEW: Handle delete button click directly from map popup
    const handleDeleteClickFromMapPopup = async (shapeId, shapeType) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus ${shapeType} ini?`)) {
            setShapeFormLoading(true); // Assuming this is for generic shape loading indicator
            try {
                if (shapeType === 'marker') {
                    await removeMarkerData(shapeId);
                } else if (shapeType === 'polyline') {
                    await removePolylineData(shapeId);
                } else if (shapeType === 'polygon') {
                    await removePolygonData(shapeId);
                } else if (shapeType === 'circle') {
                    await removeCircleData(shapeId);
                }
                alert(`${shapeType} berhasil dihapus!`);
                setSelectedShapeDetails(null); // Clear displayed details
                setIsShapeDetailsFormVisible(false); // Close details form
                setIsEditingMapShape(false); // Deactivate map editing
                setSelectedShape(null); // Clear selected shape for map component
                setSelectedShapeType(null);
            } catch (error) {
                alert(`Gagal menghapus ${shapeType}: ${error.message}`);
                console.error(`Error deleting ${shapeType}:`, error);
            } finally {
                setShapeFormLoading(false);
            }
        }
    };


    // Handle form change for generic shapes
    const handleShapeFormChange = (e) => {
        const { name, value } = e.target;
        setShapeForm(prev => ({ ...prev, [name]: value }));
    };

    // Handle update for generic shapes from sidebar form
    const handleUpdateShape = async (e) => {
        e.preventDefault();
        setShapeFormLoading(true);
        try {
            const { id, type, name, lat, lng, radius } = shapeForm;

            if (type === 'marker') {
                const existingMarker = markers.find(m => m.id === id);
                const updatedMarker = {
                    ...existingMarker,
                    name: name,
                    // Only update lat/lng if they are changed in the form, otherwise use existing
                    lat: lat ? parseFloat(lat) : existingMarker.lat,
                    lng: lng ? parseFloat(lng) : existingMarker.lng
                };
                await updateMarkerData(id, updatedMarker);
            } else if (type === 'polyline') {
                // Polyline geometry is edited via map. This form just shows them.
                // If there were non-geometric properties for polyline, they would be updated here.
                // No direct 'points' update from this form if it's read-only.
                // The geometry updates are handled by onPolylineEdit from MapComponent.
                const existingPolyline = polylines.find(p => p.id === id);
                // Assume 'name' or other non-geometry properties can be updated via form
                // For now, no specific editable fields for polyline/polygon in form besides geometry
                await updatePolylineData(id, { ...existingPolyline, name: name }); // Example: if you add a 'name' field
            } else if (type === 'polygon') {
                // Similar to polyline.
                const existingPolygon = polygons.find(p => p.id === id);
                await updatePolygonData(id, { ...existingPolygon, name: name }); // Example: if you add a 'name' field
            } else if (type === 'circle') {
                const existingCircle = circles.find(c => c.id === id);
                const updatedCircle = {
                    ...existingCircle,
                    // Center is assumed to be edited via map, but radius can be changed here.
                    radius: parseFloat(radius)
                };
                await updateCircleData(id, updatedCircle);
            }
            alert(`${type} berhasil diperbarui!`);
            setSelectedShapeDetails(null);
            setIsShapeDetailsFormVisible(false);
            setIsEditingMapShape(false); // Deactivate map editing after form submission
            setSelectedShape(null); // Clear selected shape for map component
            setSelectedShapeType(null);
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
                setIsEditingMapShape(false); // Deactivate map editing
                setSelectedShape(null); // Clear selected shape for map component
                setSelectedShapeType(null);
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
            setSelectedShapeDetails(newMarker); // Set detail for the newly created shape
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
        // Hanya tambahkan marker jika tidak ada form detail shape yang terlihat DAN tidak dalam mode drawing ruas jalan
        // DAN tidak dalam mode editing shape di peta
        if (isShapeDetailsFormVisible || isDrawingForRuasJalan || isEditingMapShape) {
            return; // Jangan tambahkan markers jika form/drawing/editing sedang aktif
        }

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
            // Setelah pembuatan, kita tidak otomatis membuka form sidebar, biarkan popup muncul.
            // Pengguna akan mengklik "Edit" di popup untuk membuka form sidebar dan mengaktifkan pengeditan.
        } catch (error) {
            console.error("Error adding marker:", error);
        } finally {
            setDataLoading(false);
        }
    };


    const handleMarkerEdit = async (e, markerId) => {
        setDataLoading(true);
        try {
            const { lat, lng } = e.layer.getLatLng(); // Dapatkan lat,lng dari layer yang diedit
            const locationDetails = await fetchLocationDetails(lat, lng);
            const updatedMarker = {
                ...markers.find((m) => m.id === markerId),
                lat,
                lng,
                ...locationDetails,
                timestamp: new Date().toISOString(),
            };
            await updateMarkerData(markerId, updatedMarker);
            // Refresh details form if it's currently showing this marker
            if (selectedShapeDetails?.id === markerId && selectedShapeDetails?.type === 'marker') {
                setSelectedShapeDetails(updatedMarker);
                setShapeForm(prev => ({ ...prev, lat: updatedMarker.lat, lng: updatedMarker.lng, name: updatedMarker.name }));
            }
        } catch (error) {
            console.error("Error updating marker:", error);
        } finally {
            setDataLoading(false);
            // Setelah edit, panggil handler untuk mereset state edit di Dashboard
            handleMapShapeEditOrDeleteFinished();
        }
    };

    const deleteMarker = async (markerId) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus marker ini?")) {
            setDataLoading(true);
            try {
                await removeMarkerData(markerId);
                if (selectedShapeDetails?.id === markerId && selectedShapeDetails?.type === 'marker') {
                    setSelectedShapeDetails(null);
                    setIsShapeDetailsFormVisible(false);
                    // Setelah penghapusan, juga reset state edit di peta
                    setIsEditingMapShape(false);
                    setSelectedShape(null);
                    setSelectedShapeType(null);
                }
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
                setSelectedShapeDetails(null);
                setIsShapeDetailsFormVisible(false);
                setIsEditingMapShape(false);
                setSelectedShape(null);
                setSelectedShapeType(null);
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
                setSelectedShapeDetails(null);
                setIsShapeDetailsFormVisible(false);
                setIsEditingMapShape(false);
                setSelectedShape(null);
                setSelectedShapeType(null);
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
                if (selectedShapeDetails?.id === polylineId && selectedShapeDetails?.type === 'polyline') {
                    setSelectedShapeDetails(null);
                    setIsShapeDetailsFormVisible(false);
                    setIsEditingMapShape(false);
                    setSelectedShape(null);
                    setSelectedShapeType(null);
                }
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
                setSelectedShapeDetails(null);
                setIsShapeDetailsFormVisible(false);
                setIsEditingMapShape(false);
                setSelectedShape(null);
                setSelectedShapeType(null);
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
                if (selectedShapeDetails?.id === polygonId && selectedShapeDetails?.type === 'polygon') {
                    setSelectedShapeDetails(null);
                    setIsShapeDetailsFormVisible(false);
                    setIsEditingMapShape(false);
                    setSelectedShape(null);
                    setSelectedShapeType(null);
                }
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
                setSelectedShapeDetails(null);
                setIsShapeDetailsFormVisible(false);
                setIsEditingMapShape(false);
                setSelectedShape(null);
                setSelectedShapeType(null);
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
                if (selectedShapeDetails?.id === circleId && selectedShapeDetails?.type === 'circle') {
                    setSelectedShapeDetails(null);
                    setIsShapeDetailsFormVisible(false);
                    setIsEditingMapShape(false);
                    setSelectedShape(null);
                    setSelectedShapeType(null);
                }
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
                // Do NOT call handleShapeClickForDetails here to avoid automatic menu change
                // User will click on popup's edit button or sidebar table to see details
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
                // Do NOT call handleShapeClickForDetails here
            } else if (layerType === "polygon") {
                const points = layer.getLatLngs()[0].map((latlng) => [latlng.lat, latlng.lng]);
                const newPolygon = {
                    id: Date.now().toString(),
                    points,
                    timestamp: new Date().toISOString(),
                    type: 'polygon'
                };
                await setPolygonData(newPolygon.id, newPolygon);
                // Do NOT call handleShapeClickForDetails here
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
                // Do NOT call handleShapeClickForDetails here
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

    // NEW: Function to open specific shape's popup on map and center view
    const openShapePopupAndCenterMap = (shapeId, shapeType, lat, lng, isGeom = false) => {
        if (mapRef.current && mapRef.current.leafletElement) {
            const map = mapRef.current.leafletElement;
            const featureGroup = mapRef.current.leafletElement._layers; // Access internal layers (not ideal but works for demo)
            
            let foundLayer = null;
            // Iterate through all layers to find the one with matching ID
            for (const layerId in featureGroup) {
                const layer = featureGroup[layerId];
                if (layer.options && String(layer.options.id) === String(shapeId)) {
                    foundLayer = layer;
                    break;
                }
            }

            if (foundLayer && foundLayer.openPopup) {
                foundLayer.openPopup();
                if (foundLayer.getCenter) { // For circles
                    map.setView(foundLayer.getCenter(), 15);
                } else if (foundLayer.getBounds) { // For polylines/polygons
                    map.fitBounds(foundLayer.getBounds(), { padding: [50, 50] });
                } else { // For markers
                    map.setView(foundLayer.getLatLng(), 15);
                }
            } else if (lat && lng) {
                // Fallback to just setting view if layer not found or doesn't have popup
                map.setView([lat, lng], 15);
            }
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

    // Set selected shape for editing (used by Leaflet.draw internal)
    // This is primarily to pass the reference for Leaflet.draw's internal editing.
    // The interactive details are handled by handleEditClickFromMapPopup.
    // This function will be called by MapComponent's EditControl's onEdited and onDeleted.
    const handleEditShape = (layer, type) => {
        // This function is now used to signal the end of an edit/delete operation from MapComponent
        // It helps reset the selectedShape and isEditingMapShape states in Dashboard.
        setSelectedShape(null); // Clear selected shape
        setSelectedShapeType(null); // Clear selected shape type
        setIsEditingMapShape(false); // Deactivate editing mode
    };

    // Handle polyline edit (from Leaflet.draw edit tool)
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
            // Update details form if it's currently showing this polyline
            if (selectedShapeDetails?.id === polylineId && selectedShapeDetails?.type === 'polyline') {
                setSelectedShapeDetails(updatedPolyline);
                setShapeForm(prev => ({ ...prev, points: updatedPolyline.points }));
            }
        } catch (error) {
            console.error("Error updating polyline:", error);
        } finally {
            setDataLoading(false);
            handleMapShapeEditOrDeleteFinished(); // Signal end of editing
        }
    };

    // Handle polygon edit (from Leaflet.draw edit tool)
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
            // Update details form if it's currently showing this polygon
            if (selectedShapeDetails?.id === polygonId && selectedShapeDetails?.type === 'polygon') {
                setSelectedShapeDetails(updatedPolygon);
                setShapeForm(prev => ({ ...prev, points: updatedPolygon.points }));
            }
        } catch (error) {
            console.error("Error updating polygon:", error);
        } finally {
            setDataLoading(false);
            handleMapShapeEditOrDeleteFinished(); // Signal end of editing
        }
    };

    // Handle circle edit (from Leaflet.draw edit tool)
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
            // Update details form if it's currently showing this circle
            if (selectedShapeDetails?.id === circleId && selectedShapeDetails?.type === 'circle') {
                setSelectedShapeDetails(updatedCircle);
                setShapeForm(prev => ({ ...prev, center: updatedCircle.center, radius: updatedCircle.radius }));
            }
        } catch (error) {
            console.error("Error updating circle:", error);
        } finally {
            setDataLoading(false);
            handleMapShapeEditOrDeleteFinished(); // Signal end of editing
        }
    };

    // Filtered Ruas Jalan List (Use useMemo for performance)
    const filteredRuasJalanList = useMemo(() => {
        return ruasJalanList.filter(rj => {
            const lowerCaseSearchTerm = ruasJalanSearchTerm.toLowerCase();

            // Get names for filtering by text search
            // Pastikan rj.kondisi_id dan rj.eksisting_id ada sebelum memanggil getNameById
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
        return <h2>Memuat autentikasi...</h2>;
    }

    return (
        <div className="dashboard-container">
            <div
                className={`map-sidebar ${showSidebar ? "" : "collapsed"}`}
                // Removed onMouseEnter and onMouseLeave
            >
                <div className="sidebar-toggle-button" onClick={() => setShowSidebar(!showSidebar)}>
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
                                onClick={() => { setSelectedMenu('about'); setIsRuasJalanFormVisible(false); setIsDrawingForRuasJalan(false); setIsShapeDetailsFormVisible(false); setIsEditingMapShape(false); }}
                            >
                                <FaInfoCircle className="menu-grid-icon" />
                                <span>Tentang Kami</span>
                            </button>
                            <button
                                className={`menu-grid-item ${selectedMenu === 'markers' ? 'active' : ''}`}
                                onClick={() => { setSelectedMenu('markers'); setIsRuasJalanFormVisible(false); setIsDrawingForRuasJalan(false); setIsShapeDetailsFormVisible(false); setIsEditingMapShape(false); }}
                            >
                                <FaMapMarkerAlt className="menu-grid-icon" />
                                <span>Markers</span>
                            </button>
                            <button
                                className={`menu-grid-item ${selectedMenu === 'polylines' ? 'active' : ''}`}
                                onClick={() => { setSelectedMenu('polylines'); setIsRuasJalanFormVisible(false); setIsDrawingForRuasJalan(false); setIsShapeDetailsFormVisible(false); setIsEditingMapShape(false); }}
                            >
                                <FaRoute className="menu-grid-icon" />
                                <span>Polylines</span>
                            </button>
                            <button
                                className={`menu-grid-item ${selectedMenu === 'ruasJalan' ? 'active' : ''}`}
                                onClick={() => { setSelectedMenu('ruasJalan'); setIsDrawingForRuasJalan(true); setIsShapeDetailsFormVisible(false); setIsEditingMapShape(false); }}
                            >
                                <FaPlusSquare className="menu-grid-icon" />
                                <span>Ruas Jalan</span>
                            </button>
                            <button
                                className={`menu-grid-item ${selectedMenu === 'polygons' ? 'active' : ''}`}
                                onClick={() => { setSelectedMenu('polygons'); setIsRuasJalanFormVisible(false); setIsDrawingForRuasJalan(false); setIsShapeDetailsFormVisible(false); setIsEditingMapShape(false); }}
                            >
                                <FaDrawPolygon className="menu-grid-icon" />
                                <span>Polygons</span>
                            </button>
                            <button
                                className={`menu-grid-item ${selectedMenu === 'circles' ? 'active' : ''}`}
                                onClick={() => { setSelectedMenu('circles'); setIsRuasJalanFormVisible(false); setIsDrawingForRuasJalan(false); setIsShapeDetailsFormVisible(false); setIsEditingMapShape(false); }}
                            >
                                <FaCircle className="menu-grid-icon" />
                                <span>Circles</span>
                            </button>
                        </div>

                        <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '15px 0' }} /> {/* Pembatas */}

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
                                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr style={{ backgroundColor: "#f2f2f2" }}>
                                                    <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Nama/ID</th>
                                                    <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Lat, Lng</th>
                                                    <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {markers.map((marker) => (
                                                    <tr key={marker.id} onClick={() => openShapePopupAndCenterMap(marker.id, 'marker', marker.lat, marker.lng)} style={{ cursor: 'pointer' }}>
                                                        <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{marker.name || `Marker ${marker.id.substring(0, 5)}...`}</td>
                                                        <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}</td>
                                                        <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px", whiteSpace: 'nowrap' }}>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleShapeClickForDetails(marker, 'marker'); }}
                                                                style={{
                                                                    backgroundColor: "#007bff", color: "white", border: "none", padding: "5px 8px", borderRadius: "3px", cursor: "pointer", marginRight: "5px", fontSize: "11px"
                                                                }}>Detail</button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteClickFromMapPopup(marker.id, 'marker'); }}
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
                                                                style={{ backgroundColor: "#007bff", color: "white", border: "none", padding: "5px 8px", borderRadius: "3px", cursor: "pointer", marginRight: "5px" }}
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
                                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr style={{ backgroundColor: "#f2f2f2" }}>
                                                    <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>ID</th>
                                                    <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Titik</th>
                                                    <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {polygons.map((polygon) => (
                                                    <tr key={polygon.id} onClick={() => openShapePopupAndCenterMap(polygon.id, 'polygon', polygon.points[0][0], polygon.points[0][1], true)} style={{ cursor: 'pointer' }}>
                                                        <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{polygon.id.substring(0, 5)}...</td>
                                                        <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{polygon.points.length}</td>
                                                        <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px", whiteSpace: 'nowrap' }}>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleShapeClickForDetails(polygon, 'polygon'); }}
                                                                style={{ backgroundColor: "#007bff", color: "white", border: "none", padding: "5px 8px", borderRadius: "3px", cursor: "pointer", marginRight: "5px" }}
                                                            >
                                                                <FaEdit /> Detail
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteClickFromMapPopup(polygon.id, 'polygon'); }}
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
                                                                style={{ backgroundColor: "#007bff", color: "white", border: "none", padding: "5px 8px", borderRadius: "3px", cursor: "pointer", marginRight: "5px" }}
                                                            >
                                                                <FaEdit /> Detail
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteClickFromMapPopup(circle.id, 'circle'); }}
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
                                            setIsShapeDetailsFormVisible(false); // Close generic shape details
                                            setIsEditingMapShape(false); // Deactivate map editing
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
                                            {filterKabupatenList.map(kab => ( // Menggunakan filterKabupatenList
                                                <option key={kab.id} value={kab.id}>{kab.value}</option>
                                            ))}
                                        </select>
                                        <select name="filterKecamatanId" value={filterKecamatanId} onChange={handleFilterChange} disabled={!filterKabupatenId} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: "5px", fontSize: "13px" }}>
                                            <option value="">Filter Kecamatan</option>
                                            {filterKecamatanList.map(kec => ( // Menggunakan filterKecamatanList
                                                <option key={kec.id} value={kec.id}>{kec.value}</option>
                                            ))}
                                        </select>
                                        <select name="filterDesaId" value={filterDesaId} onChange={handleFilterChange} disabled={!filterKecamatanId} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: "10px", fontSize: "13px" }}>
                                            <option value="">Filter Desa</option>
                                            {filterDesaList.map(desa => ( // Menggunakan filterDesaList
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
                                    Detail & Edit {selectedShapeDetails.type.charAt(0).toUpperCase() + selectedShapeDetails.type.slice(1)} ({selectedShapeDetails.id.substring(0, 5)}...)
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
                                                Koordinat {selectedShapeDetails.type === 'polyline' ? 'Polyline' : 'Polygon'} (Edit di Peta):
                                            </p>
                                            <textarea
                                                value={JSON.stringify(shapeForm.points)}
                                                readOnly
                                                style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc", minHeight: "100px", backgroundColor: '#f0f0f0' }}
                                            />
                                            {/* Anda bisa menambahkan input untuk nama atau properti non-geometri di sini */}
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
                                        width: "100%", padding: "10px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginTop: '10px'
                                    }}>
                                        Hapus Shape
                                    </button>
                                    <button type="button" onClick={() => {
                                        setIsShapeDetailsFormVisible(false);
                                        setIsEditingMapShape(false); // Pastikan mode edit peta dinonaktifkan juga saat batal
                                        setSelectedShape(null);
                                        setSelectedShapeType(null);
                                    }} style={{
                                        width: "100%", padding: "10px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginTop: '10px'
                                    }}>
                                        Batal
                                    </button>
                                    {/* Tombol "Edit Geometri di Peta" di sidebar dihapus, karena akan diinisiasi dari popup peta */}
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
                    // Pass specific delete handlers (for sidebar/popups that directly trigger delete)
                    onDeleteMarker={deleteMarker}
                    onDeletePolyline={deletePolyline}
                    onDeletePolygon={deletePolygon}
                    onDeleteCircle={deleteCircle}
                    // This is the callback from MapComponent when an edit/delete is finished on the map
                    onEditShape={handleMapShapeEditOrDeleteFinished} 
                    selectedShape={selectedShape}
                    selectedShapeType={selectedShapeType}
                    isEditingMapShape={isEditingMapShape} // NEW: Pass the state to activate/deactivate map editing
                    // Pass master data and region lists for lookups in MapComponent
                    eksistingList={eksistingList}
                    jenisJalanList={jenisJalanList}
                    kondisiList={kondisiList}
                    provinsiList={provinsiList}
                    kabupatenList={kabupatenList}
                    kecamatanList={kecamatanList}
                    desaList={desaList}
                    isDrawingForRuasJalan={isDrawingForRuasJalan}
                    // NEW: Pass new handlers for map popup buttons and sidebar row clicks
                    handleEditClickFromMapPopup={handleEditClickFromMapPopup}
                    handleDeleteClickFromMapPopup={handleDeleteClickFromMapPopup}
                    openShapePopupAndCenterMap={openShapePopupAndCenterMap}
                />
            </div>
        </div>
    );
};

export default Dashboard;
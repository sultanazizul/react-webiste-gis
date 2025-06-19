// src/hooks/useRuasJalanData.js
import { useState, useEffect } from "react";
import {
  getAllRuasJalan,
  addRuasJalan as apiAddRuasJalan, // Rename to avoid conflict
  editRuasJalan as apiEditRuasJalan,
  deleteRuasJalan as apiDeleteRuasJalan,
} from "../api/ruasJalan";
import { calculatePolylineLength } from "../utils/helpers";
import { getAllRegions, getKabupatenByProvinsiId, getKecamatanByKabupatenId, getDesaByKecamatanId, getKecamatanByDesaId } from "../api/region";

const useRuasJalanData = (user, navigate) => {
  const [ruasJalanList, setRuasJalanList] = useState([]);
  const [ruasJalanLoading, setRuasJalanLoading] = useState(true);
  const [editingRuasJalan, setEditingRuasJalan] = useState(null);
  const [isRuasJalanFormVisible, setIsRuasJalanFormVisible] = useState(false);
  const [lastDrawnPolylineCoords, setLastDrawnPolylineCoords] = useState(null);
  const [isDrawingForRuasJalan, setIsDrawingForRuasJalan] = useState(false);

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

  // State for internal form dropdowns (not filter)
  const [provinsiListForm, setProvinsiListForm] = useState([]);
  const [kabupatenListForm, setKabupatenListForm] = useState([]);
  const [kecamatanListForm, setKecamatanListForm] = useState([]);
  const [desaListForm, setDesaListForm] = useState([]);


  // Fetch all ruas jalan data on user change
  useEffect(() => {
    const fetchRuasJalan = async () => {
      const token = localStorage.getItem("authToken");
      if (user && token) {
        setRuasJalanLoading(true);
        try {
          const data = await getAllRuasJalan(token); //
          setRuasJalanList(data);
        } catch (error) {
          alert(`Error fetching ruas jalan: ${error.message}`);
          console.error("Error fetching ruas jalan:", error);
        } finally {
          setRuasJalanLoading(false);
        }
      }
    };
    fetchRuasJalan();
  }, [user]);

  // Fetch regions for form dropdowns (KOREKSI: Memanggil getAllRegions untuk provinsi)
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (user && token) {
      const fetchAllRegionsForForm = async () => {
        try {
          const { provinsi } = await getAllRegions(token); // KOREKSI PENTING DI SINI: Gunakan getAllRegions
          setProvinsiListForm(provinsi);
        } catch (error) {
          console.error("Error fetching provinces for form:", error);
          setProvinsiListForm([]); // Pastikan selalu array kosong jika gagal
        }
      };
      fetchAllRegionsForForm();
    } else {
        setProvinsiListForm([]);
    }
  }, [user]);


  // Effect for fetching kabupatens when provinsi_id in form changes
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (ruasJalanForm.provinsi_id && token) {
      const fetchKabupatens = async () => {
        try {
          const kabupatens = await getKabupatenByProvinsiId(ruasJalanForm.provinsi_id, token); //
          setKabupatenListForm(kabupatens);
        } catch (error) {
          console.error("Error fetching kabupatens for form:", error);
          setKabupatenListForm([]);
        }
      };
      fetchKabupatens();
    } else {
      setKabupatenListForm([]);
    }
  }, [ruasJalanForm.provinsi_id, user]);

  // Effect for fetching kecamatans when kabupaten_id in form changes
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (ruasJalanForm.kabupaten_id && token) {
      const fetchKecamatans = async () => {
        try {
          const kecamatans = await getKecamatanByKabupatenId(ruasJalanForm.kabupaten_id, token); //
          setKecamatanListForm(kecamatans);
        } catch (error) {
          console.error("Error fetching kecamatans for form:", error);
          setKecamatanListForm([]);
        }
      };
      fetchKecamatans();
    } else {
      setKecamatanListForm([]);
    }
  }, [ruasJalanForm.kabupaten_id, user]);

  // Effect for fetching desas when kecamatan_id in form changes
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (ruasJalanForm.kecamatan_id && token) {
      const fetchDesas = async () => {
        try {
          const desas = await getDesaByKecamatanId(ruasJalanForm.kecamatan_id, token); //
          setDesaListForm(desas);
        } catch (error) {
          console.error("Error fetching desas for form:", error);
          setDesaListForm([]);
        }
      };
      fetchDesas();
    } else {
      setDesaListForm([]);
    }
  }, [ruasJalanForm.kecamatan_id, user]);

  const handleRuasJalanFormChange = (e) => {
    const { name, value } = e.target;
    setRuasJalanForm(prev => {
      const newForm = { ...prev, [name]: value };

      // Reset dependent dropdowns when parent changes
      if (name === 'provinsi_id') {
        newForm.kabupaten_id = '';
        newForm.kecamatan_id = '';
        newForm.desa_id = '';
        setKabupatenListForm([]);
        setKecamatanListForm([]);
        setDesaListForm([]);
      } else if (name === 'kabupaten_id') {
        newForm.kecamatan_id = '';
        newForm.desa_id = '';
        setKecamatanListForm([]);
        setDesaListForm([]);
      } else if (name === 'kecamatan_id') {
        newForm.desa_id = '';
        setDesaListForm([]);
      }
      return newForm;
    });
  };

  const handleSetLastDrawnPolyline = (coords) => {
    setLastDrawnPolylineCoords(coords);
    setRuasJalanForm(prev => ({
      ...prev,
      paths: coords,
      panjang: calculatePolylineLength(coords).toFixed(2)
    }));
  };

  const handleAddOrUpdateRuasJalan = async () => {
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
        await apiEditRuasJalan(editingRuasJalan.id, dataToSend, token); //
        alert("Ruas Jalan updated successfully!");
      } else {
        await apiAddRuasJalan(dataToSend, token); //
        alert("Ruas Jalan added successfully!");
      }
      setEditingRuasJalan(null);
      setIsRuasJalanFormVisible(false);
      // Reset form to initial empty state, including region IDs
      setRuasJalanForm({
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
      setIsDrawingForRuasJalan(false); // Pastikan mode menggambar dinonaktifkan setelah submit/update

      // Re-fetch all data to ensure the list is updated
      const fetchedRuasJalanData = await getAllRuasJalan(token); //
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
    setIsDrawingForRuasJalan(true); // Activate drawing mode when editing

    // Prepare initial form state with existing data
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
      provinsi_id: '', // Will be filled by lookup
      kabupaten_id: '', // Will be filled by lookup
      kecamatan_id: '', // Will be filled by lookup
    };
    setRuasJalanForm(initialFormState);

    const token = localStorage.getItem("authToken");
    if (ruasJalan.desa_id && token) {
      try {
        // Fetch full region data to pre-populate dropdowns
        const regionData = await getKecamatanByDesaId(ruasJalan.desa_id, token); //
        const { provinsi, kabupaten, kecamatan, desa } = regionData;

        setRuasJalanForm(prev => ({
          ...prev,
          provinsi_id: provinsi?.id || '',
          kabupaten_id: kabupaten?.id || '',
          kecamatan_id: kecamatan?.id || '',
          desa_id: desa?.id || '',
        }));

        // Manually trigger fetching dependent dropdowns
        if (provinsi?.id) {
          const fetchedKabupatens = await getKabupatenByProvinsiId(provinsi.id, token); //
          setKabupatenListForm(fetchedKabupatens);
          if (kabupaten?.id) {
            const fetchedKecamatans = await getKecamatanByKabupatenId(kabupaten.id, token); //
            setKecamatanListForm(fetchedKecamatans);
            if (kecamatan?.id) {
              const fetchedDesas = await getDesaByKecamatanId(kecamatan.id, token); //
              setDesaListForm(fetchedDesas);
            }
          }
        }
      } catch (error) {
        console.error("Error looking up region by desa ID during edit:", error);
        alert("Failed to load full region data for editing. Please select region manually.");
        setKabupatenListForm([]);
        setKecamatanListForm([]);
        setDesaListForm([]);
      }
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
        await apiDeleteRuasJalan(id, token); //
        alert("Ruas Jalan berhasil dihapus!");
        // Re-fetch all data to ensure the list is updated
        const fetchedRuasJalanData = await getAllRuasJalan(token); //
        setRuasJalanList(fetchedRuasJalanData);
      } catch (error) {
        alert(`Error menghapus ruas jalan: ${error.response?.data?.message || JSON.stringify(error.response?.data) || error.message || "Unknown error"}`);
        console.error("Error deleting ruas jalan:", error);
      } finally {
        setRuasJalanLoading(false);
      }
    }
  };

  const toggleRuasJalanFormVisibility = () => {
    setIsRuasJalanFormVisible(prev => !prev);
    setEditingRuasJalan(null); // Clear editing state when toggling form
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
    setIsDrawingForRuasJalan(prev => !prev); // KOREKSI: Toggle isDrawingForRuasJalan sesuai visibilitas form
  };

  const cancelRuasJalanForm = () => {
    setIsRuasJalanFormVisible(false);
    setEditingRuasJalan(null);
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
  };


  return {
    ruasJalanList,
    ruasJalanLoading,
    editingRuasJalan,
    isRuasJalanFormVisible,
    lastDrawnPolylineCoords,
    isDrawingForRuasJalan,
    ruasJalanForm,
    provinsiListForm,
    kabupatenListForm,
    kecamatanListForm,
    desaListForm,
    handleRuasJalanFormChange,
    handleSetLastDrawnPolyline,
    handleAddOrUpdateRuasJalan,
    handleEditRuasJalanClick,
    handleDeleteRuasJalanClick,
    toggleRuasJalanFormVisibility,
    cancelRuasJalanForm,
  };
};

export default useRuasJalanData;
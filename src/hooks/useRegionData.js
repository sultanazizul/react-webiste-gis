// src/hooks/useRegionData.js
import { useState, useEffect } from "react";
import {
  getAllRegions,
  getKabupatenByProvinsiId,
  getKecamatanByKabupatenId,
  getDesaByKecamatanId,
} from "../api/region";

const useRegionData = (user) => {
  const [allProvinsi, setAllProvinsi] = useState([]); // Master list of all provinces
  const [filterProvinsiId, setFilterProvinsiId] = useState('');
  const [filterKabupatenList, setFilterKabupatenList] = useState([]);
  const [filterKabupatenId, setFilterKabupatenId] = useState('');
  const [filterKecamatanList, setFilterKecamatanList] = useState([]);
  const [filterKecamatanId, setFilterKecamatanId] = useState('');
  const [filterDesaList, setFilterDesaList] = useState([]);
  const [filterDesaId, setFilterDesaId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (user && token) {
      const fetchRegions = async () => {
        try {
          const { provinsi } = await getAllRegions(token);
          setAllProvinsi(provinsi);
        } catch (error) {
          console.error("Error fetching all regions:", error);
        }
      };
      fetchRegions();
    }
  }, [user]);

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

  // Fetch Kabupatens for FILTER when filterProvinsiId changes
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (filterProvinsiId && token) {
      const fetchFilterKabupatens = async () => {
        try {
          const kabupatens = await getKabupatenByProvinsiId(filterProvinsiId, token);
          setFilterKabupatenList(kabupatens);
        } catch (error) {
          console.error("Error fetching filter kabupatens:", error);
          setFilterKabupatenList([]);
        }
      };
      fetchFilterKabupatens();
    } else {
      setFilterKabupatenList([]);
    }
  }, [filterProvinsiId, user]);

  // Fetch Kecamatans for FILTER when filterKabupatenId changes
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (filterKabupatenId && token) {
      const fetchFilterKecamatans = async () => {
        try {
          const kecamatans = await getKecamatanByKabupatenId(filterKabupatenId, token);
          setFilterKecamatanList(kecamatans);
        } catch (error) {
          console.error("Error fetching filter kecamatans:", error);
          setFilterKecamatanList([]);
        }
      };
      fetchFilterKecamatans();
    } else {
      setFilterKecamatanList([]);
    }
  }, [filterKabupatenId, user]);

  // Fetch Desas for FILTER when filterKecamatanId changes
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (filterKecamatanId && token) {
      const fetchFilterDesas = async () => {
        try {
          const desas = await getDesaByKecamatanId(filterKecamatanId, token);
          setFilterDesaList(desas);
        } catch (error) {
          console.error("Error fetching filter desas:", error);
          setFilterDesaList([]);
        }
      };
      fetchFilterDesas();
    } else {
      setFilterDesaList([]);
    }
  }, [filterKecamatanId, user]);

  return {
    allProvinsi,
    filterProvinsiId,
    filterKabupatenList,
    filterKabupatenId,
    filterKecamatanList,
    filterKecamatanId,
    filterDesaList,
    filterDesaId,
    handleFilterChange,
  };
};

export default useRegionData;
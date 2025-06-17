// src/api/region.js
import axios from "axios";
import { API_BASE_URL } from "../utils/constants";

const getAuthHeaders = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export const getAllRegions = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/mregion`, getAuthHeaders(token));
    return {
      provinsi: response.data.provinsi || [],
      kabupaten: response.data.kabupaten || [],
      kecamatan: response.data.kecamatan || [],
      desa: response.data.desa || [],
    };
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch all regions");
  }
};

export const getKabupatenByProvinsiId = async (provinsiId, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/kabupaten/${provinsiId}`, getAuthHeaders(token));
    return response.data.kabupaten || [];
  } catch (error) {
    throw new Error(error.response?.data?.message || `Failed to fetch kabupatens for provinsi ${provinsiId}`);
  }
};

export const getKecamatanByKabupatenId = async (kabupatenId, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/kecamatan/${kabupatenId}`, getAuthHeaders(token));
    return response.data.kecamatan || [];
  } catch (error) {
    throw new Error(error.response?.data?.message || `Failed to fetch kecamatans for kabupaten ${kabupatenId}`);
  }
};

export const getDesaByKecamatanId = async (kecamatanId, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/desa/${kecamatanId}`, getAuthHeaders(token));
    return response.data.desa || [];
  } catch (error) {
    throw new Error(error.response?.data?.message || `Failed to fetch desas for kecamatan ${kecamatanId}`);
  }
};

// Anda juga bisa menambahkan fungsi untuk API lookup balik jika diperlukan
export const getKecamatanByDesaId = async (desaId, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/kecamatanbydesaid/${desaId}`, getAuthHeaders(token));
    return response.data; // Akan berisi desa, kecamatan, kabupaten, provinsi
  } catch (error) {
    throw new Error(error.response?.data?.message || `Failed to fetch region by desa ID ${desaId}`);
  }
};
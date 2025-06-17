// src/api/masterData.js
import axios from "axios";
import { API_BASE_URL } from "../utils/constants";

const getAuthHeaders = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export const getMasterEksistingJalan = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/meksisting`, getAuthHeaders(token));
    return response.data.eksisting || [];
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch eksisting types");
  }
};

export const getMasterJenisJalan = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/mjenisjalan`, getAuthHeaders(token));
    return response.data.eksisting || []; // API response has "eksisting" key for jenisjalan
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch jenis jalan types");
  }
};

export const getMasterKondisiJalan = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/mkondisi`, getAuthHeaders(token));
    return response.data.eksisting || []; // API response has "eksisting" key for kondisi
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch kondisi types");
  }
};
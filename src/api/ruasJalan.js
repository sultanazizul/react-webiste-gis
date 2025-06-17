// src/api/ruasJalan.js
import axios from "axios";
import { API_BASE_URL } from "../utils/constants";
import polyline from "polyline-encoded"; // Import library polyline-encoded

const getAuthHeaders = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// GET all Ruas Jalan
const getAllRuasJalan = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/ruasjalan`, getAuthHeaders(token));
    // Decode paths for each ruas jalan
    const ruasJalan = response.data.ruasjalan.map(rj => ({
      ...rj,
      decodedPaths: rj.paths ? polyline.decode(rj.paths) : [] // Decode paths to array of [lat, lng]
    }));
    return ruasJalan;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch ruas jalan");
  }
};

// GET Ruas Jalan by ID
const getRuasJalanById = async (id, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/ruasjalan/${id}`, getAuthHeaders(token));
    const ruasJalan = {
      ...response.data.ruasjalan,
      decodedPaths: response.data.ruasjalan.paths ? polyline.decode(response.data.ruasjalan.paths) : []
    };
    return ruasJalan;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch ruas jalan by ID");
  }
};

// POST New Ruas Jalan
const addRuasJalan = async (ruasJalanData, token) => {
  try {
    // Encode paths before sending to API
    const encodedPaths = ruasJalanData.paths ? polyline.encode(ruasJalanData.paths) : ""; // Assume paths is array of [lat,lng]
    const dataToSend = {
      ...ruasJalanData,
      paths: encodedPaths,
    };
    const response = await axios.post(`${API_BASE_URL}/ruasjalan`, dataToSend, getAuthHeaders(token));
    return response.data.ruasjalan;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to add ruas jalan");
  }
};

// PUT Edit Ruas Jalan by ID
const editRuasJalan = async (id, ruasJalanData, token) => {
  try {
    // Encode paths before sending to API
    const encodedPaths = ruasJalanData.paths ? polyline.encode(ruasJalanData.paths) : ""; // Assume paths is array of [lat,lng]
    const dataToSend = {
      ...ruasJalanData,
      paths: encodedPaths,
      _method: "PUT" // Laravel method spoofing for PUT request
    };
    const response = await axios.post(`${API_BASE_URL}/ruasjalan/${id}`, dataToSend, getAuthHeaders(token)); // Using POST for PUT with _method
    return response.data.ruasjalan;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to edit ruas jalan");
  }
};

// DELETE Ruas Jalan by ID
const deleteRuasJalan = async (id, token) => {
  try {
    await axios.delete(`${API_BASE_URL}/ruasjalan/${id}`, getAuthHeaders(token));
    return "Ruas Jalan deleted successfully";
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to delete ruas jalan");
  }
};

export {
  getAllRuasJalan,
  getRuasJalanById,
  addRuasJalan,
  editRuasJalan,
  deleteRuasJalan,
};
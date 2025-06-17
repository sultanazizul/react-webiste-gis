// src/api/auth.js
import axios from "axios";
import { API_BASE_URL } from "../utils/constants";

const loginUser = async (email, password) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/login`, {
      email,
      password,
    });
    // PERBAIKAN: Mengambil token dari response.data.meta.token
    return response.data.meta.token; 
  } catch (error) {
    throw new Error(error.response?.data?.meta?.message || "Login failed");
  }
};

const registerUser = async (name, email, password) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/register`, {
      name,
      email,
      password,
    });
    return response.data.meta.message;
  } catch (error) {
    throw new Error(error.response?.data?.meta?.message || "Registration failed");
  }
};

const logoutUser = async (token) => {
  try {
    await axios.post(`${API_BASE_URL}/logout`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return "Successfully logged out";
  } catch (error) {
    throw new Error(error.response?.data?.meta?.message || "Logout failed");
  }
};

const getUser = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data.user;
  } catch (error) {
    throw new Error(error.response?.data?.meta?.message || "Failed to fetch user data");
  }
};

export { loginUser, registerUser, logoutUser, getUser };

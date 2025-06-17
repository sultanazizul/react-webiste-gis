// src/hooks/useAuth.js
import { useState, useEffect } from "react";
import { loginUser, registerUser, logoutUser, getUser } from "../api/auth";

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("authToken"));

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const userData = await getUser(token);
          setUser(userData);
        } catch (error) {
          console.error("Failed to fetch user:", error);
          localStorage.removeItem("authToken");
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const fetchedToken = await loginUser(email, password);
      localStorage.setItem("authToken", fetchedToken);
      setToken(fetchedToken);
      const userData = await getUser(fetchedToken);
      setUser(userData);
      return true;
    } catch (error) {
      alert(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (name, email, password) => {
    setLoading(true);
    try {
      const message = await registerUser(name, email, password);
      alert(message);
      return true;
    } catch (error) {
      alert(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser(token);
      localStorage.removeItem("authToken");
      setToken(null);
      setUser(null);
      alert("Successfully logged out");
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, login: handleLogin, register: handleRegister, logout: handleLogout };
};

export default useAuth;
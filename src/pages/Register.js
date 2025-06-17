import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth"; // Import custom hook
import "../styles/index.css";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); // Tambahkan state untuk nama
  const { loading, register } = useAuth(); // Dapatkan loading dan fungsi register dari hook
  const [error, setError] = useState(null); // State untuk menampilkan error spesifik
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null); // Bersihkan error sebelumnya
    const success = await register(name, email, password); // Gunakan fungsi register dari hook
    if (success) {
      navigate("/login");
    } else {
      // Error handling sudah ada di useAuth, tapi jika ingin menampilkan di UI
      // Anda bisa menambahkan state error di useAuth dan mengembalikannya
      setError("Registration failed. Please try again."); // Pesan error umum jika tidak berhasil
    }
  };

  return (
    <div className="login-container">
      <h2>Welcome</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleRegister}>
        <div className="input-container">
          <input
            type="text" // Input untuk nama
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label>Name</label>
        </div>

        <div className="input-container">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label>Email</label>
        </div>

        <div className="input-container">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <label>Password</label>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      <p className="nav-text">
        Sudah punya akun? <span onClick={() => navigate("/login")}>Login</span>
      </p>
    </div>
  );
};

export default Register;
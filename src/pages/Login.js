import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth"; // Import custom hook
import "../styles/index.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { loading, login } = useAuth(); // Dapatkan loading dan fungsi login dari hook
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const success = await login(email, password); // Gunakan fungsi login dari hook
    if (success) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="login-container">
      <h2>Welcome Back</h2>
      <form onSubmit={handleLogin}>
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
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="nav-text">
        Belum punya akun? <span onClick={() => navigate("/register")}>Register</span>
      </p>
    </div>
  );
};

export default Login;
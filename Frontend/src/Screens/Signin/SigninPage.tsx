import { useState } from "react";
import "./SigninPage.css";
import { API_ENDPOINTS } from "../../config/api";

const Signin: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");



  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const res = await fetch(API_ENDPOINTS.addUser, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email }),
      });
      const data = await res.json();
      console.log(data);

      if (!data.data) return alert(data.message || "User name already exist"); // data.data = 0
      alert("User created successfully");
      window.location.href = "/login";
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    }
  }
  return (
    <div className="login-fullscreen">
      <div className="login-container">
        {/* LOGO SECTION - TOP */}
        <div className="login-logo">
          <div className="login-logo-circle">
            <span className="login-logo-text">ABB</span>
          </div>
          <h2>Digital Panel</h2>
          <p className="login-subtitle">Energy Management System</p>
          <p className="login-description">Secure access to your power monitoring dashboard</p>
        </div>

        <form className="login-box" onSubmit={handleSignin}>
          <h1>Sign In</h1>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit">Sign In</button>

          <button
            className="signin"
            type="button"
            onClick={() => window.location.href = "/login"}
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Signin;

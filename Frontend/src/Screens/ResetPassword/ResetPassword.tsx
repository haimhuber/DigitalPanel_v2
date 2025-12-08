import { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../../config/api";
import "../Login/LoginPage.css";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, []);



  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.resetPassword, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword })
      });

      const result = await response.json();

      if (result.success) {
        alert('Password updated successfully!');
        window.location.href = "/login";
      } else {
        alert(result.message || 'Failed to update password');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      alert('Failed to update password');
    }
  }

  return (
    <div className="login-fullscreen">
      <div className="login-container">
        <form className="login-box" onSubmit={handleResetPassword}>
          <h1>Set New Password</h1>
          <p>Email: {email}</p>

          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button type="submit">Update Password</button>

          <button
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

export default ResetPassword;
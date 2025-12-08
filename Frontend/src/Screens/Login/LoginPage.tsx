import { useEffect, useState } from "react";
import "./LoginPage.css";
import { sendEmail } from "../../Types/CombinedData";
import { API_ENDPOINTS } from "../../config/api";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [emailCode, setEmailCode] = useState<number>(0);
  const [showAuth, setShowAuth] = useState(false);
  const [disabledBtn, setDisabledBtn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [countDown, setCountDown] = useState(30);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [showForgotVerification, setShowForgotVerification] = useState(false);
  const [forgotCode, setForgotCode] = useState("");
  const [forgotEmailCode, setForgotEmailCode] = useState<number>(0);



  function handleSendAgain() {
    setDisabledBtn(true);
    setCountDown(30); // reset countdown
  }

  useEffect(() => {
    let timer: any;

    if (disabledBtn && countDown > 0) {
      timer = setInterval(() => {
        setCountDown(prev => prev - 1);
      }, 1000);
    }

    if (countDown === 0) {
      setDisabledBtn(false); // enable button again
    }

    return () => clearInterval(timer);
  }, [disabledBtn, countDown]);

  async function resendEmail() {
    try {
      const request = await sendEmail(userEmail);
      if (request?.Succsess) {
        setEmailCode(request.code);
      } else {
        alert("Cannot send verification code");
      }
    } catch (err) {
      console.error("Email sending error:", err);
      alert("Failed to send email");
    }
  }


  function signin() {
    window.location.href = "/Signin";
  }

  async function handleForgotPassword() {
    if (!forgotEmail) {
      alert('Please enter your email address');
      return;
    }

    try {
      // First check if user exists
      const response = await fetch(API_ENDPOINTS.forgotPassword, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });

      const result = await response.json();

      if (result.success) {
        // Use the same sendEmail function as login
        try {
          const request = await sendEmail(forgotEmail);
          if (request?.Succsess) {
            setForgotEmailCode(request.code);
            setShowForgotPassword(false);
            setShowForgotVerification(true);
          } else {
            alert('Cannot send verification code');
          }
        } catch (err) {
          console.error('Email sending error:', err);
          alert('Failed to send email');
        }
      } else {
        alert(result.message || 'Email not found');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      alert('Failed to send reset email');
    }
  }

  function verifyForgotCode() {
    if (Number(forgotCode) === forgotEmailCode) {
      window.location.href = `/reset-password?email=${encodeURIComponent(forgotEmail)}`;
    } else {
      alert('Verification code is incorrect!');
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch(API_ENDPOINTS.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!data.data) {
        alert(data.message || "User or Password are invalid");
        sessionStorage.removeItem("token");
        return;
      }

      // ---- Login Success ----
      setShowAuth(true);
      setUserEmail(data.userEmail);
      try {
        const request = await sendEmail(data.userEmail);
        if (request?.Succsess) {
          setEmailCode(request.code);
        } else {
          alert("Cannot send verification code");
        }
      } catch (err) {
        console.error("Email sending error:", err);
        alert("Failed to send email");
      }

    } catch (err) {
      console.error(err);
    }
  }


  async function verificationCode(inputCode: number) {
    if (inputCode === emailCode) {
      sessionStorage.setItem("token", "true");
      sessionStorage.setItem("username", username);

      // ---- Audit Log ----
      try {
        const usernameAudit = sessionStorage.getItem("username");
        const type = "login";

        await fetch(API_ENDPOINTS.audit, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernameAudit, type })
        });
      } catch (err) {
        console.error("Audit error:", err);
      }

      // Redirect
      window.location.href = "/";
    } else {
      alert("Verification code is incorrect!");
    }
  }

  return (
    <div className="login-fullscreen">
      <div className="login-container">
        {/* LOGO SECTION - LEFT SIDE */}
        <div className="login-logo">
          <div className="login-logo-circle">
            <span className="login-logo-text">ABB</span>
          </div>
          <h2>Digital Panel</h2>
          <p className="login-subtitle">Energy Management System</p>
          <p className="login-description">Secure access to your power monitoring dashboard</p>
        </div>

        {/* LOGIN FORM */}
        {!showAuth && (
          <form className="login-box" onSubmit={handleLogin}>
            <h1>Login</h1>

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

            <button type="submit">Login</button>

            <button
              className="signin"
              type="button"
              onClick={signin}
            >
              Signin
            </button>

            <button
              className="forgot-password"
              type="button"
              onClick={() => setShowForgotPassword(true)}
            >
              Forgot Password?
            </button>
          </form>
        )}

        {/* AUTH CODE INPUT */}
        {showAuth && (
          <div className="auth-box">
            <h2>Enter Verification Code</h2>

            <input
              type="text"
              placeholder="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />

            <button
              className="signin"
              type="button"
              onClick={() => { verificationCode(Number(code)) }}
            >
              Verify
            </button>

            <button
              disabled={disabledBtn}
              className={`signin ${disabledBtn ? "disabled" : "enabled"}`}
              type="button"
              onClick={() => { handleSendAgain(); resendEmail() }}
            >
              Send again : {disabledBtn ? "Disabled" : "Enabled"} {disabledBtn ? `${countDown}s` : ""}
            </button>
          </div>
        )}

        {/* FORGOT PASSWORD */}
        {showForgotPassword && (
          <div className="auth-box">
            <h2>Reset Password</h2>
            <p>Enter your email to receive verification code</p>

            <input
              type="email"
              placeholder="Email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
            />

            <button
              className="signin"
              type="button"
              onClick={handleForgotPassword}
            >
              Send Verification Code
            </button>

            <button
              className="signin"
              type="button"
              onClick={() => setShowForgotPassword(false)}
            >
              Back to Login
            </button>
          </div>
        )}

        {/* FORGOT PASSWORD VERIFICATION */}
        {showForgotVerification && (
          <div className="auth-box">
            <h2>Enter Verification Code</h2>
            <p>Code sent to: {forgotEmail}</p>

            <input
              type="text"
              placeholder="Verification Code"
              value={forgotCode}
              onChange={(e) => setForgotCode(e.target.value)}
              required
            />

            <button
              className="signin"
              type="button"
              onClick={verifyForgotCode}
            >
              Verify & Reset Password
            </button>

            <button
              className="signin"
              type="button"
              onClick={() => {
                setShowForgotVerification(false);
                setShowForgotPassword(true);
              }}
            >
              Back
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Login;

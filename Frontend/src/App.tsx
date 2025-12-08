import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { lazy, Suspense, useState, useEffect } from 'react'
import './App.css'
import { useAuth, useAlerts, useTime } from './contexts';
import { initializeServerUrl } from './config/api';

const HomeScreen = lazy(() => import('./Screens/Home/HomeScreen').then(m => ({ default: m.HomeScreen })));

const Setting = lazy(() => import('./Screens/_Setting/Setting').then(m => ({ default: m.Setting })));
const Login = lazy(() => import('./Screens/Login/LoginPage'));
const Signin = lazy(() => import('./Screens/Signin/SigninPage'));
const ResetPassword = lazy(() => import('./Screens/ResetPassword/ResetPassword'));
const Logout = lazy(() => import('./Screens/Logout/Logout').then(m => ({ default: m.Logout })));
const Alerts = lazy(() => import('./Screens/Alarms/Alerts').then(m => ({ default: m.Alerts })));
const Report = lazy(() => import('./Screens/Reports/Report'));
const Billing = lazy(() => import('./Screens/Billing/BillingScreen').then(m => ({ default: m.BillingScreen })));

function AppContent() {
  const { isAuthenticated, user, token } = useAuth();
  const { alertsNumber } = useAlerts();
  const { season, peakOffSeason, shortDate } = useTime();
  const location = useLocation();
  const [, forceUpdate] = useState({});

  // Initialize server URL on app start
  useEffect(() => {
    initializeServerUrl();
  }, []);

  // רענון אוטומטי בתחילת כל שעה עגולה לעדכון תעריפים
  useEffect(() => {
    const scheduleNextUpdate = () => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0); // Next full hour
      const msUntilNextHour = nextHour.getTime() - now.getTime();

      return setTimeout(() => {
        forceUpdate({}); // Force re-render at start of hour
        scheduleNextUpdate(); // Schedule next hour
      }, msUntilNextHour);
    };

    const timeout = scheduleNextUpdate();
    return () => clearTimeout(timeout);
  }, []);

  // הסתרת Navbar בעמודי ה-authentication
  const hideNavbar = ['/login', '/Signin', '/reset-password'].includes(location.pathname);

  return (
    <div className="app-layout">
      {!hideNavbar && (
        <nav className='sidebar-nav'>
          {isAuthenticated && (
            <div className="user-info">
              <div className="user-avatar">
                <span className="avatar-letter">{user.charAt(0).toUpperCase()}</span>
              </div>
              <div className="user-details">
                <span className="user-name">{user}</span>
                <Link to="/logout" className="logout-link">Logout</Link>
              </div>
            </div>
          )}
          <div className="sidebar-logo">
            <div className="sidebar-logo-circle">
              <span className="sidebar-logo-text">ABB</span>
            </div>
            <span className="sidebar-title">Digital Panel</span>
          </div>

          <div className="sidebar-status">
            <div className="status-item">
              📅 {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
              <br />
              🕐 {new Date().toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>

            <div className="status-item">
              {(() => {
                const now = new Date();
                const hour = now.getHours();
                const month = now.getMonth() + 1;
                const dayOfWeek = now.getDay();
                const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

                let peakRate = '';
                let offPeakRate = '';
                let isPeakTime = false;

                if (month === 12 || month === 1 || month === 2) {
                  peakRate = '₪1.21/kWh';
                  offPeakRate = '₪0.46/kWh';
                  isPeakTime = hour >= 17 && hour < 22; // All days including weekends
                } else if (month >= 6 && month <= 9) {
                  peakRate = '₪1.69/kWh';
                  offPeakRate = '₪0.53/kWh';
                  isPeakTime = !isWeekend && hour >= 17 && hour < 23;
                } else {
                  peakRate = '₪0.50/kWh';
                  offPeakRate = '₪0.45/kWh';
                  isPeakTime = !isWeekend && hour >= 17 && hour < 22;
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{
                      color: isPeakTime ? '#10b981' : '#6b7280',
                      fontWeight: isPeakTime ? '600' : '400'
                    }}>
                      PEAK RATE - {peakRate}
                    </div>
                    <div style={{
                      color: !isPeakTime ? '#10b981' : '#6b7280',
                      fontWeight: !isPeakTime ? '600' : '400'
                    }}>
                      OFF PEAK RATE - {offPeakRate}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="status-item">
              {(() => {
                const now = new Date();
                const hour = now.getHours();
                const month = now.getMonth() + 1;
                const dayOfWeek = now.getDay();
                const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

                let isPeakTime = false;

                if (month === 12 || month === 1 || month === 2) {
                  isPeakTime = hour >= 17 && hour < 22; // All days including weekends
                  return (
                    <>
                      <div style={{
                        color: isPeakTime ? '#10b981' : '#6b7280',
                        fontWeight: isPeakTime ? '600' : '400'
                      }}>PEAK: 17:00-22:00 (All days)</div>
                      <div style={{
                        color: !isPeakTime ? '#10b981' : '#6b7280',
                        fontWeight: !isPeakTime ? '600' : '400'
                      }}>OFF: 00:00-17:00, 22:00-24:00</div>
                    </>
                  );
                }

                if (month >= 6 && month <= 9) {
                  isPeakTime = !isWeekend && hour >= 17 && hour < 23;
                  if (!isWeekend) {
                    return (
                      <>
                        <div style={{
                          color: isPeakTime ? '#10b981' : '#6b7280',
                          fontWeight: isPeakTime ? '600' : '400'
                        }}>PEAK: 17:00-23:00 (Weekdays)</div>
                        <div style={{
                          color: !isPeakTime ? '#10b981' : '#6b7280',
                          fontWeight: !isPeakTime ? '600' : '400'
                        }}>OFF: 00:00-17:00, 23:00-24:00</div>
                      </>
                    );
                  } else {
                    return <div style={{ color: '#10b981', fontWeight: '600' }}>OFF-PEAK: All day (Weekend)</div>;
                  }
                }

                // Spring/Autumn (Mar-May, Oct-Nov)
                isPeakTime = !isWeekend && hour >= 17 && hour < 22;
                if (!isWeekend) {
                  return (
                    <>
                      <div style={{
                        color: isPeakTime ? '#10b981' : '#6b7280',
                        fontWeight: isPeakTime ? '600' : '400'
                      }}>PEAK: 17:00-22:00 (Weekdays)</div>
                      <div style={{
                        color: !isPeakTime ? '#10b981' : '#6b7280',
                        fontWeight: !isPeakTime ? '600' : '400'
                      }}>OFF: 00:00-17:00, 22:00-24:00</div>
                    </>
                  );
                } else {
                  return <div style={{ color: '#10b981', fontWeight: '600' }}>OFF-PEAK: All day (Weekend)</div>;
                }
              })()}
            </div>
            <div className="status-season">{season}</div>
          </div>

          <div className="nav-links">
            <Link to="/" className="nav-link">📊 Dashboard</Link>
            <Link to="/alerts" className="nav-link alerts-link">
              🚨 Alerts
              {token && alertsNumber > 0 && (<span className="alerts-badge">{alertsNumber}</span>)}
            </Link>
            <Link to="/reports" className="nav-link">📈 Reports</Link>
            <Link to="/billing" className="nav-link">💰 Billing</Link>
            <Link to="/settings" className="nav-link">⚙️ Settings</Link>
          </div>
        </nav>
      )}

      <div className="main-content">
        <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}>
          <Routes>
            <Route path="/" element={<HomeScreen />} />

            <Route path="/settings" element={<Setting />} />
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/Signin" element={<Signin />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/reports" element={<Report />} />
            <Route path="/billing" element={<Billing />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
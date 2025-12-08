import './Report.css';
import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getAlerts, getBreakerNames } from "../../Types/CombinedData";
import type { AlertInterface } from "../../Types/Alerts";
import { breakerDataList } from '../../Types/digitalPanel';
import { API_ENDPOINTS } from "../../config/api";

const Report = () => {
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [data, setData] = useState<AlertInterface[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [showSwitchData, SetshowSwitchData] = useState(false);
  const [breakerList, setBreakerList] = useState<any[]>([]);
  const [selectedBreaker, setSelectedBreaker] = useState("");
  const breakerData = breakerDataList;
  const [breakerDataPick, setBbreakerDataPick] = useState("");
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sampleType, setSampleType] = useState<string>('daily');

  useEffect(() => {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    setStartDate(lastWeek.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);
  const [switchReportData, setSwitchReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = async () => {
    try {
      const response = await getAlerts();
      setData(response.data ?? []);
    } catch (err) {
      // Error handled silently
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    async function fetchNames() {
      try {
        const req = await getBreakerNames();
        setBreakerList(req);
      } catch (err) {
        // Error handled silently
      }
    }
    fetchNames();
  }, []);

  const fetchSwitchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.report, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          breakerName: selectedBreaker || '1',
          startTime: `${startDate} 00:00:00`,
          endTime: `${endDate} 23:59:59`
        })
      });
      const result = await response.json();

      // Filter data based on sample type
      let filteredData = result.data || [];
      if (sampleType === 'daily') {
        const dailyData: { [key: string]: any } = {};
        filteredData.forEach((row: any) => {
          const date = new Date(row.timestamp).toDateString();
          if (!dailyData[date] || new Date(row.timestamp) > new Date(dailyData[date].timestamp)) {
            dailyData[date] = row;
          }
        });
        filteredData = Object.values(dailyData);
      } else if (sampleType === 'hourly') {
        const hourlyData: { [key: string]: any } = {};
        filteredData.forEach((row: any) => {
          const hour = new Date(row.timestamp).toISOString().slice(0, 13);
          if (!hourlyData[hour] || new Date(row.timestamp) > new Date(hourlyData[hour].timestamp)) {
            hourlyData[hour] = row;
          }
        });
        filteredData = Object.values(hourlyData);
      } else if (sampleType === 'weekly') {
        const weeklyData: { [key: string]: any } = {};
        const getWeekKey = (ts: string) => {
          const d = new Date(ts);
          const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          const dayNum = date.getUTCDay() || 7; // Monday=1..Sunday=7
          const monday = new Date(date);
          monday.setUTCDate(date.getUTCDate() + (1 - dayNum));
          const yearStart = new Date(Date.UTC(monday.getUTCFullYear(), 0, 1));
          const weekNo = Math.ceil((((monday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
          return `${monday.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
        };

        filteredData.forEach((row: any) => {
          const weekKey = getWeekKey(row.timestamp);
          // keep the earliest record in that week (so mid-week readings like 06-11 are not overridden by later days)
          if (!weeklyData[weekKey] || new Date(row.timestamp) < new Date(weeklyData[weekKey].timestamp)) {
            weeklyData[weekKey] = row;
          }
        });
        filteredData = Object.values(weeklyData);
      } else if (sampleType === 'monthly') {
        const monthlyData: { [key: string]: any } = {};
        filteredData.forEach((row: any) => {
          const d = new Date(row.timestamp);
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          // keep earliest record in the month
          if (!monthlyData[monthKey] || new Date(row.timestamp) < new Date(monthlyData[monthKey].timestamp)) {
            monthlyData[monthKey] = row;
          }
        });
        filteredData = Object.values(monthlyData);
      }

      setSwitchReportData(filteredData);
    } catch (err) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showSwitchData) {
      fetchSwitchData();
    }
  }, [showSwitchData, selectedBreaker, startDate, endDate, sampleType, breakerDataPick]);

  const formatTimestamp = (ts: string) => {
    if (!ts) return "--";
    const date = new Date(ts);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const generatePDF = () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const dateTime = `${date} ${time}`;

    const element = reportRef.current;
    if (!element) return;

    html2canvas(element, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`report_${dateTime}.pdf`);
    });
  };

  function setAlert() {
    setShowAlert(true);
    SetshowSwitchData(false);
  }

  function toggleSwitchReport() {
    SetshowSwitchData(true);
    setShowAlert(false);
  }

  return (
    <div className="billing-screen">
      <div className="billing-header">
        <div className="header-content">
          <div className="abb-logo">
            <div className="logo-circle">
              <span className="logo-text-circle">ABB</span>
            </div>
          </div>
          <h1>Reports Dashboard</h1>
          <p className="subtitle" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>ABB Smart Power Digital Solutions - Site Caesarea</p>
        </div>
      </div>

      <div className="billing-controls" style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '1.2rem',
        padding: '1.6rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '1.5rem'
      }}>
        <div className="control-group" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className={`control-btn ${showAlert ? 'active' : ''}`}
            onClick={setAlert}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', height: '36px', margin: 0 }}
          >
            📊 Alerts
          </button>
          <button
            className={`control-btn ${showSwitchData ? 'active' : ''}`}
            onClick={toggleSwitchReport}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', height: '36px', margin: 0 }}
          >
            ⚡ Switch
          </button>
        </div>

        <div style={{ height: '36px', width: '1px', backgroundColor: '#dee2e6' }}></div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 500 }}>Breaker</label>
          <select
            value={selectedBreaker}
            onChange={(e) => setSelectedBreaker(e.target.value)}
            className="control-select"
            disabled={showAlert}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem', height: '36px', minWidth: '140px', border: '1px solid #ced4da', borderRadius: '4px', opacity: showAlert ? 0.5 : 1, cursor: showAlert ? 'not-allowed' : 'pointer' }}
          >
            <option value="">All Breakers</option>
            {breakerList.map((curr) => (
              <option key={curr.id} value={curr.id}>
                {curr.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 500 }}>Data Type</label>
          <select
            value={breakerDataPick}
            onChange={(e) => setBbreakerDataPick(e.target.value)}
            className="control-select"
            disabled={showAlert}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem', height: '36px', minWidth: '140px', border: '1px solid #ced4da', borderRadius: '4px', opacity: showAlert ? 0.5 : 1, cursor: showAlert ? 'not-allowed' : 'pointer' }}
          >
            <option value="">Select Type</option>
            <option value={breakerData.ActiveEnergy}>{breakerData.ActiveEnergy}</option>
            <option value={breakerData.ActivePower}>{breakerData.ActivePower}</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 500 }}>Sample</label>
          <select
            value={sampleType}
            onChange={(e) => setSampleType(e.target.value)}
            className="control-select"
            disabled={showAlert}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem', height: '36px', minWidth: '120px', border: '1px solid #ced4da', borderRadius: '4px', opacity: showAlert ? 0.5 : 1, cursor: showAlert ? 'not-allowed' : 'pointer' }}
          >
            <option value="daily">Daily</option>
            <option value="hourly">Hourly</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div style={{ height: '36px', width: '1px', backgroundColor: '#dee2e6' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 500 }}>From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '0.4rem 0.6rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.85rem',
                height: '36px',
                minWidth: '140px'
              }}
            />
          </div>

          <div style={{ marginTop: '1.2rem', fontSize: '0.85rem', color: '#6c757d' }}>→</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 500 }}>To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '0.4rem 0.6rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.85rem',
                height: '36px',
                minWidth: '140px'
              }}
            />
          </div>
        </div>

        <div style={{ height: '36px', width: '1px', backgroundColor: '#dee2e6' }}></div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            className="export-btn"
            onClick={generatePDF}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1.2rem', height: '36px', margin: 0 }}
          >
            📄 PDF
          </button>
        </div>
      </div>

      <div ref={reportRef}>
        {showAlert && (
          <div className="data-table-section">
            <div className="table-header">
              <h3>Alerts Report</h3>
              <span className="table-info">{data.length} alerts found | Period: {startDate} to {endDate}</span>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Alarm ID</th>
                    <th>Type</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {data
                    .filter(alert => {
                      if (!startDate || !endDate) return true;
                      const alertDate = new Date(alert.timestamp).toISOString().split('T')[0];
                      return alertDate >= startDate && alertDate <= endDate;
                    })
                    .map((alert) => (
                      <tr key={alert.id}>
                        <td>{alert.id}</td>
                        <td>{alert.alarmId}</td>
                        <td>
                          <span className="rate-badge standard">{alert.alert_type}</span>
                        </td>
                        <td>{alert.alert_message}</td>
                        <td>
                          <span className={`rate-badge ${alert.alertAck ? 'off-peak' : 'peak'}`}>
                            {alert.alertAck ? "✓ ACK" : "⚠ Not Ack"}
                          </span>
                        </td>
                        <td className="timestamp-cell">
                          {formatTimestamp(alert.timestamp)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showSwitchData && (
          <div className="data-table-section">
            <div className="table-header">
              <h3>Switch Report</h3>
              <span className="table-info">Period: {startDate} to {endDate} | Breaker: {selectedBreaker || 'Not Selected'} | Data: {breakerDataPick || 'Not Selected'}</span>
            </div>

            <div className="table-container">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  <h3>🌀 Loading...</h3>
                  <p>Updating data, please wait</p>
                </div>
              ) : !selectedBreaker || !breakerDataPick ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#E31E24', backgroundColor: '#fff5f5', border: '1px solid #E31E24', borderRadius: '8px' }}>
                  <h3>⚠️ Selection Required</h3>
                  <p>Please select both Breaker and Data Type to view the report</p>
                </div>
              ) : switchReportData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  <h3>No Data Available</h3>
                  <p>No data found for the selected date range</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Breaker ID</th>
                      <th>Name</th>
                      <th>Data Type</th>
                      <th>Value</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {switchReportData
                      .map((row, index) => {
                        const breakerInfo = breakerList.find(b => b.id == selectedBreaker);

                        return (
                          <tr key={index}>
                            <td>{selectedBreaker}</td>
                            <td>{breakerInfo?.name || `Q${selectedBreaker}`}</td>
                            <td>
                              <span className="rate-badge standard">{breakerDataPick}</span>
                            </td>
                            <td className="consumption-value">
                              {breakerDataPick === 'ActiveEnergy' ? row.ActiveEnergy : row.ActivePower} {breakerDataPick === 'ActiveEnergy' ? 'kWh' : 'kW'}
                            </td>
                            <td className="timestamp-cell">
                              {formatTimestamp(row.timestamp)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Report;
import './Alerts.css';
import { getAlerts, getBreakerNames, getTime } from '../../Types/CombinedData';
import { useEffect, useState, useMemo } from 'react';
import { formatSqlTime, type AckTimestamp, type AlertInterface } from '../../Types/Alerts'
import { useAlerts } from '../../contexts';
import { API_ENDPOINTS } from '../../config/api';
import { Line } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


export const Alerts = () => {
  const [alerts, setAlerts] = useState<AlertInterface[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<AlertInterface[]>([]);
  const [names, setNames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('30');
  const ackBy = sessionStorage.getItem('username');
  const [ackDataBy, setAckDataBy] = useState<AckTimestamp[]>([]);
  const { refreshAlerts } = useAlerts();

  const readAllAckData = async () => {
    const res = await fetch(API_ENDPOINTS.ackData);
    const req = await res.json();
    setAckDataBy(req.data);
  };

  const ackByFb = async (ackId: number) => {
    try {
      const res = await fetch(API_ENDPOINTS.ackBy, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ackId, ackBy }),
      });

      const data = await res.json();

      if (!data.data) {
        alert(data.message || "Alarm can't be acknowledged");
      } else {
        const confiremed = window.confirm("Are you sure you want to acknowledge this alert?");
        if (confiremed) {
          fetchAlerts();
          refreshAlerts(); // עדכון מספר ההתראות בקונטקסט
        }
      }
    } catch (err) {
      // Error handled silently
      alert("Something went wrong. Please try again.");
    }

  };

  const ackAlarm = async (alertType: string, alertMsg: string, alertId: number) => {
    try {
      const ackUpdate = 1;
      const res = await fetch(API_ENDPOINTS.ack, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertType, alertMsg, alertId, ackUpdate }),
      });
      const data = await res.json();
      if (!data.data) {
        alert(data.message || "Alarm can't be acknowledged");
      }
    } catch (err) {
      // Error handled silently
      alert("Something went wrong. Please try again.");
    }
  };

  // 1️⃣ Extract fetchAlerts so it can be called anywhere
  const fetchAlerts = async () => {
    try {
      const response = await getAlerts();
      setAlerts(response.data ?? []);
    } catch (err) {
      // Error handled silently
    }

    try {
      const responseNames = await getBreakerNames();
      setNames(responseNames ?? []);
    } catch (err) {
      // Error handled silently
    } finally {
      setLoading(false);

      readAllAckData();
    }
  };

  // Initialize dates
  useEffect(() => {
    const today = new Date();
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setStartDate(lastMonth.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  // Filter alerts when data or dates change
  useEffect(() => {
    if (startDate && endDate) {
      const filtered = alerts.filter(alert => {
        const alertDate = new Date(alert.timestamp).toISOString().split('T')[0];
        return alertDate >= startDate && alertDate <= endDate;
      });
      setFilteredAlerts(filtered);
    } else {
      setFilteredAlerts(alerts);
    }
  }, [alerts, startDate, endDate]);

  // 2️⃣ Run on mount + interval
  useEffect(() => {
    fetchAlerts(); // initial fetch
    const intervalId = setInterval(fetchAlerts, 60000); // every 60 sec
    return () => clearInterval(intervalId);
  }, []);


  const getRowColor = (type: string) => {
    switch (type) {
      case 'tripped':
        return '#ff4d4f20'; // light red with transparency
      case 'CommStatus - Error':
        return '#faad1420'; // light orange
      case 'ProtectionInstTrip':
        return '#1890ff20'; // light blue
      default:
        return '#ffffff10'; // light gray
    }
  };

  function formatTimestampUTC(ts: string) {
    const date = new Date(ts);

    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();

    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds = String(date.getUTCSeconds()).padStart(2, "0");

    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  }


  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    if (value !== 'custom') {
      const today = new Date();
      const days = parseInt(value);
      const start = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    }
  };

  const activeAlerts = useMemo(() =>
    filteredAlerts.filter(alert => !alert.alertAck).length, [filteredAlerts]
  );
  const acknowledgedAlerts = useMemo(() =>
    filteredAlerts.filter(alert => alert.alertAck).length, [filteredAlerts]
  );
  const totalAlerts = filteredAlerts.length;

  // Chart data for last 30 days
  const chartData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    const dailyCounts = last30Days.map(date => {
      return alerts.filter(alert =>
        new Date(alert.timestamp).toISOString().split('T')[0] === date
      ).length;
    });

    return {
      labels: last30Days.map(date => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Daily Alerts',
        data: dailyCounts,
        borderColor: '#FF6900',
        backgroundColor: 'rgba(255, 105, 0, 0.1)',
        borderWidth: 3,
        fill: false,
        tension: 0.4
      }]
    };
  }, [alerts]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1E1E1E',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#E5E5E5' },
        ticks: { color: '#666666' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#666666' }
      }
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();

      // ABB Logo
      doc.setFillColor(227, 30, 36);
      doc.rect(22, 12, 16, 16, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('ABB', 26, 22);

      // Header
      doc.setFontSize(20);
      doc.setTextColor(30, 62, 80);
      doc.text('Alerts Report', 50, 25);

      doc.setFontSize(12);
      doc.setTextColor(127, 140, 141);
      doc.text('ABB Smart Power Digital Solutions - Site Caesarea', 20, 35);

      // Report details
      doc.setFontSize(10);
      doc.setTextColor(44, 62, 80);
      doc.text(`Report Period: ${new Date(startDate || '').toLocaleDateString()} - ${new Date(endDate || '').toLocaleDateString()}`, 20, 50);
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString('en-GB', { hour12: false })}`, 20, 58);

      // Summary
      doc.setFillColor(248, 249, 250);
      doc.rect(20, 65, 170, 25, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary:', 25, 75);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Alerts: ${totalAlerts}`, 25, 83);
      doc.text(`Active Alerts: ${activeAlerts}`, 100, 83);
      doc.text(`Acknowledged: ${acknowledgedAlerts}`, 25, 91);

      // Table - show active alerts first
      const sortedAlerts = [...filteredAlerts].sort((a, b) => {
        if (a.alertAck === b.alertAck) return 0;
        return a.alertAck ? 1 : -1; // Active alerts first
      });

      const tableData = sortedAlerts.slice(0, 20).map(alert => {
        const ackTimestamp = ackDataBy.find(item => item.ackId === alert.id)?.timestamp;
        return [
          names[alert.alarmId - 1]?.name || 'Unknown',
          alert.alert_type,
          alert.alert_message,
          new Date(alert.timestamp).toLocaleDateString(),
          alert.alertAck ? 'Yes' : 'No',
          ackTimestamp ? new Date(ackTimestamp).toLocaleString() : '--'
        ];
      });

      autoTable(doc, {
        head: [['Breaker', 'Type', 'Message', 'Date', 'Ack', 'Ack Timestamp']],
        body: tableData,
        startY: 100,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [255, 105, 0] }
      });

      const fileName = `Alerts_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

    } catch (error) {
      // Error handled silently
      alert('Error generating PDF. Please try again.');
    }
  };

  return (
    <div className="billing-screen">
      <div className="billing-header">
        <div className="header-content">
          <div className="abb-logo">
            <div className="logo-circle">
              <span className="logo-text-circle">ABB</span>
            </div>
          </div>
          <h1>Alerts & Monitoring Dashboard</h1>
          <p className="subtitle">ABB Smart Power Digital Solutions - Site Caesarea</p>
        </div>
      </div>

      <div className="billing-controls">
        <div className="control-card">
          <label>Time Period</label>
          <select value={dateRange} onChange={(e) => handleDateRangeChange(e.target.value)}>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {dateRange === 'custom' && (
          <>
            <div className="control-card">
              <label>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="control-card">
              <label>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="control-card">
          <button
            className="refresh-btn"
            onClick={fetchAlerts}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-icon">🚨</div>
          <div className="metric-content">
            <h3>{activeAlerts}</h3>
            <p>Active Alerts</p>
            <span className="metric-change negative">Requires Attention</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <h3>{acknowledgedAlerts}</h3>
            <p>Acknowledged Alerts</p>
            <span className="metric-change positive">Resolved</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <h3>{totalAlerts}</h3>
            <p>Total Alerts</p>
            <span className="metric-change">In Selected Period</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <h3>{Math.round((acknowledgedAlerts / totalAlerts) * 100) || 0}%</h3>
            <p>Resolution Rate</p>
            <span className="metric-change positive">Efficiency</span>
          </div>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-card main-chart">
          <div className="chart-header">
            <h3>Alerts Trend (Last 30 Days)</h3>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#FF6900' }}></span>
                Daily Alerts Count
              </span>
            </div>
          </div>
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="data-table-section">
        <div className="table-header">
          <h3>Detailed Alerts Data</h3>
          <button className="export-btn" onClick={exportToPDF}>Export PDF</button>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Breaker Name</th>
                <th>Type</th>
                <th>Message</th>
                <th>Timestamp</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {[...filteredAlerts]
                .sort((a, b) => {
                  if (a.alertAck === b.alertAck) return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                  return a.alertAck ? 1 : -1; // Active alerts first
                })
                .map((alert) => {
                  const ackTimestamp = ackDataBy.find(item => item.ackId === alert.id)?.timestamp;
                  return (
                    <tr key={alert.id} style={{ backgroundColor: !alert.alertAck ? '#ff4d4f20' : 'transparent' }}>
                      <td>{names[alert.alarmId - 1]?.name || 'Unknown'}</td>
                      <td>
                        <span className={`rate-badge ${alert.alert_type === 'tripped' ? 'peak' : alert.alert_type === 'CommStatus - Error' ? 'standard' : 'off-peak'}`}>
                          {alert.alert_type}
                        </span>
                      </td>
                      <td style={{ maxWidth: '200px', wordWrap: 'break-word' }}>{alert.alert_message}</td>
                      <td>{new Date(alert.timestamp).toLocaleString()}</td>
                      <td>
                        {alert.alertAck ? (
                          <div className="ack-badge">
                            <span className="ack-icon">✔</span>
                            <span className="ack-text">
                              {ackDataBy.find(item => item.ackId === alert.id)?.ackBy || "--"}
                            </span>
                          </div>
                        ) : (
                          <div className="not-ack-badge">
                            🚨 ACTIVE
                          </div>
                        )}
                      </td>
                      <td>
                        {alert.alertAck ? (
                          <div className="ack-timestamp">
                            {ackTimestamp ? new Date(ackTimestamp).toLocaleString() : '--'}
                          </div>
                        ) : (
                          <button
                            className="export-btn"
                            onClick={() => {
                              ackAlarm(alert.alert_type, alert.alert_message, alert.id);
                              ackByFb(alert.id);
                            }}
                          >
                            Acknowledge
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

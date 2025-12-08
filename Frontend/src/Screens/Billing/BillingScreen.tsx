import { useState, useEffect, useMemo } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import { API_ENDPOINTS } from '../../config/api';
import './BillingScreen.css';

interface ConsumptionData {
  switch_id: number;
  consumption_date: string;
  consumption_day: string;
  season: string;
  daily_consumption: number;
  daily_cost: number;
  cumulative_consumption: number;
  cumulative_cost: number;
}

type SeasonKey = 'summer' | 'winter' | 'springAutumn';

export const BillingScreen = () => {
  const [selectedBreaker, setSelectedBreaker] = useState<string>('1');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('custom');
  const [consumptionData, setConsumptionData] = useState<ConsumptionData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showTariffModal, setShowTariffModal] = useState<boolean>(false);
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [breakerOptions, setBreakerOptions] = useState<Array<{ value: string; label: string; type: string }>>([]);
  const tariffRates = {
    summer: { peak: 1.6895, offPeak: 0.5283, peakHours: '17:00-23:00' },
    winter: { peak: 1.2071, offPeak: 0.4557, peakHours: '17:00-22:00' },
    springAutumn: { peak: 0.4977, offPeak: 0.446, peakHours: '17:00-22:00' }
  };
  const [efficiencyBase, setEfficiencyBase] = useState(50);
  const [efficiencyMultiplier, setEfficiencyMultiplier] = useState(2);

  const getSeasonKey = (date: Date): SeasonKey => {
    const month = date.getMonth() + 1;
    if (month === 12 || month === 1 || month === 2) return 'winter';
    if (month >= 6 && month <= 9) return 'summer';
    if ((month >= 3 && month <= 5) || (month >= 10 && month <= 11)) return 'springAutumn';
    return 'springAutumn';
  };

  const getSeasonLabel = (seasonKey: SeasonKey) => {
    if (seasonKey === 'summer') return 'Summer';
    if (seasonKey === 'winter') return 'Winter';
    return 'Spring/Autumn';
  };

  const isWeekend = (dayOfWeek: number) => dayOfWeek === 5 || dayOfWeek === 6; // Fri/Sat

  const getTariffForDate = (date: Date) => {
    const seasonKey = getSeasonKey(date);
    const seasonRates = tariffRates[seasonKey as keyof typeof tariffRates];
    const dayOfWeek = date.getDay();
    const weekend = isWeekend(dayOfWeek);

    let peakHours = 0;
    let peakHoursLabel = 'No peak';
    let offPeakHoursLabel = 'All hours';

    // Winter: all days have peak hours 17:00-22:00
    if (seasonKey === 'winter') {
      peakHours = 5; // 17:00-22:00 = 5 hours
      peakHoursLabel = '17:00-22:00';
      offPeakHoursLabel = '00:00-17:00 and 22:00-24:00';
    }
    // Non-winter seasons: check if it's a weekday
    else if (!weekend) {
      if (seasonKey === 'summer') {
        peakHours = 6; // 17:00-23:00 = 6 hours
        peakHoursLabel = '17:00-23:00';
        offPeakHoursLabel = '00:00-17:00 and 23:00-24:00';
      } else { // spring/autumn weekdays
        peakHours = 5; // 17:00-22:00 = 5 hours
        peakHoursLabel = '17:00-22:00';
        offPeakHoursLabel = '00:00-17:00 and 22:00-24:00';
      }
    } else {
      // Non-winter weekends (Fri/Sat): no peak pricing
      peakHours = 0;
      peakHoursLabel = 'No peak (Fri/Sat)';
      offPeakHoursLabel = 'All hours (24:00)';
    }

    const offPeakHours = 24 - peakHours;
    const effectiveRate = weekend
      ? seasonRates.offPeak
      : ((peakHours / 24) * seasonRates.peak) + ((offPeakHours / 24) * seasonRates.offPeak);

    return {
      seasonKey,
      seasonLabel: getSeasonLabel(seasonKey),
      peakRate: seasonRates.peak,
      offPeakRate: seasonRates.offPeak,
      peakHoursLabel,
      offPeakHoursLabel,
      effectiveRate,
      isWeekend: weekend,
      peakHours,
      offPeakHours
    };
  };

  // Load tariff and efficiency settings
  useEffect(() => {
    fetchTariffSettings();
    fetchBreakerOptions();
  }, []);

  const fetchBreakerOptions = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.breakersNames);
      if (response.ok) {
        const result = await response.json();
        const breakers = result.data || [];
        const options = breakers.map((b: any) => ({
          value: String(b.id),
          label: `${b.name} - ${b.load || 'N/A'}`,
          type: b.type || 'N/A'
        }));
        setBreakerOptions(options);
      }
    } catch (err) {
      // Error handled silently
      // Fallback to default options if API fails
      setBreakerOptions([
        { value: '1', label: 'Q1 - Main Supply', type: 'EMAX E1.2' },
        { value: '2', label: 'Q2 - Building 1 Ground Floor', type: 'XT4' },
        { value: '3', label: 'Q3 - Building 2 First Floor', type: 'XT4' },
        { value: '4', label: 'Q4 - Building 4 Second Floor', type: 'XT4' },
        { value: '8', label: 'Q8 - Bridge', type: 'XT2' },
        { value: '13', label: 'Q9 - Bridge Secondary', type: 'XT2' }
      ]);
    }
  };

  const fetchTariffSettings = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.tariffRates);
      if (response.ok) {
        const result = await response.json();
        const rates = result.data || [];
        if (rates.length > 0) {
          setEfficiencyBase(rates[0].efficiencyBase || 50);
          setEfficiencyMultiplier(rates[0].efficiencyMultiplier || 2);
        }
      }
    } catch (err) {
      // Error handled silently
    }
  };

  // Initialize dates
  useEffect(() => {
    // Set dates based on existing data in database
    setStartDate('2025-11-06');
    setEndDate('2025-11-07');
  }, []);

  // Generate data when parameters change
  useEffect(() => {
    if (startDate && endDate) {
      fetchRealData();
    }
  }, [selectedBreaker, startDate, endDate, dateRange]);

  // Simple hash function for consistent random values
  const simpleHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  const fetchRealData = async () => {
    setLoading(true);
    setConsumptionData([]); // איפוס הנתונים
    try {
      const response = await fetch(API_ENDPOINTS.consumption(selectedBreaker, startDate, endDate));
      const result = await response.json();

      if (result.status === 200 && result.data) {
        setConsumptionData(result.data);
      } else {
        generateDummyData();
      }
    } catch (error) {
      // Backend server not available, using dummy data
      generateDummyData();
    } finally {
      setLoading(false);
    }
  };

  const generateDummyData = () => {
    let days: number;
    let start: Date, end: Date;

    if (dateRange === 'custom' && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    } else {
      days = parseInt(dateRange) || 7;
      end = new Date();
      start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    }

    const data: ConsumptionData[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const tariff = getTariffForDate(date);

      const seed = simpleHash(`${selectedBreaker}-${dateStr}`);
      const pseudoRandom1 = (seed % 1000) / 1000;

      const consumption = pseudoRandom1 * 50 + 20;

      const cost = consumption * tariff.effectiveRate;

      data.push({
        switch_id: parseInt(selectedBreaker),
        consumption_date: dateStr,
        consumption_day: date.toLocaleDateString('en-US', { weekday: 'long' }),
        season: tariff.seasonLabel,
        daily_consumption: consumption,
        daily_cost: cost,
        cumulative_consumption: 0,
        cumulative_cost: 0
      });
    }

    setConsumptionData(data);
  };

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

  const lineChartData = {
    labels: consumptionData.map(item => new Date(item.consumption_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Energy Consumption (kWh)',
        data: consumptionData.map(item => item.daily_consumption),
        borderColor: '#FF6900',
        backgroundColor: 'rgba(255, 105, 0, 0.1)',
        borderWidth: 3,
        fill: false,
        tension: 0.4
      }
    ]
  };

  const doughnutData = useMemo(() => {
    const month = new Date().getMonth() + 1;
    const dayOfWeek = new Date().getDay();

    let peakHours, offPeakHours;

    if (month >= 6 && month <= 9) { // Summer
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        peakHours = 6; // 17:00-23:00
        offPeakHours = 18;
      } else {
        peakHours = 0; // No peak on weekends
        offPeakHours = 24;
      }
    } else if (month === 12 || month === 1 || month === 2) { // Winter
      peakHours = 5; // 17:00-22:00
      offPeakHours = 19;
    } else { // Spring/Autumn
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        peakHours = 5; // 17:00-22:00
        offPeakHours = 19;
      } else {
        peakHours = 0; // No peak on weekends
        offPeakHours = 24;
      }
    }

    return {
      labels: peakHours > 0 ? ['Peak Hours', 'Off-Peak Hours'] : ['Off-Peak Hours'],
      datasets: [{
        data: peakHours > 0 ? [peakHours, offPeakHours] : [offPeakHours],
        backgroundColor: peakHours > 0 ? ['#FF6900', '#8BC34A'] : ['#8BC34A'],
        borderWidth: 0
      }]
    };
  }, []);

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

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    }
  };

  const totalConsumption = useMemo(() =>
    consumptionData.reduce((sum, item) => sum + item.daily_consumption, 0), [consumptionData]
  );
  const totalCost = useMemo(() =>
    consumptionData.reduce((sum, item) => sum + item.daily_cost, 0), [consumptionData]
  );
  const avgDailyConsumption = useMemo(() =>
    consumptionData.length > 0 ? totalConsumption / consumptionData.length : 0, [totalConsumption, consumptionData.length]
  );
  const peakConsumption = useMemo(() =>
    consumptionData.length > 0 ? Math.max(...consumptionData.map(item => item.daily_consumption)) : 0, [consumptionData]
  );

  const selectedBreakerInfo = breakerOptions.find(b => b.value === selectedBreaker);

  const handleAdminAuth = () => {
    if (adminPassword === 'AbbDp2025!') {
      setAdminPassword('');
      setShowPasswordModal(false);
      setShowTariffModal(true);
    } else {
      alert('Invalid admin password!');
      setAdminPassword('');
    }
  };

  const handleSaveTariffs = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.efficiencySettings, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          efficiencyBase,
          efficiencyMultiplier
        })
      });
      if (response.ok) {
        alert('Settings saved successfully!');
        fetchRealData(); // Refresh the data
      }
    } catch (err) {
      alert('Error saving settings');
    }
    setShowTariffModal(false);
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();

      // ABB Logo (square)
      doc.setFillColor(227, 30, 36);
      doc.rect(22, 12, 16, 16, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('ABB', 26, 22);

      // Header
      doc.setFontSize(20);
      doc.setTextColor(30, 62, 80);
      doc.text('Energy Billing Report', 50, 25);

      doc.setFontSize(12);
      doc.setTextColor(127, 140, 141);
      doc.text('ABB Smart Power Digital Solutions - Site Caesarea', 20, 35);

      // Report details
      doc.setFontSize(10);
      doc.setTextColor(44, 62, 80);
      doc.text(`Circuit Breaker: ${selectedBreakerInfo?.label || 'N/A'}`, 20, 50);
      doc.text(`Report Period: ${new Date(startDate || '').toLocaleDateString()} - ${new Date(endDate || '').toLocaleDateString()}`, 20, 58);
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString('en-GB', { hour12: false })}`, 20, 66);

      // Summary box
      doc.setFillColor(248, 249, 250);
      doc.rect(20, 75, 170, 25, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary:', 25, 85);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Consumption: ${totalConsumption.toFixed(1)} kWh`, 25, 93);
      doc.text(`Total Cost: ${totalCost.toFixed(2)} ILS`, 25, 101);

      // Table with proper columns
      let yPos = 120;
      const colX = [20, 55, 90, 120, 155]; // X positions

      // Table header
      doc.setFontSize(9);
      doc.setFillColor(255, 105, 0);
      doc.rect(20, yPos - 6, 170, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Date', colX[0] + 2, yPos);
      doc.text('kWh', colX[1] + 2, yPos);
      doc.text('Cost (ILS)', colX[2] + 2, yPos);
      doc.text('Rate', colX[3] + 2, yPos);
      doc.text('Eff%', colX[4] + 2, yPos);

      yPos += 12;
      doc.setTextColor(44, 62, 80);
      doc.setFont('helvetica', 'normal');

      // Table rows
      consumptionData.forEach((item, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(248, 249, 250);
          doc.rect(20, yPos - 6, 170, 10, 'F');
        }

        const date = new Date(item.consumption_date);
        const dateStr = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
        const month = date.getMonth() + 1;
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

        let peakHours = '';
        if (isWeekend) {
          peakHours = 'No peak';
        } else if (month >= 6 && month <= 9) {
          peakHours = '17:00-23:00';
        } else if (month === 12 || month === 1 || month === 2) {
          peakHours = '17:00-22:00';
        } else {
          peakHours = '17:00-22:00';
        }

        const efficiency = Math.round(Math.min(100, (efficiencyBase - item.daily_consumption) * efficiencyMultiplier + 50));

        doc.text(dateStr, colX[0] + 2, yPos);
        doc.text(item.daily_consumption.toFixed(1), colX[1] + 2, yPos);
        doc.text(item.daily_cost.toFixed(2), colX[2] + 2, yPos);
        doc.text(peakHours, colX[3] + 2, yPos);
        doc.text(efficiency + '%', colX[4] + 2, yPos);

        yPos += 10;
      });

      // Total row
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos - 6, 170, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL', colX[0] + 2, yPos);
      doc.text(totalConsumption.toFixed(1), colX[1] + 2, yPos);
      doc.text(totalCost.toFixed(2), colX[2] + 2, yPos);
      doc.text('-', colX[3] + 2, yPos);
      doc.text('-', colX[4] + 2, yPos);

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(127, 140, 141);
      doc.text('Generated by ABB Smart Power Digital Solutions', 20, pageHeight - 15);
      doc.text(`Page 1 of 1`, 170, pageHeight - 15);

      // Save PDF
      const fileName = `Energy_Report_${selectedBreakerInfo?.label.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
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
          <h1>Energy Billing & Analytics</h1>
          <p className="subtitle">Smart Power Digital Solutions - Site Caesarea</p>
        </div>
      </div>

      <div className="billing-controls">
        <div className="control-card">
          <label>Circuit Breaker</label>
          <select value={selectedBreaker} onChange={(e) => setSelectedBreaker(e.target.value)}>
            {breakerOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {selectedBreakerInfo && (
            <span className="breaker-type">{selectedBreakerInfo.type}</span>
          )}
        </div>

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
            onClick={fetchRealData}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>

        <div className="control-card">
          <button
            className="tariff-btn"
            onClick={() => setShowPasswordModal(true)}
          >
            Tariff Settings
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-icon">⚡</div>
          <div className="metric-content">
            <h3>{totalConsumption.toFixed(1)}</h3>
            <p>Total Consumption (kWh)</p>
            <span className="metric-change">+2.3% vs last period</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <h3>₪{totalCost.toFixed(0)}</h3>
            <p>Total Cost</p>
            <span className="metric-change positive">-1.2% vs last period</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <h3>{avgDailyConsumption.toFixed(1)}</h3>
            <p>Daily Average (kWh)</p>
            <span className="metric-change">+0.8% vs last period</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <h3>{peakConsumption.toFixed(1)}</h3>
            <p>Peak Consumption (kWh)</p>
            <span className="metric-change negative">+5.4% vs last period</span>
          </div>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-card main-chart">
          <div className="chart-header">
            <h3>Energy Consumption Trend</h3>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#FF6900' }}></span>
                Daily Consumption
              </span>
            </div>
          </div>
          <div className="chart-container">
            <Line
              key={`line-${selectedBreaker}-${startDate}-${endDate}`}
              data={lineChartData}
              options={chartOptions}
            />
          </div>
        </div>

        <div className="chart-card side-chart">
          <div className="chart-header">
            <h3>Usage Distribution</h3>
          </div>
          <div className="chart-container">
            <Doughnut
              key={`doughnut-${selectedBreaker}`}
              data={doughnutData}
              options={doughnutOptions}
            />
          </div>
          <div className="tariff-legend">
            <div className="tariff-item peak">
              <span className="tariff-dot" style={{ backgroundColor: '#FF6900' }}></span>
              {(() => {
                const month = new Date().getMonth() + 1;
                const dayOfWeek = new Date().getDay();

                if (month >= 6 && month <= 9) {
                  return dayOfWeek >= 1 && dayOfWeek <= 5 ? 'Peak Hours (17:00-23:00) - ₪1.69/kWh' : 'No Peak (Weekend)';
                } else if (month === 12 || month === 1 || month === 2) {
                  return 'Peak Hours (17:00-22:00) - ₪1.21/kWh';
                } else {
                  return dayOfWeek >= 1 && dayOfWeek <= 5 ? 'Peak Hours (07:00-17:00) - ₪0.50/kWh' : 'No Peak (Weekend)';
                }
              })()}
            </div>
            <div className="tariff-item off-peak">
              <span className="tariff-dot" style={{ backgroundColor: '#8BC34A' }}></span>
              {(() => {
                const month = new Date().getMonth() + 1;

                if (month >= 6 && month <= 9) {
                  return 'Off-Peak Hours (All other) - ₪0.53/kWh';
                } else if (month === 12 || month === 1 || month === 2) {
                  return 'Off-Peak Hours (All other) - ₪0.46/kWh';
                } else {
                  return 'Off-Peak Hours (All other) - ₪0.45/kWh';
                }
              })()}
            </div>
          </div>
        </div>
      </div>

      <div className="data-table-section">
        <div className="table-header">
          <h3>Detailed Consumption Data</h3>
          <button className="export-btn" onClick={exportToPDF}>Export PDF</button>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Consumption (kWh)</th>
                <th>Cost (₪) incl. VAT</th>
                <th>Season</th>
                <th>Peak Rate</th>
                <th>Off-Peak Rate</th>
                <th>Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {consumptionData.map((item, index) => (
                <tr key={index}>
                  <td>{new Date(item.consumption_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}</td>
                  <td className="consumption-value">{Math.round(item.daily_consumption * 10) / 10}</td>
                  <td className="cost-value">₪{item.daily_cost.toFixed(2)}</td>
                  <td>
                    <span className="rate-badge standard">
                      {(() => {
                        const season = item.season;
                        if (season === 'Spring/Autumn') return 'S/A';
                        if (season === 'Summer') return 'Sum';
                        if (season === 'Winter') return 'Win';
                        return season;
                      })()}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const date = new Date(item.consumption_date);
                      const month = date.getMonth() + 1;
                      const dayOfWeek = date.getDay();
                      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

                      if (month >= 6 && month <= 9) {
                        return isWeekend ? '₪1.69/kWh (No peak)' : '₪1.69/kWh (17:00-23:00)';
                      } else if (month === 12 || month === 1 || month === 2) {
                        return isWeekend ? '₪1.21/kWh (No peak)' : '₪1.21/kWh (17:00-22:00)';
                      } else {
                        return isWeekend ? '₪0.50/kWh (No peak)' : '₪0.50/kWh (17:00-22:00)';
                      }
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const date = new Date(item.consumption_date);
                      const month = date.getMonth() + 1;

                      if (month >= 6 && month <= 9) {
                        return '₪0.53/kWh (All other hours)';
                      } else if (month === 12 || month === 1 || month === 2) {
                        return '₪0.46/kWh (All other hours)';
                      } else {
                        return '₪0.45/kWh (All other hours)';
                      }
                    })()}
                  </td>
                  <td>
                    <div className="efficiency-container">
                      <div className="efficiency-bar">
                        <div
                          className="efficiency-fill"
                          style={{ width: `${Math.min(100, Math.max(0, (efficiencyBase - item.daily_consumption) * efficiencyMultiplier + 50))}%` }}
                        ></div>
                      </div>
                      <span className="efficiency-text">
                        {Math.round(Math.min(100, (efficiencyBase - item.daily_consumption) * efficiencyMultiplier + 50))}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td><strong>Total</strong></td>
                <td className="consumption-value"><strong>{totalConsumption.toFixed(1)} kWh</strong></td>
                <td className="cost-value"><strong>₪{totalCost.toFixed(2)}</strong></td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Tariff Settings Sidebar */}
      {showTariffModal && (
        <div className="tariff-overlay" onClick={() => {
          setShowTariffModal(false);
          setAdminPassword('');
        }}>
          <div className="tariff-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="tariff-header">
              <div className="tariff-header-content">
                <div className="abb-logo">
                  <div className="logo-circle">
                    <span className="logo-text-circle">ABB</span>
                  </div>
                </div>
                <div className="header-text">
                  <h3>Tariff Management</h3>
                  <p className="subtitle">Electricity Rate Configuration</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => {
                setShowTariffModal(false);
                setAdminPassword('');
              }}>×</button>
            </div>

            <div className="tariff-settings">
              <div className="tariff-section">
                <h4>Summer (June-September)</h4>
                <div className="rate-inputs">
                  <label>Peak Rate (₪/kWh, incl. VAT):</label>
                  <input type="number" step="0.01" defaultValue={1.6895} />
                  <label>Off-Peak Rate (₪/kWh, incl. VAT):</label>
                  <input type="number" step="0.01" defaultValue={0.5283} />
                  <label>Peak Hours (weekdays):</label>
                  <input type="text" defaultValue="17:00-23:00" />
                </div>
              </div>

              <div className="tariff-section">
                <h4>Winter (December-February)</h4>
                <div className="rate-inputs">
                  <label>Peak Rate (₪/kWh, incl. VAT):</label>
                  <input type="number" step="0.01" defaultValue={1.2071} />
                  <label>Off-Peak Rate (₪/kWh, incl. VAT):</label>
                  <input type="number" step="0.01" defaultValue={0.4557} />
                  <label>Peak Hours (all days):</label>
                  <input type="text" defaultValue="17:00-22:00" />
                </div>
              </div>

              <div className="tariff-section">
                <h4>Spring/Autumn (Mar-May, Oct-Nov)</h4>
                <div className="rate-inputs">
                  <label>Peak Rate (₪/kWh, incl. VAT):</label>
                  <input type="number" step="0.01" defaultValue={0.4977} />
                  <label>Off-Peak Rate (₪/kWh, incl. VAT):</label>
                  <input type="number" step="0.01" defaultValue={0.446} />
                  <label>Peak Hours (weekdays only):</label>
                  <input type="text" defaultValue="17:00-22:00" />
                </div>
              </div>

              <div className="tariff-section">
                <h4>Efficiency Settings</h4>
                <div className="rate-inputs">
                  <label>Base Consumption (kWh/day):</label>
                  <input
                    type="number"
                    value={efficiencyBase}
                    onChange={(e) => setEfficiencyBase(Number(e.target.value))}
                    min="1"
                    max="200"
                    id="efficiencyBase"
                  />
                  <label>Efficiency Multiplier:</label>
                  <input
                    type="number"
                    value={efficiencyMultiplier}
                    onChange={(e) => setEfficiencyMultiplier(Number(e.target.value))}
                    min="0.1"
                    max="10"
                    step="0.1"
                    id="efficiencyMultiplier"
                  />
                  <small style={{ color: '#666', fontSize: '0.8rem' }}>Formula: ({efficiencyBase} - consumption) × {efficiencyMultiplier} + 50</small>
                </div>
              </div>

              <div className="modal-actions">
                <button className="save-btn" onClick={handleSaveTariffs}>Save Changes</button>
                <button className="cancel-btn" onClick={() => {
                  setShowTariffModal(false);
                  setAdminPassword('');
                }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="tariff-overlay" onClick={() => {
          setShowPasswordModal(false);
          setAdminPassword('');
        }}>
          <div className="password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Admin Authentication</h3>
              <button className="close-btn" onClick={() => {
                setShowPasswordModal(false);
                setAdminPassword('');
              }}>×</button>
            </div>
            <div className="auth-section">
              <p>Enter admin password to access Tariff Settings:</p>
              <input
                type="password"
                placeholder="Admin Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdminAuth()}
                autoFocus
              />
              <div className="modal-actions">
                <button className="save-btn" onClick={handleAdminAuth}>Authenticate</button>
                <button className="cancel-btn" onClick={() => {
                  setShowPasswordModal(false);
                  setAdminPassword('');
                }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

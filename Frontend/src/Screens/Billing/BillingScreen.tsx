import { useState, useEffect, useMemo } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import { API_ENDPOINTS } from '../../config/api';
import { useTariff } from '../../contexts/TariffContext';
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
  peak_consumption?: number;
  offpeak_consumption?: number;
  // הוסף שדה אופציונלי לדגימות שעתיות (24 ערכים)
  hourly_consumption?: number[];
  isEstimated?: boolean; // Whether the data is estimated (not all 24 hours)
}

type SeasonKey = 'summer' | 'winter' | 'springAutumn';

export const BillingScreen = () => {
  const { tariffRates, setTariffRates } = useTariff();

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
  const [efficiencyBase, setEfficiencyBase] = useState(50);
  const [efficiencyMultiplier, setEfficiencyMultiplier] = useState(2);

  // Editable tariff rates state
  // Use correct keys from DB/context
    const [summerPeak, setSummerPeak] = useState(tariffRates.summer?.peakRate ?? 0);
    const [summerOffPeak, setSummerOffPeak] = useState(tariffRates.summer?.offPeakRate ?? 0);
    const [summerHours, setSummerHours] = useState('17:00-23:00');
    const [winterPeak, setWinterPeak] = useState(tariffRates.winter?.peakRate ?? 0);
    const [winterOffPeak, setWinterOffPeak] = useState(tariffRates.winter?.offPeakRate ?? 0);
    const [winterHours, setWinterHours] = useState('17:00-22:00');
    const [springPeak, setSpringPeak] = useState(tariffRates.springAutumn?.peakRate ?? 0);
    const [springOffPeak, setSpringOffPeak] = useState(tariffRates.springAutumn?.offPeakRate ?? 0);
    const [springHours, setSpringHours] = useState('17:00-22:00');

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

  // פונקציה פשוטה שמחזירה את שעת סיום הפיק (לפי עונה ויום)
  const getPeakEndHour = (date: Date): number => {
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay();
    // שישי/שבת - אין פיק
    if (dayOfWeek === 5 || dayOfWeek === 6) return 0;
    if (month >= 6 && month <= 9) return 23; // קיץ
    if (month === 12 || month === 1 || month === 2) return 22; // חורף
    return 22; // אביב/סתיו
  };

  const getTariffForDate = (date: Date) => {
    const seasonKey = getSeasonKey(date);
    const seasonRates = tariffRates[seasonKey] || { peakRate: 0, offPeakRate: 0 };
    const dayOfWeek = date.getDay();
    const weekend = isWeekend(dayOfWeek);

    let peakHours = 0;
    let peakHoursLabel = 'No peak';
    let offPeakHoursLabel = 'All hours';


    // שימוש בפונקציה הפשוטה
    const peakEnd = getPeakEndHour(date);
    if (peakEnd === 0) {
      peakHours = 0;
      peakHoursLabel = 'No peak (Fri/Sat)';
      offPeakHoursLabel = 'All hours (24:00)';
    } else if (peakEnd === 23) {
      peakHours = 6;
      peakHoursLabel = '17:00-23:00';
      offPeakHoursLabel = '00:00-17:00 and 23:00-24:00';
    } else {
      peakHours = 5;
      peakHoursLabel = '17:00-22:00';
      offPeakHoursLabel = '00:00-17:00 and 22:00-24:00';
    }

    const offPeakHours = 24 - peakHours;
      const effectiveRate = weekend
        ? seasonRates.offPeakRate
        : ((peakHours / 24) * seasonRates.peakRate) + ((offPeakHours / 24) * seasonRates.offPeakRate);

      return {
        seasonKey,
        seasonLabel: getSeasonLabel(seasonKey),
        peakRate: seasonRates.peakRate,
        offPeakRate: seasonRates.offPeakRate,
        peakHoursLabel,
        offPeakHoursLabel,
        effectiveRate,
        isWeekend: weekend,
        peakHours,
        offPeakHours
      };

    return {
      seasonKey,
      seasonLabel: getSeasonLabel(seasonKey),
      peakRate: seasonRates.peakRate,
      offPeakRate: seasonRates.offPeakRate,
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

  // חישוב צריכת פיק/שפל אמיתית לפי דגימות שעתיות (אם קיימות)
  const calcPeakOffPeak = (date: Date, hourly: number[] | undefined) => {
    if (!hourly || hourly.length === 0) return { peak: 0, offpeak: 0, isEstimated: true };
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay();
    let peakHours: number[] = [];
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      // weekend: הכל שפל
      return { peak: 0, offpeak: hourly.reduce((a, b) => a + b, 0), isEstimated: hourly.length !== 24 };
    }
    if (month >= 6 && month <= 9) {
      // קיץ: 17:00-23:00
      peakHours = [17, 18, 19, 20, 21, 22];
    } else {
      // חורף/אביב/סתיו: 17:00-22:00
      peakHours = [17, 18, 19, 20, 21];
    }
    let peak = 0, offpeak = 0;
    for (let h = 0; h < hourly.length; h++) {
      if (peakHours.includes(h)) peak += hourly[h];
      else offpeak += hourly[h];
    }
    // אם אין 24 שעות - זה משוער
    return { peak, offpeak, isEstimated: hourly.length !== 24 };
  };

  const fetchRealData = async () => {
    setLoading(true);
    setConsumptionData([]); // איפוס הנתונים
    try {
      const response = await fetch(API_ENDPOINTS.consumption(selectedBreaker, startDate, endDate));
      const result = await response.json();

      if (result.status === 200 && result.data) {
        // Add peak/off-peak calculation to each row
        const processed = result.data.map((item: ConsumptionData) => {
          const date = new Date(item.consumption_date);
          // אם יש hourly_consumption - לחשב לפי דגימות, אחרת לפי יחס שעות
          if (item.hourly_consumption && item.hourly_consumption.length > 0) {
            const { peak, offpeak, isEstimated } = calcPeakOffPeak(date, item.hourly_consumption);
            return { ...item, peak_consumption: +peak.toFixed(2), offpeak_consumption: +offpeak.toFixed(2), isEstimated };
          } else {
            const tariff = getTariffForDate(date);
            const peak = +(item.daily_consumption * (tariff.peakHours / 24)).toFixed(2);
            const offpeak = +(item.daily_consumption * (tariff.offPeakHours / 24)).toFixed(2);
            return { ...item, peak_consumption: peak, offpeak_consumption: offpeak, isEstimated: true };
          }
        });
        setConsumptionData(processed);
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

      const peak = +(consumption * (tariff.peakHours / 24)).toFixed(2);
      const offpeak = +(consumption * (tariff.offPeakHours / 24)).toFixed(2);
      data.push({
        switch_id: parseInt(selectedBreaker),
        consumption_date: dateStr,
        consumption_day: date.toLocaleDateString('en-US', { weekday: 'long' }),
        season: tariff.seasonLabel,
        daily_consumption: consumption,
        daily_cost: cost,
        cumulative_consumption: 0,
        cumulative_cost: 0,
        peak_consumption: peak,
        offpeak_consumption: offpeak
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
      // PATCH efficiency settings
      const efficiencyResponse = await fetch(API_ENDPOINTS.efficiencySettings, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          efficiencyBase,
          efficiencyMultiplier
        })
      });

      // Get latest DB data for ids and other fields
      const tariffSettingsRes = await fetch(API_ENDPOINTS.tariffRates);
      let rates = [];
      if (tariffSettingsRes.ok) {
        const result = await tariffSettingsRes.json();
        rates = result.data || [];
      }

      // Helper to get DB row by season
      const getDbRow = (seasonLabel) => rates.find(r => r.season === seasonLabel) || {};
      const currentUser = localStorage.getItem('user') || 'Admin';

      // Build full payload for each season
      const fullPayload = [
        {
          id: getDbRow('Summer').id,
          season: 'Summer',
          peakRate: summerPeak,
          offPeakRate: summerOffPeak,
          peakHours: summerHours,
          weekdaysOnly: 1,
          isActive: 1,
          createdBy: currentUser
        },
        {
          id: getDbRow('Winter').id,
          season: 'Winter',
          peakRate: winterPeak,
          offPeakRate: winterOffPeak,
          peakHours: winterHours,
          weekdaysOnly: 0,
          isActive: 1,
          createdBy: currentUser
        },
        {
          id: getDbRow('Spring/Autumn').id,
          season: 'Spring/Autumn',
          peakRate: springPeak,
          offPeakRate: springOffPeak,
          peakHours: springHours,
          weekdaysOnly: 1,
          isActive: 1,
          createdBy: currentUser
        }
      ];

      // Send PATCH for each season
      let allOk = true;
      for (const seasonData of fullPayload) {
        const resp = await fetch(API_ENDPOINTS.tariffRates, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(seasonData)
        });
        if (!resp.ok) allOk = false;
      }

      if (efficiencyResponse.ok && allOk) {
        alert('Settings and tariff rates updated successfully!');
        setShowTariffModal(false);
        fetchRealData(); // Refresh the data
      } else {
        alert('Failed to update settings or tariff rates.');
      }
    } catch (error) {
      alert('Failed to update settings or tariff rates.');
    }
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


      // Table with requested columns and improved layout
      let yPos = 120;
  // Adjusted column positions for better fit and increased gap between Date and kWh
  // Date, kWh, kWh PEAK, kWh OFF-PEAK, Cost(ILS), Season
  // Page width: 210mm, margins: 20mm left/right, usable: 170mm
  // Column widths: [40, 18, 28, 28, 28, 28] (total 170)
  const colX = [20, 60, 78, 106, 134, 162];

      // Table header
      doc.setFontSize(10);
      doc.setFillColor(255, 105, 0);
      doc.rect(20, yPos - 6, 170, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Date', colX[0] + 2, yPos);
      doc.text('kWh', colX[1] + 2, yPos);
      doc.text('kWh PEAK', colX[2] + 2, yPos);
      doc.text('kWh OFF-PEAK', colX[3] + 2, yPos);
      doc.text('Cost (ILS)', colX[4] + 2, yPos);
      doc.text('Season', colX[5] + 2, yPos);

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
          day: 'numeric',
          year: 'numeric',
          weekday: 'long'
        });
        // Season short
        let seasonShort = item.season;
        if (seasonShort === 'Spring/Autumn') seasonShort = 'S/A';
        if (seasonShort === 'Summer') seasonShort = 'Sum';
        if (seasonShort === 'Winter') seasonShort = 'Win';

        doc.text(dateStr, colX[0] + 2, yPos);
        doc.text(item.daily_consumption.toFixed(1), colX[1] + 2, yPos);
        doc.text((item.peak_consumption ?? 0).toFixed(2), colX[2] + 2, yPos);
        doc.text((item.offpeak_consumption ?? 0).toFixed(2), colX[3] + 2, yPos);
        doc.text(item.daily_cost.toFixed(2), colX[4] + 2, yPos);
        doc.text(seasonShort, colX[5] + 2, yPos);

        yPos += 10;
      });

      // Total row
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos - 6, 170, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL', colX[0] + 2, yPos);
      doc.text(totalConsumption.toFixed(1), colX[1] + 2, yPos);
      doc.text(consumptionData.reduce((sum, item) => sum + (item.peak_consumption || 0), 0).toFixed(2), colX[2] + 2, yPos);
      doc.text(consumptionData.reduce((sum, item) => sum + (item.offpeak_consumption || 0), 0).toFixed(2), colX[3] + 2, yPos);
      doc.text(totalCost.toFixed(2), colX[4] + 2, yPos);
      doc.text('-', colX[5] + 2, yPos);

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

  // Sync local state with context when context changes
  useEffect(() => {
    setSummerPeak(tariffRates.summer.peakRate);
    setSummerOffPeak(tariffRates.summer.offPeakRate);
    setWinterPeak(tariffRates.winter.peakRate);
    setWinterOffPeak(tariffRates.winter.offPeakRate);
    setSpringPeak(tariffRates.springAutumn.peakRate);
    setSpringOffPeak(tariffRates.springAutumn.offPeakRate);
  }, [tariffRates]);

  // Fetch latest tariff rates when modal is opened
  useEffect(() => {
    if (showTariffModal) {
      fetch(API_ENDPOINTS.tariffRates)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.data && data.data.length > 0) {
            // Map DB data to context shape
            const dbRates = data.data;
            const newRates = {
              summer: {
                peakRate: Number(dbRates.find(r => r.season === 'Summer')?.peakRate ?? 1.6895),
                offPeakRate: Number(dbRates.find(r => r.season === 'Summer')?.offPeakRate ?? 0.5283)
              },
              winter: {
                peakRate: Number(dbRates.find(r => r.season === 'Winter')?.peakRate ?? 1.2071),
                offPeakRate: Number(dbRates.find(r => r.season === 'Winter')?.offPeakRate ?? 0.4557)
              },
              springAutumn: {
                peakRate: Number(dbRates.find(r => r.season === 'Spring/Autumn')?.peakRate ?? 0.4977),
                offPeakRate: Number(dbRates.find(r => r.season === 'Spring/Autumn')?.offPeakRate ?? 0.446)
              }
            };
            setTariffRates(newRates);
          }
        });
    }
  }, [showTariffModal]);

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

      <div className="charts-section" style={{ display: 'flex', gap: '24px', alignItems: 'stretch' }}>
        <div className="chart-card main-chart" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="chart-header">
            <h3>Energy Consumption Trend</h3>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#FF6900' }}></span>
                Daily Consumption
              </span>
            </div>
          </div>
          <div className="chart-container" style={{ flex: 1 }}>
            <Line
              key={`line-${selectedBreaker}-${startDate}-${endDate}`}
              data={lineChartData}
              options={chartOptions}
            />
          </div>
        </div>

        <div className="chart-card side-chart" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="chart-header">
            <h3 style={{ fontSize: '0.95rem', marginBottom: 4 }}>Usage Distribution</h3>
          </div>
          <div className="chart-container" style={{ flex: 1, marginBottom: 6 }}>
            <Doughnut
              key={`doughnut-${selectedBreaker}`}
              data={doughnutData}
              options={{ ...doughnutOptions, maintainAspectRatio: false }}
            />
          </div>
          <div className="tariff-legend" style={{ fontSize: '0.9rem', marginTop: 2, fontWeight: 700, color: '#333', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            {(() => {
              const now = new Date();
              const month = now.getMonth() + 1;
              const dayOfWeek = now.getDay();
              let peakHours = '';
              let offPeakHours = '';
              let season = '';
              let emoji = '';
              if (month >= 6 && month <= 9) {
                season = 'Summer'; emoji = '🌞';
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                  peakHours = '17:00-23:00';
                  offPeakHours = '00:00-17:00, 23:00-24:00';
                } else {
                  peakHours = 'No peak (Weekend)';
                  offPeakHours = 'All hours';
                }
              } else if (month === 12 || month === 1 || month === 2) {
                season = 'Winter'; emoji = '❄️';
                peakHours = '17:00-22:00';
                offPeakHours = '00:00-17:00, 22:00-24:00';
              } else {
                season = 'Spring/Autumn'; emoji = '🌷';
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                  peakHours = '17:00-22:00';
                  offPeakHours = '00:00-17:00, 22:00-24:00';
                } else {
                  peakHours = 'No peak (Weekend)';
                  offPeakHours = 'All hours';
                }
              }
              return (
                <>
                  <span style={{ marginRight: 16, display: 'flex', alignItems: 'center' }}>
                    <span className="tariff-dot" style={{ backgroundColor: '#FF6900', width: 12, height: 12, marginRight: 6, display: 'inline-block' }}></span>
                    Peak Hours: {peakHours}
                  </span>
                  <span style={{ marginRight: 16, display: 'flex', alignItems: 'center' }}>
                    <span className="tariff-dot" style={{ backgroundColor: '#00BFFF', width: 12, height: 12, marginRight: 6, display: 'inline-block' }}></span>
                    Off-Peak Hours: {offPeakHours} <span style={{ margin: '0 8px' }}>|</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      Season: {season}
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.9em',
                        filter: 'drop-shadow(0 2px 4px #aaa)',
                        transform: 'scale(1.2) rotate(-10deg)',
                        transition: 'transform 0.2s',
                        marginLeft: 4
                      }}>{emoji}</span>
                    </span>
                  </span>
                </>
              );
            })()}
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
                  <th>
                    Peak (kWh)
                    <span
                      style={{ cursor: 'help', color: '#FF6900', marginLeft: 4 }}
                      title={"Peak hours vary by season and day. Example: Winter 17:00-22:00, Summer 17:00-23:00, Weekend: No peak. Hover over value for exact hours per row."}
                    >🛈</span>
                  </th>
                  <th>
                    Off-Peak (kWh)
                    <span
                      style={{ cursor: 'help', color: '#8BC34A', marginLeft: 4 }}
                      title={"Off-peak hours vary by season and day. Example: Winter 00:00-17:00, 22:00-24:00; Summer 00:00-17:00, 23:00-24:00; Weekend: All hours. Hover over value for exact hours per row."}
                    >🛈</span>
                  </th>
                  <th>Cost (₪) incl. VAT</th>
                  <th>Season</th>
                  <th>Peak Hours</th>
                  <th>Off-Peak Rate</th>
                  <th>Daily Efficiency</th>
                </tr>
              </thead>
            <tbody>
              {consumptionData.map((item, index) => (
                <tr
                  key={index}
                  title={
                    item.isEstimated === true
                      ? 'Estimated data – not all 24 hourly samples available'
                      : (Array.isArray(item.hourly_consumption) && item.hourly_consumption.length === 24)
                        ? 'Complete data – all 24 hourly samples available'
                        : ''
                  }
                >
                  <td>
                    {item.isEstimated === true ? (
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'red',
                          marginRight: 6,
                          verticalAlign: 'middle'
                        }}
                        title="Estimated data – not all 24 hourly samples available"
                      ></span>
                    ) : (Array.isArray(item.hourly_consumption) && item.hourly_consumption.length === 24) ? (
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'green',
                          marginRight: 6,
                          verticalAlign: 'middle'
                        }}
                      ></span>
                    ) : null}
                    {new Date(item.consumption_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="consumption-value">{Math.round(item.daily_consumption * 10) / 10}</td>
                  <td
                    className="peak-value"
                    title={(() => {
                      if ((item as any).isEstimated) {
                        return 'Estimated data – not all 24 hourly samples available';
                      }
                      const date = new Date(item.consumption_date);
                      const month = date.getMonth() + 1;
                      const dayOfWeek = date.getDay();
                      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
                      if (isWeekend) return 'No peak (Weekend)';
                      if (month >= 6 && month <= 9) return 'Peak: 17:00-23:00';
                      if (month === 12 || month === 1 || month === 2) return 'Peak: 17:00-22:00';
                      return 'Peak: 17:00-22:00';
                    })()}
                  >{item.peak_consumption?.toFixed(2)}</td>
                  <td
                    className="offpeak-value"
                    title={(() => {
                      if ((item as any).isEstimated) {
                        return 'Estimated data – not all 24 hourly samples available';
                      }
                      const date = new Date(item.consumption_date);
                      const month = date.getMonth() + 1;
                      const dayOfWeek = date.getDay();
                      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
                      if (isWeekend) return 'Off-Peak: All hours';
                      if (month >= 6 && month <= 9) return 'Off-Peak: 00:00-17:00, 23:00-24:00';
                      if (month === 12 || month === 1 || month === 2) return 'Off-Peak: 00:00-17:00, 22:00-24:00';
                      return 'Off-Peak: 00:00-17:00, 22:00-24:00';
                    })()}
                  >{item.offpeak_consumption?.toFixed(2)}</td>
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
                    <div
                      className="efficiency-container"
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                      title={
                        `Daily Efficiency compares today's consumption to the previous day.
Formula: Efficiency = 100 - ((Today - Yesterday) / Yesterday) * 100
If today < yesterday, efficiency = 100%. If yesterday = 0, shows 'Not Available'.`
                      }
                    >
                      <div className="efficiency-bar" style={{ marginRight: 8 }}>
                        {(() => {
                          if (index === 0) return <div className="efficiency-fill" style={{ width: '100%' }}></div>;
                          const prev = consumptionData[index - 1]?.daily_consumption;
                          if (prev === 0) return <div className="efficiency-fill" style={{ width: '0%' }}>N/A</div>;
                          if (!prev) return <div className="efficiency-fill" style={{ width: '100%' }}></div>;
                          const percent = Math.max(0, Math.min(100, 100 - ((item.daily_consumption - prev) / prev) * 100));
                          return <div className="efficiency-fill" style={{ width: percent + '%' }}></div>;
                        })()}
                      </div>
                      <span className="efficiency-text">
                        {(() => {
                          if (index === 0) return '100%';
                          const prev = consumptionData[index - 1]?.daily_consumption;
                          if (prev === 0) return 'Not Available';
                          if (!prev) return '100%';
                          const percent = Math.max(0, Math.min(100, 100 - ((item.daily_consumption - prev) / prev) * 100));
                          return Math.round(percent) + '%';
                        })()}
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
                <td className="peak-value"><strong>{consumptionData.reduce((sum, item) => sum + (item.peak_consumption || 0), 0).toFixed(2)} kWh</strong></td>
                <td className="offpeak-value"><strong>{consumptionData.reduce((sum, item) => sum + (item.offpeak_consumption || 0), 0).toFixed(2)} kWh</strong></td>
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
                  <input type="number" step="0.01" value={summerPeak} onChange={(e) => setSummerPeak(Number(e.target.value))} />
                  <label>Off-Peak Rate (₪/kWh, incl. VAT):</label>
                  <input type="number" step="0.01" value={summerOffPeak} onChange={(e) => setSummerOffPeak(Number(e.target.value))} />
                  <label>Peak Hours (weekdays):</label>
                  <input type="text" value={summerHours} onChange={(e) => setSummerHours(e.target.value)} />
                </div>
              </div>

              <div className="tariff-section">
                <h4>Winter (December-February)</h4>
                <div className="rate-inputs">
                  <label>Peak Rate (₪/kWh, incl. VAT):</label>
                  <input type="number" step="0.01" value={winterPeak} onChange={(e) => setWinterPeak(Number(e.target.value))} />
                  <label>Off-Peak Rate (₪/kWh, incl. VAT):</label>
                  <input type="number" step="0.01" value={winterOffPeak} onChange={(e) => setWinterOffPeak(Number(e.target.value))} />
                  <label>Peak Hours (all days):</label>
                  <input type="text" value={winterHours} onChange={(e) => setWinterHours(e.target.value)} />
                </div>
              </div>

              <div className="tariff-section">
                <h4>Spring/Autumn (Mar-May, Oct-Nov)</h4>
                <div className="rate-inputs">
                  <label>Peak Rate (₪/kWh, incl. VAT):</label>
                  <input type="number" step="0.01" value={springPeak} onChange={(e) => setSpringPeak(Number(e.target.value))} />
                  <label>Off-Peak Rate (₪/kWh, incl. VAT):</label>
                  <input type="number" step="0.01" value={springOffPeak} onChange={(e) => setSpringOffPeak(Number(e.target.value))} />
                  <label>Peak Hours (weekdays only):</label>
                  <input type="text" value={springHours} onChange={(e) => setSpringHours(e.target.value)} />
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
                <button className="save-btn" style={{ background: '#2563eb', color: '#fff', borderRadius: '6px', border: 'none', padding: '10px 24px', fontWeight: 600 }} onClick={handleSaveTariffs}>Save Changes</button>
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

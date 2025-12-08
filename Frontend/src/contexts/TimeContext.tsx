import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { PaekOffSeason } from '../Types/peakAndOffSeason';

interface TimeContextType {
  season: string;
  peakOffSeason: PaekOffSeason | undefined;
  shortDate: string;
}

const TimeContext = createContext<TimeContextType | undefined>(undefined);

export const useTime = () => {
  const context = useContext(TimeContext);
  if (!context) {
    throw new Error('useTime must be used within a TimeProvider');
  }
  return context;
};

interface TimeProviderProps {
  children: ReactNode;
}

export const TimeProvider: React.FC<TimeProviderProps> = ({ children }) => {
  const [season, setSeason] = useState('');
  const [peakOffSeason, setPeakOffSeason] = useState<PaekOffSeason>();
  const [shortDate, setShortDate] = useState('');

  const getSeasonFromMonth = (date = new Date()) => {
    const m = date.getMonth() + 1;
    if (m === 12 || m === 1 || m === 2) setSeason('❄️ Winter');
    else if (m >= 3 && m <= 5) setSeason('🌸 Spring');
    else if (m >= 6 && m <= 8) setSeason('☀️ Summer');
    else setSeason('🍂 Fall');
  };

  const getPeakOffHours = (date = new Date()) => {
    const day = date.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    const month = date.getMonth() + 1;

    let season: 'winter' | 'spring' | 'summer' | 'fall';

    // Determine season
    if (month >= 12 || month <= 2) season = 'winter';
    else if (month >= 3 && month <= 5) season = 'spring';
    else if (month >= 6 && month <= 9) season = 'summer';
    else season = 'fall';

    // Winter (December-February) - All days same (including Saturday and Friday)
    if (season === 'winter') {
      setPeakOffSeason({
        offPeakStart: '22:00',
        offPeakEnd: '17:00',
        peakStart: '17:00',
        peakEnd: '22:00'
      });
      return;
    }

    // Saturday (day 6) - no peak hours (except winter)
    if (day === 6) {
      setPeakOffSeason({
        offPeakStart: '00:00',
        offPeakEnd: '23:59',
        peakStart: 'N/A',
        peakEnd: 'N/A'
      });
      return;
    }

    // Friday (day 5) and holiday eves - no peak hours (except winter)
    if (day === 5) {
      setPeakOffSeason({
        offPeakStart: '00:00',
        offPeakEnd: '23:59',
        peakStart: 'N/A',
        peakEnd: 'N/A'
      });
      return;
    }

    // Weekdays (Sunday-Thursday)
    switch (season) {
      case 'summer': // June-September
        setPeakOffSeason({
          offPeakStart: '00:00',
          offPeakEnd: '17:00',
          peakStart: '17:00',
          peakEnd: '23:00'
        });
        break;
      case 'spring': // March-May
      case 'fall': // October-November
        setPeakOffSeason({
          offPeakStart: '00:00',
          offPeakEnd: '17:00',
          peakStart: '17:00',
          peakEnd: '22:00'
        });
        break;
      default:
        break;
    }
  };

  const formatShortDate = (date = new Date()) => {
    const d = date.getDate();
    const m = date.getMonth() + 1;
    const y = date.getFullYear().toString().slice(-2);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${d}-${m}-${y} ${hh}:${mm}`;
  };

  const updateClock = () => {
    setShortDate(formatShortDate());
  };

  useEffect(() => {
    getSeasonFromMonth();
    getPeakOffHours();
    updateClock();

    const peakInterval = setInterval(getPeakOffHours, 24 * 60 * 60 * 1000);
    const clockInterval = setInterval(updateClock, 6 * 1000);

    return () => {
      clearInterval(peakInterval);
      clearInterval(clockInterval);
    };
  }, []);

  return (
    <TimeContext.Provider value={{ season, peakOffSeason, shortDate }}>
      {children}
    </TimeContext.Provider>
  );
};
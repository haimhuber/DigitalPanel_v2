import { createContext, useContext, useState } from 'react';

export type TariffRates = {
  summer: { peakRate: number; offPeakRate: number };
  winter: { peakRate: number; offPeakRate: number };
  springAutumn: { peakRate: number; offPeakRate: number };
};

const defaultRates: TariffRates = {
  summer: { peakRate: 1.6895, offPeakRate: 0.5283 },
  winter: { peakRate: 1.2071, offPeakRate: 0.4557 },
  springAutumn: { peakRate: 0.4977, offPeakRate: 0.446 }
};

const TariffContext = createContext<{
  tariffRates: TariffRates;
  setTariffRates: (rates: TariffRates) => void;
}>({
  tariffRates: defaultRates,
  setTariffRates: () => {}
});

export const useTariff = () => useContext(TariffContext);

export function TariffProvider({ children }: { children: React.ReactNode }) {
  const [tariffRates, setTariffRates] = useState<TariffRates>(defaultRates);
  return (
    <TariffContext.Provider value={{ tariffRates, setTariffRates }}>
      {children}
    </TariffContext.Provider>
  );
}

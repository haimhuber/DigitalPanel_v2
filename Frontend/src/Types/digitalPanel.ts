
export const breakerDataList = {
    V12: "V12",
    V23: "V23",
    V31: "V31",
    I1: "I1",
    I2: "I2",
    I3: "I3",
    Frequency: "Frequency",
    PowerFactor: "PowerFactor",
    ActivePower: "ActivePower",
    ReactivePower: "ReactivePower",
    ApparentPower: "ApparentPower",
    NominalCurrent: "NominalCurrent",
    ActiveEnergy: "ActiveEnergy"
}


export type DigitalPanelCardProps = {
    switch_id: string;
    name: string;
    type: string;
    load: string;
    CommStatus: string;
    V12: number;
    V23: number;
    V31: number;
    I1: number;
    I2: number;
    I3: number;
    Frequency: number;
    PowerFactor: number;
    ActivePower: number;
    ReactivePower: number;
    ApparentPower: number;
    NominalCurrent: number;
    ActiveEnergy: number;
    ProtectionTrip: string;
    ProtectionInstTrip: string;
    ProtectionI_Enabled: string;
    ProtectionS_Enabled: string;
    ProtectionL_Enabled: string;
    ProtectionG_Trip: string;
    ProtectionI_Trip: string;
    ProtectionS_Trip: string;
    ProtectionL_Trip: string;
    TripDisconnected: string;
    Tripped: string;
    Undefined:string;
    BreakerClose: string;
    BreakerOpen: string;
};

export type DigitalPanelHomeProps = {
    switch_id: string;
    name: string;
    type: string;
    load: string;
    CommStatus: string;
    Tripped: string;
    BreakerClose: string;
    
};


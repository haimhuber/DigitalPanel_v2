import { getAlerts } from "./CombinedData";

export interface AlertInterface {
  id: number;
  alarmId: number;
  alert_type: string;
  alert_message: string;
  timestamp: string;
  alertAck : number;
  ackTimestamp: string;
}

export interface AckTimestamp {
  id: number;
  ackId: number;
  ackBy: string;
  timestamp: string;
}

export function formatSqlTime(sqlTime?: string) {
  if (!sqlTime) {
    console.log("sqlTime is undefined or null");
    return "--";
  }

  const parts = sqlTime.split(' ');
  if (!parts || parts.length < 2) {
    console.log("sqlTime malformed:", sqlTime);
    return "--";
  }

  const [datePart, timePart] = parts;
  console.log("Hi"); // now this will run

  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':');
  const sec = Number(second.split('.')[0]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return `${pad(day)}-${pad(month)}-${year} ${pad(Number(hour))}:${pad(Number(minute))}:${pad(sec)}`;
}

export async function alertNum() {
  let alertCounter = 0;
          try {
            const response = await getAlerts();
            const data = response.data;
            for(let index = 0; index < data.length ; index ++) {
              if (data[index].alertAck ===  0) {
                  ++alertCounter;
              }
            }
            return alertCounter;
            
          } catch (err) {
            console.error('Failed to fetch alerts', err);
          }
};








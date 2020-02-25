import { IPowerData } from '../model/i-power-data';

export function isPowerOn(powerData: IPowerData): boolean {
  return powerData.voltage > 0;
}

export function isPowerOff(powerData: IPowerData): boolean {
  return !isPowerOn(powerData);
}

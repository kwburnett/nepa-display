import { IPowerData } from '../model/i-power-data';

export function isPowerOn(powerData: IPowerData): boolean {
  return powerData.voltage > 0;
}

export function isPowerOff(powerData: IPowerData): boolean {
  return powerData.voltage === 0;
}

export function isNullOrUndefined(object: any): boolean {
	return object === null || object === undefined;
}

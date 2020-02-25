import { IPowerData } from './i-power-data';

export interface IRecentSwitch {
  powerChange: IPowerData;
  numberOfInterruptions: number;
}

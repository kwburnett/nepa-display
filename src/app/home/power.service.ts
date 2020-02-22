import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { IPowerData } from '../../model/i-power-data';

@Injectable({
  providedIn: 'root'
})
export class PowerService {
  private voltageData: IPowerData[] = [];
  private nextDataIndexToGet: number;

  private tempGetPowerData(): Observable<IPowerData[]> {
    if (this.voltageData.length === 0) {
      try {
        const voltageData: number[] = require('../../json/voltage-data.json');
        const numberOfDataPoints: number = voltageData.length;
        const tempSeedIndex = Math.floor(Math.random() * numberOfDataPoints);
        // Re-shuffle the data so it's ordered according to the seed index
        voltageData.unshift(...voltageData.splice(tempSeedIndex));

        const nowIndex = Math.floor(numberOfDataPoints / 2);
        const dateNow = new Date();
        // Start numbering the data into the future
        for (let i = nowIndex; i < numberOfDataPoints; i++) {
          this.voltageData.push({
            time: dateNow.getTime() - (i - nowIndex) * 60000,
            voltage: voltageData[i]
          });
        }
        // Number the data back into the past
        for (let i = nowIndex - 1; i >= 0; i--) {
          this.voltageData.unshift({
            time: dateNow.getTime() - (nowIndex - i) * 60000,
            voltage: voltageData[i]
          });
        }
        this.nextDataIndexToGet = nowIndex + 1;
      } catch (err) {
        return of([]);
      }
    }
    return of(
      this.voltageData.slice(
        this.nextDataIndexToGet - 4 * 60,
        this.nextDataIndexToGet - 1
      )
    );
  }

  constructor() {}

  public getPowerData(): Observable<IPowerData[]> {
    return this.tempGetPowerData();
  }
}

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { IPowerData } from '../../model/i-power-data';

export interface IRecentChange {
  powerChange: IPowerData;
  numberOfInterruptions: number;
}

@Injectable({
  providedIn: 'root'
})
export class PowerService {
  private voltageData: IPowerData[] = [];
  private nextDataIndexToGet: number;
  private minimumNumberOfMeasurementsToNotConstituteInterruption: number = 15;

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

  public getMostRecentPowerOutage(): Observable<IRecentChange> {
    let indexToUse = -1;
    let numberOfInterruptions = 0;
    for (let i = 1; i < this.nextDataIndexToGet; i++) {
      if (
        this.voltageData[i - 1].voltage !== 0 &&
        this.voltageData[i].voltage === 0
      ) {
        const voltageDataThatMayBeInterruption = this.voltageData.slice(
          i,
          i + this.minimumNumberOfMeasurementsToNotConstituteInterruption
        );
        // If all of the next N are 0, this is an outage
        if (
          voltageDataThatMayBeInterruption.every(
            (voltageDataPoint: IPowerData): boolean =>
              voltageDataPoint.voltage === 0
          )
        ) {
          numberOfInterruptions = 0;
          indexToUse = i;
          i += this.minimumNumberOfMeasurementsToNotConstituteInterruption;
        }
      } else if (
        this.voltageData[i - 1].voltage === 0 &&
        this.voltageData[i].voltage !== 0 &&
        indexToUse > -1
      ) {
        const voltageDataThatMayBeInterruption = this.voltageData.slice(
          i,
          i + this.minimumNumberOfMeasurementsToNotConstituteInterruption
        );
        // If any of the next N are 0, this is an interruption
        if (
          voltageDataThatMayBeInterruption.some(
            (voltageDataPoint: IPowerData): boolean =>
              voltageDataPoint.voltage === 0
          )
        ) {
          numberOfInterruptions++;
          i += voltageDataThatMayBeInterruption.findIndex(
            (voltageDataPoint: IPowerData): boolean =>
              voltageDataPoint.voltage === 0
          ) + 1;
        }
      }
    }
    return of({
      powerChange: this.voltageData[indexToUse],
      numberOfInterruptions
    });
  }

  public getMostRecentPowerRestoration(): Observable<IRecentChange> {
    let indexToUse = -1;
    let numberOfInterruptions = 0;
    for (let i = 1; i < this.nextDataIndexToGet; i++) {
      if (
        this.voltageData[i - 1].voltage === 0 &&
        this.voltageData[i].voltage !== 0
      ) {
        const voltageDataThatMayBeInterruption = this.voltageData.slice(
          i,
          i + this.minimumNumberOfMeasurementsToNotConstituteInterruption
        );
        // If all of the next N are not 0, this is a restoration
        if (
          voltageDataThatMayBeInterruption.every(
            (voltageDataPoint: IPowerData): boolean =>
              voltageDataPoint.voltage > 0
          )
        ) {
          numberOfInterruptions = 0;
          indexToUse = i;
          i += this.minimumNumberOfMeasurementsToNotConstituteInterruption;
        }
      } else if (
        this.voltageData[i - 1].voltage !== 0 &&
        this.voltageData[i].voltage === 0 &&
        indexToUse > -1
      ) {
        const voltageDataThatMayBeInterruption = this.voltageData.slice(
          i,
          i + this.minimumNumberOfMeasurementsToNotConstituteInterruption
        );
        // If any of the next N are not 0, this is an interruption
        if (
          voltageDataThatMayBeInterruption.some(
            (voltageDataPoint: IPowerData): boolean =>
              voltageDataPoint.voltage > 0
          )
        ) {
          numberOfInterruptions++;
          i += voltageDataThatMayBeInterruption.findIndex(
            (voltageDataPoint: IPowerData): boolean =>
              voltageDataPoint.voltage > 0
          ) + 1;
        }
      }
    }
    return of({
      powerChange: this.voltageData[indexToUse],
      numberOfInterruptions
    });
  }
}

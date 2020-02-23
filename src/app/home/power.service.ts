import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Observable, of, Subscription } from 'rxjs';
import { flatMap } from 'rxjs/operators';
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
  private frequencyOfDataCheckPerMinute = 60;
  private dataSubscription: Subscription;
  private returnedPowerData: BehaviorSubject<
    IPowerData[]
  > = new BehaviorSubject([]);

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
            time: dateNow.getTime() + (i - nowIndex) * 60000,
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
        return this.returnedPowerData.asObservable();
      }
    }
    this.returnedPowerData.next(
      this.voltageData.slice(
        this.nextDataIndexToGet - 4 * 60,
        this.nextDataIndexToGet
      )
    );
    return this.returnedPowerData.asObservable();
  }

  private tempGetSubsequentPowerData(): Observable<IPowerData[]> {
    return of(
      this.voltageData.slice(this.nextDataIndexToGet, ++this.nextDataIndexToGet)
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
          i +=
            voltageDataThatMayBeInterruption.findIndex(
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
          i +=
            voltageDataThatMayBeInterruption.findIndex(
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

  public initiateDataCheck(): void {
    this.dataSubscription = interval(
      (60 * 1000) / this.frequencyOfDataCheckPerMinute
    )
      .pipe(flatMap(() => this.fetchSubsequentData()))
      .subscribe((latestPowerDataPoints: IPowerData[]): void => {
        this.returnedPowerData.next([
          ...this.returnedPowerData.getValue(),
          ...latestPowerDataPoints
        ]);
      });
  }

  public cancelDataCheck(): void {
    if (this.dataSubscription !== null) {
      this.dataSubscription.unsubscribe();
    }
  }

  private fetchSubsequentData(): Observable<IPowerData[]> {
    return this.tempGetSubsequentPowerData();
  }
}

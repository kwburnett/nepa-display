import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Observable, of, Subscription } from 'rxjs';
import { flatMap, map } from 'rxjs/operators';
import { IPowerData } from '../../model/i-power-data';
import { IRecentSwitch } from '../../model/i-recent-switch';
import { isPowerOff, isPowerOn } from '../utils';

@Injectable({
  providedIn: 'root'
})
export class PowerService {
  private voltageData: IPowerData[] = [];
  private voltageSwitches: IPowerData[] = [];
  private nextDataIndexToGet: number;
  private minimumNumberOfMinutesToNotConstituteInterruption: number = 15;
  private frequencyOfDataCheckPerMinute = 15;
  private dataSubscription: Subscription;
  private returnedPowerData: BehaviorSubject<
    IPowerData[]
  > = new BehaviorSubject([]);
  private returnedPowerSwitches: BehaviorSubject<
    IPowerData[]
  > = new BehaviorSubject([]);

  private init(): void {
    this.seedVoltageData();
    this.setVoltageSwitches();
  }

  private setVoltageSwitches(): void {
    let powerWasOn: boolean = isPowerOn(this.voltageData[0]);
    for (let voltageDataPoint of this.voltageData) {
      if (
        (isPowerOff(voltageDataPoint) && powerWasOn) ||
        (isPowerOn(voltageDataPoint) && !powerWasOn)
      ) {
        this.voltageSwitches.push(voltageDataPoint);
        powerWasOn = isPowerOn(voltageDataPoint);
      }
    }
    this.returnedPowerSwitches.next(this.voltageSwitches);
  }

  private seedVoltageData(): void {
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
      console.log('There was an error initializing the power data.');
      throw err;
    }
  }

  private tempGetPowerData(): Observable<IPowerData[]> {
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

  private tempGetPowerSwitches(
    timeOfLatestDataPointDisplayed: number
  ): Observable<IPowerData[]> {
    return this.returnedPowerSwitches.asObservable().pipe(
      map((powerDataSwitches: IPowerData[]): IPowerData[] => {
        const indexOfChangePastLatest: number = powerDataSwitches.findIndex(
          (powerDataSwitchDataPoint: IPowerData): boolean =>
            powerDataSwitchDataPoint.time > timeOfLatestDataPointDisplayed
				);
        const timeOfMostRecentDataPointDisplayed = this.voltageData[
          this.nextDataIndexToGet - 1
        ].time;
        const indexOfChangePastRecent: number = powerDataSwitches.findIndex(
          (powerDataSwitchDataPoint: IPowerData): boolean =>
            powerDataSwitchDataPoint.time > timeOfMostRecentDataPointDisplayed
				);
        return powerDataSwitches.slice(
          indexOfChangePastLatest - 1,
          indexOfChangePastRecent
        );
      })
    );
  }

  constructor() {
    this.init();
  }

  public getPowerData(): Observable<IPowerData[]> {
    return this.tempGetPowerData();
  }

  public getMostRecentPowerOutage(): Observable<IRecentSwitch> {
    return this.tempGetMostRecentPowerSwitch(isPowerOff);
  }

  public getMostRecentPowerRestoration(): Observable<IRecentSwitch> {
    return this.tempGetMostRecentPowerSwitch(isPowerOn);
  }

  public getPowerSwitches(
    timeOfLatestDataPointDisplayed: number
  ): Observable<IPowerData[]> {
    return this.tempGetPowerSwitches(timeOfLatestDataPointDisplayed);
  }

  private tempGetMostRecentPowerSwitch(
    powerCheckFunction: (powerDataPoint: IPowerData) => boolean
  ): Observable<IRecentSwitch> {
    let indexToUse = -1;
    let numberOfInterruptions = 0;
    for (let i = 1; i < this.nextDataIndexToGet; i++) {
      if (
        !powerCheckFunction(this.voltageData[i - 1]) &&
        powerCheckFunction(this.voltageData[i])
      ) {
        const timeOfCurrentMeasurement: number = this.voltageData[i].time;
        const voltageDataThatMayBeInterruption = this.voltageData.filter(
          (powerDataPoint: IPowerData): boolean =>
            powerDataPoint.time >= timeOfCurrentMeasurement &&
            powerDataPoint.time <
              timeOfCurrentMeasurement +
                this.minimumNumberOfMinutesToNotConstituteInterruption
        );
        // If all of the next N match the power check, this isn't an interruption
        if (voltageDataThatMayBeInterruption.every(powerCheckFunction)) {
          while (
            this.voltageData[++i].time <
            timeOfCurrentMeasurement +
              this.minimumNumberOfMinutesToNotConstituteInterruption
          ) {}
          numberOfInterruptions = 0;
          indexToUse = i;
        }
      } else if (
        powerCheckFunction(this.voltageData[i - 1]) &&
        !powerCheckFunction(this.voltageData[i]) &&
        indexToUse > -1
      ) {
        const timeOfCurrentMeasurement: number = this.voltageData[i].time;
        const voltageDataThatMayBeInterruption = this.voltageData.filter(
          (powerDataPoint: IPowerData): boolean =>
            powerDataPoint.time >= timeOfCurrentMeasurement &&
            powerDataPoint.time <
              timeOfCurrentMeasurement +
                this.minimumNumberOfMinutesToNotConstituteInterruption
        );
        // If any of the next N match the power check, this is an interruption
        if (voltageDataThatMayBeInterruption.some(powerCheckFunction)) {
          numberOfInterruptions++;
          i +=
            voltageDataThatMayBeInterruption.findIndex(powerCheckFunction) + 1;
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

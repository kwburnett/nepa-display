import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, interval, Observable, of, Subscription } from 'rxjs';
import { flatMap, map } from 'rxjs/operators';
import { IPowerData } from '../../model/i-power-data';
import { IRecentSwitch } from '../../model/i-recent-switch';
import { isPowerOff, isPowerOn } from '../utils';

@Injectable({
	providedIn: 'root',
})
export class PowerService {
	private _voltageData: IPowerData[] = [];
	private _voltageSwitches: IPowerData[] = [];
	private _nextDataIndexToGet: number;
	private _minimumNumberOfMinutesToNotConstituteInterruption: number = 15;
	private _frequencyOfDataCheckPerMinute = 60;
	private _dataSubscription: Subscription;
	private _returnedPowerData: BehaviorSubject<IPowerData[]> = new BehaviorSubject([]);
	private _returnedPowerSwitches: BehaviorSubject<IPowerData[]> = new BehaviorSubject([]);

	private _init(): void {
		this._seedVoltageData();
		this._setVoltageSwitches();
	}

	private _setVoltageSwitches(): void {
		let powerWasOn: boolean = isPowerOn(this._voltageData[0]);
		for (let voltageDataPoint of this._voltageData) {
			if ((isPowerOff(voltageDataPoint) && powerWasOn) || (isPowerOn(voltageDataPoint) && !powerWasOn)) {
				this._voltageSwitches.push(voltageDataPoint);
				powerWasOn = isPowerOn(voltageDataPoint);
			}
		}
		this._returnedPowerSwitches.next(this._voltageSwitches);
	}

	private _seedVoltageData(): void {
		try {
			const voltageData: number[] = [...(require('../../json/voltage-data.json') as number[])];
			const numberOfDataPoints: number = voltageData.length;
			// const tempSeedIndex = Math.floor(Math.random() * numberOfDataPoints);
			const tempSeedIndex = (Math.floor(numberOfDataPoints / 2) + 3658) % numberOfDataPoints;
			// Re-shuffle the data so it's ordered according to the seed index
			voltageData.unshift(...voltageData.splice(tempSeedIndex));

			const nowIndex = Math.floor(numberOfDataPoints / 2);
			const dateNow = new Date();
			// Start numbering the data into the future
			this._voltageData = voltageData.map(
				(voltage: number, index: number): IPowerData => {
					return {
						time: dateNow.getTime() - (nowIndex - index) * 60000,
						voltage,
					};
				},
			);
			this._nextDataIndexToGet = nowIndex + 1;
		} catch (err) {
			console.log('There was an error initializing the power data.');
			throw err;
		}
	}

	private _tempGetPowerData(): Observable<IPowerData[]> {
		this._returnedPowerData.next(this._voltageData.slice(this._nextDataIndexToGet - 4 * 60, this._nextDataIndexToGet));
		return this._returnedPowerData.asObservable();
	}

	private _tempGetSubsequentPowerData(): Observable<IPowerData[]> {
		return of(this._voltageData.slice(this._nextDataIndexToGet, ++this._nextDataIndexToGet));
	}

	private _tempGetPowerSwitches(timeOfLatestDataPointDisplayed: number): Observable<IPowerData[]> {
		return combineLatest(this._returnedPowerData.asObservable(), this._returnedPowerSwitches.asObservable()).pipe(
			map(([powerData, powerDataSwitches]: [IPowerData[], IPowerData[]]): IPowerData[] => {
				const indexOfChangePastLatest: number = powerDataSwitches.findIndex(
					(powerDataSwitchDataPoint: IPowerData): boolean =>
						powerDataSwitchDataPoint.time > timeOfLatestDataPointDisplayed,
				);
				const timeOfMostRecentDataPointDisplayed = this._voltageData[this._nextDataIndexToGet - 1].time;
				const indexOfChangePastRecent: number = powerDataSwitches.findIndex(
					(powerDataSwitchDataPoint: IPowerData): boolean =>
						powerDataSwitchDataPoint.time > timeOfMostRecentDataPointDisplayed,
				);
				return powerDataSwitches.slice(indexOfChangePastLatest - 1, indexOfChangePastRecent);
			}),
		);
	}

	constructor() {
		this._init();
	}

	public getPowerData(): Observable<IPowerData[]> {
		return this._tempGetPowerData();
	}

	public getMostRecentPowerOutage(): Observable<IRecentSwitch> {
		return this._tempGetMostRecentPowerSwitch(isPowerOff);
	}

	public getMostRecentPowerRestoration(): Observable<IRecentSwitch> {
		return this._tempGetMostRecentPowerSwitch(isPowerOn);
	}

	public getPowerSwitches(timeOfLatestDataPointDisplayed: number): Observable<IPowerData[]> {
		return this._tempGetPowerSwitches(timeOfLatestDataPointDisplayed);
	}

	private _tempGetMostRecentPowerSwitch(
		powerCheckFunction: (powerDataPoint: IPowerData) => boolean,
	): Observable<IRecentSwitch> {
		let numberOfInterruptions = 0;
		const timeOfCurrentData = this._voltageData[this._nextDataIndexToGet - 1].time;
		const indexOfPowerSwitchBeforeCurrent =
			this._voltageSwitches.findIndex((voltageSwitch: IPowerData): boolean => voltageSwitch.time > timeOfCurrentData) -
			1;
		let powerChange: IPowerData;
		for (let i = indexOfPowerSwitchBeforeCurrent; i >= 0; i--) {
			if (!powerCheckFunction(this._voltageSwitches[i])) {
				continue;
			}
			if (
				this._voltageSwitches[i].time - this._voltageSwitches[i - 1].time >=
				this._minimumNumberOfMinutesToNotConstituteInterruption * 1000 * 60
			) {
				powerChange = this._voltageSwitches[i];
				break;
			} else {
				numberOfInterruptions++;
			}
		}
		return of({
			powerChange,
			numberOfInterruptions,
		});
	}

	public initiateDataCheck(): void {
		if (this._dataSubscription) {
			return;
		}
		this._dataSubscription = interval((60 * 1000) / this._frequencyOfDataCheckPerMinute)
			.pipe(flatMap(() => this._fetchSubsequentData()))
			.subscribe((latestPowerDataPoints: IPowerData[]): void => {
				this._returnedPowerData.next([...this._returnedPowerData.getValue(), ...latestPowerDataPoints]);
				// this._returnedPowerData.next([
				// 	...this._returnedPowerData.getValue(),
				// 	...latestPowerDataPoints.map(
				// 		(oldData: IPowerData): IPowerData => {
				// 			return {
				// 				time: oldData.time,
				// 				voltage: undefined,
				// 			};
				// 		},
				// 	),
				// ]);
			});
	}

	public cancelDataCheck(): void {
		if (this._dataSubscription) {
			this._dataSubscription.unsubscribe();
			this._dataSubscription = null;
		}
	}

	private _fetchSubsequentData(): Observable<IPowerData[]> {
		return this._tempGetSubsequentPowerData();
	}
}

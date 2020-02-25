import { Component, OnDestroy, OnInit } from '@angular/core';
import { TrackballCustomContentData } from 'nativescript-ui-chart';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { isAndroid, Page } from 'tns-core-modules/ui/page/page';
import { IPowerData } from '../../model/i-power-data';
import { IRecentSwitch } from '../../model/i-recent-switch';
import { isPowerOff, isPowerOn } from '../utils';
import { PowerService } from './power.service';

@Component({
  selector: 'nepa-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  public powerData$: Observable<IPowerData[]>;
  public isPowerOn$: Observable<boolean>;
  public yAxisMinimum$: Observable<number>;
  public yAxisMaximum$: Observable<number>;
  public xAxisMinimum$: Observable<Date>;
  public xAxisMaximum$: Observable<Date>;
  public timeText$: Observable<string>;
  public interruptionsText$: Observable<string>;

  private subscriptions: Subscription[] = [];
  private changeTracker$: Observable<[IPowerData[], IRecentSwitch]>;
  private powerSwitches: IPowerData[] = [];

  constructor(private page: Page, private _powerService: PowerService) {
    if (isAndroid) {
      this.page.actionBarHidden = true;
    }
  }

  public ngOnInit(): void {
    this.powerData$ = this._powerService.getPowerData();
    this.powerData$
      .subscribe((powerData: IPowerData[]): void => {
        this.subscriptions.push(
          this._powerService
            .getPowerSwitches(powerData[0].time)
            .subscribe((powerSwitchData: IPowerData[]): void => {
              this.powerSwitches = powerSwitchData;
            })
        );
      })
      .unsubscribe();
    this.isPowerOn$ = this.powerData$.pipe(
      map((powerData: IPowerData[]): boolean => {
        return isPowerOn(powerData[powerData.length - 1]);
      })
    );
    this.yAxisMaximum$ = this.powerData$.pipe(
      map((powerData: IPowerData[]): number => {
        return Math.round(
          Math.max(
            ...powerData.map(
              (powerDataPoint: IPowerData): number => powerDataPoint.voltage
            )
          ) + 10
        );
      })
    );
    this.yAxisMinimum$ = this.powerData$.pipe(
      map((powerData: IPowerData[]): number => {
        return Math.round(
          Math.min(
            ...powerData
              .filter(isPowerOn)
              .map(
                (powerDataPoint: IPowerData): number => powerDataPoint.voltage
              )
          ) - 10
        );
      })
    );
    this.xAxisMaximum$ = this.powerData$.pipe(
      map(
        (powerData: IPowerData[]): Date => {
          const maxTime = new Date(powerData[powerData.length - 1].time);
          const hour = maxTime.getHours();
          const minutes = maxTime.getMinutes();
          let minutesToUse = 30,
            hoursToUse = hour;
          if (minutes > 30) {
            minutesToUse = 0;
            hoursToUse++;
          }
          const timeToUse = new Date(
            maxTime.getFullYear(),
            maxTime.getMonth(),
            maxTime.getDate(),
            hoursToUse,
            minutesToUse
          );
          // console.log(timeToUse);
          return timeToUse;
        }
      )
    );
    this.xAxisMinimum$ = this.xAxisMaximum$.pipe(
      map(
        (maxTime: Date): Date => {
          const minTime = new Date(maxTime);
          minTime.setHours(minTime.getHours() - 4);
          // console.log(minTime);
          return minTime;
        }
      )
    );
    this.changeTracker$ = combineLatest(
      this.powerData$,
      this.isPowerOn$.pipe(
        switchMap(
          (isPowerCurrentlyOn: boolean): Observable<IRecentSwitch> => {
            return isPowerCurrentlyOn
              ? this._powerService.getMostRecentPowerRestoration()
              : this._powerService.getMostRecentPowerOutage();
          }
        )
      )
    );
    this.timeText$ = this.changeTracker$.pipe(
      map(
        ([powerData, mostRecentChange]: [
          IPowerData[],
          IRecentSwitch
        ]): string => {
          return this.getTimeIntervalDisplay(
            mostRecentChange.powerChange.time,
            powerData[powerData.length - 1].time
          );
        }
      )
    );
    this.interruptionsText$ = this.changeTracker$.pipe(
      map(
        ([powerData, mostRecentChange]: [
          IPowerData[],
          IRecentSwitch
        ]): string => {
          return `with ${
            mostRecentChange.numberOfInterruptions > 0
              ? mostRecentChange.numberOfInterruptions
              : 'no'
          } interruption${
            mostRecentChange.numberOfInterruptions !== 1 ? 's' : ''
          }`;
        }
      )
    );
    this._powerService.initiateDataCheck();
  }

  public ngOnDestroy(): void {
    this.subscriptions.forEach((subscription: Subscription): void => {
      subscription.unsubscribe();
    });
  }

  public onTrackBallContentRequested(event: TrackballCustomContentData): void {
    const selectedDataPoint = <IPowerData>event.pointData;
    event.content = `Power ${
      isPowerOff(selectedDataPoint) ? 'out' : 'on'
    } from:\r\n`;
    if (this.powerSwitches.length === 0) {
      event.content += 'No data found';
    } else {
      const indexOfChangePastSelectedDataPoint = this.powerSwitches.findIndex(
        (powerSwitch: IPowerData): boolean =>
          powerSwitch.time >= selectedDataPoint.time
      );
      let timeEnd = this.powerSwitches[this.powerSwitches.length - 1].time,
        timeStart = -1;
      if (indexOfChangePastSelectedDataPoint > -1) {
        timeEnd = this.powerSwitches[indexOfChangePastSelectedDataPoint - 1]
          .time;
        timeStart = this.powerSwitches[indexOfChangePastSelectedDataPoint].time;
      }
      event.content += `${this.formatTime(timeEnd)} - ${
        timeStart > -1 ? this.formatTime(timeStart) : 'now'
      }`;
    }
  }

  private formatTime(timeToFormat: number): string {
    const dateToUse = new Date(timeToFormat);
    return `${
      dateToUse.getHours() > 12
        ? dateToUse.getHours() - 12
        : dateToUse.getHours()
    }:${dateToUse.getMinutes() < 10 ? '0' : ''}${dateToUse.getMinutes()}`;
  }

  private getTimeIntervalDisplay(timeStart: number, timeEnd: number): string {
    const timeDifferenceInMinutes = (timeEnd - timeStart) / 1000 / 60;
    if (timeDifferenceInMinutes < 5) {
      return '< 5 mins';
    } else if (timeDifferenceInMinutes <= 15) {
      return `${Math.floor(timeDifferenceInMinutes / 5) * 5} mins`;
    } else if (timeDifferenceInMinutes < 60) {
      return `${Math.floor(timeDifferenceInMinutes / 15) * 15} mins`;
    } else if (timeDifferenceInMinutes < 1440) {
      const biHourValue = Math.floor(timeDifferenceInMinutes / 30);
      let hourValue: string;
      if (biHourValue % 2 === 1) {
        hourValue = (biHourValue / 2).toFixed(1);
      } else {
        hourValue = (biHourValue / 2).toString();
      }
      return `${hourValue} hr${biHourValue !== 2 ? 's' : ''}`;
    } else {
      const dayValue = Math.floor(timeDifferenceInMinutes / 1440);
      const hourValue = Math.floor(
        (timeDifferenceInMinutes - dayValue * 1440) / 60
      );
      return `${dayValue} day${dayValue > 1 ? 's' : ''} ${hourValue} hr${
        hourValue > 1 ? 's' : ''
      }`;
    }
  }
}

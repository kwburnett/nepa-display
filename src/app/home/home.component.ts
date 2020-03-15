import { Component, HostBinding, HostListener } from '@angular/core';
import { TrackballCustomContentData } from 'nativescript-ui-chart';
import { BehaviorSubject, combineLatest, Observable, of, Subscription } from 'rxjs';
import { distinctUntilChanged, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { screen } from 'tns-core-modules/platform';
import { isAndroid, Page } from 'tns-core-modules/ui/page/page';
import { IPowerData } from '../../model/i-power-data';
import { IRecentSwitch } from '../../model/i-recent-switch';
import { LifeCycleHooks } from '../life-cycle-hooks';
import { isNullOrUndefined, isPowerOff, isPowerOn } from '../utils';
import { PowerService } from './power.service';

function getInitialTimeWhenDataStartedMissing(): number {
  return new Date().setHours(new Date().getHours() - 1);
}
function getInitialTimeWhenDataMissingEnds(): number {
  return new Date().setDate(new Date().getDate() + 1);
}

const timeDelayInMillisBecauseOtherwiseChartBandComplainsAboutBeingTheSameAsNow: number = 60000;
const minimumCssScreenResolution: number = 20;
enum PowerIcon {
  warning = 'f071',
  question = 'f059',
  power = 'f011',
}

@Component({
  selector: 'nepa-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  public powerData$: Observable<IPowerData[]>;
  public isPowerOn$: Observable<boolean>;
  public isPowerOff$: Observable<boolean>;
  public yAxisMinimum$: Observable<number>;
  public yAxisMaximum$: Observable<number>;
  public xAxisMinimum$: Observable<Date> = of(new Date());
  public xAxisMaximum$: Observable<Date> = of(new Date());
  public timeText$: Observable<string>;
  public interruptionsText$: Observable<string>;
  public canGetNewData$: Observable<boolean> = of(true);
  public appIcon: string;

  @HostBinding('class') public screenSizeClass: string = '';

  public isDataMissing$: Observable<boolean> = of(false);
  private _shouldShowDataMissingBand$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  public shouldShowDataMissingBand$: Observable<boolean> = this._shouldShowDataMissingBand$
    .asObservable()
    .pipe(distinctUntilChanged());
  private _timeWhenDataStartedMissing$: BehaviorSubject<number> = new BehaviorSubject(
    getInitialTimeWhenDataStartedMissing(),
  );
  public timeWhenDataStartedMissing$: Observable<number> = this._timeWhenDataStartedMissing$
    .asObservable()
    .pipe(distinctUntilChanged());
  private _timeWhenDataMissingEnd$: BehaviorSubject<number> = new BehaviorSubject(getInitialTimeWhenDataMissingEnds());
  public timeOfMostRecentMeasurement$: Observable<number> = this._timeWhenDataMissingEnd$
    .asObservable()
    .pipe(distinctUntilChanged());

  private _subscriptions: Subscription[] = [];
  private _changeTracker$: Observable<[IPowerData[], IRecentSwitch]>;
  private _powerSwitches: IPowerData[] = [];

  constructor(private _page: Page, private _powerService: PowerService) {
    if (isAndroid) {
      this._page.actionBarHidden = true;
    }

    LifeCycleHooks.addOnPauseCallback(() => {
      this._powerService.cancelDataCheck();
    });
    LifeCycleHooks.addOnResumeCallback(() => {
      this._powerService.initiateDataCheck();
    });
  }

  @HostListener('loaded')
  public pageOnInit() {
    this._initObservables();
    this._addScreenCss();
  }
  @HostListener('unloaded')
  public pageDestroy() {
    this._subscriptions.forEach((subscription: Subscription): void => {
      subscription.unsubscribe();
    });
    this._resetNoDataIntervals();
  }

  private _addScreenCss(): void {
    const screenSizeRoundedToNearest5 =
      Math.floor(screen.mainScreen.heightDIPs / minimumCssScreenResolution) * minimumCssScreenResolution;
    this.screenSizeClass = `dip-${screenSizeRoundedToNearest5}`;
  }

  private _initObservables(): void {
    this.powerData$ = this._powerService.getPowerData();
    this.powerData$
      .subscribe((powerData: IPowerData[]): void => {
        this._subscriptions.push(
          this._powerService.getPowerSwitches(powerData[0].time).subscribe((powerSwitchData: IPowerData[]): void => {
            this._powerSwitches = powerSwitchData;
          }),
        );
      })
      .unsubscribe();
    this.isDataMissing$ = this.powerData$.pipe(
      map((powerData: IPowerData[]): boolean => isNullOrUndefined(powerData[powerData.length - 1].voltage)),
      distinctUntilChanged(),
    );
    this._subscriptions.push(
      this.powerData$
        .pipe(withLatestFrom(this.isDataMissing$))
        .subscribe(([powerData, isDataMissing]: [IPowerData[], boolean]): void => {
          if (isDataMissing) {
            const mostRecentTime = powerData[powerData.length - 1].time;
            const timeWhenDataStartedMissing = powerData.find((powerDataPoint: IPowerData): boolean =>
              isNullOrUndefined(powerDataPoint.voltage),
            ).time;
            if (
              mostRecentTime - timeWhenDataStartedMissing >
              timeDelayInMillisBecauseOtherwiseChartBandComplainsAboutBeingTheSameAsNow
            ) {
              this._shouldShowDataMissingBand$.next(true);
              this._timeWhenDataStartedMissing$.next(timeWhenDataStartedMissing);
              this._timeWhenDataMissingEnd$.next(mostRecentTime);
            }
          } else {
            this._resetNoDataIntervals();
          }
        }),
    );
    this.isPowerOn$ = this.powerData$.pipe(
      map((powerData: IPowerData[]): boolean => isPowerOn(powerData[powerData.length - 1])),
    );
    this.isPowerOff$ = this.powerData$.pipe(
      map((powerData: IPowerData[]): boolean => isPowerOff(powerData[powerData.length - 1])),
    );
    this.yAxisMaximum$ = this.powerData$.pipe(
      map((powerData: IPowerData[]): number => {
        return Math.round(
          Math.max(...powerData.map((powerDataPoint: IPowerData): number => powerDataPoint.voltage)) + 10,
        );
      }),
    );
    this.yAxisMinimum$ = this.powerData$.pipe(
      map((powerData: IPowerData[]): number => {
        return Math.round(
          Math.min(...powerData.filter(isPowerOn).map((powerDataPoint: IPowerData): number => powerDataPoint.voltage)) -
            10,
        );
      }),
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
            minutesToUse,
          );
          // console.log(timeToUse);
          return timeToUse;
        },
      ),
    );
    this.xAxisMinimum$ = this.xAxisMaximum$.pipe(
      map(
        (maxTime: Date): Date => {
          const minTime = new Date(maxTime);
          minTime.setHours(minTime.getHours() - 4);
          // console.log(minTime);
          return minTime;
        },
      ),
    );
    this._changeTracker$ = combineLatest(
      this.powerData$,
      this.isPowerOn$.pipe(
        switchMap(
          (isPowerCurrentlyOn: boolean): Observable<IRecentSwitch> => {
            return isPowerCurrentlyOn
              ? this._powerService.getMostRecentPowerRestoration()
              : this._powerService.getMostRecentPowerOutage();
          },
        ),
      ),
    );
    this.timeText$ = this._changeTracker$.pipe(
      withLatestFrom(this.isDataMissing$),
      map(([[powerData, mostRecentChange], isDataMissing]: [[IPowerData[], IRecentSwitch], boolean]): string => {
        if (isDataMissing) {
          return this._getTimeIntervalDisplay(
            this._timeWhenDataStartedMissing$.getValue(),
            powerData[powerData.length - 1].time,
          );
        }
        return this._getTimeIntervalDisplay(mostRecentChange.powerChange.time, powerData[powerData.length - 1].time);
      }),
    );
    this.interruptionsText$ = this._changeTracker$.pipe(
      map(([powerData, mostRecentChange]: [IPowerData[], IRecentSwitch]): string => {
        return `with ${
          mostRecentChange.numberOfInterruptions > 0 ? mostRecentChange.numberOfInterruptions : 'no'
        } interruption${mostRecentChange.numberOfInterruptions !== 1 ? 's' : ''}`;
      }),
    );
    this._subscriptions.push(
      combineLatest(this.isDataMissing$, this.canGetNewData$).subscribe(
        ([isDataMissing, canGetNewData]: [boolean, boolean]): void => {
          let iconToUse: PowerIcon = PowerIcon.question;
          if (canGetNewData) {
            if (isDataMissing) {
              iconToUse = PowerIcon.warning;
            } else {
              iconToUse = PowerIcon.power;
            }
          }
          this._updateAppIcon(iconToUse);
        },
      ),
    );
    this._powerService.initiateDataCheck();
  }

  public onTrackBallContentRequested(event: TrackballCustomContentData): void {
    const selectedDataPoint = <IPowerData>event.pointData;
    event.content = `Power ${isPowerOff(selectedDataPoint) ? 'out' : 'on'} from:\r\n`;
    if (this._powerSwitches.length === 0) {
      event.content += 'No data found';
    } else {
      const indexOfChangePastSelectedDataPoint = this._powerSwitches.findIndex(
        (powerSwitch: IPowerData): boolean => powerSwitch.time >= selectedDataPoint.time,
      );
      let timeEnd = this._powerSwitches[this._powerSwitches.length - 1].time,
        timeStart = -1;
      if (indexOfChangePastSelectedDataPoint > -1) {
        timeEnd = this._powerSwitches[indexOfChangePastSelectedDataPoint - 1].time;
        timeStart = this._powerSwitches[indexOfChangePastSelectedDataPoint].time;
      }
      event.content += `${this._formatTime(timeEnd)} - ${timeStart > -1 ? this._formatTime(timeStart) : 'now'}`;
    }
  }

  private _formatTime(timeToFormat: number): string {
    const dateToUse = new Date(timeToFormat);
    return `${dateToUse.getHours() > 12 ? dateToUse.getHours() - 12 : dateToUse.getHours()}:${
      dateToUse.getMinutes() < 10 ? '0' : ''
    }${dateToUse.getMinutes()}`;
  }

  private _getTimeIntervalDisplay(timeStart: number, timeEnd: number): string {
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
      const hourValue = Math.floor((timeDifferenceInMinutes - dayValue * 1440) / 60);
      return `${dayValue} day${dayValue > 1 ? 's' : ''} ${hourValue} hr${hourValue > 1 ? 's' : ''}`;
    }
  }

  private _resetNoDataIntervals(): void {
    this._shouldShowDataMissingBand$.next(false);
    this._timeWhenDataMissingEnd$.next(getInitialTimeWhenDataMissingEnds());
    this._timeWhenDataStartedMissing$.next(getInitialTimeWhenDataStartedMissing());
  }

  private _updateAppIcon(iconToDisplay: string) {
    this.appIcon = String.fromCharCode(parseInt(iconToDisplay, 16));
  }
}

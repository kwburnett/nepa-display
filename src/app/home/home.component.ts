import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { isAndroid, Page } from 'tns-core-modules/ui/page/page';
import { IPowerData } from '../../model/i-power-data';
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

  private subscriptions: Subscription[] = [];

  constructor(private page: Page, private _powerService: PowerService) {
    if (isAndroid) {
      this.page.actionBarHidden = true;
    }
  }

  public ngOnInit(): void {
    this.powerData$ = this._powerService.getPowerData();
    this.isPowerOn$ = this.powerData$.pipe(
      map((powerData: IPowerData[]): boolean => {
        return powerData[powerData.length - 1].voltage !== 0;
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
              .filter(
                (powerDataPoint: IPowerData): boolean =>
                  powerDataPoint.voltage > 0
              )
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
          console.log(timeToUse);
          return timeToUse;
        }
      )
    );
    this.xAxisMinimum$ = this.xAxisMaximum$.pipe(
      map(
        (maxTime: Date): Date => {
          const minTime = new Date(maxTime);
          minTime.setHours(minTime.getHours() - 4);
          console.log(minTime);
          return minTime;
        }
      )
    );
  }

  public ngOnDestroy(): void {
    this.subscriptions.forEach((subscription: Subscription): void => {
      subscription.unsubscribe();
    });
  }
}

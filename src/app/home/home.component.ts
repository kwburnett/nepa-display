import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { isAndroid, Page } from 'tns-core-modules/ui/page/page';
import { PowerService } from './power.service';

@Component({
  selector: 'nepa-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  public powerData$: Observable<number[]>;
  public isPowerOn: boolean = false;

  private subscriptions: Subscription[] = [];

  constructor(private page: Page, private powerService: PowerService) {
    if (isAndroid) {
      this.page.actionBarHidden = true;
    }
  }

  public ngOnInit(): void {
    this.powerData$ = this.powerService.getPowerData();

    this.subscriptions.push(this.powerData$.subscribe((powerData: number[]): void => {
      this.isPowerOn = powerData[powerData.length - 1] !== 0;
    }));
  }
  
  public ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }
}

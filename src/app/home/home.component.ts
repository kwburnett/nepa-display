import { Component, OnInit } from '@angular/core';
import { isAndroid, Page } from 'tns-core-modules/ui/page/page';
import { PowerService } from './power.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'nepa-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  public powerData$: Observable<number[]>;
  constructor(private page: Page, private powerService: PowerService) {
    if (isAndroid) {
      this.page.actionBarHidden = true;
    }
  }

  public ngOnInit(): void {
    this.powerData$ = this.powerService.getPowerData();
  }
}

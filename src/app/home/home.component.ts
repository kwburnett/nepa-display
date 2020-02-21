import { Component, OnInit } from '@angular/core';
import { Page, isAndroid } from 'tns-core-modules/ui/page/page';

@Component({
  selector: 'nepa-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  constructor(private page: Page) {
    if (isAndroid) {
      this.page.actionBarHidden = true;
    }
  }

  ngOnInit(): void {}
}

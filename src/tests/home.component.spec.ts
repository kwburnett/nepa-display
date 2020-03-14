import { ComponentFixture } from '@angular/core/testing';
import { nsTestBedAfterEach, nsTestBedBeforeEach, nsTestBedRender } from 'nativescript-angular/testing';
import { HomeComponent } from '../app/home/home.component';
import { PowerService } from '../app/home/power.service';

describe('HomeComponent', () => {
  beforeEach(nsTestBedBeforeEach([HomeComponent], [PowerService]));
  afterEach(nsTestBedAfterEach());

  it('should create', () => {
    nsTestBedRender(HomeComponent).then((fixture: ComponentFixture<HomeComponent>) => {
      expect(fixture.componentInstance).toBeTruthy();
    });
  });
});

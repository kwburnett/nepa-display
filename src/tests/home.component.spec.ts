// import 'reflect-metadata';
import { ComponentFixture } from '@angular/core/testing';
import { nsTestBedAfterEach, nsTestBedBeforeEach, nsTestBedRender } from 'nativescript-angular/testing';
import { BehaviorSubject, interval, Observable, of, Subject } from 'rxjs';
import { HomeComponent } from '../app/home/home.component';
import { PowerService } from '../app/home/power.service';
import { IPowerData } from '../model/i-power-data';
import { IRecentSwitch } from '../model/i-recent-switch';
import { withLatestFrom } from 'rxjs/operators';

class MockPowerService {
	private _mockData: IPowerData[] = [
		{ voltage: 250, time: new Date().getTime() - 3 },
		{ voltage: 250, time: new Date().getTime() - 2 },
		{ voltage: 0, time: new Date().getTime() - 1 },
		{ voltage: 0, time: new Date().getTime() },
	];
	private _updatingMockData: BehaviorSubject<IPowerData[]> = new BehaviorSubject(this._mockData);

	public getMostRecentPowerRestoration(): Observable<IRecentSwitch> {
		return of({
			powerChange: this._mockData[0],
			numberOfInterruptions: 0,
		});
	}

	public getMostRecentPowerOutage(): Observable<IRecentSwitch> {
		return of({
			powerChange: this._mockData[2],
			numberOfInterruptions: 0,
		});
	}

	public initiateDataCheck(): void {
    setTimeout(() => {
			// this._returnedPowerData.next([...this._returnedPowerData.getValue(), ...latestPowerDataPoints]);
			this._updatingMockData.next([
				...this._updatingMockData.getValue(),
				{
					time: new Date().getTime(),
					voltage: undefined,
				},
			]);
    }, 500);
	}

	public cancelDataCheck(): void {}

	public getPowerData(): Observable<IPowerData[]> {
		return this._updatingMockData.asObservable();
	}

	public getPowerSwitches(): Observable<IPowerData[]> {
		return of([this._mockData[0], this._mockData[2]]);
	}
}

describe('HomeComponent', () => {
	beforeEach(nsTestBedBeforeEach([HomeComponent], [{ provide: PowerService, useClass: MockPowerService }]));
	afterEach(nsTestBedAfterEach(false));

	it('should create', done => {
		nsTestBedRender(HomeComponent).then((fixture: ComponentFixture<HomeComponent>) => {
			expect(fixture.componentInstance).toBeTruthy();
			done();
		});
	});

	it("should say data isn't missing when data present", done => {
		nsTestBedRender(HomeComponent).then((fixture: ComponentFixture<HomeComponent>) => {
      const component = fixture.componentInstance;
      component.pageOnInit();
			component.isDataMissing$
				.subscribe((isDataMissing: boolean): void => {
					expect(isDataMissing).toBeFalse();
					done();
				})
				.unsubscribe();
		});
	});

	it('should say data is missing when data absent', done => {
		nsTestBedRender(HomeComponent).then((fixture: ComponentFixture<HomeComponent>) => {
			const component = fixture.componentInstance;
      component.pageOnInit();
			setTimeout(() => {
				component.isDataMissing$
					.subscribe((isDataMissing: boolean): void => {
						expect(isDataMissing).toBeTrue();
						done();
					})
					.unsubscribe();
			}, 1000);
		});
	});

	it('should display a short time when data first starts missing', done => {
		nsTestBedRender(HomeComponent).then((fixture: ComponentFixture<HomeComponent>) => {
			const component = fixture.componentInstance;
      component.pageOnInit();
			setTimeout(() => {
        component.isDataMissing$
          .pipe(withLatestFrom(component.timeText$))
					.subscribe(([isDataMissing, timeText]: [boolean, string]): void => {
            expect(isDataMissing).toBeTrue();
            expect(timeText).toEqual('< 5 mins');
						done();
					})
					.unsubscribe();
			}, 1000);
		});
	});
});

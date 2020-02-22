import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PowerService {
  private tempSeedRow: number = -1;
  private voltageData: number[] = [];

  private tempGetPowerData(): Observable<number[]> {
    if (this.voltageData.length === 0) {
      try {
        this.voltageData = require('../../json/voltage-data.json');
        if (this.tempSeedRow < 0) {
          const totalRowCount: number = this.voltageData.length;
          this.tempSeedRow = Math.floor(Math.random() * totalRowCount) - 40;
          if (this.tempSeedRow < 0) {
            this.tempSeedRow = 0;
          }
        }
      } catch (err) {
        return of([]);
      }
    }
    return of(this.voltageData.slice(this.tempSeedRow, this.tempSeedRow + 40));
  }

  constructor() {}

  public getPowerData(): Observable<number[]> {
    return this.tempGetPowerData();
  }
}

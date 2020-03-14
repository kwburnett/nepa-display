import { nsTestBedAfterEach, nsTestBedBeforeEach } from 'nativescript-angular/testing';
import { PowerService } from '../app/home/power.service';
import { getTestBed } from '@angular/core/testing';

describe('PowerService', () => {
  beforeEach(nsTestBedBeforeEach([], [PowerService]));
  afterEach(nsTestBedAfterEach());

  it('should be created', () => {
    let service = getTestBed().get(PowerService);
    expect(service).toBeTruthy();
  });
});

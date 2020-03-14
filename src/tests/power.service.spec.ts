import { getTestBed, TestBed } from '@angular/core/testing';
import { PowerService } from '../app/home/power.service';
import { nsTestBedBeforeEach } from 'nativescript-angular/testing';

describe('PowerService', () => {
  beforeEach(nsTestBedBeforeEach([], [PowerService]));

  // it('should be created', () => {
  //   let service = getTestBed().get(PowerService);
  //   expect(service).toBeTruthy();
  // });
});

import { getTestBed, TestBed } from '@angular/core/testing';
import { PowerService } from './power.service';

describe('PowerService', () => {
  let service: PowerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PowerService]
    });
    service = getTestBed().get(PowerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

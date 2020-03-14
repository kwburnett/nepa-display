import { IPowerData } from '../model/i-power-data';
import { isPowerOff, isPowerOn } from '../app/utils';

describe('utils', () => {
  const voltageOn: IPowerData = {
    time: new Date().getTime(),
    voltage: 231,
  };
  const voltageOff: IPowerData = {
    time: new Date().getTime(),
    voltage: 0,
  };
  const voltageNoData: IPowerData = {
    time: new Date().getTime(),
  };

  describe('isPowerOn', () => {
    it('should return true if not 0', () => {
      expect(isPowerOn(voltageOn)).toBe(true);
      expect(isPowerOn(voltageOff)).toBe(false);
      expect(isPowerOn(voltageNoData)).toBe(false);
    });
    it('should return false if 0 or no data', () => {
      expect(isPowerOff(voltageOn)).toBe(false);
      expect(isPowerOff(voltageOff)).toBe(true);
      expect(isPowerOff(voltageNoData)).toBe(true);
    });
  });
});

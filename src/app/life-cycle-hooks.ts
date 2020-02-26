import { ApplicationEventData } from 'tns-core-modules/application';

export class LifeCycleHooks {
  private static _onPauseCallbacks: any[] = [];
  public static addOnPauseCallback(callback: () => void): void {
    this._onPauseCallbacks.push(callback);
  }
  public static removeOnPauseCallback(callback: () => void): void {
    this._onPauseCallbacks = this._onPauseCallbacks.filter(
      (onPauseCallback): boolean => onPauseCallback !== callback
    );
  }

  public static onPause(event: ApplicationEventData): void {
    for (let callback of this._onPauseCallbacks) {
      callback(event);
    }
  }

  private static _onResumeCallbacks: any[] = [];
  public static addOnResumeCallback(callback: () => void): void {
    this._onResumeCallbacks.push(callback);
  }
  public static removeOnResumeCallback(callback: () => void): void {
    this._onResumeCallbacks = this._onResumeCallbacks.filter(
      (onResumeCallback): boolean => onResumeCallback !== callback
    );
  }

  public static onResume(event: ApplicationEventData): void {
    for (let callback of this._onResumeCallbacks) {
      callback(event);
    }
  }

  constructor() {}
}

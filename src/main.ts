// this import should be first in order to load some required settings (like globals and reflect-metadata)
import { registerElement } from 'nativescript-angular/element-registry';
import { platformNativeScriptDynamic } from 'nativescript-angular/platform';
import { ShadowedLabel } from 'nativescript-shadowed-label';
import {
  ApplicationEventData,
  on as applicationOn,
  resumeEvent,
  suspendEvent
} from 'tns-core-modules/application';
import { AppModule } from './app/app.module';
import { LifeCycleHooks } from './app/life-cycle-hooks';

registerElement('ShadowedLabel', () => ShadowedLabel);

applicationOn(suspendEvent, (event: ApplicationEventData): void => {
  LifeCycleHooks.onPause(event);
});
applicationOn(resumeEvent, (event: ApplicationEventData): void => {
  LifeCycleHooks.onResume(event);
});

// A traditional NativeScript application starts by initializing global objects,
// setting up global CSS rules, creating, and navigating to the main page.
// Angular applications need to take care of their own initialization:
// modules, components, directives, routes, DI providers.
// A NativeScript Angular app needs to make both paradigms work together,
// so we provide a wrapper platform object, platformNativeScriptDynamic,
// that sets up a NativeScript application and can bootstrap the Angular framework.
platformNativeScriptDynamic().bootstrapModule(AppModule);

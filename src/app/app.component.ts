import {
  AfterViewInit,
  Component,
  OnInit,
  ViewChild,
  Injector,
  ComponentFactoryResolver,
  ApplicationRef, ElementRef
} from '@angular/core';
import { SeismicComponent } from './seismic/seismic.component';

import {WindowService} from "./window.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('container', { static: false }) container: ElementRef;
  @ViewChild(SeismicComponent, { static: true }) seismic: SeismicComponent;
  public _onCloseDialog: any;

  public _windowService: WindowService;

  constructor(public componentFactoryResolver: ComponentFactoryResolver,
              public appRef: ApplicationRef,
              public injector: Injector) {

    this._windowService = new WindowService(componentFactoryResolver, appRef, injector);

    this._onCloseDialog = function (type, dialog, args) {
      const area = dialog.getArea();

      dialog.off(WindowService.Events.onClose, this._onCloseDialog);
      if (args != null && args['componentType'] != null) {

        const componentType = args['componentType'];
        let component = this._windowService.findComponentByType(componentType);
        if (component == null) {
          component = this._windowService.createComponent(componentType);
        }
        if (component != null) {
          const options = args['options'];
          this.attachToComponent(component, this.seismic.getPipeline(), options);
        }
      }
    }.bind(this);
  }
  ngOnInit() {
  }

  ngAfterViewInit() {
    this._windowService.setMainComponent(this.seismic);
    this.seismic.setWindowService(this._windowService);
  }

  public attachToComponent (component, pipeline, options) {
    component.addArea(pipeline, options);
    return this;
  }
}

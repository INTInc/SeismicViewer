import {
  Injector,
  ComponentFactoryResolver,
  EmbeddedViewRef,
  ApplicationRef,
} from '@angular/core';

enum Events {
  /**
   * onClose
   * @type {string}
   */
  onClose = 'onClose'
}

export interface IWindow {
  setWindowService(windowService: WindowService);
}

export interface IDialog {
  initializeLayout(width, height);
  on(event, callback);
  close();
}

let WindowServiceInstance: WindowService = null;

/*@Injectable()*/
export class WindowService {
  public _activeDialogRef;
  public _seismicComponent;
  public _onCloseDialog;
  public _chartComponentsByType = {};
  public _chartComponents = [];

  constructor(
    public componentFactoryResolver: ComponentFactoryResolver,
    public appRef: ApplicationRef,
    public injector: Injector
  ) {
    WindowServiceInstance = this;

    this._onCloseDialog = function(type, dialog, args){
      this.appRef.detachView(this._activeDialogRef.hostView);
      this._activeDialogRef.destroy();
      this._activeDialogRef = null;

      this.unlock();
    }.bind(this);
  }
  static Events = Events;

  static getInstance():WindowService {
    return WindowServiceInstance;
  }

  public lock() {
    this._seismicComponent.setEnabled(false);
    return this;
  }
  public unlock() {
    this._seismicComponent.setEnabled(true);
    return this;
  }

  public setMainComponent(seismic) {
    this._seismicComponent = seismic;
    return this;
  }

  public removeComponent(componentInstance: any) {
    const component = this.findComponentByInstance(componentInstance);
    if (component == null) return this;

    this.removeComponentFromLayout(componentInstance);

    this.appRef.detachView(component.component.hostView);
    component.component.destroy();

    this._chartComponents[component.type] = null;
    let index = this._chartComponents.indexOf(component);
    this._chartComponents.splice(index, 1);

    return this;
  }

  public createComponent(componentType: any) {
    const component = this.appendComponentToBody(componentType);
    (component.instance as IWindow).setWindowService(this);

    //TODO create simple layout manager
    this.attachComponentToLayout(component);
    this._chartComponentsByType[componentType] = component.instance;
    this._chartComponents.push({
      type: componentType,
      component: component,
      instance: component.instance
    });
    return component.instance;
  }

  public attachComponentToLayout (component) {
    //TODO - move to Window Service
    this._seismicComponent.setLayout({
      'right': 610
    });
  }

  public removeComponentFromLayout (component) {
    this._seismicComponent.setLayout({
      'right': 10
    });
  }

  public findComponentByInstance (componentInstance) {
    for (let i = 0; i < this._chartComponents.length; i++) {
      if (this._chartComponents[i].instance == componentInstance){
        return this._chartComponents[i];
      }
    }
    return null;
  }

  public findComponentByType (componentType) {
    return this._chartComponentsByType[componentType];
  }

  public showDialog(dialog: any) {
    if (this._activeDialogRef != null) {
      (this._activeDialogRef.instance as IDialog).close();
    }
    this._activeDialogRef = null;
    const dialogRef = this.appendComponentToBody(dialog);

    if (dialogRef.instance != null) {
      this.lock();
      this._activeDialogRef = dialogRef;
      (dialogRef.instance as IDialog)
        .on(WindowService.Events.onClose, this._onCloseDialog)
        .initializeLayout(window.innerWidth, window.innerHeight);
    }
    return this._activeDialogRef;
  }



  public appendComponentToBody(component: any) {
    // Create a component reference from the component
    const componentRef = this.componentFactoryResolver
      .resolveComponentFactory(component)
      .create(this.injector);

    // Attach component to the appRef so that it's inside the ng component tree
    this.appRef.attachView(componentRef.hostView);

    // Get DOM element from component
    const domElem = (componentRef.hostView as EmbeddedViewRef<any>)
      .rootNodes[0] as HTMLElement;

    // Append DOM element to the body
    document.body.appendChild(domElem);

    return componentRef;
  }
}

module WindowService {
  export interface Events {
    /**
     * onClose
     * @type {string}
     */
    onClose: string;
  }
}

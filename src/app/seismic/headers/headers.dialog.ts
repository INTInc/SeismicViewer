import { EventDispatcher } from "@int/geotoolkit/util/EventDispatcher";
import { Input, Component, AfterViewInit, ViewChild, ElementRef, OnInit } from '@angular/core';

import {WindowService, IDialog} from "../../window.service";

let HeadersDialog_LAYOUT = {
  custom: false,
  top: 250,
  left: 200
};

@Component({
  selector: 'headers-dialog',
  templateUrl: './headers.dialog.html',
  styleUrls: ['./headers.dialog.css']
})

export class HeadersDialog extends EventDispatcher implements IDialog, OnInit, AfterViewInit {
  @ViewChild('headersGroup') headersGroup: ElementRef;

  @Input('left') left: number;
  @Input('top') top: number;
  public draggingWindow: boolean;
  public px: number;
  public py: number;
  public _onMouseUp: any;
  public _onMouseMove: any;

  public selectedTabIndex: number = 0;
  public auxiliaryHeaders: any;
  public axisHeaders: any;

  constructor() {
    super();
    this.top = HeadersDialog_LAYOUT.top;
    this.left = HeadersDialog_LAYOUT.left;

    this._onMouseUp = this.onMouseUp.bind(this);
    this._onMouseMove = this.onMouseMove.bind(this);

    this.auxiliaryHeaders = [];
    this.axisHeaders = [];
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
  }

  tabChange(event) {
    //https://github.com/angular/material2/issues/5269
    this.selectedTabIndex = event.index;
    //Promise.resolve().then(() => this.selectedTabIndex = event.index);
  }

  onMouseDown(event: MouseEvent) {
    this.draggingWindow = true;
    this.px = event.screenX;
    this.py = event.screenY;
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('mousemove', this._onMouseMove);
  }
  onMouseUp() {
    this.draggingWindow = false;
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('mousemove', this._onMouseMove);
  }

  onMouseMove(event: MouseEvent) {
    if (!this.draggingWindow) {
      return;
    }
    let offsetX = event.screenX - this.px;
    let offsetY = event.screenY - this.py;
    this.px = event.screenX;
    this.py = event.screenY;

    this.left += offsetX;
    this.top += offsetY;

    HeadersDialog_LAYOUT.custom = true;
    HeadersDialog_LAYOUT.top = this.top;
    HeadersDialog_LAYOUT.left = this.left;
  }

  public initializeLayout(width, height) {
    if (HeadersDialog_LAYOUT.custom === false) {
      this.top = (height - 600) / 2;
      this.left = (width - 600) / 2;

      HeadersDialog_LAYOUT.top = this.top;
      HeadersDialog_LAYOUT.left = this.left;
    }
  }

  public close() {
    this.notify(WindowService.Events.onClose, this, null);
  }

  public apply() {
    this.notify(WindowService.Events.onClose, this, this.getOptions());
  }

  public getHeaders(allHeaders, activeHeaders) {
    let availableHeaders = [];
    const findHeaderByName = function (headerName) {
      for(let headerKey in activeHeaders) {
        if (activeHeaders.hasOwnProperty(headerKey)) {
          let headerInfo = activeHeaders[headerKey];
          if (headerKey == headerName) {
            return headerInfo;
          }
        }
      }
      return null;
    };
    for(let i = 0; i < allHeaders.length; i++) {
      let headerFieldInfo = {
        'id': allHeaders[i].getIdentifier(),
        'name' : allHeaders[i].getName(),
        'title': allHeaders[i].getTitle(),
        'isEnabled': false,
        'color': 'transparent'
      };
      let headerInfo = findHeaderByName(allHeaders[i].getName());
      if (headerInfo != null) {
        headerFieldInfo['color'] = headerInfo['color'];
        headerFieldInfo['isEnabled'] = true;
      }
      availableHeaders.push(headerFieldInfo)
    }
    return availableHeaders;
  }

  public setOptions(options) {
    const allHeaders = options['availableheaders'];
    this.auxiliaryHeaders = this.getHeaders(allHeaders, options['auxiliary-headers']);
    this.axisHeaders = this.getHeaders(allHeaders, options['axis-headers']);
    return this;
  }

  public getOptions() {
    const collectHeaders = function (headerOptions) {
      let activeHeaders = [];
      for (let i = 0; i < headerOptions.length; i++) {
        let header = headerOptions[i];
        if (header['isEnabled'] === true) {
          activeHeaders.push(header);
        }
      }
      return activeHeaders;
    };

    return {
      'auxiliary-headers': collectHeaders(this.auxiliaryHeaders),
      'axis-headers': collectHeaders(this.axisHeaders)
    };
  }
}

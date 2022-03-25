import {Component, OnInit, Input} from '@angular/core';
import {Utils} from "../../utils";

@Component({
  selector: 'app-header-properties',
  templateUrl: './header.properties.html',
  styleUrls: ['./header.properties.css']
})
export class HeaderProperties implements OnInit{
  public _selectedColor: string = 'transparent';
  public _isExpanded: boolean = false;
  public _isEnabled: boolean = false;
  public _headerName: string = 'Header name';
  @Input('header') _headerOptions: any;
  @Input('default-color') _defaultColor: any = null;

  constructor(){
  }
  ngOnInit() {
    if(this._headerOptions != null) {
      if(this._headerOptions['color'] != null){
        this._selectedColor = this._headerOptions['color'];
      }
      this._isEnabled = this._headerOptions['isEnabled'] === true;
      this._isExpanded = this._isEnabled === true;
      this._headerName = this._headerOptions['name'];
    }
  }

  onChecked() {
    if(this._headerOptions != null) {
      this._headerOptions['isEnabled'] = this._isEnabled;

      if (this._isEnabled && this._selectedColor == 'transparent') {
        this.SelectedColor = this._defaultColor || Utils.getRandomRgbColor();
      }
    }
  }

  public set SelectedColor(color: any) {
    this._selectedColor = color;
    if ( this._headerOptions != null) {
      this._headerOptions['color'] = color;
    }
  }

  public get SelectedColor(): any {
    return this._selectedColor;
  }

  applyColor(color) {
    this.SelectedColor = color;
  }
}

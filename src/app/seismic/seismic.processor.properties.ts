import {Component, OnInit, Input} from '@angular/core';

@Component({
  selector: 'app-seismic-processor-properties',
  templateUrl: './seismic.processor.properties.html',
  styleUrls: ['./seismic.processor.properties.css']
})
export class ProcessorProperties implements OnInit{
  public _isExpanded: boolean = false;
  public _isEnabled: boolean = false;
  public _processorName: string = 'Processor name';
  public _processorDescription: string = 'Processor name';
  @Input('processor') _processorOptions: any;

  constructor(){
  }
  ngOnInit() {
    if(this._processorOptions != null) {
      this._isEnabled = this._processorOptions['isEnabled'] === true;
      this._isExpanded = this._isEnabled === true;
      this._processorName = this._processorOptions['name'];
      this._processorDescription = this._processorOptions['description'];
    }
  }

  onChecked() {
    if(this._processorOptions != null) {
      this._processorOptions['isEnabled'] = this._isEnabled;
    }
  }
}

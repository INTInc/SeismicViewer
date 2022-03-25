import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';

import { MatTooltipModule} from '@angular/material';
import { MatButtonModule } from '@angular/material';
import { MatExpansionModule} from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatGridListModule } from '@angular/material/grid-list';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';

import { AppComponent } from './app.component';
import { ColorPickerComponent } from "./color-picker/color-picker.component";

import { SeismicComponent } from './seismic/seismic.component';
import { SeismicProperties } from "./seismic/seismic.properties";
import { HeadersDialog } from "./seismic/headers/headers.dialog";
import { HeaderProperties } from "./seismic/headers/header.properties";

import {ProcessorProperties} from "./seismic/seismic.processor.properties";

@NgModule({
  declarations: [
    AppComponent,

    ColorPickerComponent,

    SeismicComponent,
    ProcessorProperties,
    SeismicProperties,
    HeadersDialog,
    HeaderProperties,
  ],
  imports: [
    FormsModule,
    BrowserModule,
    BrowserAnimationsModule,
    MatCardModule,
    MatExpansionModule,
    MatSelectModule,
    MatInputModule,
    MatRadioModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatTabsModule,
    MatChipsModule,
    MatButtonModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatGridListModule
  ],
  providers: [],
  bootstrap: [AppComponent],
  entryComponents: [
    ProcessorProperties,
    SeismicProperties,
    HeadersDialog,
    HeaderProperties,
  ]
})
export class AppModule { }

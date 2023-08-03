import { EventDispatcher } from '@int/geotoolkit/util/EventDispatcher';
import { SeismicColors } from '@int/geotoolkit/seismic/util/SeismicColors';
import { NormalizationType } from '@int/geotoolkit/seismic/pipeline/NormalizationType';
import { Range } from '@int/geotoolkit/util/Range';
import { Input, Component, AfterViewInit, OnInit } from '@angular/core';

import {WindowService, IDialog} from '../window.service';
import { SeismicPipeline } from '@int/geotoolkit/seismic/pipeline/SeismicPipeline';
import { InterpolationType } from '@int/geotoolkit/seismic/pipeline/InterpolationType';
import { SeismicImage } from '@int/geotoolkit/seismic/image/SeismicImage';

const round = function(number: number): number {
  return Math.round(number * 100) / 100;
};

const SeismicProperties_LAYOUT = {
  custom: false,
  top: 250,
  left: 200
};

@Component({
  selector: 'seismic-properties',
  templateUrl: './seismic.properties.html',
  styleUrls: ['./seismic.properties.css']
})

export class SeismicProperties extends EventDispatcher implements IDialog, OnInit, AfterViewInit {
  public tracesPerInch: number;
  public inchesPerSecond: number;
  public interpolationType: InterpolationType;

  public normalizationType: NormalizationType;
  public scale: number;
  public minLimit: string;
  public maxLimit: string;

  public isWiggle: boolean;
  public isNegativeFill: boolean;
  public isPositiveFill: boolean;
  public isNegativeColorFill: boolean;
  public isPositiveColorFill: boolean;
  public isSimpleDensity: boolean;
  public isInterpolatedDensity: boolean;

  public clippingFactor: number;
  public decimationSpacing: number;
  public selectedColormap: any;
  public selectedColormap_URL: string;

  @Input('left') left: number;
  @Input('top') top: number;
  public draggingWindow: boolean;
  public px: number;
  public py: number;
  public _onMouseUp: any;
  public _onMouseMove: any;

  public availableColorMaps: any;
  public selectedTabIndex = 0;
  public processors: {
    name: string,
    description: string,
    isEnabled: boolean
  }[] = [];

  constructor() {
    super();
    this.top = SeismicProperties_LAYOUT.top;
    this.left = SeismicProperties_LAYOUT.left;

    this._onMouseUp = this.onMouseUp.bind(this);
    this._onMouseMove = this.onMouseMove.bind(this);

    const colorProvider = SeismicColors.getDefault();
    const colorMaps = colorProvider.listNameColorMaps();
    const availableColorMaps = [];
    for (let i = 0; i < colorMaps.length; i++) {
      const colorMap = colorProvider.createNamedColorMap(colorMaps[i], 320);
      const surface = colorMap.exportToImage(140, 10, false);

      availableColorMaps.push({
        name: colorMaps[i],
        URL: surface.getBase64()
      });
    }
    this.availableColorMaps = availableColorMaps;
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
  }

  tabChange(event) {
    // https://github.com/angular/material2/issues/5269
    this.selectedTabIndex = event.index;
    // Promise.resolve().then(() => this.selectedTabIndex = event.index);
  }

  isNormalizationLimits() {
    return this.normalizationType === NormalizationType.Limits;
  }

  onMouseDown(event: MouseEvent) {
    this.draggingWindow = true;
    this.px = event.screenX;
    this.py = event.screenY;
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('mousemove', this._onMouseMove);
  }
  onMouseUp(event: MouseEvent) {
    this.draggingWindow = false;
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('mousemove', this._onMouseMove);
  }

  onMouseMove(event: MouseEvent) {
    if (!this.draggingWindow) {
      return;
    }
    const offsetX = event.screenX - this.px;
    const offsetY = event.screenY - this.py;
    this.px = event.screenX;
    this.py = event.screenY;

    this.left += offsetX;
    this.top += offsetY;

    SeismicProperties_LAYOUT.custom = true;
    SeismicProperties_LAYOUT.top = this.top;
    SeismicProperties_LAYOUT.left = this.left;
  }

  public initializeLayout(width, height) {
    if (SeismicProperties_LAYOUT.custom === false) {
      this.top = (height - 600) / 2;
      this.left = (width - 600) / 2;

      SeismicProperties_LAYOUT.top = this.top;
      SeismicProperties_LAYOUT.left = this.left;
    }
  }

  public close() {
    this.notify(WindowService.Events.onClose, this, null);
  }

  public apply() {
    this.notify(WindowService.Events.onClose, this, this.getOptions());
  }

  onColorMapChanged(event) {
    const colorProvider = SeismicColors.getDefault();
    for (let i = 0; i < this.availableColorMaps.length; i++) {
      const colorMap = this.availableColorMaps[i];
      if (this.selectedColormap === colorMap.name) {

        this.selectedColormap_URL = (colorProvider.createNamedColorMap(colorMap.name, 320)
          .exportToImage(155, 10, false) as any)
          .getCanvas()
          .toDataURL();
        break;
      }
    }
  }

  public setOptions(options: {
    processors: {
      name: string,
      description: string,
      isEnabled: boolean
    }[],
    normalization: SeismicPipeline.Options['normalization'],
    interpolation: SeismicPipeline.Options['interpolation'],
    scale: {
      tracescale: SeismicImage.ScaleOptions['tracescale'],
      samplescale: SeismicImage.ScaleOptions['samplescale']
    },
    colors: SeismicPipeline.Options['colors'],
    plot: SeismicPipeline.Options['plot']
  }) {
    this.processors = options['processors'];

    this.tracesPerInch = round(options['scale']['tracescale']);
    this.inchesPerSecond = round(options['scale']['samplescale']);
    this.interpolationType =  options['interpolation']['type'];

    this.normalizationType =  options['normalization']['type'];
    this.scale = options['normalization']['scale'];
    this.minLimit = (options['normalization']['limits'] as Range).getLow().toFixed(2);
    this.maxLimit = (options['normalization']['limits'] as Range).getHigh().toFixed(2);

    this.isWiggle = options['plot']['type']['wiggle'];
    this.isNegativeFill = options['plot']['type']['negativefill'];
    this.isPositiveFill = options['plot']['type']['positivefill'];
    this.isNegativeColorFill = options['plot']['type']['negativecolorfill'];
    this.isPositiveColorFill = options['plot']['type']['positivecolorfill'];
    this.isSimpleDensity = options['plot']['type']['simpledensity'];
    this.isInterpolatedDensity = options['plot']['type']['interpolateddensity'];

    this.clippingFactor = options['plot']['clippingfactor'];
    this.decimationSpacing = options['plot']['decimationspacing'];

    const selectedColorMap = options['colors']['colormap'];
    const colorProvider = SeismicColors.getDefault();
    for (let i = 0; i < this.availableColorMaps.length; i++) {
      const colorMap = this.availableColorMaps[i];
      if (selectedColorMap === colorMap.name) {
        this.selectedColormap = colorMap.name;

        this.selectedColormap_URL = colorProvider.createNamedColorMap(colorMap.name, 320)
          .exportToImage(155, 10, false)
          .getBase64();
        break;
      }
    }
    return this;
  }

  public getOptions(): {processors: {
    name: string,
    description: string,
    isEnabled: boolean
  }[], scale: SeismicImage.ScaleOptions, options: SeismicPipeline.Options} {
    return {
      'processors': this.processors,
      'scale': {
        'tracescale': round(Number(this.tracesPerInch)),
        'samplescale': round(Number(this.inchesPerSecond))
      },
      'options': {
        'interpolation': {
          'traces': {
            'type': this.interpolationType
          }
        },
        'normalization': {
          'type': this.normalizationType,
          'scale': Number(this.scale),
          'limits': new Range(Number(this.minLimit), Number(this.maxLimit))
        },
        'plot': {
          'clippingfactor': Number(this.clippingFactor),
          'decimationspacing': Number(this.decimationSpacing),
          'type': {
            'wiggle': this.isWiggle,
            'negativefill': this.isNegativeFill,
            'positivefill': this.isPositiveFill,
            'negativecolorfill': this.isNegativeColorFill,
            'positivecolorfill': this.isPositiveColorFill,
            'simpledensity': this.isSimpleDensity,
            'interpolateddensity': this.isInterpolatedDensity
          }
        },
        'colors': {
          'colormap': this.selectedColormap
        }
      }
    };
  }
}

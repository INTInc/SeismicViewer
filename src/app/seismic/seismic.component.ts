import '@int/geotoolkit/bootstrap/polyfill';
import { init } from '@int/geotoolkit/base';
import { EventDispatcher } from '@int/geotoolkit/util/EventDispatcher';
import { SeismicPipeline } from '@int/geotoolkit/seismic/pipeline/SeismicPipeline';
import { Plot } from '@int/geotoolkit/plot/Plot';
import { SeismicWidget } from '@int/geotoolkit/seismic/widgets/SeismicWidget';
import { ToolsContainer } from '@int/geotoolkit/controls/tools/ToolsContainer';
import { NormalizationType } from '@int/geotoolkit/seismic/pipeline/NormalizationType';
import { Range } from '@int/geotoolkit/util/Range';
import { SeismicColors } from '@int/geotoolkit/seismic/util/SeismicColors';
import { AGC } from '@int/geotoolkit/seismic/pipeline/processor/AGC';
import { Reverse } from '@int/geotoolkit/seismic/pipeline/processor/Reverse';
import { RemoteSeismicDataSource } from '@int/geotoolkit/seismic/data/RemoteSeismicDataSource';
import { Group } from '@int/geotoolkit/scene/Group';
import { VerticalBoxLayout } from '@int/geotoolkit/layout/VerticalBoxLayout';
import { Alignment } from '@int/geotoolkit/layout/BoxLayout';
import { Text } from '@int/geotoolkit/scene/shapes/Text';
import { Events as LayoutEvents } from '@int/geotoolkit/layout/Events';
import { LineStyle } from '@int/geotoolkit/attributes/LineStyle';
import { Events as CrossHairEvents } from '@int/geotoolkit/controls/tools/CrossHair';
import { ColorBarLocation } from '@int/geotoolkit/controls/shapes/ColorBarLocation';
import { TextStyle } from '@int/geotoolkit/attributes/TextStyle';
import {JSLoader as JSCompression} from '@int/geotoolkit/seismic/data/compression/JSLoader';
import {WasmLoader as WasmCompression} from '@int/geotoolkit/seismic/data/compression/WasmLoader';
import {JSLoader as JSFilters} from '@int/geotoolkit/seismic/analysis/filters/JSLoader';
import {WasmLoader as WasmFilters} from '@int/geotoolkit/seismic/analysis/filters/WasmLoader';
import { Component, AfterViewInit, ViewChild, ElementRef, HostListener, OnInit, Input } from '@angular/core';
import { IWindow, WindowService } from '../window.service';
import { SeismicProperties } from './seismic.properties';
import { HeadersDialog } from './headers/headers.dialog';
import {TraceHeaderChartWidget} from '@int/geotoolkit/seismic/widgets/TraceHeaderChartWidget';
import ChartOptions = TraceHeaderChartWidget.ChartOptions;

init({
  'imports': [
      JSCompression,
      WasmCompression,
      JSFilters,
      WasmFilters
  ]
});

@Component({
  selector: 'app-seismic',
  templateUrl: './seismic.component.html',
  styleUrls: ['./seismic.component.css']
})
export class SeismicComponent extends EventDispatcher implements IWindow, OnInit, AfterViewInit {
  @ViewChild('card') card: ElementRef;
  @ViewChild('plot') canvas: ElementRef;
  @ViewChild('plothost') plotHost: ElementRef;
  @Input('left') left: number;
  @Input('top') top: number;
  @Input('right') right: number;
  @Input('bottom') bottom: number;

  @Input('isTable') isTable: boolean;

  public _windowService: WindowService;
  public _onCloseDialog: any;
  public pipeline: SeismicPipeline;
  public plot: Plot;
  public seismicWidget: SeismicWidget;
  public _toolsContainer: ToolsContainer;

  public _onActiveStateListener: any;
  public _onCreateArea: any;
  public _onAreaCreated: any;
  private _charts: [];
  constructor() {
    super();
  }

  public static createPipeline(reader): SeismicPipeline {
    const pipeline = new SeismicPipeline({
      'name': 'Seismic',
      'reader': reader,
      'statistics': reader.getStatistics()
    })
      .setOptions({
        'normalization': {
          'type': NormalizationType.Limits,
          'scale': -1,
          'limits': new Range(-15000, 15000)
        },
        'plot': {
          'type': {
            'wiggle': false,
            'interpolateddensity': true
          },
          'decimationspacing': 5
        },
        'colors': {
          'colormap': SeismicColors.getDefault().createNamedColorMap('WhiteBlack', 256)
        }
      })
      .addTraceProcessor(new AGC({ 'apply': true, 'name': 'AGC' }))
      .addTraceProcessor(new Reverse({ 'apply': false, 'name': 'Reverse' }));
    return pipeline;
  }

  public static createSectionQuery(position, key, oppositeKey) {
    if (key.key === 'TraceNumber') {
      // 2D seismic does not need the query
      return {
        'workflow': 'HaarWavelets U',
        'error': 2,
        'agc': true
      };
    }

    const selectKeys = [];
    selectKeys[0] = {
      'name': key['key'],
      'min': position,
      'max': position,
      'step': key['increment'],
      'order': 'asc'
    };

    selectKeys[1] = {
      'name': oppositeKey['key'],
      'min': oppositeKey['min'],
      'max': oppositeKey['max'],
      'step': oppositeKey['increment'],
      'order': 'asc'
    };
    return {
      'workflow': 'HaarWavelets U',
      'error': 2,
      'agc': true,
      'keys': selectKeys,
      'options': null,
      'emptyTracesKey': {
        'name': oppositeKey['key'],
        'min': oppositeKey['min'],
        'max': oppositeKey['max']
      }
    };
  }
  ngOnInit() {
  }

  ngAfterViewInit() {
    this.createReader((reader) => {
      this.initializePlot(reader);
      this.updateState();
    }, () => { });

    this.resize(null);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.resize(event);
  }

  setWindowService(windowService: WindowService): SeismicComponent {
    this._windowService = windowService;
    return this;
  }

  public setLayout(layout) {
    if (layout.hasOwnProperty('left')) {
      this.left = layout['left'];
    }
    if (layout.hasOwnProperty('top')) {
      this.top = layout['top'];
    }
    if (layout.hasOwnProperty('right')) {
      this.right = layout['right'];
    }
    if (layout.hasOwnProperty('bottom')) {
      this.bottom = layout['bottom'];
    }

    setTimeout(() => { this.resize(); }, 100);
    return this;
  }
  public createReader(onready, onfailure) {
    const host = 'https://demo.int.com/INTGeoServer/json';
    const data = new RemoteSeismicDataSource({
      'host': host,
      'file': 'data/seismic/WG152D0002-00007A508-PSTM_RAW-FULL_STK-248666312.xgy',
      'version': 2
    });
    data.open(
      function () {
        const keys = data.getKeys();
        const key = keys[0]; // INLINE
        const oppositeKey = keys[1]; // XLINE
        // request the fist INLINE
        const query = SeismicComponent.createSectionQuery(key['min'], key, oppositeKey);
        data.select(query, function (reader) {
          onready(reader);
        });
      }.bind(this), function (err) {
        onfailure(err);
      }
    );
  }

  public initializePlot(reader) {
    const GraphHeight = 100;
    // Create a reader
    this.pipeline = SeismicComponent.createPipeline(reader);
    const textOptions: Text.Options = {
      'text': 'WG152D0002-00007A508-PSTM_RAW-FULL_STK-248666312.xgy',
      'ax': 0.5,
      'ay': 0.5,
      'sizeisindevicespace': true,
      'textstyle': {
        'color': '#757575',
        'font': '13px Roboto'
      }
    };
    const text = new Text(textOptions).setLayoutStyle({
      'height': 20
    });
    this.plot = new Plot({
      'canvaselement': this.canvas.nativeElement,
      'root': new Group()
        .setAutoModelLimitsMode(true)
        .setLayout(new VerticalBoxLayout(null, Alignment.Left))
        .addChild([
          text,
          // create seismic
          this.seismicWidget = this.createSeismicWidget(this.pipeline)
        ]),
      'autoupdate': true
    });
    this.setActiveHeaders([{
      'name': 'CDP',
      'color': 'gray'
    }]);
    this.seismicWidget.on(LayoutEvents.LayoutInvalidated, this.updateState.bind(this));

    // init tools container to support interactions with widget
    this.initializeCrossHairCursor(this.seismicWidget);

    this._onActiveStateListener = (sender, eventArgs) => {
      const seismicCrossHair = this.seismicWidget.getToolByName('cross-hair');
      seismicCrossHair.setEnabled(true);
    };

    this._toolsContainer = new ToolsContainer(this.plot)
      .add([
        this.seismicWidget.getTool()
      ]);
    this.plot.setSize(this.plotHost.nativeElement.clientWidth, this.plotHost.nativeElement.clientHeight);
    return this;
  }

  public getPipeline(): SeismicPipeline {
    return this.pipeline;
  }

  public initializeCrossHairCursor(seismicWidget) {
    // customize widget tools
    const lineStyle = new LineStyle({
      color: 'red',
      width: 1,
      pixelsnapmode: {
        x: true,
        y: true
      }
    });
    const seismicCrossHair = seismicWidget.getToolByName('cross-hair')
      .setVerticalLineStyle(lineStyle)
      .setHorizontalLineStyle(null);

    const onPositionChanged = function (sender, eventArgs) {
      const position = eventArgs.getPosition().getX();
      if (isNaN(position)) {
        seismicCrossHair.setVisible(false);
        return;
      }
      seismicCrossHair.setVisible(true);
    };
    seismicCrossHair.addListener(CrossHairEvents.onPositionChanged, onPositionChanged);
  }
  public isChartVisible() {
    return this.seismicWidget && this.seismicWidget.getOptions()['auxiliarychart']['visible'] === true;
  }
  public toggleChartWidget(addDefaultChart: boolean) {
    const isChartVisible = this.seismicWidget.getOptions()['auxiliarychart']['visible'] === true;
    const charts = this.seismicWidget.getOptions()['auxiliarychart']['charts'];
    if (charts.length === 0) {
      const chartOptions: ChartOptions = {
        'visible': true,
        'name': 'CDP',
        'linestyle': new LineStyle('#205193'),
      };
      charts.push(chartOptions);
    }
    this.seismicWidget.setOptions({
      'auxiliarychart': {
          'visible': !isChartVisible,
          'charts': charts
      }
    });
    return this;
  }

  public createSeismicWidget(pipeline: SeismicPipeline): SeismicWidget {
    const widget = new SeismicWidget({
      'pipeline': pipeline,
      'table': {
        'size': 200,
        'visible': false
      },
      'colorbar': {
        'location': ColorBarLocation.West,
        'maxheight': '80%',
        'alignment': Alignment.Top
      },
      'auxiliarychart': {
        'size': 120,
        'visible': false,
        'title': {
            'text': 'Auxiliary Chart',
            'textstyle': {
                'font': '16px Roboto',
                'color': 'gray'
            },
            'size': 20
        },
        'charts': this._charts
      }
    })
      .setAnnotationSize({ 'west': 120 })
      .setScaleOptions({
        'tracescale': 400,
        'samplescale': 2,
        'deviceunit': 'in',
        'sampleunit': 's'
      }) as SeismicWidget;
    return widget;
  }

  public resize(event?) {
    if (this.plot) {
      this.plot.setSize(this.plotHost.nativeElement.clientWidth, this.plotHost.nativeElement.clientHeight);
    }
  }

  public zoomIn(): SeismicComponent {
    this.seismicWidget.zoomIn();
    return this;
  }

  public zoomOut(): SeismicComponent {
    this.seismicWidget.zoomOut();
    return this;
  }

  public toggleTable(): SeismicComponent {
    const isTableVisible = this.seismicWidget.getOptions()['table']['visible'] === true;
    this.seismicWidget.setOptions({
      'table': {
        'visible': !isTableVisible
      }
    });
    return this;
  }

  public setActiveHeaders(axisHeaders): SeismicComponent {
    const activeHeaders = this.seismicWidget.getTraceHeaders();
    const findHeader = function (headerName) {
      for (let i = 0; i < axisHeaders.length; i++) {
        if (axisHeaders[i]['name'] === headerName) {
          return axisHeaders[i];
        }
      }
      return null;
    };

    let headerField;
    for (let i = 0; i < axisHeaders.length; i++) {
      headerField = this.seismicWidget.getTraceHeader(axisHeaders[i]['name']);
      if (activeHeaders.indexOf(axisHeaders[i]['name']) === -1) {
        this.seismicWidget.setTraceHeaderVisible(headerField, true);
      }
      const headerInfo = this.seismicWidget.getTraceHeaderAxis(headerField);
      if (headerInfo) {
        const color = axisHeaders[i]['color'];
        const lineStyle = LineStyle.fromObject(color);
        const textStyle = TextStyle.fromObject(color);
        headerInfo['label'].setTextStyle(textStyle);
        headerInfo['axis']
          .getTickGenerator()
          .setTickStyle('MAJOR', lineStyle)
          .setLabelStyle('MAJOR', textStyle);
        headerInfo['axis'].invalidate();
      }
    }

    for (let i = 0; i < activeHeaders.length; i++) {
      if (findHeader(activeHeaders[i]) == null) {
        headerField = this.seismicWidget.getTraceHeader(activeHeaders[i]);
        this.seismicWidget.setTraceHeaderVisible(headerField, false);
      }
    }
    return this;
  }

  public addRemoveHeaders(): SeismicComponent {
    const availableHeaders = this.seismicWidget.getPipeline().getReader().getTraceHeaderFields();

    const axisHeaders = {};
    for (let i = 0; i < availableHeaders.length; i++) {
      const header = availableHeaders[i];

      const headerInfo = this.seismicWidget.getTraceHeaderAxis(header);
      if (headerInfo) {
        axisHeaders[header.getName()] = {
          'color': headerInfo['label'].getTextStyle().getColor()
        };
      }
    }

    const headersOptions = {
      'availableheaders': availableHeaders,
      'auxiliary-headers': this._charts,
      'axis-headers': axisHeaders
    };

    this._onCloseDialog =  (type, dialog, args) => {
      dialog.off(WindowService.Events.onClose, this._onCloseDialog);
      if (args == null) {
        return;
      }
      if (args['axis-headers'] != null) {
        this.setActiveHeaders(args['axis-headers']);
      }
      if (args['auxiliary-headers']) {
        this._charts = args['auxiliary-headers'];
        this.seismicWidget.setOptions({
          'auxiliarychart': {
            'visible': this._charts.length > 0,
            'charts': this._charts
          }
        });
      }
    };

    const headersDialog = WindowService.getInstance().showDialog(HeadersDialog);
    if (headersDialog.instance) {
      (headersDialog.instance)
        .setOptions(headersOptions)
        .on(WindowService.Events.onClose, this._onCloseDialog);
    }
    return this;
  }

  public showProperties(): SeismicComponent {
    this._onCloseDialog = (type, dialog, args) => {
      dialog.off(WindowService.Events.onClose, this._onCloseDialog);
      if (args != null && args['options'] != null) {
        const seismicOptions = args['options'];
        const scaleOptions = seismicOptions['scale'];

        const pipeline = this.seismicWidget.getPipeline();
        const processors = args['processors'];
        let processorsHasBeenChanged = false;
        for (let i = 0; i < processors.length; i++) {
          const processorInfo = processors[i];
          for (let j = 0; j < pipeline.getTraceProcessorsCount(); j++) {
            const processor = pipeline.getTraceProcessor(j);
            if (processor.getName() === processorInfo['name'] && processor.isApplicable() !== processorInfo['isEnabled']) {
              processor.apply(processorInfo['isEnabled']);
              processorsHasBeenChanged = true;
              break;
            }
          }
        }

        pipeline.setOptions(seismicOptions);
        this.seismicWidget.setScaleOptions({
          'tracescale': scaleOptions['tracescale'],
          'samplescale': scaleOptions['samplescale']
        });

        if (processorsHasBeenChanged) {
          pipeline.refresh();
        }
      }
    };

    const seismicProperties = this._windowService.showDialog(SeismicProperties);
    if (seismicProperties.instance) {
      const pipeline = this.seismicWidget.getPipeline();
      const seismicOptions = pipeline.getOptions();
      const scaleOptions = this.seismicWidget.getScaleOptions();

      const processors = [];
      for (let i = 0; i < pipeline.getTraceProcessorsCount(); i++) {
        const processor = pipeline.getTraceProcessor(i);
        processors.push({
          'name': processor.getName(),
          'description': '',
          'isEnabled': processor.isApplicable()
        });
      }

      (seismicProperties.instance)
        .setOptions({
          'processors': processors,
          'normalization': seismicOptions['normalization'],
          'interpolation': seismicOptions['interpolation'],
          'scale': {
            'tracescale': scaleOptions['tracescale'],
            'samplescale': scaleOptions['samplescale']
          },
          'colors': seismicOptions['colors'],
          'plot': seismicOptions['plot']
        })
        .on(WindowService.Events.onClose, this._onCloseDialog);
    }
    return this;
  }
  public updateState() {
    const isTableVisible = this.seismicWidget.getOptions()['table']['visible'] === true;
    this.isTable = isTableVisible;
    return this;
  }
}

import "@int/geotoolkit/bootstrap/polyfill";
import { init } from "@int/geotoolkit/base";
import { EventDispatcher } from "@int/geotoolkit/util/EventDispatcher";
import { SeismicPipeline } from "@int/geotoolkit/seismic/pipeline/SeismicPipeline";
import { Plot } from "@int/geotoolkit/plot/Plot";
import { SeismicWidget } from "@int/geotoolkit/seismic/widgets/SeismicWidget";
import { ViewSynchronizer } from "@int/geotoolkit/widgets/sync/ViewSynchronizer";
import { ToolsContainer } from "@int/geotoolkit/controls/tools/ToolsContainer";
import { NormalizationType } from "@int/geotoolkit/seismic/pipeline/NormalizationType";
import { Range } from "@int/geotoolkit/util/Range";
import { SeismicColors } from "@int/geotoolkit/seismic/util/SeismicColors";
import { AGC } from "@int/geotoolkit/seismic/pipeline/processor/AGC";
import { Reverse } from "@int/geotoolkit/seismic/pipeline/processor/Reverse";
import { RemoteSeismicDataSource } from "@int/geotoolkit/seismic/data/RemoteSeismicDataSource";
import { Group } from "@int/geotoolkit/scene/Group";
import {Events as NodeEvents} from '@int/geotoolkit/scene/Node';
import { VerticalBoxLayout } from "@int/geotoolkit/layout/VerticalBoxLayout";
import { Alignment } from "@int/geotoolkit/layout/BoxLayout";
import { Text } from "@int/geotoolkit/scene/shapes/Text";
import { Events as Events__geo__ } from "@int/geotoolkit/layout/Events";
import { Events as Events__geo__0 } from "@int/geotoolkit/controls/tools/AbstractTool";
import { SyncMode } from "@int/geotoolkit/widgets/sync/SyncMode";
import { LineStyle } from "@int/geotoolkit/attributes/LineStyle";
import { Point } from "@int/geotoolkit/util/Point";
import { Events as Events__geo__1 } from "@int/geotoolkit/controls/tools/CrossHair";
import { ColorBarLocation } from "@int/geotoolkit/controls/shapes/ColorBarLocation";
import { TextStyle } from "@int/geotoolkit/attributes/TextStyle";
import {JSLoader as JSCompression} from '@int/geotoolkit/seismic/data/compression/JSLoader';
import {WasmLoader as WasmCompression} from '@int/geotoolkit/seismic/data/compression/WasmLoader';
import {JSLoader as JSFilters} from '@int/geotoolkit/seismic/analysis/filters/JSLoader';
import {WasmLoader as WasmFilters} from '@int/geotoolkit/seismic/analysis/filters/WasmLoader';
import { Component, AfterViewInit, ViewChild, ElementRef, HostListener, OnInit, Input } from '@angular/core';
import { AuxiliaryChart } from './auxiliarychart';
import { IWindow, WindowService } from "../window.service";
import { SeismicProperties } from "./seismic.properties";
import { HeadersDialog } from "./headers/headers.dialog";

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
  public chartWidget: AuxiliaryChart;
  public synchronizer: ViewSynchronizer;

  public _toolsContainer: ToolsContainer;

  public _onActiveStateListener: any;
  public _onCreateArea: any;
  public _onAreaCreated: any;

  constructor() {
    super();
  }

  ngOnInit() {
    
  }

  ngAfterViewInit() {
    this.createReader(function (reader) {
      this.initializePlot(reader);
      this.updateState();
    }.bind(this), function () { });

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
    if (layout.hasOwnProperty('left')) this.left = layout['left'];
    if (layout.hasOwnProperty('top')) this.top = layout['top'];
    if (layout.hasOwnProperty('right')) this.right = layout['right'];
    if (layout.hasOwnProperty('bottom')) this.bottom = layout['bottom'];

    setTimeout(() => { this.resize(); }, 100);
    return this;
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
            'Wiggle': false,
            'InterpolatedDensity': true
          },
          'decimationSpacing': 5
        },
        'colors': {
          'colorMap': SeismicColors.getDefault().createNamedColorMap('WhiteBlack', 256)
        }
      })
      //.addTraceProcessor(new geotoolkit.seismic.analysis.filters.TaperFilterProcess({'apply': false, 'name': 'TaperFilter'}))
      .addTraceProcessor(new AGC({ 'apply': true, 'name': 'AGC' }))
      .addTraceProcessor(new Reverse({ 'apply': false, 'name': 'Reverse' }));
    return pipeline;
  }

  public static createSectionQuery(position, key, oppositeKey) {
    if (key.key == 'TraceNumber') {
      //2D seismic does not need the query
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

    this.plot = new Plot({
      'canvasElement': this.canvas.nativeElement,
      'root': new Group()
        .setAutoModelLimitsMode(true)
        .setLayout(new VerticalBoxLayout(null, Alignment.Left))
        .addChild([
          new Text({
            'text': 'WG152D0002-00007A508-PSTM_RAW-FULL_STK-248666312.xgy',
            'ax': 0.5,
            'ay': 0.5,
            'sizeIsInDeviceSpace': true,
            'textStyle': {
              'color': '#757575',
              'font': '13px Roboto'
            }
          }).setLayoutStyle({
            'height': 20
          }),
          // Create a seismic chart widget and customize data series to display trace headers
          this.chartWidget = this.createChartWidget(this.pipeline)
            .setLayoutStyle({
              'height': GraphHeight
            })// as AuxiliaryChart,
            .setVisible(false) as AuxiliaryChart,
          // create seismic
          this.seismicWidget = this.createSeismicWidget(this.pipeline)
        ]),
      'autoUpdate': true
    });
    this.setActiveHeaders([{
      'name': 'CDP',
      'color': 'gray'
    }]);
    this.seismicWidget.on(Events__geo__.LayoutInvalidated, this.updateState.bind(this));

    // init tools container to support interactions with widget
    this.initializeCrossHairCursor(this.seismicWidget, this.chartWidget);

    this._onActiveStateListener = function (sender, eventArgs) {
      const seismicCrossHair = this.seismicWidget.getToolByName('crosshair');
      seismicCrossHair.setEnabled(true);
    }.bind(this);
    
    this._toolsContainer = new ToolsContainer(this.plot)
      .add([
        this.chartWidget.getTool(),
        this.seismicWidget.getTool()
      ]);


    // init view synchronizer
    // geotoolkit.widgets.sync.SyncMode.VisibleRange
    this.synchronizer = new ViewSynchronizer({ 'mode': [SyncMode.VisibleRange] })
      .connect(this.chartWidget, {
        'horizontal': true,
        'vertical': false,
        'ignoreModelLimits': true // visible limits will not be intersected with model limits
      })
      .connect(this.seismicWidget, {
        'horizontal': true,
        'vertical': false,
        'ignoreModelLimits': true, // visible limits will not be intersected with model limits
        'events': [NodeEvents.VisibleLimitsChanged]
      });
    this.synchronizer.synchronize(this.seismicWidget.getModel(), SyncMode.VisibleRange);

    this.plot.setSize(this.plotHost.nativeElement.clientWidth, this.plotHost.nativeElement.clientHeight);
    return this;
  }

  public getPipeline(): SeismicPipeline {
    return this.pipeline;
  };

  public initializeCrossHairCursor(seismicWidget, chartWidget) {
    // customize widget tools
    const lineStyle = new LineStyle({
      color: 'red',
      width: 1,
      pixelsnapmode: {
        x: true,
        y: true
      }
    });
    const seismicCrossHair = seismicWidget.getToolByName('crosshair')
      .setVerticalLineStyle(lineStyle)
      .setHorizontalLineStyle(null);
    const chartCrossHair = chartWidget.getToolByName('crosshair')
      .setVerticalLineStyle(lineStyle)
      .setHorizontalLineStyle(null);

    const onPositionChanged = function (sender, eventArgs) {
      const position = eventArgs.getPosition().getX();
      if (isNaN(position)) {
        seismicCrossHair.setVisible(false);
        chartCrossHair.setVisible(false);
        return;
      }
      seismicCrossHair.setVisible(true);
      chartCrossHair.setVisible(true);
      const oppositeCrossHair = sender === seismicCrossHair ? chartCrossHair : seismicCrossHair;
      if (oppositeCrossHair.getPosition().getX() !== position) {
        oppositeCrossHair
          .setVisible(true)
          .setPosition(new Point(position, 0), sender !== chartCrossHair);
        sender.setHorizontalLineStyle(lineStyle);
        oppositeCrossHair.setHorizontalLineStyle(null);
      }
    };
    seismicCrossHair.addListener(Events__geo__1.onPositionChanged, onPositionChanged);
    chartCrossHair.addListener(Events__geo__1.onPositionChanged, onPositionChanged);
  }
  public toggleChartWidget(addDefaultChart: boolean) {
    if (this.chartWidget == null) return this;
    this.chartWidget.setVisible(!this.chartWidget.getVisible());
    if (addDefaultChart && this.chartWidget.getHeadersCount() == 0) {
      this.chartWidget.addHeader('CDP', {
        'collectstatistics': true,
        'axis': {
          'linestyle': new LineStyle('#205193')
        },
        'chart': {
          'linestyle': new LineStyle('#205193')
        }
      });
      //this.synchronizer.synchronize(this.seismicWidget.getModel(), geotoolkit.widgets.sync.SyncMode.VisibleRange);
    }
    return this;
  }

  public createChartWidget(pipeline: SeismicPipeline): AuxiliaryChart {
    return new AuxiliaryChart(pipeline)
      .setAnnotationSize({ 'west': 120 }) as AuxiliaryChart;
  }

  public createSeismicWidget(pipeline: SeismicPipeline): SeismicWidget {
    const widget = new SeismicWidget(pipeline, {
      'table': {
        'size': 200,
        'visible': false
      },
      'colorbar': {
        'location': ColorBarLocation.West,
        'maxheight': '80%',
        'alignment': Alignment.Top
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
    const isTableVisible = this.seismicWidget.getOptions()['table']['visible'] == true;
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
        if (axisHeaders[i]['name'] == headerName) {
          return axisHeaders[i];
        }
      }
      return null;
    };

    let headerField;
    for (let i = 0; i < axisHeaders.length; i++) {
      headerField = this.seismicWidget.getTraceHeader(axisHeaders[i]['name']);
      if (activeHeaders.indexOf(axisHeaders[i]['name']) == -1) {
        this.seismicWidget.setTraceHeaderVisible(headerField, true);
      }
      let headerInfo = this.seismicWidget.getTraceHeaderAxis(headerField);
      if (headerInfo) {
        let color = axisHeaders[i]['color'];
        let lineStyle = LineStyle.fromObject(color);
        let textStyle = TextStyle.fromObject(color);
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
    //this.seismicWidget.invalidate();
    return this;
  }

  public addRemoveHeaders(): SeismicComponent {
    const availableHeaders = this.seismicWidget.getPipeline().getReader().getTraceHeaderFields();

    const axisHeaders = {};
    for (let i = 0; i < availableHeaders.length; i++) {
      let header = availableHeaders[i];

      let headerInfo = this.seismicWidget.getTraceHeaderAxis(header);
      if (headerInfo) {
        axisHeaders[header.getName()] = {
          'color': headerInfo['label'].getTextStyle().getColor()
        }
      }
    }

    const headersOptions = {
      'availableheaders': availableHeaders,
      'auxiliary-headers': this.chartWidget.getChartOptions()['headers'],
      'axis-headers': axisHeaders
    };

    this._onCloseDialog = function (type, dialog, args) {
      dialog.off(WindowService.Events.onClose, this._onCloseDialog);
      if (args == null) return;
      if (args['auxiliary-headers'] != null) {
        if (this.chartWidget.getVisible() == false && args['auxiliary-headers'].length > 0) {
          this.toggleChartWidget(false);
        }
        this.chartWidget.setChartOptions(args['auxiliary-headers'])

        var westAnnotationWidth = this.chartWidget.getAnnotation('west').getDesiredWidth();
        this.seismicWidget.setAnnotationSize({ 'west': westAnnotationWidth });
      }
      if (args['axis-headers'] != null) {
        this.setActiveHeaders(args['axis-headers']);
      }
    }.bind(this);

    let headersDialog = WindowService.getInstance().showDialog(HeadersDialog);
    if (headersDialog.instance) {
      (headersDialog.instance)
        .setOptions(headersOptions)
        .on(WindowService.Events.onClose, this._onCloseDialog);
    }
    return this;
  }

  public showProperties(): SeismicComponent {
    this._onCloseDialog = function (type, dialog, args) {
      dialog.off(WindowService.Events.onClose, this._onCloseDialog);
      if (args != null && args['options'] != null) {
        const seismicOptions = args['options'];
        const scaleOptions = seismicOptions['scale'];

        const pipeline = this.seismicWidget.getPipeline();
        const processors = args['processors'];
        let processorsHasBeenChanged = false;
        for (let i = 0; i < processors.length; i++) {
          let processorInfo = processors[i];
          for (var j = 0; j < pipeline.getTraceProcessorsCount(); j++) {
            let processor = pipeline.getTraceProcessor(j);
            if (processor.getName() == processorInfo['name'] && processor.isApplicable() != processorInfo['isEnabled']) {
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
    }.bind(this);

    let seismicProperties = this._windowService.showDialog(SeismicProperties);
    if (seismicProperties.instance) {
      const pipeline = this.seismicWidget.getPipeline();
      const seismicOptions = pipeline.getOptions();
      const scaleOptions = this.seismicWidget.getScaleOptions();

      const processors = [];
      for (let i = 0; i < pipeline.getTraceProcessorsCount(); i++) {
        let processor = pipeline.getTraceProcessor(i);
        processors.push({
          'name': processor.getName(),
          'description': '',
          'isEnabled': processor.isApplicable()
        })
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
    const isTableVisible = this.seismicWidget.getOptions()['table']['visible'] == true;
    this.isTable = isTableVisible;
    return this;
  }
}

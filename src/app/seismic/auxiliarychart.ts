import { SeismicPipeline } from "@int/geotoolkit/seismic/pipeline/SeismicPipeline";
import { Range } from "@int/geotoolkit/util/Range";
import { log } from "@int/geotoolkit/base";
import { AnnotatedWidget, Events } from "@int/geotoolkit/widgets/AnnotatedWidget";
import { Text } from "@int/geotoolkit/scene/shapes/Text";
import { Group } from "@int/geotoolkit/scene/Group";
import { Axis } from "@int/geotoolkit/axis/Axis";
import { from as from__geo__ } from "@int/geotoolkit/selection/from";
import { AnnotatedNode } from "@int/geotoolkit/scene/AnnotatedNode";
import { AnnotationLocation } from "@int/geotoolkit/layout/AnnotationLocation";
import { TickPosition, LabelPosition } from "@int/geotoolkit/axis/TickInfo";
import { Orientation } from "@int/geotoolkit/util/Orientation";
import { AnchorType } from "@int/geotoolkit/util/AnchorType";
import { LineStyle } from "@int/geotoolkit/attributes/LineStyle";
import { LineChart } from "@int/geotoolkit/controls/shapes/LineChart";
import { NumericTickGeneratorFactory } from "@int/geotoolkit/axis/NumericTickGeneratorFactory";
import { TextStyle } from "@int/geotoolkit/attributes/TextStyle";
import { MathUtil } from "@int/geotoolkit/util/MathUtil";
import { obfuscate } from "@int/geotoolkit/lib";
import { AnchoredTransformationAdjustmentStrategy } from "@int/geotoolkit/scene/AnchoredTransformationAdjustmentStrategy";
import { Utils } from "../utils";

class TraceHeadersData {
  public _pipeline: SeismicPipeline;
  public _traceRange: any;
  public _postponeRequest: any;
  public _query: any;
  constructor(pipeline) {
    this._pipeline = pipeline;
    this._traceRange = null;

    this._postponeRequest = null;
    this._query = null;
  };
  /**
   * Return trace values
   * @param {Array<string>} headerNames trace header name
   * @param {geotoolkit.util.Range} range range of values
   * @param {function} callback callback
   */
  getHeaderValues(headerNames: Array<string>, range: Range, callback: Function) {
    let from = Math.floor(range.getLow());
    let to = Math.ceil(range.getHigh());
    let modelLimits = this._pipeline.getModelLimits();
    if (from < modelLimits.getLeft()) {
        from = Math.floor(modelLimits.getLeft());
    }
    if (to >= modelLimits.getRight()) {
        to = Math.floor(modelLimits.getRight() - 1);
    }

    range.setRange(from, to);
    if (range.equalsRange(this._traceRange)) {
        return;
    }

    if (this._query != null) {
        this._postponeRequest = {
            headerNames: headerNames,
            range: range,
            callback: callback
        };
        return;
    }

    this._query = {
            'range': range,
            'from': range.getLow(),
            'to': range.getHigh()
        };
    let fetchAwait = function () {
      if (this._query != null) {
          this._pipeline.select(this._query, function (queryResult) {
              this._query = null;

              if (queryResult.isValid() === false) {
                  if (this._postponeRequest != null) {
                      const request = this._postponeRequest;
                      this._postponeRequest = null;
                      this.getHeaderValues(request.headerNames, request.range, request.callback);
                  }
                  return;
              }
              let traceMapping = this._pipeline.getTraceMapping();

              let query = queryResult.getQuery();
              let _range = query['range'];
              let _from = query['from'];
              let _to = query['to'];

              // build header indices
              let headerIndices = [];
              let headerFields = this._pipeline.getReader().getTraceHeaderFields();

              let indices = [];
              let values = {};
              let statistics = {};
              let headerName = null;
              for (let hf = 0; hf < headerFields.length; hf++) {
                  for (let hn = 0; hn < headerNames.length; hn++) {
                      headerName = headerFields[hf].getName();
                      if (headerName === headerNames[hn]) {
                          headerIndices.push(hf);

                          values[headerName] = [];
                          statistics[headerName] = {
                              'min': Number.POSITIVE_INFINITY,
                              'max': Number.NEGATIVE_INFINITY
                          };

                          break;
                      }
                  }
                  if (headerIndices.length === headerNames.length) {
                      break;
                  }
              }

              if (traceMapping != null) {
                  _from = traceMapping.getTraceIndex(_from);
                  _to = traceMapping.getTraceIndex(_to);
              }
              for (let i = _from; i < _to; i++) {
                  let traceId = traceMapping != null ? traceMapping.getTraceLocation(i) : i;

                  let trace = queryResult.getTrace(traceId);

                  if (trace == null) {
                      log('error: Trace # ' + traceId + ' not found');
                      continue;
                  }
                  indices.push(traceId);

                  for (let hi = 0; hi < headerIndices.length; hi++) {
                      let headerIndex = headerIndices[hi];
                      let value = trace.getHeader(headerIndex);
                      headerName = headerFields[headerIndex].getName();
                      values[headerName].push(value);
                      statistics[headerName]['min'] = Math.min(value, statistics[headerName]['min']);
                      statistics[headerName]['max'] = Math.max(value, statistics[headerName]['max']);
                  }
              }
              this._traceRange = _range;
              callback.call(this, {
                  'indices': indices,
                  'values': values,
                  'statistics': statistics
              });

              if (this._postponeRequest != null) {
                  const postRequest = this._postponeRequest;
                  this._postponeRequest = null;
                  this.getHeaderValues(postRequest.headerNames, postRequest.range, postRequest.callback);
              }
          }.bind(this));
      }
    }.bind(this);
      if (this._pipeline.isFetching()) {
          this._pipeline.await(fetchAwait);
      } else {
          fetchAwait.call();
      }
    }
}

export class AuxiliaryChart extends AnnotatedWidget {
    public _pipeline: SeismicPipeline;
    public _traceHeadersCache: TraceHeadersData;
    public _charts: any;
    public _chartsCounts: number = 0;
    public _axis_south = null;
    public _chartModel = null;
    public _seismicTraceLimits: any;
    public _title: Text;

    constructor(pipeline: SeismicPipeline) {
      super({
          'model': new Group(),
          'keepvisiblelimits': false,
          'annotationssizes': {
              'north': '15',
              'south': '0',
              'east': '15',
              'west': '120'
          },
          'north': [],
          'south': [new Axis()],
          'west': [],
          'east': [],
          'tools': {
              'horizontalscroll': { 'visible': false },
              'verticalscroll': { 'visible': false }
          }
      });
      this._seismicTraceLimits = pipeline.getModelLimits().clone().setY(0).setHeight(1);
      const annotatedNode = from__geo__(this)
          .where(node => node instanceof AnnotatedNode)
          .selectFirst();
      annotatedNode.setScaleScrollStrategy(new AnchoredTransformationAdjustmentStrategy());
      this._traceHeadersCache = new TraceHeadersData(pipeline);
      this._chartModel = this.getModel();
      this._chartModel.setModelLimits(this._seismicTraceLimits);
      this._pipeline = pipeline;
      this._title = from__geo__(this.getAnnotation(AnnotationLocation.North))
          .where(node => node instanceof Text)
          .selectFirst();
      this._charts = {};
      this._axis_south = from__geo__(this.getAnnotation(AnnotationLocation.South))
          .where(node => node instanceof Axis)
          .selectFirst();
      this._axis_south.setVisible(false);
      this._axis_south.setTickPosition(TickPosition.Top)
          .setLabelPosition(LabelPosition.Bottom)
          .setOrientation(Orientation.Horizontal)
          .setTitleAnchor(AnchorType.RightCenter);

      let crossHairTool = this.getToolByName('cross-hair');
      if (crossHairTool != null) {
        crossHairTool.setName('cross-hair');
      }

      this.connect(this._axis_south, this._chartModel);
    }
    /**
     * Notify listeners
     * @param {string} type event types
     * @param {object} source of the event
     * @param {object} [args] arguments of the event
     * @returns {geotoolkit.util.EventDispatcher} this
     * @protected
     */
    notify(type, source, args) {
      super.notify(type, source, args);
      if (source == this && type == Events.ModelVisibleLimitsChanged) {
        this.onModelVisibleLimitsChanged();
      }
      return this;
    }

    /**
     * Remove header
     * @param {string} headerName trace header name
     * @returns {AuxiliaryChart} this
     */
    removeHeader(headerName: string): AuxiliaryChart {
      let chartInfo = this._charts[headerName];
      if (chartInfo == null) {
          return this;
      }
      let annotatedNode = from__geo__(this)
          .where(function (node) {
              return node instanceof AnnotatedNode;
          })
          .selectFirst();

      annotatedNode.removeItem(chartInfo['axis'].getParent(), AnnotationLocation.West)
          .disconnect(chartInfo['axis']);

      this._chartModel.removeChild(chartInfo['chart']);

      delete this._charts[headerName];
      this._chartsCounts --;
      this.setAnnotationSize({
        'west': this._chartsCounts <= 3 ? 120 : this._chartsCounts * 40
      });
      return this;
    }
    /**
     * Add header chart
     * @param {string} headerName trace header name
     * @param {object} [options] chart options
     * @param {geotoolkit.util.Range} [options.range] header data range
     * @param {object|string|geotoolkit.attributes.LineStyle} [options.linestyle] line style
     * @param {object} [options.chart] chart options
     * @param {object|string|geotoolkit.attributes.LineStyle} [options.chart.linestyle] chart line style
     * @param {object} [options.axis] axis options
     * @param {object|string|geotoolkit.attributes.LineStyle} [options.axis.linestyle] axis line style
     * @returns {AuxiliaryChart} this
     */
    addHeader(headerName: string, options: any): AuxiliaryChart {
      if (this.getChartByName(headerName) != null) {
          return this;
      }
      let dataRange = new Range(0, 1);
      if (options && options['range']) {
        dataRange = options['range'].clone();
      }
      let headerDataLimits = this._pipeline.getModelLimits()
        .clone()
        .setY(dataRange.getLow())
        .setHeight(dataRange.getHigh() - dataRange.getLow());

      let lineStyle;
      if (options && options['linestyle']) {
        lineStyle = LineStyle.fromObject(options['linestyle']);
      } else {
        lineStyle = new LineStyle(Utils.getRandomRgbColor(), 1);
      }

      if (options && options['chart'] && options['chart']['linestyle']) {
        lineStyle = LineStyle.fromObject(options['chart']['linestyle']) || lineStyle;
      }

      let lineChart = new LineChart({
        'id': headerName,
        'gridvisible': false,
        'linestyles': lineStyle,
        'logscale': false,
        'spline': false,
        'symbols': null
      });
      lineChart.setId(headerName);
      lineChart.setCache(null);
      lineChart.setVerticalFlip(true);
      lineChart.setModelLimits(headerDataLimits);
      lineChart.setBounds(this._seismicTraceLimits);

      let axisLineStyle = lineStyle;
      if (options && options['axis'] && options['axis']['linestyle']) {
        axisLineStyle = LineStyle.fromObject(options['axis']['linestyle']);
      }
      let tg = NumericTickGeneratorFactory.getInstance().createLinear({
        'ticks': { 'MAJOR': { 'visible': false } },
        'labels': { 'MAJOR': { 'visible': false } }
      });
      let axis = new Axis()
        .setTickPosition(TickPosition.Right)
        .setLabelPosition(LabelPosition.Right)
        .setOrientation(Orientation.Vertical)
        .setBaseLineStyle(axisLineStyle || lineStyle)
        .setTitleAnchor(AnchorType.Center)
        .setTickGenerator(tg)
        .setTitleTextStyle((axisLineStyle || lineStyle).getColor())
        .setTitle(headerName)
        .setTitleVisible(true);

      axis.getTickGenerator()
        .setTickStyle('MAJOR', axisLineStyle || lineStyle)
        .setTickStyle('EDGE', axisLineStyle || lineStyle)
        .setLabelStyle('MAJOR', new TextStyle((axisLineStyle || lineStyle).getColor()))
        .setLabelStyle('EDGE', new TextStyle((axisLineStyle || lineStyle).getColor()));

      let groupAxis = new Group()
        .addChild(axis);

      this._chartModel.addChild(lineChart);
      let annotatedNode = from__geo__(this)
        .where(function (node) {
          return node instanceof AnnotatedNode;
        })
        .selectFirst();
      annotatedNode.addItem(groupAxis, AnnotationLocation.West)
        .connect(axis, lineChart);

      this._charts[headerName] = {
        'axis': axis,
        'chart': lineChart,
        'options': options
      };
      this._chartsCounts ++;
      this.setAnnotationSize({
        'west': this._chartsCounts <= 3 ? 120 : this._chartsCounts * 40
      });
      this.onModelVisibleLimitsChanged();
      return this;
    }
    /**
     * Return chart by name
     * @param {string} headerName header name
     * @returns {null|object} chartInfo
     */
    getChartByName(headerName: string): any {
        return this._charts[headerName];
    }
    onModelVisibleLimitsChanged() {
      if (this._traceHeadersCache == null) return;
      let headers = [];
      from__geo__(this._chartModel)
          .where(function (node) {
              return node instanceof LineChart;
          })
          .select(function (chart) {
              headers.push(chart.getId());
          });
      if (headers.length === 0) return this;

      let newModelLimits = this.getModel().getVisibleModelLimits();
      this._traceHeadersCache.getHeaderValues(headers, new Range(newModelLimits.getLeft(), newModelLimits.getRight()),
        function (data) {
          const indices = data['indices'];
          from__geo__(this._chartModel)
            .where(function (node) {
                return node instanceof LineChart;
            })
            .select(function (chart) {
              const chartId = chart.getId();
              if (chartId == null || data['values'][chartId] == null) {
                  return;
              }

              chart.setData({
                  'x': indices,
                  'y': data['values'][chartId]
              });
              let statistics = data['statistics'][chartId];
              let min = statistics['min'];
              let max = statistics['max'];

              let options = this._charts[chartId]['options'];
              if (options != null) {
                if (options['range'] != null) {
                  min = options['range'].getLow();
                  max = options['range'].getHigh();
                } else if (options['collectstatistics'] === true) {
                  const statistics = options['statistics'] || new Range(min, max);
                  min = Math.min(statistics.getLow(), min);
                  max = Math.max(statistics.getHigh(), max);
                  options['statistics'] = statistics.setRange(min, max);
                }

                if (options['neatlimits'] === true) {
                  const limits = MathUtil.calculateNeatLimits(min, max, false, true);
                  min = limits.getLow();
                  max = limits.getHigh();
                  if (options['collectstatistics'] === true) {
                    options['statistics'] = new Range(min, max);
                  }
                }
              }
              if (Math.abs(max - min) <= 1E-10) {
                min = 0;
                max = 1;
              }

              const modelLimits = this._pipeline.getModelLimits().clone()
                  .setY(min)
                  .setHeight(max - min);
                chart.setModelLimits(modelLimits);
              }.bind(this));
          }.bind(this));
    }
    /**
     * Set chart title
     * @param {string} title title
     * @returns {AuxiliaryChart} this
     */
    setTitle(title: string): AuxiliaryChart {
        this._title.setText(title);
        return this;
    };

    /**
     * Returns chart title
     * @returns {string}
     */
    getTitle() : string {
        return this._title.getText();
    }

    public setChartOptions (headers) {
      const findHeader = function (headerName) {
        for (let i = 0; i<headers.length; i++) {
          if (headers[i]['name'] == headerName) {
            return headers[i];
          }
        }
        return null;
      };
      const findChart = function (chartName) {
        for(let chartKey in this._charts) {
          if (this._charts.hasOwnProperty(chartKey) && chartKey === chartName) {
            return this._charts[chartKey];
          }
        }
        return null;
      }.bind(this);

      const toDelete = [];
      for(let chartName in this._charts) {
        if (this._charts.hasOwnProperty(chartName)) {
          if(findHeader(chartName) == null) {
            toDelete.push(chartName);
          }
        }
      }
      for (let i = 0; i < toDelete.length; i++){
        this.removeHeader(toDelete[i]);
      }

      for (let i = 0; i<headers.length; i++) {
        let chart = findChart(headers[i]['name']);
        let color = headers[i]['color'];
        let lineStyle = LineStyle.fromObject(color);
        if (chart != null) {
          chart['chart'].setOptions({
            'linestyles': lineStyle
          }).invalidate();
          chart['options']['axis']['linestyle'] = lineStyle;
          chart['options']['chart']['linestyle'] = lineStyle;

          let textStyle = TextStyle.fromObject(color);
          chart['axis']
            .setBaseLineStyle(lineStyle)
            .setTitleTextStyle(textStyle)
            .setTitleVisible(true)
            .getTickGenerator()
              .setTickStyle('MAJOR', lineStyle)
              .setTickStyle('EDGE', lineStyle)
              .setLabelStyle('MAJOR', textStyle)
              .setLabelStyle('EDGE', textStyle);

        } else {
          this.addHeader(headers[i]['name'], {
            'collectstatistics': true,
            'axis': {
              'linestyle': lineStyle
            },
            'chart': {
              'linestyle': lineStyle
            }
          })
        }
      }
      return this;
    }

    public getHeadersCount() {
      let headersCount = 0;
      for(let chartName in this._charts) {
        if (this._charts.hasOwnProperty(chartName)) {
          headersCount ++;
        }
      }
      return headersCount;
    }

    public getChartOptions() {
      let headers = {};
      for(let chartName in this._charts) {
        if (this._charts.hasOwnProperty(chartName)) {
          headers[chartName] = {
            'color' : this._charts[chartName]['options']['chart']['linestyle'].getColor()
          }
        }
      }
      return {
        'headers': headers,
        /*'availableheaders': this._pipeline.getReader().getTraceHeaderFields()*/
      }
    }
}
obfuscate(AuxiliaryChart);
/*geotoolkit.setClassName(AuxiliaryChart, 'AuxiliaryChart');*/


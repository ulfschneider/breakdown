'use babel';

import BreakdownEnvironment from './breakdown-environment';
import moment from 'moment';
const d3 = require('d3');
const HEIGHT = 600;
const FONT_SIZE = 12;

export default class BreakdownStatisticsView {

    constructor(config) {
        this.chartCache = new Map();


        this.element = document.createElement('div');
        this.element.classList.add('breakdown-statistics');

        this.gutter = document.createElement('div');
        this.element.appendChild(this.gutter);
        this.gutter.classList.add('gutter');

        this.label = document.createElement('span');
        this.gutter.appendChild(this.label);
        this.label.classList.add('label');
        this.label.innerHTML = '▲ Charts';

        this.reload = document.createElement('span');
        this.gutter.appendChild(this.reload);
        this.reload.classList.add('reload');
        this.reload.setAttribute('style', 'display:none');
        this.reload.innerHTML = 'Reload Charts'
        this.reload.addEventListener('click', this.reloadListener = event => {
            if (this.display) {
                event.stopPropagation();
                config.pullChartData();
            }
        });

        this.content = document.createElement('div');
        this.element.appendChild(this.content);
        this.content.setAttribute('style', 'height:0px; transition: height 0.25s ease-in;');
        this.content.classList.add('content');

        this.gutter.addEventListener('click', this.slideListener = event => {
            if (this.display) {
                this.slideDown();
            } else {
                this.slideUp(config.pullChartData);
            }
        });

        this.cfdContainer = document.createElement('div');
        this.content.appendChild(this.cfdContainer);
        this.cfdContainer.setAttribute('id', 'cfdContainer');

        this.download = document.createElement('div');
        this.cfdContainer.appendChild(this.download);
        this.download.classList.add('download');
        this.download.innerHTML = 'Preparing Chart Data ...';
        this.download.setAttribute('style', 'display:none');

        this.cfdImg = document.createElement('img');
        this.cfdContainer.appendChild(this.cfdImg);

        this.durationContainer = document.createElement('div');
        this.content.appendChild(this.durationContainer);
        this.durationContainer.setAttribute('id', 'durationContainer');

        this.durationImg = document.createElement('img');
        this.durationContainer.appendChild(this.durationImg);

        window.addEventListener('resize', this.resizeListener = event => {
            this.render();
        });
    }

    serialize() {}

    deserialize(state) {}

    isVisible() {
        return this.display;
    }

    destroy() {
        window.removeEventListener('resize', this.resizeListener);
        this.gutter.removeEventListener('click', this.slideListener);
        this.reload.removeEventListener('click', this.reloadListener);
        this.element.remove();
    }

    clear() {
        this.download.setAttribute('style', 'display:none');
        this.cfdImg.setAttribute('style', 'display:none');
        this.durationImg.setAttribute('style', 'display:none');
    }

    indicateDownload() {
        this.download.setAttribute('style', 'display:block');
    }

    clearDownloadIndication() {
        this.download.setAttribute('style', 'display:none');
    }

    setCumulativeFlowImg(img) {
        this.clearDownloadIndication();
        this.cfdImg.setAttribute('src', img);
        this.cfdImg.setAttribute('style', 'display:inline-block');
    }

    setDurationImg(img) {
        this.clearDownloadIndication();
        this.durationImg.setAttribute('src', img);
        this.durationImg.setAttribute('style', 'display:inline-block');
    }

    slideDown() {
        this.display = false;
        this.content.setAttribute('style', 'height:0px; transition: height 0.25s ease-in;');
        this.clearDownloadIndication();
        this.label.innerHTML = '► Charts';
        this.reload.setAttribute('style', 'display:none');
    }

    slideUp(callback) {
        let cfdImg = this.chartCache.get('CFD' + BreakdownEnvironment.getActivePath());
        let durImg = this.chartCache.get('DUR' + BreakdownEnvironment.getActivePath());

        if (((BreakdownEnvironment.isHandlingDifferentEditors() || BreakdownUtil.hasOption(BreakdownUtil.OPTION_OFFLINE)) &&
                (BreakdownUtil.isFalsy(cfdImg) || BreakdownUtil.isFalsy(durImg))) ||  !BreakdownEnvironment.isBreakdownGrammar()) {
            BreakdownEnvironment.flashEditor();
            return;
        }

        this.display = true;
        if (cfdImg && durImg) {
            this.setCumulativeFlowImg(cfdImg);
            this.setDurationImg(durImg);
        } else {
            this.clear();
            this.indicateDownload();
            if (callback) {
                callback();
            } else {
                this.render();
            }
        }
        this.label.innerHTML = '▼ Charts';
        this.reload.setAttribute('style', 'display:inline');
        this.content.setAttribute('style', 'height:' +
            HEIGHT + 'px; transition: height 0.25s ease-in;');
    }


    render() {
        if (BreakdownEnvironment.getPath() == BreakdownEnvironment.getLastPullPath()) {
            //the order, cumulitive flow first and duration second, is important, because settings are getting reused
            let settings = this.renderCumulativeFlowDiagram();
            this.renderDurationDiagram(settings);
        }
    }

    renderCumulativeFlowDiagram() {
        let settings = {};
        this.prepareCumulationFlowDiagram(settings);
        this.prepareMargins(settings);
        this.prepareCumulativeFlowScales(settings);
        settings.x = d3.scaleTime()
            .range([0, settings.width]);
        settings.y = d3.scaleLinear()
            .range([settings.height, 0]);
        let fromDate = BreakdownEnvironment.getSettings()
            .fromDate;
        settings.fromDate = fromDate ? moment(fromDate)
            .startOf('day') : fromDate;
        let toDate = BreakdownEnvironment.getSettings()
            .toDate;
        settings.toDate = toDate ? moment(toDate)
            .startOf('day') : toDate;

        settings.stack = d3.stack();
        settings.area = d3.area()
            .x(function(d, i) {
                return settings.x(d.data.date);
            })
            .y0(function(d) {
                return settings.y(d[0]);
            })
            .y1(function(d) {
                return settings.y(d[1]);
            });

        settings.data = BreakdownEnvironment.getTransitionLog()
            .transitionsToJSON({
                storyPoints: BreakdownUtil.hasOption(BreakdownUtil.OPTION_CFD_POINTS),
                fromDate: settings.fromDate,
                toDate: settings.toDate,
            });
        let xRange = d3.extent(settings.data, function(d) {
            return d.date;
        });
        if (settings.fromDate) {
            xRange[0] = settings.fromDate;
        }
        if (settings.toDate) {
            xRange[1] = settings.toDate;
        }
        settings.x.domain(xRange);
        settings.keys = settings.data.columns.slice(1);
        settings.stack.keys(settings.keys);
        settings.y.domain([0, d3.max(settings.data, function(d) {
            let sum = 0;
            for (let i = 1, n = settings.data.columns.length; i < n; i++) {
                sum += d[settings.data.columns[i]];
            }
            return sum;
        })]);

        settings.g = settings.svg.append('g')
            .attr('transform', 'translate(' + settings.margin.left + ',' + settings.margin.top + ')');

        this.appendCumulativeFlowLayers(settings);
        this.appendCumulativeFlowAxis(settings);
        this.appendCumulativeFlowPrediction(settings);
        this.appendMarkers(settings);
        this.appendCumulativeFlowLegend(settings);
        this.injectCumulativeFlowImage(settings);

        return settings;
    }

    renderDurationDiagram(settings) {
        //reuse CFD settings and overwrite or add only what is necessary

        this.prepareDurationDiagram(settings);

        settings.data = BreakdownEnvironment.getTransitionLog()
            .durationsToJSON({
                storyPoints: BreakdownUtil.hasOption(BreakdownUtil.OPTION_CFD_POINTS),
                fromDate: settings.fromDate,
                toDate: settings.toDate,
            });

        settings.z = d3.scaleLinear()
            .range([settings.height, 0]);
        settings.y.domain([0, d3.max(settings.data, function(d) {
            return d.indeterminateCount;
        })]);

        settings.z.domain([d3.min(settings.data, function(d) {
            if (d.avgCycleTime && d.avgLeadTime) {
                return Math.min(d.avgCycleTime, d.avgLeadTime);
            } else if (d.avgCycleTime) {
                return d.avgCycleTime;
            } else if (d.avgLeadTime) {
                return d.avgLeadTime;
            }
        }), d3.max(settings.data, function(d) {
            if (d.avgCycleTime && d.avgLeadTime) {
                return Math.max(d.avgCycleTime, d.avgLeadTime);
            } else if (d.avgCycleTime) {
                return d.avgCycleTime;
            } else if (d.avgLeadTime) {
                return d.avgLeadTime;
            }
        })]);


        settings.g = settings.svg.append('g')
            .attr('transform', 'translate(' + settings.margin.left + ',' + settings.margin.top + ')');
        this.appendDurationLines(settings);
        this.appendDurationAxis(settings);
        this.appendMarkers(settings);
        this.appendDurationLegend(settings);
        this.injectDurationImage(settings);
    }

    prepareMargins(settings) {
        settings.margin = {
            top: 55,
            right: 210,
            bottom: 30,
            left: 80
        }
        settings.width = settings.svg.attr('width') - settings.margin.left - settings.margin.right;
        settings.height = settings.svg.attr('height') - settings.margin.top - settings.margin.bottom;
    }

    prepareCumulativeFlowScales(settings) {
        settings.x = d3.scaleTime()
            .range([0, settings.width]);
        settings.y = d3.scaleLinear()
            .range([settings.height, 0]);
        let fromDate = BreakdownEnvironment.getSettings()
            .fromDate;
        settings.fromDate = fromDate ? moment(fromDate)
            .startOf('day') : fromDate;
        let toDate = BreakdownEnvironment.getSettings()
            .toDate;
        settings.toDate = toDate ? moment(toDate)
            .startOf('day') : toDate;

    }

    prepareCumulationFlowDiagram(settings) {
        settings.cfd = document.createElement('svg');
        settings.cfd.setAttribute('style', 'display:none');
        settings.cfd.setAttribute('id', 'cfd');
        settings.cfd.setAttribute('width', this.cfdContainer.clientWidth);
        settings.cfd.setAttribute('height', HEIGHT);
        this.cfdContainer.appendChild(settings.cfd);
        settings.svg = d3.select('#cfd');
    }

    prepareDurationDiagram(settings) {
        settings.durations = document.createElement('svg');
        settings.durations.setAttribute('style', 'display:none');
        settings.durations.setAttribute('id', 'durations');
        settings.durations.setAttribute('width', this.durationContainer.clientWidth);
        settings.durations.setAttribute('height', HEIGHT);
        this.durationContainer.appendChild(settings.durations);
        settings.svg = d3.select('#durations');
    }


    injectCumulativeFlowImage(settings) {
        let img = BreakdownUtil.toInlineSvgImg(settings.svg.attr('width'), HEIGHT, settings.cfd.innerHTML);
        this.chartCache.set('CFD' + BreakdownEnvironment.getPath(), img);
        if (!BreakdownEnvironment.isHandlingDifferentEditors()) {
            this.setCumulativeFlowImg(img);
        }
        this.cfdContainer.removeChild(settings.cfd);
    }

    injectDurationImage(settings) {
        let img = BreakdownUtil.toInlineSvgImg(settings.svg.attr('width'), HEIGHT, settings.durations.innerHTML);
        this.chartCache.set('DUR' + BreakdownEnvironment.getPath(), img);
        if (!BreakdownEnvironment.isHandlingDifferentEditors()) {
            this.setDurationImg(img);
        }
        this.durationContainer.removeChild(settings.durations);
    }

    appendCumulativeFlowLayers(settings) {
        settings.newStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .new');
        settings.indeterminateStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .indeterminate');
        settings.doneStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .done');

        let layer = settings.g.selectAll('.layer')
            .data(settings.stack(settings.data))
            .enter()
            .append('g')
            .attr('class', 'layer');

        layer.append('path')
            .attr('class', 'area')
            .style('fill', function(d) {
                if (BreakdownUtil.isIndeterminateStatus(d.key)) {
                    return settings.indeterminateStyle.fill;
                } else if (BreakdownUtil.isDoneStatus(d.key)) {
                    return settings.doneStyle.fill;
                }
                return settings.newStyle.fill;
            })
            .style('stroke', function(d) {
                if (BreakdownUtil.isIndeterminateStatus(d.key)) {
                    return settings.indeterminateStyle.stroke;
                } else if (BreakdownUtil.isDoneStatus(d.key)) {
                    return settings.doneStyle.stroke;
                }
                return settings.newStyle.stroke;
            })
            .style('stroke-width', '.5')
            .attr('d', settings.area);

        layer.filter(function(d) {
                return settings.data.length && settings.y(d[d.length - 1][0]) - settings.y(d[d.length - 1][1]) >= FONT_SIZE;
            })
            .append('text')
            .attr('x', settings.width + 50)
            .attr('y', function(d) {
                return settings.y(d[d.length - 1][1]);
            })
            .attr('dy', '.35em')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', function(d) {
                if (BreakdownUtil.isIndeterminateStatus(d.key)) {
                    return settings.indeterminateStyle.color;
                } else if (BreakdownUtil.isDoneStatus(d.key)) {
                    return settings.doneStyle.color;
                }
                return settings.newStyle.color;
            })
            .text(function(d) {
                return (d[d.length - 1][1] - d[d.length - 1][0]) + ' ' + d.key;
            });
    }

    appendDurationLines(settings) {
        settings.newStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .new');
        settings.indeterminateStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .indeterminate');
        settings.markerStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .markers');

        let indeterminate = d3.area()
            .x(function(d) {
                return settings.x(d.date);
            })
            .y1(function(d) {
                return settings.y(d.indeterminateCount);
            })
            .y0(function(d) {
                return settings.y(0)
            });

        let avgCycleTime = d3.line()
            .defined(function(d) {
                return d.date && d.avgCycleTime
            })
            .x(function(d) {
                return settings.x(d.date)
            })
            .y(function(d) {
                return settings.z(d.avgCycleTime)
            });

        let avgLeadTime = d3.line()
            .defined(function(d) {
                return d.date && d.avgLeadTime
            })
            .x(function(d) {
                return settings.x(d.date)
            })
            .y(function(d) {
                return settings.z(d.avgLeadTime)
            });


        settings.g.append("path")
            .datum(settings.data)
            .style("fill", settings.indeterminateStyle.fill)
            .attr("d", indeterminate);

        if (settings.data.indeterminateCount >= 0) {
            settings.g.append('text')
                .attr('x', settings.width + 50)
                .attr('y', settings.y(settings.data.indeterminateCount))
                .attr('dy', '.35em')
                .style('font', FONT_SIZE + 'px sans-serif')
                .style('text-anchor', 'start')
                .style('fill', settings.indeterminateStyle.color)
                .text(settings.data.indeterminateCount + ' In Progress');
        }

        settings.g.append('path')
            .datum(settings.data)
            .style('stroke-width', '3')
            .style('stroke', settings.markerStyle['background-color'])
            .style('fill', 'none')
            .attr('d', avgLeadTime);

        settings.g.append('path')
            .datum(settings.data)
            .style('stroke', settings.newStyle.color)
            .style('fill', 'none')
            .attr('d', avgLeadTime);

        settings.g.append('path')
            .datum(settings.data)
            .style('stroke-width', '3')
            .style('stroke', settings.markerStyle['background-color'])
            .style('fill', 'none')
            .attr('d', avgCycleTime);

        settings.g.append('path')
            .datum(settings.data)
            .style('stroke', settings.indeterminateStyle.color)
            .style('fill', 'none')
            .attr('d', avgCycleTime);
    }

    appendCumulativeFlowAxis(settings) {
        settings.axisStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .axis');
        let xAxis = settings.g.append('g')
            .attr('transform', 'translate(0,' + settings.height + ')')
            .call(d3.axisBottom(settings.x));
        xAxis
            .selectAll('path')
            .style('stroke', settings.axisStyle.color);
        xAxis
            .selectAll('line')
            .style('stroke', settings.axisStyle.color);
        xAxis
            .selectAll('text')
            .style('fill', settings.axisStyle.color)
            .style('font', FONT_SIZE + 'px sans-serif');

        let yAxis = settings.g.append('g')
            .attr('transform', 'translate(' + settings.width + ' ,0)')
            .call(d3.axisRight(settings.y));
        yAxis
            .selectAll('path')
            .style('stroke', settings.axisStyle.color);
        yAxis
            .selectAll('line')
            .style('stroke', settings.axisStyle.color);
        yAxis
            .selectAll('text')
            .style('fill', settings.axisStyle.color)
            .style('font', FONT_SIZE + 'px sans-serif');
    }

    appendDurationAxis(settings) {
        settings.axisStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .axis');
        let xAxis = settings.g.append('g')
            .attr('transform', 'translate(0,' + settings.height + ')')
            .call(d3.axisBottom(settings.x));
        xAxis
            .selectAll('path')
            .style('stroke', settings.axisStyle.color);
        xAxis
            .selectAll('line')
            .style('stroke', settings.axisStyle.color);
        xAxis
            .selectAll('text')
            .style('fill', settings.axisStyle.color)
            .style('font', FONT_SIZE + 'px sans-serif');


        let yAxis = settings.g.append('g')
            .attr('transform', 'translate(' + settings.width + ' ,0)')
            .call(d3.axisRight(settings.y));
        yAxis
            .selectAll('path')
            .style('stroke', settings.axisStyle.color);
        yAxis
            .selectAll('line')
            .style('stroke', settings.axisStyle.color);
        yAxis
            .selectAll('text')
            .style('fill', settings.axisStyle.color)
            .style('font', FONT_SIZE + 'px sans-serif');

        let zAxis = settings.g.append('g')
            .call(d3.axisLeft(settings.z)
                .tickFormat(function(d) {
                    return BreakdownUtil.formatDuration(moment.duration(d));
                }));
        zAxis
            .selectAll('path')
            .style('stroke', settings.axisStyle.color);
        zAxis
            .selectAll('line')
            .style('stroke', settings.axisStyle.color);
        zAxis
            .selectAll('text')
            .style('fill', settings.axisStyle.color)
            .style('font', FONT_SIZE + 'px sans-serif');

    }

    appendCumulativeFlowLegend(settings) {
        settings.newStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .new');
        settings.indeterminateStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .indeterminate');
        settings.doneStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .done');
        settings.legendStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .legend');

        let fileName = settings.g.append('text')
            .attr('x', 5)
            .attr('y', -35)
            .attr('dy', '.35em')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', settings.newStyle.color)
            .text('Cumulative Flow Diagram for ' + BreakdownEnvironment.getFileNameWithoutExtension() +
                ' at ' +
                BreakdownUtil.formatDate(moment(), BreakdownUtil.DAY_FORMAT));


        let newLegend = settings.g.append('text')
            .attr('x', 5)
            .attr('y', 0)
            .attr('dy', FONT_SIZE + 'px')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', settings.newStyle.color)
            .text('To Do');

        let indeterminateLegend = settings.g.append('text')
            .attr('x', 5)
            .attr('y', 15)
            .attr('dy', FONT_SIZE + 'px')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', settings.indeterminateStyle.color)
            .text('In Progress');

        let doneLegend = settings.g.append('text')
            .attr('x', 5)
            .attr('y', 30)
            .attr('dy', FONT_SIZE + 'px')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', settings.doneStyle.color)
            .text('Done');

        let counting = settings.g.append('text')
            .attr('x', settings.width + 50)
            .attr('y', -15)
            .attr('dy', '.35em')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', settings.legendStyle.color)
            .text(BreakdownUtil.hasOption(BreakdownUtil.OPTION_CFD_POINTS) ? 'Story Points' : 'Issues');
    }



    appendDurationLegend(settings) {
        settings.legendStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .legend');
        settings.newStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .new');
        settings.indeterminateStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .indeterminate');

        let fileName = settings.g.append('text')
            .attr('x', 5)
            .attr('y', -35)
            .attr('dy', '.35em')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', settings.newStyle.color)
            .text('Avg Cycle Time and Avg Lead Time for ' + BreakdownEnvironment.getFileNameWithoutExtension() +
                ' at ' +
                BreakdownUtil.formatDate(moment(), BreakdownUtil.DAY_FORMAT));

        settings.g.append('line')
            .attr('x1', 5)
            .attr('y1', 8)
            .attr('x2', 15)
            .attr('y2', 8)
            .style('stroke-width', '1')
            .style('stroke', settings.newStyle.color);

        let avgLeadTimeLegend = settings.g.append('text')
            .attr('x', 20)
            .attr('y', 0)
            .attr('dy', FONT_SIZE + 'px')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', settings.newStyle.color)
            .text('Avg Lead Time' + (settings.data.avgLeadTime ? ' ' + BreakdownUtil.formatDuration(settings.data.avgLeadTime) : ''));

        settings.g.append('line')
            .attr('x1', 5)
            .attr('y1', 23)
            .attr('x2', 15)
            .attr('y2', 23)
            .style('stroke-width', '1')
            .style('stroke', settings.indeterminateStyle.color);

        let avgCycleTimeLegend = settings.g.append('text')
            .attr('x', 20)
            .attr('y', 15)
            .attr('dy', FONT_SIZE + 'px')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', settings.indeterminateStyle.color)
            .text('Avg Cycle Time' + (settings.data.avgCycleTime ? ' ' + BreakdownUtil.formatDuration(settings.data.avgCycleTime) : ''));

        let counting = settings.g.append('text')
            .attr('x', settings.width + 50)
            .attr('y', -15)
            .attr('dy', '.35em')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', settings.legendStyle.color)
            .text(BreakdownUtil.hasOption(BreakdownUtil.OPTION_CFD_POINTS) ? 'Story Points in Progress' : 'Issues in Progress');
    }


    isDateInRange(date, settings) {
        let dataFromDate, dataToDate;
        if (settings.data.length) {
            dataFromDate = settings.data[0].date;
            dataToDate = settings.data[settings.data.length - 1].date;
        }

        if (settings.fromDate && date.isBefore(settings.fromDate)) {
            return false;
        } else if (BreakdownUtil.isFalsy(settings.fromDate) && dataFromDate && date.isBefore(dataFromDate)) {
            return false;
        }

        if (settings.toDate && date.isAfter(settings.toDate)) {
            return false;
        } else if (BreakdownUtil.isFalsy(settings.toDate) && dataToDate && date.isAfter(dataToDate)) {
            return false;
        }
        return true;
    }

    appendMarkers(settings) {

        settings.markerStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .markers');

        let mark = function(date, label) {
            let x1 = settings.x(date);
            let y1 = settings.height;
            let y2 = 0;
            settings.g.append('line')
                .attr('x1', x1)
                .attr('y1', y1)
                .attr('x2', x1)
                .attr('y2', y2)
                .style('stroke-width', '3')
                .style('stroke', settings.markerStyle['background-color']);
            settings.g.append('line')
                .attr('x1', x1)
                .attr('y1', y1)
                .attr('x2', x1)
                .attr('y2', y2)
                .style('stroke-width', '1')
                .style('stroke', settings.markerStyle.color);

            settings.g.append('text')
                .attr('x', x1)
                .attr('y', -15)
                .attr('dy', '.35em')
                .style('font', FONT_SIZE + 'px sans-serif')
                .style('text-anchor', 'middle')
                .style('fill', settings.markerStyle.color)
                .text(label ? label : BreakdownUtil.formatDate(date));
        }
        settings.markers = BreakdownEnvironment.getSettings()
            .markers;

        if (settings.markers) {
            settings.markers.forEach(m => {
                if (this.isDateInRange(m.date, settings)) {
                    mark(m.date, m.label);
                }
            });
        }
    }


    appendCumulativeFlowPrediction(settings) {
        let summarizeDone = function(date) {
            for (let entry of settings.data) {
                if (entry.date.isSame(date, 'day')) {
                    let sum = 0;
                    for (let key of settings.keys) {
                        if (BreakdownUtil.isDoneStatus(key)) {
                            sum += entry[key];
                        }
                    }
                    return sum;
                }
            }
            return 0;
        }

        if (settings.data.length) {
            settings.predict = BreakdownEnvironment.getSettings()
                .predict;
            let startDate = settings.predict;
            let currentDate = settings.data[settings.data.length - 1].date;
            if (startDate && startDate.isBefore(currentDate) && this.isDateInRange(startDate, settings)) {
                let x1 = settings.x(startDate);
                let x2 = settings.x(currentDate);
                let y1 = settings.y(summarizeDone(startDate));
                let y2 = settings.y(summarizeDone(currentDate));
                let m = (y2 - y1) / (x2 - x1);

                let predictX = function() {
                    return -y1 / m + x1;
                }

                let dateFromX = function(x) {
                    let m = (x2 - x1) / (currentDate - startDate);
                    let c = x1 - m * startDate;
                    return moment((x - c) / m);
                }

                let x3 = settings.x(settings.toDate ? settings.toDate : currentDate);
                let y3 = y1 + m * (x3 - x1);
                if (y3 < 0) {
                    x3 = -y1 / m + x1;
                    y3 = y1 + m * (x3 - x1);
                }

                settings.predictStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .predict');
                settings.g.append('line')
                    .attr('x1', x1)
                    .attr('y1', y1)
                    .attr('x2', x3)
                    .attr('y2', y3)
                    .style('stroke-width', '3')
                    .style('stroke', settings.predictStyle['background-color']);
                settings.g.append('line')
                    .attr('x1', x1)
                    .attr('y1', y1)
                    .attr('x2', x3)
                    .attr('y2', y3)
                    .style('stroke-width', '1')
                    .style('stroke', settings.predictStyle.stroke);

                settings.g.append('text')
                    .attr('x', x3)
                    .attr('y', -35)
                    .attr('dy', '.35em')
                    .style('font', FONT_SIZE + 'px sans-serif')
                    .style('text-anchor', 'middle')
                    .style('fill', settings.predictStyle.color)
                    .text(BreakdownUtil.formatDate(dateFromX(predictX())));
            }
        }
    }

    getElement() {
        return this.element;
    }

}
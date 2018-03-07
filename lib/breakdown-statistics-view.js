'use babel';


import BreakdownEnvironment from './breakdown-environment';
import moment from 'moment';
const d3 = require('d3');
const HEIGHT = 600;
const FONT_SIZE = 12;


//TODO 5) predicted completion date
//TODO 6) cycle time + lead time

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
        this.label.innerHTML = '▲ Cumulative Flow Diagram';

        this.reload = document.createElement('span');
        this.gutter.appendChild(this.reload);
        this.reload.classList.add('reload');
        this.reload.setAttribute('style', 'display:none');
        this.reload.innerHTML = 'Reload Chart'
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
    }

    indicateDownload() {
        this.download.setAttribute('style', 'display:block');
    }

    clearDownloadIndication() {
        this.download.setAttribute('style', 'display:none');
    }

    setImg(img) {
        this.clearDownloadIndication();
        this.cfdImg.setAttribute('src', img);
        this.cfdImg.setAttribute('style', 'display:inline-block');
    }

    slideDown() {
        this.display = false;
        this.content.setAttribute('style', 'height:0px; transition: height 0.25s ease-in;');
        this.clearDownloadIndication();
        this.label.innerHTML = '▲ Cumulative Flow Diagram';
        this.reload.setAttribute('style', 'display:none');
    }

    slideUp(callback) {
        this.display = true;
        let img = this.chartCache.get(BreakdownEnvironment.getActivePath());
        if (img) {
            this.setImg(img);
        } else {
            this.clear();
            this.indicateDownload();
            if (callback) {
                callback();
            } else {
                this.render();
            }
        }
        this.label.innerHTML = '▼ Cumulative Flow Diagram';
        this.reload.setAttribute('style', 'display:inline');
        this.content.setAttribute('style', 'height:' +
            HEIGHT + 'px; transition: height 0.25s ease-in;');
    }



    render() {
        let settings = {};

        this.prepareCfd(settings);
        this.prepareMargins(settings);

        settings.x = d3.scaleTime()
            .range([0, settings.width]);
        settings.y = d3.scaleLinear()
            .range([settings.height, 0]);

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

        let fromDate = BreakdownEnvironment.getSettings()
            .fromDate;
        settings.fromDate = fromDate ? moment(fromDate)
            .startOf('day') : fromDate;
        let toDate = BreakdownEnvironment.getSettings()
            .toDate;
        settings.toDate = toDate ? moment(toDate)
            .startOf('day') : toDate;

        settings.data = BreakdownEnvironment.getDownload()
            .transitionLog.toJSON({
                storyPoints: BreakdownUtil.hasOption('cfdpoints'),
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

        this.appendLayers(settings);
        this.appendAxis(settings);
        this.appendLegend(settings);
        this.appendMarkers(settings);
        this.injectImage(settings);
    }

    prepareMargins(settings) {
        settings.margin = {
            top: 55,
            right: 210,
            bottom: 30,
            left: 30
        }
        settings.width = settings.svg.attr('width') - settings.margin.left - settings.margin.right;
        settings.height = settings.svg.attr('height') - settings.margin.top - settings.margin.bottom;
    }

    prepareCfd(settings) {
        settings.cfd = document.createElement('svg');
        settings.cfd.setAttribute('style', 'display:none');
        settings.cfd.setAttribute('id', 'cfd');
        settings.cfd.setAttribute('width', this.cfdContainer.clientWidth);
        settings.cfd.setAttribute('height', HEIGHT);
        this.cfdContainer.appendChild(settings.cfd);
        settings.svg = d3.select('#cfd');
    }

    injectImage(settings) {
        let img = BreakdownUtil.toInlineSvgImg(settings.svg.attr('width'), HEIGHT, settings.cfd.innerHTML);
        this.chartCache.set(BreakdownEnvironment.getPath(), img);
        if (!BreakdownEnvironment.isHandlingDifferentEditors()) {
            this.setImg(img);
        }
        this.cfdContainer.removeChild(settings.cfd);
    }

    appendLayers(settings) {
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

    appendAxis(settings) {
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

    appendLegend(settings) {
        settings.legendStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .legend');
        let newLegend = settings.g.append('text')
            .attr('x', 0)
            .attr('y', -35)
            .attr('dy', '.35em')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', settings.newStyle.color)
            .text('To Do');

        let indeterminateLegend = settings.g.append('text')
            .attr('x', 55)
            .attr('y', -35)
            .attr('dy', '.35em')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', settings.indeterminateStyle.color)
            .text('In Progress');

        let doneLegend = settings.g.append('text')
            .attr('x', 140)
            .attr('y', -35)
            .attr('dy', '.35em')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', settings.doneStyle.color)
            .text('Done');

        let counting = settings.g.append('text')
            .attr('x', settings.width + 50)
            .attr('y', -35)
            .attr('dy', '.35em')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', settings.legendStyle.color)
            .text(BreakdownUtil.hasOption('cfdpoints') ? 'Counting Story Points' : 'Counting Issues');
    }

    appendMarkers(settings) {

        settings.markerStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .markers');

        let isDateInRange = function(date) {
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
                if (isDateInRange(m.date)) {
                    mark(m.date, m.label);
                }
            });
        }
    }

    getElement() {
        return this.element;
    }

}
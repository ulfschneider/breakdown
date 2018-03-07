'use babel';


import BreakdownEnvironment from './breakdown-environment';
import moment from 'moment';
const d3 = require('d3');
const HEIGHT = 600;
const FONT_SIZE = 12;


//TODO 4) allow to click for issue count or story point display
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

    isDateInRange(date, data, fromDate, toDate) {
        let dataFromDate, dataToDate;
        if (data.length) {
            dataFromDate = data[0].date;
            dataToDate = data[data.length - 1].date;
        }

        if (fromDate && date.isBefore(fromDate)) {
            return false;
        } else if (BreakdownUtil.isFalsy(fromDate) && dataFromDate && date.isBefore(dataFromDate)) {
            return false;
        }

        if (toDate && date.isAfter(toDate)) {
            return false;
        } else if (BreakdownUtil.isFalsy(toDate) && dataToDate && date.isAfter(dataToDate)) {
            return false;
        }
        return true;
    }


    render() {
        let dynamicWidth = this.cfdContainer.clientWidth
        cfd = document.createElement('svg');
        cfd.setAttribute('style', 'display:none');
        cfd.setAttribute('id', 'cfd');
        cfd.setAttribute('width', dynamicWidth);
        cfd.setAttribute('height', HEIGHT);
        this.cfdContainer.appendChild(cfd);

        let svg = d3.select('#cfd');

        let margin = {
                top: 55,
                right: 210,
                bottom: 30,
                left: 30
            },
            width = svg.attr('width') - margin.left - margin.right,
            height = svg.attr('height') - margin.top - margin.bottom;

        let x = d3.scaleTime()
            .range([0, width]),
            y = d3.scaleLinear()
            .range([height, 0]);

        let stack = d3.stack();

        let area = d3.area()
            .x(function(d, i) {
                return x(d.data.date);
            })
            .y0(function(d) {
                return y(d[0]);
            })
            .y1(function(d) {
                return y(d[1]);
            });

        let g = svg.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        let fromDate = BreakdownEnvironment.getSettings()
            .fromDate;
        fromDate = fromDate ? moment(fromDate)
            .startOf('day') : fromDate;
        let toDate = BreakdownEnvironment.getSettings()
            .toDate;
        toDate = toDate ? moment(toDate)
            .startOf('day') : toDate;

        let marker = BreakdownEnvironment.getSettings()
            .marker;


        let data = BreakdownEnvironment.getDownload()
            .transitionLog.toJSON({
                storyPoints: BreakdownUtil.hasOption('cfdpoints'),
                fromDate: fromDate,
                toDate: toDate,
            });
        let xRange = d3.extent(data, function(d) {
            return d.date;
        });
        if (fromDate) {
            xRange[0] = fromDate;
        }
        if (toDate) {
            xRange[1] = toDate;
        }
        x.domain(xRange);
        let keys = data.columns.slice(1);
        stack.keys(keys);
        y.domain([0, d3.max(data, function(d) {
            let sum = 0;
            for (let i = 1, n = data.columns.length; i < n; i++) {
                sum += d[data.columns[i]];
            }
            return sum;
        })]);

        let newStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .new');
        let indeterminateStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .indeterminate');
        let doneStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .done');

        let layer = g.selectAll('.layer')
            .data(stack(data))
            .enter()
            .append('g')
            .attr('class', 'layer');

        layer.append('path')
            .attr('class', 'area')
            .style('fill', function(d) {
                if (BreakdownUtil.isIndeterminateStatus(d.key)) {
                    return indeterminateStyle.fill;
                } else if (BreakdownUtil.isDoneStatus(d.key)) {
                    return doneStyle.fill;
                }
                return newStyle.fill;
            })
            .style('stroke', function(d) {
                if (BreakdownUtil.isIndeterminateStatus(d.key)) {
                    return indeterminateStyle.stroke;
                } else if (BreakdownUtil.isDoneStatus(d.key)) {
                    return doneStyle.stroke;
                }
                return newStyle.stroke;
            })
            .style('stroke-width', '.5')
            .attr('d', area);


        layer.filter(function(d) {
                return y(d[d.length - 1][0]) - y(d[d.length - 1][1]) >= FONT_SIZE;
            })
            .append('text')
            .attr('x', width + 50)
            .attr('y', function(d) {
                return y(d[d.length - 1][1]);
            })
            .attr('dy', '.35em')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', function(d) {
                if (BreakdownUtil.isIndeterminateStatus(d.key)) {
                    return indeterminateStyle.color;
                } else if (BreakdownUtil.isDoneStatus(d.key)) {
                    return doneStyle.color;
                }
                return newStyle.color;
            })
            .text(function(d) {
                return (d[d.length - 1][1] - d[d.length - 1][0]) + ' ' + d.key;
            });

        let legendStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .legend');
        let axisStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .axis');
        let xAxis = g.append('g')
            .attr('transform', 'translate(0,' + height + ')')
            .call(d3.axisBottom(x));
        xAxis
            .selectAll('path')
            .style('stroke', axisStyle.color);
        xAxis
            .selectAll('line')
            .style('stroke', axisStyle.color);
        xAxis
            .selectAll('text')
            .style('fill', axisStyle.color)
            .style('font', FONT_SIZE + 'px sans-serif');

        let yAxis = g.append('g')
            .attr('transform', 'translate(' + width + ' ,0)')
            .call(d3.axisRight(y));
        yAxis
            .selectAll('path')
            .style('stroke', axisStyle.color);
        yAxis
            .selectAll('line')
            .style('stroke', axisStyle.color);
        yAxis
            .selectAll('text')
            .style('fill', axisStyle.color)
            .style('font', FONT_SIZE + 'px sans-serif');

        let newLegend = g.append('text')
            .attr('x', 0)
            .attr('y', -35)
            .attr('dy', '.35em')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', newStyle.color)
            .text('To Do');

        let indeterminateLegend = g.append('text')
            .attr('x', 55)
            .attr('y', -35)
            .attr('dy', '.35em')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', indeterminateStyle.color)
            .text('In Progress');

        let doneLegend = g.append('text')
            .attr('x', 140)
            .attr('y', -35)
            .attr('dy', '.35em')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', doneStyle.color)
            .text('Done');

        let counting = g.append('text')
            .attr('x', width + 50)
            .attr('y', -35)
            .attr('dy', '.35em')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', legendStyle.color)
            .text(BreakdownUtil.hasOption('cfdpoints') ? 'Counting Story Points' : 'Counting Issues');


        let markerStyle = BreakdownUtil.getStyleDeclaration('.breakdown-statistics .marker');
        let mark = function(svg, date, label) {
            let x1 = x(date);
            let y1 = height;
            let y2 = 0;
            svg.append('line')
                .attr('x1', x1)
                .attr('y1', y1)
                .attr('x2', x1)
                .attr('y2', y2)
                .style('stroke-width', '3')
                .style('stroke', markerStyle['background-color']);
            svg.append('line')
                .attr('x1', x1)
                .attr('y1', y1)
                .attr('x2', x1)
                .attr('y2', y2)
                .style('stroke-width', '1')
                .style('stroke', markerStyle.color);

            g.append('text')
                .attr('x', x1)
                .attr('y', -15)
                .attr('dy', '.35em')
                .style('font', FONT_SIZE + 'px sans-serif')
                .style('text-anchor', 'middle')
                .style('fill', markerStyle.color)
                .text(label ? label : BreakdownUtil.formatDate(date));

        }

        if (marker.length) {
            marker.forEach(m => {
                if (this.isDateInRange(m.date, data, fromDate, toDate)) {
                    mark(g, m.date, m.label);
                }
            });
        }

        let img = BreakdownUtil.toInlineSvgImg(svg.attr('width'), HEIGHT, cfd.innerHTML);
        this.chartCache.set(BreakdownEnvironment.getPath(), img);
        if (!BreakdownEnvironment.isHandlingDifferentEditors()) {
            this.setImg(img);
        }
        this.cfdContainer.removeChild(cfd);
    }

    getElement() {
        return this.element;
    }



}
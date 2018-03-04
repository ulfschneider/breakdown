'use babel';


import BreakdownEnvironment from './breakdown-environment';
const d3 = require('d3');
const HEIGHT = 600;
const FONT_SIZE = 12;

//TODO 1) give meaningful pull status bar for: pulling, prepare pushing, pull chart data
//TODO 2) remove event listeners
//TODO 3) limit to start and finish date -> in config


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
        this.reload.addEventListener('click', event => {
            if (this.display) {
                event.stopPropagation();
                config.pullChartData();
            }
        });

        this.content = document.createElement('div');
        this.element.appendChild(this.content);
        this.content.setAttribute('style', 'height:0px; transition: height 0.25s ease-in;');
        this.content.classList.add('content');

        this.gutter.addEventListener('click', event => {
            if (this.display) {
                this.slideDown();
            } else {
                this.slideUp(config.pullChartData);
            }
        });

        this.cfdContainer = document.createElement('div');
        this.content.appendChild(this.cfdContainer);
        this.cfdContainer.setAttribute('id', 'cfdContainer');

        this.cfdImg = document.createElement('img');
        this.cfdContainer.appendChild(this.cfdImg);

        window.addEventListener('resize', event => {
            this.render();
        });
    }

    serialize() {}

    deserialize(state) {}

    isVisible() {
        return this.display;
    }

    destroy() {
        this.element.remove();
    }

    clear() {
        this.cfdImg.setAttribute('style', 'display:none');
    }

    setImg(img) {
        this.cfdImg.setAttribute('src', img);
        this.cfdImg.setAttribute('style', 'display:inline-block');
    }

    slideDown() {
        this.display = false;
        this.label.innerHTML = '▲ Cumulative Flow Diagram';
        this.reload.setAttribute('style', 'display:none');
        this.content.setAttribute('style', 'height:0px; transition: height 0.25s ease-in;');
    }

    slideUp(callback) {
        let img = this.chartCache.get(BreakdownEnvironment.getPath());
        if (img) {
            this.setImg(img);
        } else {
            if (callback) {
                callback();
            } else {
                this.render();
            }
        }
        this.display = true;
        this.label.innerHTML = '▼ Cumulative Flow Diagram';
        this.reload.setAttribute('style', 'display:inline');
        this.content.setAttribute('style', 'height:' +
            HEIGHT + 'px; transition: height 0.25s ease-in;');
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
                top: 40,
                right: 200,
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

        let data = BreakdownEnvironment.getDownload()
            .transitionLog.toJSON(BreakdownUtil.hasOption('cfdpoints'));

        let keys = data.columns.slice(1);

        x.domain(d3.extent(data, function(d) {
            return d.date;
        }));

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
            .attr('x', width + 40)
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
            .attr('y', -15)
            .attr('dy', '.35em')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', newStyle.color)
            .text('New');

        let indeterminateLegend = g.append('text')
            .attr('x', 50)
            .attr('y', -15)
            .attr('dy', '.35em')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', indeterminateStyle.color)
            .text('In Progress');

        let doneLegend = g.append('text')
            .attr('x', 135)
            .attr('y', -15)
            .attr('dy', '.35em')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', doneStyle.color)
            .text('Done');

        let counting = g.append('text')
            .attr('x', 185)
            .attr('y', -15)
            .attr('dy', '.35em')
            .style('font', FONT_SIZE + 'px sans-serif')
            .style('text-anchor', 'start')
            .style('fill', legendStyle.color)
            .text(BreakdownUtil.hasOption('cfdpoints') ? 'Counting Story Points' : 'Counting Issues');

        let img = BreakdownUtil.toInlineSvgImg(svg.attr('width'), HEIGHT, cfd.innerHTML);
        this.chartCache.set(BreakdownEnvironment.getPath(), img);
        this.setImg(img);
        this.cfdContainer.removeChild(cfd);
    }

    getElement() {
        return this.element;
    }



}
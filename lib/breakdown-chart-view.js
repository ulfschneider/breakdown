'use babel';


import BreakdownEnvironment from './breakdown-environment';
const d3 = require('d3');

export default class BreakdownChartView {

    constructor() {
        this.element = document.createElement('div');
        this.element.classList.add('breakdown-statistics');

        this.gutter = document.createElement('div');
        this.element.appendChild(this.gutter);
        this.gutter.classList.add('gutter');

        this.open = document.createElement('div');
        this.gutter.appendChild(this.open);
        this.open.innerHTML = '▲ Cumulative Flow Diagram'; //⌃⎔
        this.gutter.addEventListener('click', event => {
            if (this.display) {
                this.display = false;
                this.open.innerHTML = '▲ Cumulative Flow Diagram';
                this.clear();
                this.cfdContainer.setAttribute('style', 'height:0px; transition: height 0.25s ease-in;');
            } else {
                this.display = true;
                this.open.innerHTML = '▼ Cumulative Flow Diagram';
                this.render();
                this.cfdContainer.setAttribute('style', 'height:500px; transition: height 0.25s ease-in;');
            }
        });

        this.content = document.createElement('div');
        this.element.appendChild(this.content);
        this.content.classList.add('content');

        this.cfdContainer = document.createElement('div');
        this.content.appendChild(this.cfdContainer);
        this.cfdContainer.setAttribute('id', 'cfdContainer');
        this.cfdContainer.setAttribute('style', 'height:0px; transition: height 0.25s ease-in;');

        this.cfd = document.createElement('svg');
        this.cfdContainer.appendChild(this.cfd);
        this.cfd.setAttribute('id', 'cfd');
        this.cfd.setAttribute('width', '900');
        this.cfd.setAttribute('height', '500');

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
        let svg = d3.select('#cfd');
        svg.selectAll("*");
    }

    render() {
        let svg = d3.select('#cfd');
        svg.selectAll("*")
            .remove();

        let margin = {
                top: 20,
                right: 20,
                bottom: 30,
                left: 50
            },
            width = svg.attr("width") - margin.left - margin.right,
            height = svg.attr("height") - margin.top - margin.bottom;

        let x = d3.scaleTime()
            .range([0, width]),
            y = d3.scaleLinear()
            .range([height, 0]),
            z = d3.scaleOrdinal(d3.schemeCategory10);

        let stack = d3.stack();

        let area = d3.area()
            .x(function(d, i) {
                return x(d.data.date);
            })
            .y0(function(d) {
                console.log('y(d[0]) ' + y(d[0]));
                return y(d[0]);
            })
            .y1(function(d) {
                console.log('y(d[0]) ' + y(d[1]));
                return y(d[1]);
            });

        let g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let data = BreakdownEnvironment.getDownload()
            .transitionLog.toJSON();

        let keys = data.columns.slice(1);

        x.domain(d3.extent(data, function(d) {
            return d.date;
        }));
        z.domain(keys);
        stack.keys(keys);

        let layer = g.selectAll(".layer")
            .data(stack(data))
            .enter()
            .append("g")
            .attr("class", "layer");

        layer.append("path")
            .attr("class", "area")
            .style("fill", function(d) {
                console.log('z(d.key) ' + z(d.key));
                return z(d.key);
            })
            .attr("d", area);

        layer.filter(function(d) {
                console.log('filter ' + (d[d.length - 1][1] - d[d.length - 1][0] > 0.01));
                return d[d.length - 1][1] - d[d.length - 1][0] > 0.01;
            })
            .append("text")
            .attr("x", width - 6)
            .attr("y", function(d) {
                return y((d[d.length - 1][0] + d[d.length - 1][1]) / 2);
            })
            .attr("dy", ".35em")
            .style("font", "10px sans-serif")
            .style("text-anchor", "end")
            .text(function(d) {
                return d.key;
            });

        g.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

        g.append("g")
            .attr("class", "axis axis--y")
            .call(d3.axisLeft(y)
                .ticks(10, "%"));
    }

    getElement() {
        return this.element;
    }



}
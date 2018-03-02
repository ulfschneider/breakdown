'use babel';


import BreakdownEnvironment from './breakdown-environment';
const d3 = require('d3');
const HEIGHT = 500;

//TODO remove event listeners
//TODO legend + hovering areas
//TODO color codes
//TODO clear for different file only
//TODO limit to start and finish date

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

        this.content = document.createElement('div');
        this.element.appendChild(this.content);
        this.content.setAttribute('style', 'height:0px; transition: height 0.25s ease-in;');
        this.content.classList.add('content');

        this.gutter.addEventListener('click', event => {
            if (this.display) {
                this.slideDown();
            } else {
                this.slideUp();
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

    slideDown() {
        this.display = false;
        this.open.innerHTML = '▲ Cumulative Flow Diagram';
        this.content.setAttribute('style', 'height:0px; transition: height 0.25s ease-in;');
    }

    slideUp() {
        this.display = true;
        this.open.innerHTML = '▼ Cumulative Flow Diagram';
        this.render();
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
                return y(d[0]);
            })
            .y1(function(d) {
                return y(d[1]);
            });

        let g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let data = BreakdownEnvironment.getDownload()
            .transitionLog.toJSON(true);

        let keys = data.columns.slice(1);

        x.domain(d3.extent(data, function(d) {
            return d.date;
        }));
        z.domain(keys);
        stack.keys(keys);
        y.domain([0, d3.max(data, function(d) {
            let sum = 0;
            for (let i = 1, n = data.columns.length; i < n; i++) {
                sum += d[data.columns[i]];
            }
            return sum;
        })]);

        let layer = g.selectAll(".layer")
            .data(stack(data))
            .enter()
            .append("g")
            .attr("class", "layer");

        layer.append("path")
            .attr("class", "area")
            .style("fill", function(d) {
                return z(d.key);
            })
            .attr("d", area);

        layer.filter(function(d) {
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
            .call(d3.axisLeft(y));

        this.cfdImg.setAttribute('src', BreakdownUtil.toInlineSvgImg(svg.attr("width"), HEIGHT, cfd.innerHTML));
        this.cfdImg.setAttribute('style', 'display:inline-block');
        this.cfdContainer.removeChild(cfd);
    }

    getElement() {
        return this.element;
    }



}
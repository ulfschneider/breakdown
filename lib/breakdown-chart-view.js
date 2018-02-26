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
            } else {
                this.display = true;
                this.open.innerHTML = '▼ Cumulative Flow Diagram';
            }
        });

        this.content = document.createElement('div');
        this.element.appendChild(this.content);
        this.content.classList.add('content');

        this.cfdContainer = document.createElement('div');
        this.content.appendChild(this.cfdContainer);
        this.cfdContainer.setAttribute('id', 'cfd-container');

        this.cfd = document.createElement('svg');
        this.cfdContainer.appendChild(this.cfd);

    }

    serialize() {}

    deserialize(state) {}

    destroy() {
        this.element.remove();
    }

    getElement() {
        return this.element;
    }



}
'use babel';


import BreakdownEnvironment from './breakdown-environment';

export default class BreakdownStatisticsView {

    constructor() {
        this.element = document.createElement('div');
        this.element.classList.add('breakdown-statistics');

        this.gutter = document.createElement('div');
        this.element.appendChild(this.gutter);
        this.gutter.innerHTML = '⬆ Cumulative Flow Diagram';

        this.content = document.createElement('div');
        this.element.appendChild(this.content);
        this.content.classList.add('content');

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
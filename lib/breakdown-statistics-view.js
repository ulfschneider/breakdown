'use babel';


import BreakdownEnvironment from './breakdown-environment';

export default class BreakdownStatisticsView {

    constructor() {
        this.element = document.createElement('div');
        this.element.classList.add('breakdown-statistics');

        this.content = document.createElement('div');
        this.content.classList.add('content');
        this.element.appendChild(this.content);
        this.content.innerHTML = ' ⬆ Breakdown<br>2<br>3<br>4<br>2<br>3<br>4<br>2<br>3<br>4<br>2<br>3<br>4<br>2<br>3<br>4<br>2<br>3<br>4';
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
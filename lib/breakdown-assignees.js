'use babel';
import _ from 'underscore';
import Assignee from './breakdown-assignee';

export default class Assignees {

    constructor() {
        this.assignees = new Map();
    }

    addIssue(issue) {
        let name = issue.fields.assignee ? issue.fields.assignee.name : '';
        if (name) {
            let assignee = this.assignees.get(name);
            if (!assignee) {
                assignee = new Assignee(name);
            }
            assignee.addIssue(issue);
            this.assignees.set(name, assignee);
        }
    }

    getNames() {
        return [...this.assignees.keys()]
            .sort((a, b) => {
                return a.toLowerCase()
                    .localeCompare(b.toLowerCase());
            });
    }

    forEach(callback) {
        for (name of this.getNames()) {
            callback(this.assignees.get(name));
        }
    }

    size() {
        return this.assignees.size;
    }
};
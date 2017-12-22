'use babel';
import _ from 'underscore';
import Assignee from './breakdown-assignee';

export default class Assignees {

    constructor() {
        this.assignees = new Map();
    }

    addAssignee(assignee) {
        if (!this.assignees.has(assignee.getName())) {
            this.assignees.set(assignee.getName(), assignee);
        }
    }

    setAssignee(assignee) {
        this.assignees.set(assignee.getName(), assignee);
    }

    addIssue(assigneeName, issue, resolved) {
        let assignee = this.assignees.get(assigneeName);
        if (!assignee) {
            assignee = new Assignee(assigneeName);
        }
        assignee.addIssue(issue, resolved);
        this.setAssignee(assignee);
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
'use babel';
import _ from 'underscore';
import Assignee from './breakdown-assignee';
import BreakdownUtil from './breakdown-util';

export default class Assignees {

    constructor() {
        this.assignees = new Map();
    }

    addIssue(issue) {
        let name = BreakdownUtil.getAssignee(issue);
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

    resolvedIssueCount() {
        let total = 0;
        this.forEach(assignee => {
            total += assignee.resolvedIssueCount();
        });
        return total;
    }

    unresolvedIssueCount() {
        let total = 0;
        this.forEach(assignee => {
            total += assignee.unresolvedIssueCount();
        });
        return total;
    }

    issueCount() {
        return this.resolvedIssueCount() + this.unresolvedIssueCount();
    }
};
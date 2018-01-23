'use babel';
import _ from 'underscore';
import Assignee from './breakdown-assignee';
import BreakdownUtil from './breakdown-util';

const UNASSIGNED = 'unassigned';

export default class Assignees {


    constructor() {
        this.assignees = new Map();
    }

    addIssue(issue) {
        let name = BreakdownUtil.getAssignee(issue);
        name = name ? name : UNASSIGNED;

        let assignee = this.assignees.get(name);
        if (!assignee) {
            assignee = new Assignee(name);
        }
        assignee.addIssue(issue);
        this.assignees.set(name, assignee);
    }

    getRemainingEstimateSeconds() {
        let issues = this.getUnresolvedIssues();
        let seconds = 0;
        issues.forEach(issue => {
            seconds += BreakdownUtil.getRemainingEstimateSeconds(issue);

        });
        return seconds;
    }

    getUnresolvedIssues() {
        let unresolved = [];
        this.forEach(assignee => {
            unresolved.push(...assignee.getUnresolvedIssues());
        });
        return unresolved;
    }

    getResolvedIssues() {
        let resolved = [];
        this.forEach(assignee => {
            resolved.push(...assignee.getResolvedIssues());
        });
        return resolved;
    }


    getNames() {
        return [...this.assignees.keys()]
            .sort((a, b) => {
                if (a == UNASSIGNED) {
                    return 1;
                } else if (b == UNASSIGNED) {
                    return -1;
                } else {
                    return a.toLowerCase()
                        .localeCompare(b.toLowerCase());
                }
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
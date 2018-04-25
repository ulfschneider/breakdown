'use babel';
import _ from 'underscore';
import {
    SoSet
} from 'somap';
import BreakdownUtil from './breakdown-util';

export default class Assignee {

    constructor(name) {
        this.name = name;

        //use order of insertion, which will be the order of the query
        this.issues = [];
        this.resolvedKeys = new Set();
        this.unresolvedKeys = new Set();
    }

    getName() {
        return this.name;
    }

    addIssue(issue) {
        this.issues.push(issue);
        if (BreakdownUtil.isResolved(issue)) {
            this.resolvedKeys.add(BreakdownUtil.getKey(issue));
        } else {
            this.unresolvedKeys.add(BreakdownUtil.getKey(issue));
        }
    }

    isResolved(key) {
        return this.resolvedKeys.has(key);
    }

    getResolvedIssueKeys() {
        return [...this.resolvedKeys];
    }

    getResolvedIssues() {
        let resolved = [];
        for (issue of this.issues) {
            if (BreakdownUtil.isResolved(issue)) {
                resolved.push(issue);
            }
        }
        return resolved;
    }

    resolvedIssueCount() {
        return this.resolvedKeys.size;
    }

    getUnresolvedIssueKeys() {
        return [...this.unresolvedKeys];
    }

    getUnresolvedIssues() {
        let unresolved = [];
        for (issue of this.issues) {
            if (!BreakdownUtil.isResolved(issue)) {
                unresolved.push(issue);
            }
        }
        return unresolved;
    }

    getIssues() {
        return this.issues;
    }

    unresolvedIssueCount() {
        return this.unresolvedKeys.size;
    }

    issueCount() {
        return this.issues.length;
    }


    getRemainingEstimateSeconds() {
        return BreakdownUtil.summarizeRemainingEstimateSeconds(this.issues);
    }

    getTimeSpentSeconds() {
        return BreakdownUtil.summarizeTimeSpentSeconds(this.issues);
    }

    getUnresolvedRemainingEstimateSeconds() {
        let issues = this.getUnresolvedIssues();
        return BreakdownUtil.summarizeRemainingEstimateSeconds(issues);
    }

    getUnresolvedTimeSpentSeconds() {
        let issues = this.getUnresolvedIssues();
        return BreakdownUtil.summarizeTimeSpentSeconds(issues);
    }

    getResolvedRemainingEstimateSeconds() {
        let issues = this.getResolvedIssues();
        return BreakdownUtil.summarizeRemainingEstimateSeconds(issues);
    }

    getResolvedTimeSpentSeconds() {
        let issues = this.getResolvedIssues();
        return BreakdownUtil.summarizeTimeSpentSeconds(issues);
    }
}
'use babel';
import _ from 'underscore';
import BreakdownUtil from './breakdown-util';

export default class Assignee {

    constructor(name) {
        this.name = name;
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

    getIssueKeys() {
        return _.pluck(this.issues, 'key');
    }

    isResolved(key) {
        return this.resolvedKeys.has(key);
    }

    getResolvedIssueKeys() {
        return [...this.resolvedKeys.values()];
    }

    getResolvedIssues() {
        let resolved = [];
        this.getResolvedIssueKeys()
            .forEach(key => {
                resolved.push(_.find(this.issues, issue => {
                    return key == BreakdownUtil.getKey(issue);
                }));
            });

        return resolved;
    }

    resolvedIssueCount() {
        return this.resolvedKeys.size;
    }

    getUnresolvedIssueKeys() {
        return [...this.unresolvedKeys.values()];
    }

    getUnresolvedIssues() {
        let unresolved = [];
        this.getUnresolvedIssueKeys()
            .forEach(key => {
                unresolved.push(_.find(this.issues, issue => {
                    return key == BreakdownUtil.getKey(issue);
                }));
            });

        return unresolved;
    }

    getIssues() {
        let issues = this.getUnresolvedIssues();
        return issues.concat(this.getResolvedIssues());
    }

    unresolvedIssueCount() {
        return this.unresolvedKeys.size;
    }

    issueCount() {
        return this.resolvedIssueCount() + this.unresolvedIssueCount();
    }


    getRemainingEstimateSeconds() {
        let issues = this.getIssues();
        return BreakdownUtil.summarizeRemainingEstimateSeconds(issues);
    }

    getTimeSpentSeconds() {
        let issues = this.getIssues();
        return BreakdownUtil.summarizeTimeSpentSeconds(issues);
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


};
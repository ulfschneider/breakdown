'use babel';
import _ from 'underscore';

export default class Assignee {

    constructor(name) {
        this.name = name;
        this.issues = [];
        this.resolvedKeys = new Set();
    }

    getName() {
        return this.name;
    }

    addIssue(issue, resolved) {
        this.issues.push(issue);
        if (resolved) {
            this.setResolved(issue.key);
        }
    }

    getIssueKeys() {
        return _.pluck(this.issues, 'key');
    }

    setResolved(key) {
        this.resolvedKeys.set(key);
    }

    isResolved(key) {
        return this.resolvedKeys.has(key);
    }

    getResolvedIssueKeys() {
        return [...this.resolvedKeys.values()];
    }

    getUnresolvedIssueKeys() {
        let issueKeys = this.getIssueKeys();
        let result = [];
        issueKeys.forEach((key) => {
            if (!this.isResolved(key)) {
                result.push(key);
            }
        });
        return result;
    }

};
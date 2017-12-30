'use babel';
import _ from 'underscore';
import BreakdownUtils from './breakdown-util';

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
    if (BreakdownUtils.isResolved(issue)) {
      this.resolvedKeys.add(issue.key);
    } else {
      this.unresolvedKeys.add(issue.key);
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

  resolvedIssueCount() {
    return this.resolvedKeys.size;
  }

  getUnresolvedIssueKeys() {
    return [...this.unresolvedKeys.values()];
  }

  unresolvedIssueCount() {
    return this.unresolvedKeys.size;
  }

  issueCount() {
    return this.resolvedIssueCount() + this.unresolvedIssueCount();
  }

};
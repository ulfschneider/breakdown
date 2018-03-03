'use babel';
import moment from 'moment';
import BreakdownUtil from './breakdown-util';
import _ from 'underscore';

export default class TransitionLog {

    DATE_FORMAT = 'YYYY-MM-DD';

    constructor() {
        this.transitions = new Map();
    }

    clear() {
        this.transitions.clear();
    }

    toString() {
        let result = '';
        this.sort();
        this.transitions.forEach((statusMap, date) => {
            result += date;
            statusMap.forEach((issues, status) => {
                result += ' ';
                result += status;
                result += '=';
                result += issues.length;
            });
            result += '\n';
        });
        return result;
    }

    toJSON(storyPoints) {
        let json = [];
        this.sort();
        this.transitions.forEach((statusMap, date) => {
            let entry = {
                date: moment(date)
            };
            this.doneStates.forEach(status => {
                entry[status] = 0;
            });
            this.indeterminateStates.forEach(status => {
                entry[status] = 0;
            });
            this.newStates.forEach(status => {
                entry[status] = 0;
            });

            if (storyPoints) {
                statusMap.forEach((issues, status) => {
                    entry[status] = _.reduce(issues, (memo, issue) => {
                        let points = BreakdownUtil.getStoryPoints(issue);
                        return memo + (points ? points : 0);
                    }, 0);
                });
            } else {
                statusMap.forEach((issues, status) => {
                    entry[status] = issues.length;
                });
            }
            json.push(entry);
        });

        json.columns = ['date'];
        json.columns = json.columns.concat(...this.doneStates);
        json.columns = json.columns.concat(...this.indeterminateStates);
        json.columns = json.columns.concat(...this.newStates);

        return json;
    }



    maintainStates(status, category) {
        if (category == BreakdownUtil.NEW) {
            this.newStates.add(status);
        } else if (category == BreakdownUtil.INDETERMINATE) {
            this.indeterminateStates.add(status);
        } else if (category == BreakdownUtil.DONE) {
            this.doneStates.add(status);
        }
    }

    sort() {
        this.newStates = new Set();
        this.indeterminateStates = new Set();
        this.doneStates = new Set();

        this.transitions = BreakdownUtil.sortMap(this.transitions);
        this.transitions.forEach((value, key, map) => {
            let sortedMap = BreakdownUtil.sortMap(value, (a, b) => {
                aCat = BreakdownUtil.getStatusCategory(a);
                bCat = BreakdownUtil.getStatusCategory(b);
                this.maintainStates(a, aCat);
                this.maintainStates(b, bCat);

                if (aCat == bCat) {
                    return a.localeCompare(b);
                } else if (aCat == BreakdownUtil.DONE) {
                    return -1;
                } else if (bCat == BreakdownUtil.DONE) {
                    return 1;
                } else if (aCat == BreakdownUtil.NEW) {
                    return 1;
                } else if (bCat == BreakdownUtil.NEW) {
                    return -1;
                }
            });
            map.set(key, sortedMap);
        });

        this.newStates = new Set([...this.newStates].sort((a, b) => {
            return a.localeCompare(b);
        }));
        this.indeterminateStates = new Set([...this.indeterminateStates].sort((a, b) => {
            return a.localeCompare(b);
        }));
        this.doneStates = new Set([...this.doneStates].sort((a, b) => {
            return a.localeCompare(b);
        }));
    }

    get() {
        this.sort();
        return this.transitions;
    }

    addIssue(issue) {
        //this.transitions = Map(date => Map(status => [issues]))

        issueTransitions = this.getTransitionLogForIssue(issue);
        issueTransitions.forEach((status, date) => {
            //status = value, date = key
            if (!this.transitions.has(date)) {
                this.transitions.set(date, new Map());
            }
            let statusForDay = this.transitions.get(date);

            if (!statusForDay.has(status)) {
                statusForDay.set(status, []);
            }

            let issuesInStatus = statusForDay.get(status);
            issuesInStatus.push(issue);
        });
    }


    getTransitionLogForIssue(issue) {
        let transitions = new Map();
        //date => status

        let referenceDate = moment(issue.fields.created).startOf('day');
        let referenceStatus;
        if (issue.changelog) {
            let histories = issue.changelog.histories;
            for (let change of histories) {
                for (let item of change.items) {
                    if (item.field == 'status') {
                        let date = moment(change.created)
                            .startOf('day');
                        if (referenceDate) {
                            while (referenceDate
                                .isBefore(date)) {
                                if (!referenceStatus) {
                                    referenceStatus = item.fromString;
                                }
                                transitions.set(referenceDate.format(this.DATE_FORMAT), referenceStatus);
                                referenceDate.add(1, 'days');
                            }
                        }
                        transitions.set(date.format(this.DATE_FORMAT), item.toString);
                        referenceDate = date;
                        referenceStatus = item.toString;
                    }
                }
            }
        }
        //fill date until today
        if (referenceDate) {
            let now = moment().startOf('day');
            while (referenceDate
                .isSameOrBefore(now)) {
                if (!referenceStatus) {
                    referenceStatus = BreakdownUtil.getStatus(issue);
                }
                transitions.set(referenceDate.format(this.DATE_FORMAT), referenceStatus);
                referenceDate.add(1, 'days');
            }
        }

        return transitions;
    }
}
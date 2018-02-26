'use babel';
import moment from 'moment';
import BreakdownUtil from './breakdown-util';

export default class TransitionLog {

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

    sort() {
        this.transitions = BreakdownUtil.sortMap(this.transitions);
        this.transitions.forEach((value, key, map) => {
            console.log('sorting ' + key);
            map.set(key, BreakdownUtil.sortMap(value, (a, b) => {
                aCat = BreakdownUtil.getStatusCategory(a);
                bCat = BreakdownUtil.getStatusCategory(b);
                if (aCat == bCat) {
                    return a.localeCompare(b);
                } else if (aCat == 'done') {
                    return -1;
                } else if (bCat == 'done') {
                    return 1;
                } else if (aCat == 'new') {
                    return 1;
                } else if (bCat == 'new') {
                    return -1;
                }
            }));
        });
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
        let histories = issue.changelog.histories;
        let referenceDate;
        let referenceStatus;
        for (let change of histories) {
            for (let item of change.items) {
                if (item.field == 'status') {
                    let date = moment(change.created)
                        .startOf('day');
                    if (referenceDate) {
                        while (referenceDate.add(1, 'days')
                            .isBefore(date)) {
                            transitions.set(referenceDate.format('YYYY-MM-DD'), referenceStatus);
                        }
                    }
                    transitions.set(date.format('YYYY-MM-DD'), item.toString);
                    referenceDate = date;
                    referenceStatus = item.toString;
                }
            }
        }
        //fill date until today
        if (referenceDate) {
            let now = moment();
            while (referenceDate.add(1, 'days')
                .isBefore(now)) {
                transitions.set(referenceDate.format('YYYY-MM-DD'), referenceStatus);
            }
        }

        return transitions;
    }
}
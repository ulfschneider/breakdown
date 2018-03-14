'use babel';
import moment from 'moment';
import BreakdownUtil from './breakdown-util';
import _ from 'underscore';

export default class TransitionLog {

    constructor() {
        this.transitions = new Map();
        this.resolvedIssues = [];
    }

    clear() {
        this.transitions.clear();
        this.resolvedIssues = [];
    }


    transitionsToJSON({
        storyPoints,
        fromDate,
        toDate
    }) {
        let entry, today;
        let json = [];

        this.transitionLog()
            .forEach((statusMap, date) => {
                today = moment(date);
                if ((BreakdownUtil.isFalsy(fromDate) || today.isSameOrAfter(fromDate)) &&
                    (BreakdownUtil.isFalsy(toDate) || today.isSameOrBefore(toDate))) {
                    entry = {
                        date: today
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
                                return memo + points;
                            }, 0);
                        });
                    } else {
                        statusMap.forEach((issues, status) => {
                            entry[status] = issues.length;
                        });
                    }
                    json.push(entry);
                }
            });


        if (json.length) {
            if (BreakdownUtil.isFalsy(toDate) || today.isBefore(toDate)) {
                json[json.length - 1].date = moment(); //set last entry to now, instead of beginning of day
            }
        }
        json.columns = ['date'];
        json.columns = json.columns.concat(...this.doneStates);
        json.columns = json.columns.concat(...this.indeterminateStates);
        json.columns = json.columns.concat(...this.newStates);

        return json;
    }

    indeterminateCount(date, storyPoints) {
        let count = 0;
        let statusMap = this.transitionLog()
            .get(BreakdownUtil.formatDate(date));
        if (statusMap) {
            if (storyPoints) {
                statusMap.forEach((issues, status) => {
                    count += _.reduce(issues, (memo, issue) => {
                        let points = 0;
                        if (BreakdownUtil.isIndeterminateStatus(status)) {
                            points = BreakdownUtil.getStoryPoints(issue);
                        }
                        return memo + points;
                    }, 0);
                });
            } else {
                statusMap.forEach((issues, status) => {
                    if (BreakdownUtil.isIndeterminateStatus(status)) {
                        count += issues.length;
                    }
                });
            }
        }

        return count;
    }

    durationsToJSON({
        storyPoints,
        fromDate,
        toDate
    }) {
        let json = [];
        let transition = this.transitionLog();
        let durations = this.durationLog();
        let resolvedAtDate;

        this.transitionLog()
            .forEach((statusMap, date) => {
                today = moment(date);
                if ((BreakdownUtil.isFalsy(fromDate) || today.isSameOrAfter(fromDate)) &&
                    (BreakdownUtil.isFalsy(toDate) || today.isSameOrBefore(toDate))) {
                    let entry = {
                        date: today,
                        indeterminateCount: this.indeterminateCount(today, storyPoints),
                        avgCycleTime: resolvedAtDate ? resolvedAtDate.avgCycleTime : null,
                        avgLeadTime: resolvedAtDate ? resolvedAtDate.avgLeadTime : null
                    };
                    json.indeterminateCount = entry.indeterminateCount;

                    if (durations.has(date)) {
                        resolvedAtDate = durations.get(date);
                    }
                    if (resolvedAtDate) {
                        entry.avgCycleTime = resolvedAtDate.avgCycleTime;
                        entry.avgLeadTime = resolvedAtDate.avgLeadTime;
                    }

                    json.push(entry);
                }
            });
        json.columns = ['date', 'avgCycleTime', 'avgLeadTime', 'indeterminateCount'];
        json.avgLeadTime = durations.avgLeadTime;
        json.avgCycleTime = durations.avgCycleTime;

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

    transitionLog() {
        this.sort();
        return this.transitions;
    }

    durationLog() {
        //prepare data structure for calculation
        this.resolvedIssues = _.sortBy(this.resolvedIssues, issue => {
            return BreakdownUtil.getResolvedDate(issue)
        });

        let durations = new Map();
        for (issue of this.resolvedIssues) {
            let resolvedDate = BreakdownUtil.formatDate(moment(BreakdownUtil.getResolvedDate(issue)));
            let resolvedAtDate = durations.get(resolvedDate);
            if (BreakdownUtil.isFalsy(resolvedAtDate)) {
                resolvedAtDate = [];
                durations.set(resolvedDate, resolvedAtDate);
            }
            resolvedAtDate.push(issue);
        }
        durations = BreakdownUtil.sortMap(durations);

        //calculate avg lead time and avg cycle time
        let cycleTime = moment.duration(0);
        let leadTime = moment.duration(0);
        let cycleCount = 0;
        let leadCount = 0;
        durations.forEach((resolvedAtDate, resolvedDate, map) => {

            for (issue of resolvedAtDate) {
                if (issue.cycleTime > 0) {
                    cycleCount++;
                    cycleTime.add(issue.cycleTime);
                }
                if (issue.leadTime > 0) {
                    leadCount++;
                    leadTime.add(issue.leadTime);
                }
            }
            if (cycleTime > 0) {
                resolvedAtDate.avgCycleTime = moment.duration(Math.ceil(cycleTime / cycleCount));
            }
            if (leadTime > 0) {
                resolvedAtDate.avgLeadTime = moment.duration(Math.ceil(leadTime / leadCount));
            }
        });

        if (cycleTime > 0) {
            durations.avgCycleTime = moment.duration(Math.ceil(cycleTime / cycleCount));
        }
        if (leadTime > 0) {
            durations.avgLeadTime = moment.duration(Math.ceil(leadTime / leadCount));
        }

        return durations;
    }

    addIssue(issue) {
        //this.transitions = Map(date => Map(status => [issues]))
        //this.resolvedIssues = []

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

        if (BreakdownUtil.isResolved(issue)) {
            this.resolvedIssues.push(issue);
        }
    }

    getSortedHistories(issue) {
        //ensure ascending order of histories
        if (issue.changelog) {
            let histories = issue.changelog.histories;
            return _.sortBy(histories, 'created');
        }
        return [];
    }


    getTransitionLogForIssue(issue) {
        let transitions = new Map(); //date => status

        let referenceDate = moment(issue.fields.created);
        let histories = this.getSortedHistories(issue);
        let referenceStatus, cycleStart;

        for (let change of histories) {
            for (let item of change.items) {
                if (item.field == 'status') {
                    let date = moment(change.created);

                    //determine cycle time start date
                    if (BreakdownUtil.isFalsy(cycleStart) &&
                        BreakdownUtil.isNewStatus(referenceStatus) &&
                        !BreakdownUtil.isNewStatus(item.toString)) {
                        cycleStart = moment(change.created);
                    }

                    //set transition log values for each day
                    while (referenceDate
                        .isBefore(date)) {
                        if (!referenceStatus) {
                            referenceStatus = item.fromString;
                        }
                        transitions.set(BreakdownUtil.formatDate(referenceDate), referenceStatus);
                        referenceDate.add(1, 'days');
                    }

                    transitions.set(BreakdownUtil.formatDate(date), item.toString);
                    referenceDate = date;
                    referenceStatus = item.toString;
                }
            }
        }

        //fill date until today
        if (referenceDate) {
            let now = moment()
                .endOf('day');
            while (referenceDate
                .isSameOrBefore(now)) {
                if (!referenceStatus) {
                    referenceStatus = BreakdownUtil.getStatus(issue);
                }
                transitions.set(BreakdownUtil.formatDate(referenceDate), referenceStatus);
                referenceDate.add(1, 'days');
            }
        }

        if (BreakdownUtil.isResolved(issue)) {
            issue.leadTime = moment.duration(moment(BreakdownUtil.getResolvedDate(issue))
                .diff(issue.fields.created));
            if (cycleStart) {
                issue.cycleTime = moment.duration(moment(BreakdownUtil.getResolvedDate(issue))
                    .diff(cycleStart));
            }
        }

        return transitions;
    }

}
'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownParse from './breakdown-parse';
import BreakdownEnvironment from './breakdown-environment';
import _ from 'underscore';

export default BreakdownStringify = (function() {

    return {
        stringifyAfterPull() {
            BreakdownEnvironment.setEditorText(this.stringifyJiraContent());
        },

        stringifyParentKey(issue) {
            let result = '';
            if (BreakdownUtil.hasOption('parentkey')) {
                let epic = BreakdownUtil.getEpicLink(issue);
                let parent = BreakdownUtil.getParentKey(issue);
                if (epic) {
                    result += '^';
                    result += epic;
                } else if (parent) {
                    result += '^';
                    result += parent;
                }
            }
            return result;
        },

        isInActiveSprint(jiraObject) {
            let issue = jiraObject.issue;
            if (issue && BreakdownUtil.isInActiveSprint(issue)) {
                return true;
            } else if (jiraObject.stories) {
                for (let storyObject of jiraObject.stories.values()) {
                    let issue = storyObject.issue;
                    if (issue && BreakdownUtil.isInActiveSprint(issue)) {
                        return true;
                    }
                }
            }
            return false;
        },

        stringifyActiveSprint(jiraObject) {
            if (this.isInActiveSprint(jiraObject)) {
                return BreakdownUtil.ACTIVE_SPRINT;
            }
            return '';
        },

        stringifyJiraObject(jiraObject) {
            let result = '';
            let issue = jiraObject.issue;
            if (issue) {
                if (BreakdownUtil.isStoryType(issue)) {
                    result += '\t';
                } else if (BreakdownUtil.isSubTaskType(issue)) {
                    result += '\t\t';
                }
                result += this.stringifyActiveSprint(jiraObject);
                if (BreakdownUtil.isResolved(issue)) {
                    result += 'Resolved ';
                }
                result += BreakdownUtil.getIssueType(issue);
                result += ' ';
                result += BreakdownUtil.getKey(issue);
                result += ' ';
                result += issue.fields.summary;
                result += this.stringifyFields(jiraObject);
                let parentKey = this.stringifyParentKey(issue);
                if (parentKey) {
                    result += ' ';
                    result += parentKey;
                }
                result += BreakdownEnvironment.getEditorLineEnding();
            }
            return result;
        },

        stringifyProgress(fraction, total, sum) {
            let result = '';
            if (total) {
                if (sum) {
                    result += 'Σ=';
                }
                result += fraction;
                if (fraction != total) {
                    result += '/';
                    result += total;
                }
                result += ' ';
                result += BreakdownUtil.progressBar(fraction / total);
            }
            return result;
        },

        stringifyFields(jiraObject) {
            let result = '';
            let totalPoints = 0;
            let donePoints = 0;
            let issue = jiraObject.issue;
            let issuetype = BreakdownUtil.getIssueType(issue);

            if (BreakdownUtil.isEpicType(issue)) {
                totalPoints = this.summarizePoints(jiraObject);
                donePoints = this.summarizeDonePoints(jiraObject);
            }

            if (this.hasPrimaryFields(issue) || totalPoints) {
                result += ' (';
                if (this.hasStatus(issue)) {
                    result += ' s:';
                    result += BreakdownUtil.getStatus(issue);
                }
                if (this.hasAssignee(issue)) {
                    result += ' a:';
                    result += BreakdownUtil.getAssignee(issue);
                }
                if (this.hasPoints(issue) || totalPoints) {
                    result += ' p:';
                    let points = BreakdownUtil.getStoryPoints(issue);
                    if (points) {
                        result += points;
                    }
                    if (totalPoints) {
                        if (points) {
                            result += ' ';
                        }
                        result += this.stringifyProgress(donePoints, totalPoints, true);
                    }
                }
                if (this.hasFixVersion(issue)) {
                    let fixversions = BreakdownUtil.getFixVersions(issue);
                    result += ' v:';
                    result += BreakdownUtil.stringifyFixVersions(fixversions);
                }
                if (this.hasComponents(issue)) {
                    let components = BreakdownUtil.getComponents(issue);
                    result += ' c:';
                    result += BreakdownUtil.stringifyComponents(components);
                }

                result += ' ) ';
            }
            return result;
        },

        stringifyMarker() {
            let result = '';
            let settings = BreakdownEnvironment.getSettings();

            if (settings.markers.length) {
                settings.markers = _.sortBy(settings.markers, 'date');
                settings.markers.forEach(m => {
                    if (m.label) {
                        result += '(';
                        result += BreakdownUtil.formatDate(m.date);
                        result += ':';
                        result += m.label;
                        result += ')';
                        result += ' ';
                    } else {
                        result += BreakdownUtil.formatDate(m.date);
                        result += ' ';
                    }
                });
            }
            return result;
        },


        stringifySettings() {
            let settings = BreakdownEnvironment.getSettings();
            let result = '';
            let lineEnding = BreakdownEnvironment.getEditorLineEnding();
            result += 'breakdown';
            result += lineEnding;

            result += 'url: ';
            result += settings.jiraUrl;
            result += lineEnding;

            if (settings.project) {
                result += 'project: ';
                result += settings.project;
                result += lineEnding;
            }

            result += 'query: ';
            result += settings.query;
            result += lineEnding;

            if (settings.options.length) {
                result += 'options: ';
                result += BreakdownUtil.concat(settings.options, ' ');
                result += lineEnding;
            }

            if (settings.fixversion) {
                result += 'fixversion: ';
                result += settings.fixversion;
                result += lineEnding;
            }
            if (settings.points) {
                result += 'points: ';
                result += settings.points;
                result += lineEnding;
            }
            if (settings.fromDate) {
                result += 'fromdate: ';
                result += BreakdownUtil.formatDate(settings.fromDate);
                result += lineEnding;
            }
            if (settings.predict) {
                result += 'predict: ';
                result += BreakdownUtil.formatDate(settings.predict);
                result += lineEnding;
            }
            if (settings.markers.length) {
                result += 'markers: ';
                result += this.stringifyMarker();
                result += lineEnding;
            }

            if (settings.toDate) {
                result += 'todate: ';
                result += BreakdownUtil.formatDate(settings.toDate);
                result += lineEnding;
            }

            result += '---';
            result += lineEnding;

            return result;
        },

        getWorkingHoursPerDay() {
            let settings = BreakdownEnvironment.getSettings();
            return settings.timeTrackingConfiguration && settings.timeTrackingConfiguration.workingHoursPerDay ? settings.timeTrackingConfiguration.workingHoursPerDay : 8;
        },

        getWorkingDaysPerWeek() {
            let settings = BreakdownEnvironment.getSettings();
            return settings.timeTrackingConfiguration && settings.timeTrackingConfiguration.workingDaysPerWeek ? settings.timeTrackingConfiguration.workingDaysPerWeek : 5;
        },

        stringifyTimeTracking(timeSpentSeconds, remainingEstimateSeconds) {
            let result = '';
            let spentTime = BreakdownUtil.stringifySeconds(timeSpentSeconds,
                this.getWorkingHoursPerDay(),
                this.getWorkingDaysPerWeek());
            let remainingEstimate = BreakdownUtil.stringifySeconds(remainingEstimateSeconds, this.getWorkingHoursPerDay(), this.getWorkingDaysPerWeek());

            if (spentTime || remainingEstimate) {
                result += '[';
                result += (spentTime ? spentTime : 'nothing');
                result += ' logged';
                result += ' | ';
                result += (remainingEstimate ? remainingEstimate : 'nothing');
                result += ' remain';
                result += ']';
            }

            return result;
        },

        stringifyUnresolvedIssues(assignee) {
            let unresolvedIssues = assignee.getUnresolvedIssues();
            let lineEnding = BreakdownEnvironment.getEditorLineEnding();
            let result = '\t\t';
            result += unresolvedIssues.length;
            result += ' issues unresolved';
            let timeTracking = this.stringifyTimeTracking(assignee.getUnresolvedTimeSpentSeconds(), assignee.getUnresolvedRemainingEstimateSeconds());
            if (timeTracking) {
                result += ' ';
                result += timeTracking;
            }
            result += lineEnding;

            unresolvedIssues.forEach((issue, index) => {
                result += '\t\t';
                if (BreakdownUtil.isInActiveSprint(issue)) {
                    result += BreakdownUtil.ACTIVE_SPRINT;
                }
                result += BreakdownUtil.getKey(issue);
                result += ' ';
                result += BreakdownUtil.getIssueType(issue);
                result += ', ';
                result += BreakdownUtil.getStatus(issue);
                let timeTracking = this.stringifyTimeTracking(BreakdownUtil.getTimeSpentSeconds(issue), BreakdownUtil.getRemainingEstimateSeconds(issue));
                if (timeTracking) {
                    result += ' ';
                    result += timeTracking;
                }
                result += ': ';
                result += BreakdownUtil.getSummary(issue);
                let parentKey = this.stringifyParentKey(issue);
                if (parentKey) {
                    result += ' ';
                    result += parentKey;
                }

                if (index < unresolvedIssues.length - 1) {
                    result += lineEnding;
                }
            });
            return result;
        },

        stringifyResolvedIssues(assignee) {
            let resolvedIssues = assignee.getResolvedIssues();
            let lineEnding = BreakdownEnvironment.getEditorLineEnding();
            let result = '\t\t';
            result += resolvedIssues.length;
            result += ' issues resolved';
            let timeTracking = this.stringifyTimeTracking(assignee.getResolvedTimeSpentSeconds(), assignee.getResolvedRemainingEstimateSeconds());
            if (timeTracking) {
                result += ' ';
                result += timeTracking;
            }
            result += lineEnding;

            resolvedIssues.forEach((issue, index) => {
                result += '\t\t';
                if (BreakdownUtil.isInActiveSprint(issue)) {
                    result += BreakdownUtil.ACTIVE_SPRINT;
                }
                result += 'Resolved ';
                result += BreakdownUtil.getKey(issue);
                result += ' ';
                result += BreakdownUtil.getIssueType(issue);
                result += ', ';
                result += BreakdownUtil.getStatus(issue);
                let timeTracking = this.stringifyTimeTracking(BreakdownUtil.getTimeSpentSeconds(issue), BreakdownUtil.getRemainingEstimateSeconds(issue));
                if (timeTracking) {
                    result += ' ';
                    result += timeTracking;
                }
                result += ': ';
                result += BreakdownUtil.getSummary(issue);
                let parentKey = this.stringifyParentKey(issue);
                if (parentKey) {
                    result += ' ';
                    result += parentKey;
                }

                if (index < resolvedIssues.length - 1) {
                    result += lineEnding;
                }
            });
            return result;
        },


        stringifyDownloadStatistics() {
            let download = BreakdownEnvironment.getDownload();
            let lineEnding = BreakdownEnvironment.getEditorLineEnding();
            let result = 'Statistics';
            result += lineEnding;

            //pulled date
            if (download.statistics.pulled) {
                result += 'Pulled at ';
                result += BreakdownUtil.formatDate(download.statistics.pulled, BreakdownUtil.DAY_FORMAT);
                result += lineEnding;
            }

            //assignees
            let assigneeCount = download.assignees.size();
            if (assigneeCount) {
                let resolvedCount = download.assignees.resolvedIssueCount();
                let issueCount = download.assignees.issueCount();
                let timeTracking = this.stringifyTimeTracking(download.assignees.getTimeSpentSeconds(),
                    download.assignees.getRemainingEstimateSeconds());
                result += 'Issue Resolution ';
                result += this.stringifyProgress(resolvedCount, issueCount, true);
                if (timeTracking) {
                    result += ' ';
                    result += timeTracking;
                }
                result += lineEnding;
                download.assignees
                    .forEach(assignee => {
                        let unresolvedCount = assignee.unresolvedIssueCount();
                        let resolvedCount = assignee.resolvedIssueCount();
                        let issueCount = assignee.issueCount();
                        let timeTracking = this.stringifyTimeTracking(assignee.getTimeSpentSeconds(),
                            assignee.getRemainingEstimateSeconds());

                        if (issueCount) {
                            result += '\t';

                            if (BreakdownUtil.hasActiveSprint(assignee.getIssues())) {
                                result += BreakdownUtil.ACTIVE_SPRINT;
                            }

                            result += assignee.getName();
                            result += ' ';
                            result += this.stringifyProgress(resolvedCount, issueCount, true);
                            if (timeTracking) {
                                result += ' ';
                                result += timeTracking;
                            }

                            if (unresolvedCount) {
                                result += lineEnding;
                                result += this.stringifyUnresolvedIssues(assignee);
                            }
                            if (resolvedCount) {
                                result += lineEnding;
                                result += this.stringifyResolvedIssues(assignee);
                            }
                            result += lineEnding;
                        }
                    });
            }

            //total points and progress
            let totalPoints = download.statistics.totalPoints;
            let donePoints = download.statistics.donePoints;
            if (totalPoints) {
                result += 'Points ';
                result += this.stringifyProgress(donePoints, totalPoints, true);
                result += lineEnding;
            }

            //issue numbers
            let settings = BreakdownEnvironment.getSettings();
            result += 'Issue numbers: ';
            result += settings.epicType + ' Σ=' + download.statistics.epicCount;
            result += ', ';
            result += settings.storyType + ' Σ=' + download.statistics.storyCount;
            result += ', ';
            result += settings.subTaskType + ' Σ=' + download.statistics.subTaskCount;
            result += lineEnding;

            result += '---';
            result += lineEnding;
            return result;
        },

        stringifyJiraContent() {
            let download = BreakdownEnvironment.getDownload();
            let result = '';
            let lineEnding = BreakdownEnvironment.getEditorLineEnding();
            result += this.stringifySettings();
            result += this.stringifyDownloadStatistics();
            result += lineEnding;
            result += BreakdownUtil.EDITABLE_CONTENT;
            result += lineEnding + lineEnding;
            for (let epicKey of download.epics.keys()) {
                //format the epic line
                let epic = download.epics.get(epicKey);

                if (epicKey == BreakdownUtil.NO_PARENT_IN_SELECTION_KEY && (epic.stories.size || epic.subTasks.size)) {
                    result += this.stringifyActiveSprint(epic);
                    result += BreakdownUtil.NO_PARENT_IN_SELECTION;
                    let totalPoints = this.summarizePoints(epic);
                    let donePoints = this.summarizeDonePoints(epic);

                    if (totalPoints) {
                        result += ' p:';
                        result += this.stringifyProgress(donePoints, totalPoints, true);
                    }
                    result += lineEnding;
                } else if (epicKey == BreakdownUtil.EMPTY_PARENT_KEY && (epic.stories.size || epic.subTasks.size)) {
                    result += this.stringifyActiveSprint(epic);
                    result += BreakdownUtil.EMPTY_PARENT;
                    let totalPoints = this.summarizePoints(epic);
                    let donePoints = this.summarizeDonePoints(epic);

                    if (totalPoints) {
                        result += ' p:';
                        result += this.stringifyProgress(donePoints, totalPoints, true);
                    }
                    result += lineEnding;
                } else {
                    result += this.stringifyJiraObject(epic);
                }

                //format the subTask line below an epic
                for (let subTask of epic.subTasks.values()) {
                    if (subTask.issue) {
                        result += this.stringifyJiraObject(subTask);
                    }
                }

                //format the story line below an epic
                for (let story of epic.stories.values()) {
                    if (story.issue) {
                        result += this.stringifyJiraObject(story);
                    }

                    //format the sub-task line below a story
                    for (let subTask of story.subTasks.values()) {
                        if (subTask.issue) {
                            result += this.stringifyJiraObject(subTask);
                        }
                    }
                }
            }
            return result;
        },

        hasPrimaryFields(issue) {
            return this.hasStatus(issue) || this.hasAssignee(issue) || this.hasPoints(issue) || this.hasFixVersion(issue);
        },

        hasStatus(issue) {
            return BreakdownUtil.getStatus(issue);
        },

        hasAssignee(issue) {
            return BreakdownUtil.getAssignee(issue);
        },

        hasPoints(issue) {
            return BreakdownUtil.getStoryPoints(issue);
        },

        hasFixVersion(issue) {
            return BreakdownUtil.getFixVersions(issue)
                .length;
        },

        hasComponents(issue) {
            return BreakdownUtil.getComponents(issue)
                .length;
        },

        summarizePoints(jiraObject, onlyDonePoints) {

            let result = 0;
            let issue = jiraObject.issue;

            if (issue && this.hasPoints(issue)) {
                if (BreakdownUtil.isFalsy(onlyDonePoints) ||
                    onlyDonePoints && BreakdownUtil.isResolved(issue)) {
                    result += BreakdownUtil.getStoryPoints(issue);
                }
            }
            if (jiraObject.stories) {
                jiraObject.stories.forEach(child => {
                    let issue = child.issue;
                    if (this.hasPoints(issue)) {
                        if (BreakdownUtil.isFalsy(onlyDonePoints) ||
                            onlyDonePoints && BreakdownUtil.isResolved(issue)) {
                            let points = BreakdownUtil.getStoryPoints(issue);
                            result += points;
                        }
                    }
                });
            }
            return result;
        },

        summarizeDonePoints(jiraObject) {
            return this.summarizePoints(jiraObject, true);
        },
    };
})();
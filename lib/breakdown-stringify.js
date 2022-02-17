'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownEnvironment from './breakdown-environment';
import _ from 'underscore';

export default BreakdownStringify = (function() {

    return {
        stringifyAfterPull() {
            BreakdownEnvironment.setEditorText(this.stringifyJiraContent(), BreakdownEnvironment.getLastPullPath());
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

        stringifyAcceptanceField() {
            return 'Acceptance' + BreakdownEnvironment.getEditorLineEnding();
        },

        stringifyAcceptance(issue) {
            let result = '';
            let description = BreakdownUtil.getAcceptanceCriteria(issue);
            if (description.length) {
                result += this.stringifyAcceptanceField();
            }
            for (let line of description) {
                line = BreakdownUtil.trim(line);
                result += '//';
                result += line;
                result += BreakdownEnvironment.getEditorLineEnding();
            }

            return result;
        },

        stringifyDescriptionField() {
            return 'Description' + BreakdownEnvironment.getEditorLineEnding();
        },

        stringifyDescription(issue) {
            let result = '';
            let description = BreakdownUtil.getDescription(issue);
            let acceptance = BreakdownUtil.getAcceptanceCriteria(issue);
            if (description.length && acceptance.length) {
                result += this.stringifyDescriptionField();
            }
            for (let line of description) {
                line = BreakdownUtil.trim(line);
                result += '//';
                result += line;
                result += BreakdownEnvironment.getEditorLineEnding();
            }

            return result;
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
                result += this.stringifyDescription(issue);
                result += this.stringifyAcceptance(issue);
            }
            return result;
        },

        stringifyProgress(fraction, total, sum, formatter) {
            let result = '';
            if (total) {
                if (sum) {
                    result += 'Σ=';
                }
                if (fraction) {
                    result += formatter ? formatter(fraction) : fraction;
                } else {
                    result += 'none';
                }
                if (fraction != total) {
                    result += '/';
                    result += formatter ? formatter(total) : total;
                }
                result += ' ';
                result += BreakdownUtil.progressBar(fraction / total);
            }
            return result;
        },

        stringifyFields(jiraObject) {
            let result = '';
            let totalPoints, totalOriginalEstimateSeconds;
            let issue = jiraObject.issue;
            let points = BreakdownUtil.getStoryPoints(issue);
            let originalEstimateSeconds = BreakdownUtil.getAggregateOriginalEstimateSeconds(issue);

            if (BreakdownUtil.isEpicType(issue)) {
                totalPoints = this.summarizePoints(jiraObject);
                totalOriginalEstimateSeconds = this.summarizeOriginalEstimate(jiraObject);
            }

            if (this.hasPrimaryFields(issue) || points || originalEstimateSeconds) {
                result += ' (';
                if (this.hasStatus(issue)) {
                    result += ' s:';
                    result += BreakdownUtil.getStatus(issue);
                }
                if (this.hasAssignee(issue)) {
                    result += ' a:';
                    result += BreakdownUtil.getAssignee(issue);
                }
                if (points || totalPoints) {
                    result += ' p:';
                    if (points) {
                        result += points;
                        result += ' ';
                    }
                    if (BreakdownUtil.isEpicType(issue)) {
                        const donePoints = this.summarizeDonePoints(jiraObject);
                        result += this.stringifyProgress(donePoints, totalPoints, true);
                    }
                }
                if (originalEstimateSeconds || totalOriginalEstimateSeconds) {
                    result += ' o:';
                    if (originalEstimateSeconds) {
                        result += BreakdownUtil.stringifySeconds(originalEstimateSeconds);
                        result += ' ';
                    }
                    if (BreakdownUtil.isEpicType(issue)) {
                        const doneOriginalEstimateSeconds = this.summarizeDoneOriginalEstimate(jiraObject);
                        result += this.stringifyProgress(doneOriginalEstimateSeconds, totalOriginalEstimateSeconds, true, BreakdownUtil.stringifySeconds);
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

            result += '---';
            result += lineEnding;

            return result;
        },

        stringifyTimeTracking(timeSpentSeconds, remainingEstimateSeconds) {
            let result = '';
            let spentTime = BreakdownUtil.stringifySeconds(timeSpentSeconds)
            let remainingEstimate = BreakdownUtil.stringifySeconds(remainingEstimateSeconds);

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
            let result = '';

            //pulled date
            if (download.statistics.pulled) {
                result += 'Pulled at ';
                result += BreakdownUtil.formatDate(download.statistics.pulled, BreakdownUtil.DAY_FORMAT);
                result += lineEnding;
            }

            if (BreakdownUtil.hasOption('statistics')) {
                //assignees
                let assigneeCount = download.assignees.size();
                if (assigneeCount) {
                    let resolvedCount = download.assignees.resolvedIssueCount();
                    let issueCount = download.assignees.issueCount();
                    let timeTracking = this.stringifyTimeTracking(download.assignees.getTimeSpentSeconds(),
                        download.assignees.getRemainingEstimateSeconds());
                    result += 'Issue Resolution ';
                    result += this.stringifyProgress(resolvedCount, issueCount, true);
                    if (issueCount > resolvedCount) {
                        result += ', ' + (issueCount - resolvedCount) + ' unresolved issues'
                    }
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
                    if (totalPoints > donePoints) {
                        result += ', ' + (totalPoints - donePoints) + ' unresolved points'
                    }
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

            }
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

        hasOriginalEstimateSeconds(issue) {
            return BreakdownUtil.getOriginalEstimateSeconds(issue);
        },

        hasFixVersion(issue) {
            return BreakdownUtil.getFixVersions(issue)
                .length;
        },

        hasComponents(issue) {
            return BreakdownUtil.getComponents(issue)
                .length;
        },



        summarizePoints(jiraObject, onlyDone) {
            let points = 0;
            let issue = jiraObject.issue;

            if (issue && BreakdownUtil.getStoryPoints(issue)) {
                if (BreakdownUtil.isFalsy(onlyDone) ||
                    onlyDone && BreakdownUtil.isResolved(issue)) {
                    points += BreakdownUtil.getStoryPoints(issue);
                }
            }
            if (jiraObject.stories) {
                jiraObject.stories.forEach(child => {
                    points += this.summarizePoints(child, onlyDone);
                });
            }
            return points;
        },

        summarizeDonePoints(jiraObject) {
            return this.summarizePoints(jiraObject, true);
        },

        summarizeOriginalEstimate(jiraObject, onlyDone) {
            let originalEstimateSeconds = 0;
            let issue = jiraObject.issue;

            if (issue && BreakdownUtil.getAggregateOriginalEstimateSeconds(issue)) {
                if (BreakdownUtil.isFalsy(onlyDone) ||
                    onlyDone && BreakdownUtil.isResolved(issue)) {
                    originalEstimateSeconds += BreakdownUtil.getAggregateOriginalEstimateSeconds(issue);
                }
            }
            if (jiraObject.stories) {
                jiraObject.stories.forEach(child => {
                    originalEstimateSeconds += this.summarizeOriginalEstimate(child, onlyDone);
                });
            }

            return originalEstimateSeconds;
        },

        summarizeDoneOriginalEstimate(jiraObject) {
            return this.summarizeOriginalEstimate(jiraObject, true);
        }

    };
})();
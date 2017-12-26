'use babel';

import BreakdownUtils from './breakdown-util';
import _ from 'underscore';

export default BreakdownStringify = (function() {

    return {
        stringifyAfterPull(download) {
            const editor = atom.workspace.getActiveTextEditor();
            if (editor) {
                download.settings.stringifyAfterPull = false;
                const buffer = editor.getBuffer();
                buffer.setTextViaDiff(this.stringifyJIRAContent(download));
                editor.setCursorScreenPosition([0, 0]);
                BreakdownBeautify.beautify(download.settings);
                editor.foldAll();
            }
        },

        stringifyJIRAIssue(jiraIssue, settings) {
            let result = '';
            const issue = jiraIssue.issue;
            if (issue) {
                let issuetype = BreakdownUtils.getIssueType(issue);
                if (BreakdownUtils.isSameIssueType(settings.storyType, issuetype)) {
                    result += '\t';
                } else if (BreakdownUtils.isSameIssueType(settings.subTaskType, issuetype)) {
                    result += '\t\t';
                }
                if (BreakdownUtils.isResolved(issue)) {
                    result += 'Resolved ';
                }
                result += issuetype;
                result += ' ';
                result += issue.key
                result += ' ';
                result += this.stringifyFields(jiraIssue, settings);
                result += issue.fields.summary;
                if (this.hasField(settings, 'parentkey')) {
                    let epic = issue.fields[settings.epicLinkFieldName];
                    let parent = issue.fields.parent;
                    if (epic) {
                        result += ' ^';
                        result += epic;
                    } else if (parent) {
                        result += ' ^';
                        result += parent.key;
                    }
                }

                result += '\n';
            }
            return result;
        },

        stringifyProgress(fraction, total) {
            result = '';
            if (total) {
                result += 'Σ=';
                result += fraction;
                result += '/';
                result += total;
                result += ' ';
                result += BreakdownUtils.progressBar(fraction / total);
            }
            return result;
        },

        stringifyFields(jiraIssue, settings) {
            let result = '';
            let totalPoints = 0;
            let donePoints = 0;
            let issue = jiraIssue.issue;
            let issuetype = BreakdownUtils.getIssueType(issue);

            if (BreakdownUtils.isSameIssueType(settings.epicType, issuetype)) {
                totalPoints = this.summarizePoints(jiraIssue, settings);
                donePoints = this.summarizeDonePoints(jiraIssue, settings);
            }

            if (this.hasPrimaryFields(issue, settings) ||
                (this.hasField(settings, 'points') && totalPoints)) {
                result += '(';
                if (this.hasStatus(issue, settings)) {
                    result += ' s:';
                    result += BreakdownUtils.getStatus(issue);
                }
                if (this.hasAssignee(issue, settings)) {
                    result += ' a:'
                    result += BreakdownUtils.getAssignee(issue);
                }
                if (this.hasPoints(issue, settings) || totalPoints) {
                    result += ' p:';
                    let points = issue.fields[settings.storyPointsFieldName];
                    if (points) {
                        result += points;
                    }
                    if (totalPoints) {
                        if (points) {
                            result += ' ';
                        }
                        result += this.stringifyProgress(donePoints, totalPoints);
                    }

                }
                if (this.hasFixVersion(issue, settings)) {
                    let fixversions = issue.fields.fixVersions;
                    result += ' v:';
                    fixversions.forEach((version, i) => {
                        result += version.name;
                        if (i < fixversions.length - 1) {
                            result += ',';
                        }
                    });
                }

                result += ' ) '
            }
            return result;
        },


        stringifySettings(download) {
            let result = '';
            result += 'jira-breakdown\n';

            result += 'url: '
            result += download.settings.jiraUrl;
            result += '\n';

            if (download.settings.project) {
                result += 'project: ';
                result += download.settings.project;
                result += '\n';
            }

            result += 'query: ';
            result += download.settings.query;
            result += '\n';

            if (download.settings.fields.length > 0) {
                result += 'fields: ';
                result += BreakdownUtils.concatString(download.settings.fields, ' ');
                result += '\n';
            }

            result += '---';
            result += '\n';

            return result;
        },


        stringifyDownloadStatistics(download) {
            let result = 'Statistics';
            result += '\n';

            //pulled date
            if (download.statistics.pulled) {
                result += 'Pulled at ';
                result += download.statistics.pulled;
                result += '\n';
            }

            //total points and progress
            let totalPoints = download.statistics.totalPoints;
            let donePoints = download.statistics.donePoints;
            if (totalPoints) {
                result += 'Points ';
                result += this.stringifyProgress(donePoints, totalPoints);
                result += '\n';
            }

            //issue numbers
            result += download.settings.epicType + '=' + download.statistics.epicCount;
            result += ', ';
            result += download.settings.storyType + '=' + download.statistics.storyCount;
            result += ', ';
            result += download.settings.subTaskType + '=' + download.statistics.subTaskCount;
            result += '\n';

            //assignees
            let assigneeCount = download.assignees.size();
            if (assigneeCount) {
                let resolvedCount = download.assignees.resolvedIssueCount();
                let issueCount = download.assignees.issueCount();
                result += 'Resolved issues '
                result += this.stringifyProgress(resolvedCount, issueCount);
                result += '\n';
                download.assignees
                    .forEach((assignee) => {
                        let unresolvedIssues = assignee.getUnresolvedIssueKeys();
                        let unresolvedCount = assignee.unresolvedIssueCount();
                        let resolvedCount = assignee.resolvedIssueCount();
                        let issueCount = assignee.issueCount();

                        if (issueCount) {
                            result += '\t';
                            result += assignee.getName();
                            result += ', ';
                            result += this.stringifyProgress(resolvedCount, issueCount);

                            if (unresolvedCount) {
                                result += ', unresolved: '
                                result += BreakdownUtils.concatString(unresolvedIssues);
                            }
                            result += '\n';
                        }
                    });
            }
            result += '---';
            result += '\n';
            return result;
        },

        stringifyJIRAContent(download) {
            let result = '';
            result += this.stringifySettings(download);
            result += this.stringifyDownloadStatistics(download);
            for (let epic of download.epics.values()) {
                //format the epic line
                if (epic.issue) {
                    result += this.stringifyJIRAIssue(epic, download.settings);
                } else {
                    result += 'NO PARENT IN SELECTION\n';
                }

                //format the story line below an epic
                for (let story of epic.children.values()) {
                    if (story.issue) {
                        result += this.stringifyJIRAIssue(story, download.settings);
                    }

                    //format the sub-task line below a story
                    for (let subTask of story.children.values()) {
                        if (subTask.issue) {
                            result += this.stringifyJIRAIssue(subTask, download.settings);
                        }
                    }
                }
            }
            return result;
        },

        hasPrimaryFields(issue, settings) {
            return this.hasStatus(issue, settings) || this.hasAssignee(issue, settings) || this.hasPoints(issue, settings) || this.hasFixVersion(issue, settings);
        },

        hasField(settings, field) {
            return _.find(settings.fields, (f) => {
                return BreakdownUtils.equalsIgnoreCase(f, field);
            });
        },

        hasStatus(issue, settings) {
            return this.hasField(settings, 'status');
        },

        hasAssignee(issue, settings) {
            return this.hasField(settings, 'assignee') && BreakdownUtils.getAssignee(issue);
        },

        hasPoints(issue, settings) {
            return this.hasField(settings, 'points') && issue.fields[settings.storyPointsFieldName];
        },

        hasFixVersion(issue, settings) {
            return this.hasField(settings, 'fixversion') && issue.fields.fixVersions && issue.fields.fixVersions.length;
        },

        summarizePoints(jiraIssue, settings, onlyDonePoints) {

            let result = 0;
            let issue = jiraIssue.issue;
            if (issue && this.hasPoints(issue, settings)) {
                if (BreakdownUtils.isFalseOrUndefined(onlyDonePoints) ||
                    onlyDonePoints && BreakdownUtils.isResolved(issue)) {
                    result += issue.fields[settings.storyPointsFieldName];
                }
            }
            if (jiraIssue.children) {
                jiraIssue.children.forEach((child) => {
                    let issue = child.issue;
                    if (this.hasPoints(issue, settings)) {
                        if (BreakdownUtils.isFalseOrUndefined(onlyDonePoints) ||
                            onlyDonePoints && BreakdownUtils.isResolved(issue)) {
                            let points = issue.fields[settings.storyPointsFieldName];
                            result += points;
                        }
                    }
                });
            }
            return result;
        },

        summarizeDonePoints(jiraIssue, settings) {
            return this.summarizePoints(jiraIssue, settings, true);
        },
    }
})();
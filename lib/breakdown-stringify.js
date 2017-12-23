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
                let issuetype = this.getIssueTypeFromIssue(issue);
                if (BreakdownUtils.isSameIssueType(settings.storyType, issuetype)) {
                    result += '\t';
                } else if (BreakdownUtils.isSameIssueType(settings.subTaskType, issuetype)) {
                    result += '\t\t';
                }
                if (this.isResolved(issue)) {
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

        stringifyTotalPoints(donePoints, totalPoints) {
            result = '';
            if (totalPoints) {
                result += 'Σ=';
                result += donePoints;
                result += '/';
                result += totalPoints;
                result += ' ';
                result += BreakdownUtils.progressBar(donePoints / totalPoints);
            }
            return result;
        },

        stringifyFields(jiraIssue, settings) {
            let result = '';
            let totalPoints = 0;
            let donePoints = 0;
            let issue = jiraIssue.issue;
            let issuetype = this.getIssueTypeFromIssue(issue);

            if (BreakdownUtils.isSameIssueType(settings.epicType, issuetype)) {
                totalPoints = this.summarizePoints(jiraIssue, settings);
                donePoints = this.summarizeDonePoints(jiraIssue, settings);
            }

            if (this.hasPrimaryFields(issue, settings) ||
                (this.hasField(settings, 'points') && totalPoints)) {
                result += '(';
                if (this.hasStatus(issue, settings)) {
                    result += ' s:';
                    result += this.getStatus(issue);
                }
                if (this.hasAssignee(issue, settings)) {
                    result += ' a:'
                    result += this.getAssignee(issue);
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
                        result += this.stringifyTotalPoints(donePoints, totalPoints);
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

        isResolved(issue) {
            return issue.fields.resolutiondate;
        },

        getStatus(issue) {
            return issue.fields.status ? issue.fields.status.name : '';
        },

        getAssignee(issue) {
            return issue.fields.assignee ? issue.fields.assignee.name : '';
        },

        summarizePoints(jiraIssue, settings, onlyDonePoints) {

            let result = 0;
            let issue = jiraIssue.issue;
            if (issue && this.hasPoints(issue, settings)) {
                if (BreakdownUtils.isFalseOrUndefined(onlyDonePoints) ||
                    onlyDonePoints && this.isResolved(issue)) {
                    result += issue.fields[settings.storyPointsFieldName];
                }
            }
            if (jiraIssue.children) {
                jiraIssue.children.forEach((child) => {
                    let issue = child.issue;
                    if (this.hasPoints(issue, settings)) {
                        if (BreakdownUtils.isFalseOrUndefined(onlyDonePoints) ||
                            onlyDonePoints && this.isResolved(issue)) {
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
            return this.hasField(settings, 'assignee') && this.getAssignee(issue);
        },

        hasPoints(issue, settings) {
            return this.hasField(settings, 'points') && issue.fields[settings.storyPointsFieldName];
        },

        hasFixVersion(issue, settings) {
            return this.hasField(settings, 'fixversion') && issue.fields.fixVersions && issue.fields.fixVersions.length;
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
                result += this.stringifyTotalPoints(donePoints, totalPoints);
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

                result += 'Open issues='
                result += download.assignees.unresolvedTotal();
                result += '\n';
                download.assignees
                    .forEach((assignee) => {
                        let unresolvedIssues = assignee.getUnresolvedIssueKeys();
                        let unresolvedCount = unresolvedIssues.length;
                        let resolvedIssues = assignee.getResolvedIssueKeys();
                        let resolvedCount = resolvedIssues.length;

                        if (unresolvedCount || resolvedCount) {
                            result += '\t';
                            result += assignee.getName();
                            if (resolvedCount) {
                                result += ', '
                                result += resolvedCount;
                                result += ' resolved';
                            }
                            if (unresolvedCount) {
                                result += ', '
                                result += unresolvedCount;
                                result += ' open: '
                                result += BreakdownUtils.concatString(unresolvedIssues);
                            } else {
                                result += ', nothing open';
                            }
                            result += '\n';
                        }
                    });
            }
            result += '---';
            result += '\n';
            return result;
        },

        getIssueTypeFromIssue(issue) {
            return issue.fields.issuetype.name;
        },

        stringifyJIRAContent(download) {
            let result = '';
            result += this.stringifySettings(download);
            result += this.stringifyDownloadStatistics(download);
            for (let epic of download.epics.values()) {
                //format the epic line
                if (epic.issue) {
                    result += this.stringifyJIRAIssue(epic, download.settings);
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

    }
})();
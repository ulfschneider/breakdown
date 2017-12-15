'use babel';

import BreakdownUtils from './breakdown-util';
import _ from 'underscore';

//TODO click on key to open jira story

export default BreakdownStringify = (function() {

    return {
        stringifyJIRAIssue(jiraIssue, settings) {
            let result = '';
            let issue = jiraIssue.issue;
            if (issue) {
                let issuetype = this.getIssueTypeFromIssue(issue);
                if (BreakdownUtils.isSameIssueType(settings.storyType, issuetype)) {
                    result += '\t';
                } else if (BreakdownUtils.isSameIssueType(settings.subTaskType, issuetype)) {
                    result += '\t\t';
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
                    result += issue.fields.status.name;
                }
                if (this.hasAssignee(issue, settings)) {
                    let assignee = issue.fields.assignee;
                    result += ' a:'
                    result += assignee.name;
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
                        result += 'Σ=';
                        result += totalPoints;
                        result += ' ';
                        result += BreakdownUtils.progressBar(donePoints / totalPoints);
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

        summarizePoints(jiraIssue, settings, onlyDonePoints) {

            let result = 0;
            if (this.hasPoints(jiraIssue.issue, settings)) {
                if (BreakdownUtils.isFalseOrUndefined(onlyDonePoints) ||
                    onlyDonePoints && jiraIssue.issue.fields.resolutiondate) {
                    result += jiraIssue.issue.fields[settings.storyPointsFieldName];
                }
            }
            if (jiraIssue.children) {
                jiraIssue.children.forEach((child) => {
                    let issue = child.issue;
                    if (this.hasPoints(issue, settings)) {
                        if (BreakdownUtils.isFalseOrUndefined(onlyDonePoints) ||
                            onlyDonePoints && issue.fields.resolutiondate) {
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
            return settings.fields.length > 0 &&
                this.hasField(settings, 'status');
        },

        hasAssignee(issue, settings) {
            return settings.fields.length > 0 && this.hasField(settings, 'assignee') && issue.fields.assignee && issue.fields.assignee.name;
        },

        hasPoints(issue, settings) {
            return settings.fields.length > 0 && this.hasField(settings, 'points') && issue.fields[settings.storyPointsFieldName];
        },

        hasFixVersion(issue, settings) {
            return settings.fields.length > 0 && this.hasField(settings, 'fixversion') && issue.fields.fixVersions && issue.fields.fixVersions.length;
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

            if (download.settings.pulled) {
                result += 'pulled: ';
                result += download.settings.pulled;
                result += '\n';
            }

            result += '---';
            result += '\n';

            return result;
        },

        stringifyJIRAContent(download) {
            this.makeDownloadDataStructure(download);
            let result = this.stringifySettings(download);
            for (let epic of download.epics.values()) {
                //format the epic line
                if (epic.issue) {
                    download.statistics.epicCount++;
                    result += this.stringifyJIRAIssue(epic, download.settings);
                }

                //format the story line below an epic
                for (let story of epic.children.values()) {
                    if (story.issue) {
                        download.statistics.storyCount++;
                        result += this.stringifyJIRAIssue(story, download.settings);
                    }

                    //format the sub-task line below a story
                    for (let subTask of story.children.values()) {
                        if (subTask.issue) {
                            download.statistics.subTaskCount++;
                            result += this.stringifyJIRAIssue(subTask, download.settings);
                        }
                    }
                }
            }
            return result;
        },

        initializeStatistics(download) {
            download.statistics.epicCount = 0;
            download.statistics.storyCount = 0;
            download.statistics.subTaskCount = 0;
            download.statistics.issueCount = download.issues.length;
        },

        stringifyDownloadStatistics(download) {
            let result = '';
            result += download.settings.epicType + '=[' + download.statistics.epicCount + ']';
            result += ', ';
            result += download.settings.storyType + '=[' + download.statistics.storyCount + ']';
            result += ', ';
            result += download.settings.subTaskType + '=[' + download.statistics.subTaskCount + ']';
            result += ', ';
            result += 'Issue=[' + download.statistics.issueCount + ']';

            return result;
        },

        getIssueTypeFromIssue(issue) {
            return issue.fields.issuetype.name;
        },

        extractDataFromDownloadedIssues(download) {
            download.epics = new Map();
            download.stories = new Map;
            download.subTasks = new Map();

            download.epics.set('NO EPIC', {
                children: new Map()
            });

            for (let issue of download.issues) {
                let issueType = this.getIssueTypeFromIssue(issue);
                if (BreakdownUtils.isSameIssueType(download.settings.epicType, issueType)) {
                    download.epics.set(issue.key, {
                        issue: issue,
                        children: new Map()
                    });
                } else if (BreakdownUtils.isSameIssueType(download.settings.storyType, issueType)) {
                    download.stories.set(issue.key, {
                        issue: issue,
                        children: new Map()
                    });
                } else if (BreakdownUtils.isSameIssueType(download.settings.subTaskType, issueType)) {
                    download.subTasks.set(issue.key, {
                        issue: issue
                    });
                }
            }
        },


        makeDownloadStoryDataStructure(download) {
            for (let story of download.stories.values()) {
                let epicKey = story.issue.fields[download.settings.epicLinkFieldName];
                if (!epicKey) {
                    epicKey = 'NO EPIC';
                }

                let epic = download.epics.get(epicKey);
                if (!epic) {
                    epicKey = 'NO EPIC';
                }

                download.epics.get(epicKey)
                    .children.set(story.issue.key, story);
            }
        },

        makeDownloadSubTaskDataStructure(download) {

            for (let subTask of download.subTasks.values()) {
                if (subTask.issue.fields.parent) {
                    let parentKey = subTask.issue.fields.parent.key;
                    let story = download.stories.get(parentKey);
                    if (story) {
                        story.children.set(subTask.issue.key, subTask);
                    }
                }
            }
        },

        makeDownloadDataStructure(download) {
            this.initializeStatistics(download);
            this.makeDownloadStoryDataStructure(download);
            this.makeDownloadSubTaskDataStructure(download);
        }
    }
})();
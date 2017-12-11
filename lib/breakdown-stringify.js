'use babel';

import BreakdownUtils from './breakdown-util';
import _ from 'underscore';

export default BreakdownStringify = (function() {

    return {
        stringifyJIRAIssue(issue, settings) {
            let result = '';
            if (issue) {
                let issuetype = this.getIssueTypeFromIssue(issue);
                if (BreakdownUtils.isSameIssueType('Story', issuetype)) {
                    result += '\t';
                } else if (BreakdownUtils.isSameIssueType('Sub-Task', issuetype)) {
                    result += '\t\t';
                }
                result += issuetype;
                result += ' ';
                result += issue.key
                result += ' ';
                if (this.hasPrimaryFields(settings)) {
                    result += '(';
                    if (this.hasField(settings, 'status')) {
                        result += 's:';
                        result += issue.fields.status.name;
                    }
                    if (this.hasField(settings, 'assignee')) {
                        let assignee = issue.fields.assignee;
                        if (assignee && assignee.name) {
                            result += ' a:'
                            result += assignee.name;
                        }
                    }
                    if (this.hasField(settings, 'points')) {
                        let points = issue.fields[settings.storyPointsFieldName];
                        if (points) {
                            result += ' p:';
                            result += points;
                        }
                    }
                    if (this.hasField(settings, 'fixversion')) {
                        let fixversions = issue.fields.fixVersions;
                        if (fixversions && fixversions.length > 0) {
                            result += ' v:';
                            fixversions.forEach((version, i) => {
                                result += version.name;
                                if (i < fixversions.length - 1) {
                                    result += ',';
                                }
                            });
                        }
                    }
                    result += ') '
                }

                //summary
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

        hasPrimaryFields(settings) {
            return settings.fields.length > 0 &&
                (this.hasField(settings, 'status') ||
                    this.hasField(settings, 'assignee') ||
                    this.hasField(settings, 'points') ||
                    this.hasField(settings, 'fixversion'));
        },

        hasField(settings, field) {
            return _.find(settings.fields, (f) => {
                return BreakdownUtils.equalsIgnoreCase(f, field);
            });
        },


        stringifySettings(download) {
            let result = '';
            result += 'jira-breakdown\n';

            result += 'url: '
            result += download.settings.jiraUrl;
            result += '\n';

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

        stringifyJIRAContent(download) {
            this.makeDataStructure(download);
            let result = this.stringifySettings(download);
            for (let epic of download.epics.values()) {
                //format the epic line
                if (epic.issue) {
                    download.statistics.epicCount++;
                    result += this.stringifyJIRAIssue(epic.issue, download.settings);
                }

                //format the story line below an epic
                if (epic.stories) {
                    for (let story of epic.stories.values()) {
                        if (story.issue) {
                            download.statistics.storyCount++;
                            result += this.stringifyJIRAIssue(story.issue, download.settings);
                        }

                        //format the sub-task line below a story
                        if (story.subTasks) {
                            for (let subTask of story.subTasks.values()) {
                                if (subTask.issue) {
                                    download.statistics.subTaskCount++;
                                    result += this.stringifyJIRAIssue(subTask.issue, download.settings);
                                }
                            }
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
                stories: new Map()
            });

            for (let issue of download.issues) {
                let issueType = this.getIssueTypeFromIssue(issue);
                if (BreakdownUtils.isSameIssueType(download.settings.epicType, issueType)) {
                    download.epics.set(issue.key, {
                        issue: issue,
                        stories: new Map()
                    });
                } else if (BreakdownUtils.isSameIssueType(download.settings.storyType, issueType)) {
                    download.stories.set(issue.key, {
                        issue: issue,
                        subTasks: new Map()
                    });
                } else if (BreakdownUtils.isSameIssueType(download.settings.subTaskType, issueType)) {
                    download.subTasks.set(issue.key, {
                        issue: issue
                    });
                }
            }
        },


        makeStoryDataStructure(download) {
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
                    .stories.set(story.issue.key, story);
            }
        },

        makeSubTaskDataStructure(download) {

            for (let subTask of download.subTasks.values()) {
                if (subTask.issue.fields.parent) {
                    let parentKey = subTask.issue.fields.parent.key;
                    let story = download.stories.get(parentKey);
                    if (story) {
                        story.subTasks.set(subTask.issue.key, subTask);
                    }
                }
            }
        },

        makeDataStructure(download) {
            this.initializeStatistics(download);
            this.makeStoryDataStructure(download);
            this.makeSubTaskDataStructure(download);
        }
    }
})();
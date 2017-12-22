'use babel';

import BreakdownUtils from './breakdown-util';
import BreakdownStringify from './breakdown-stringify';
import Assignees from './breakdown-assignees';
import _ from 'underscore';

export default BreakdownPull = (function() {

    return {

        initializeStatistics(download) {
            download.statistics.epicCount = 0;
            download.statistics.storyCount = 0;
            download.statistics.subTaskCount = 0;
            download.statistics.issueCount = download.issues.length;
        },


        validatePullSettings(settings) {
            let valid = true;
            if (!settings.jiraUrl) {
                console.log('No JIRA URL specified');
                atom.notifications.addError('Please specify your JIRA URL. Refer to the https://atom.io/packages/breakdown package in case of questions.', {
                    dismissable: true
                });
                valid = false;
            }
            if (!settings.query) {
                console.log('No JIRA query specified');
                atom.notifications.addError('Please specify your JIRA query. Refer to the https://atom.io/packages/breakdown package in case of questions.', {
                    dismissable: true
                });
                valid = false;
            }
            return valid;
        },

        extractCustomFieldNames(content, settings) {
            let object = JSON.parse(content);
            let fields = object.fields;
            let keys = Object.keys(fields);

            for (let i = 0; i < keys.length && (!settings.epicLinkFieldName || !settings.storyPointsFieldName); i++) {
                if (!settings.epicLinkFieldName && fields[keys[i]].name == 'Epic Link') {
                    settings.epicLinkFieldName = keys[i];
                }
                if (!settings.storyPointsFieldName && fields[keys[i]].name == 'Story Points') {
                    settings.storyPointsFieldName = keys[i];
                }
            }
        },

        extractDataFromDownloadedIssues(download) {
            download.epics = new Map();
            download.stories = new Map;
            download.subTasks = new Map();
            download.assignees = new Assignees();
            download.settings.epicResolvedStates = new Set();
            download.settings.storyResolvedStates = new Set();
            download.settings.subTaskResolvedStates = new Set();
            this.initializeStatistics(download);

            download.epics.set('NO EPIC', {
                children: new Map()
            });

            for (let issue of download.issues) {
                let issueType = BreakdownStringify.getIssueTypeFromIssue(issue);
                if (BreakdownUtils.isSameIssueType(download.settings.epicType, issueType)) {
                    download.statistics.epicCount++;
                    download.epics.set(issue.key, {
                        issue: issue,
                        children: new Map()
                    });
                    if (BreakdownStringify.isResolved(issue)) {
                        download.settings.epicResolvedStates.add(BreakdownStringify.getStatus(issue));
                        if (BreakdownStringify.hasAssignee(issue, download.settings)) {
                            download.assignees.addIssue(BreakdownStringify.getAssignee(issue), issue, true);
                        }
                    } else if (BreakdownStringify.hasAssignee(issue, download.settings)) {
                        download.assignees.addIssue(BreakdownStringify.getAssignee(issue), issue);
                    }
                } else if (BreakdownUtils.isSameIssueType(download.settings.storyType, issueType)) {
                    download.statistics.storyCount++;
                    download.stories.set(issue.key, {
                        issue: issue,
                        children: new Map()
                    });
                    if (BreakdownStringify.isResolved(issue)) {
                        download.settings.storyResolvedStates.add(BreakdownStringify.getStatus(issue));
                        if (BreakdownStringify.hasAssignee(issue, download.settings)) {
                            download.assignees.addIssue(BreakdownStringify.getAssignee(issue), issue, true);
                        }
                    } else if (BreakdownStringify.hasAssignee(issue, download.settings)) {
                        download.assignees.addIssue(BreakdownStringify.getAssignee(issue), issue);
                    }

                } else if (BreakdownUtils.isSameIssueType(download.settings.subTaskType, issueType)) {
                    download.statistics.subTaskCount++;
                    download.subTasks.set(issue.key, {
                        issue: issue
                    });
                    if (BreakdownStringify.isResolved(issue)) {
                        download.settings.subTaskResolvedStates.add(BreakdownStringify.getStatus(issue));
                        if (BreakdownStringify.hasAssignee(issue, download.settings)) {
                            download.assignees.addIssue(BreakdownStringify.getAssignee(issue), issue, true);
                        }
                    } else if (BreakdownStringify.hasAssignee(issue, download.settings)) {
                        download.assignees.addIssue(BreakdownStringify.getAssignee(issue), issue);
                    }
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


        makePointStatistics(download) {
            let totalPoints = 0;
            let donePoints = 0;
            for (let epic of download.epics.values()) {
                totalPoints += BreakdownStringify.summarizePoints(epic, download.settings);
                donePoints += BreakdownStringify.summarizeDonePoints(epic, download.settings);
            }
            download.statistics.totalPoints = totalPoints;
            download.statistics.donePoints = donePoints;
        },

        /*can only be called after custom fieldname for epic key is known
         */
        makeDownloadDataStructure(download) {
            this.makeDownloadStoryDataStructure(download);
            this.makeDownloadSubTaskDataStructure(download);
            this.makePointStatistics(download);
        }
    }
})();
'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownStringify from './breakdown-stringify';
import BreakdownRequest from './breakdown-request';
import BreakdownStatusBar from './breakdown-status-bar';
import Assignees from './breakdown-assignees';
import BreakdownEnvironment from './breakdown-environment';
import _ from 'underscore';

export default BreakdownPull = (function () {

    return {

        initializeStatistics() {
            let download = BreakdownEnvironment.getDownload();
            download.statistics.epicCount = 0;
            download.statistics.storyCount = 0;
            download.statistics.subTaskCount = 0;
            download.statistics.issueCount = download.issues.length;
        },

        validatePullSettings() {
            let settings = BreakdownEnvironment.getSettings();
            let valid = true;
            if (!settings.jiraUrl) {
                console.log('No Jira URL specified');
                atom.notifications.addWarning('Please specify your Jira URL in the format\n\nurl: http://your.jira.url\n\nRefer to the https://atom.io/packages/breakdown package for documentation.', {
                    dismissable: true
                });
                valid = false;
            }
            if (!settings.project) {
                console.log('No Jira project key specified');
                atom.notifications.addWarning('Please specify the key of the Jira project to push new issues to in the format\n\nproject: PRJKEY\n\nRefer to the https://atom.io/packages/breakdown package for documentation.', {
                    dismissable: true
                });
                valid = false;
            }
            if (!settings.query) {
                console.log('No Jira query specified');
                atom.notifications.addWarning('Please specify your Jira query to select the issues you want to pull in the format\n\nquery: YOUR JQL QUERY\n\nRefer to the https://atom.io/packages/breakdown package for documentation.', {
                    dismissable: true
                });
                valid = false;
            }
            return valid;
        },

        pullConfiguration() {
            BreakdownParse.readSettings();
            let settings = BreakdownEnvironment.getSettings();
            let jiraUrl = BreakdownEnvironment.getJiraUrl();
            let options = {
                url: jiraUrl + '/rest/api/2/configuration'
            };
            return BreakdownRequest.httpRequest(options)
                .then(body => {
                    if (body.timeTrackingConfiguration) {
                        settings.timeTrackingConfiguration = body.timeTrackingConfiguration;
                    }
                });
        },

        pullIssues(config) {
            let download = BreakdownEnvironment.getDownload();

            if (_.isUndefined(config.startAt) || config.startAt == 0) {
                download.issues = [];
            }
            return BreakdownRequest.httpRequest(config)
                .then(body => {
                    download.issues = download.issues.concat(body.issues);

                    let startAt = body.startAt;
                    let maxResults = body.maxResults;
                    let total = body.total;
                    if (startAt + maxResults < total) {
                        //recursive chaining for paginated loading of issues
                        BreakdownStatusBar.pull('Pulling ' + BreakdownStringify.stringifyProgress(startAt + maxResults, total) + ' into ' + BreakdownEnvironment.getFileNameWithoutExtension());
                        config.startAt = startAt + maxResults;
                        config.maxResults = maxResults;
                        return this.pullIssues(config);
                    } else {
                        BreakdownStatusBar.pull('Pulling ' + BreakdownStringify.stringifyProgress(total, total) + ' into ' + BreakdownEnvironment.getFileNameWithoutExtension());
                        this.extractDataFromDownloadedIssues();
                    }
                });
        },

        extractCustomFieldNames(fields) {
            let settings = BreakdownEnvironment.getSettings();

            for (let i = 0; i < fields.length &&
                (!settings.epicLinkFieldName ||
                    !settings.epicNameFieldName ||
                    !settings.storyPointsFieldName ||
                    !settings.sprintFieldName); i++) {
                if (!settings.storyPointsFieldName && fields[i].name == 'Story Points') {
                    settings.storyPointsFieldName = fields[i].id;
                }
                if (!settings.epicLinkFieldName && fields[i].name == 'Epic Link') {
                    settings.epicLinkFieldName = fields[i].id;
                }
                if (!settings.epicNameFieldName && fields[i].name == 'Epic Name') {
                    settings.epicNameFieldName = fields[i].id;
                }
                if (!settings.sprintFieldName && fields[i].name == 'Sprint') {
                    settings.sprintFieldName = fields[i].id;
                }
            }

            let extract = true;
            let notification = 'One or more custom fields couldn´t be extracted:\n\n';
            if (!settings.epicNameFieldName) {
                console.log('Custom field Epic Name not extracted');
                notification += '* Epic Name\n';
                extract = false;
            }
            if (!settings.epicLinkFieldName) {
                console.log('Custom field Epic Link not extracted');
                notification += '* Epic Link\n';
                extract = false;
            }
            if (!settings.storyPointsFieldName) {
                console.log('Custom field Story Points not extracted');
                notification += '* Story Points\n';
                extract = true; //!intentional
            }
            if (!settings.sprintFieldName) {
                console.log('Custom field Sprint not extracted');
                notification += '* Sprint\n';
                extract = true; //!intentional
            }

            if (!extract) {
                notification += '\nAre you sure you are accessing a Jira Scrum project?';
                atom.notifications.addWarning(notification, {
                    dismissable: true
                });
            }
            return extract;

        },


        pullCustomFieldNames() {
            let settings = BreakdownEnvironment.getSettings();
            let options = {
                url: settings.jiraUrl + '/rest/api/2/field'
            };

            return BreakdownRequest.httpRequest(options)
                .then(fields => {
                    let extract = this.extractCustomFieldNames(fields);
                    if (!extract) {
                        return Promise.reject();
                    }
                });
        },

        pullStatusCategories() {
            let options = {
                url: BreakdownEnvironment.getJiraUrl() + '/rest/api/2/status'
            };

            return BreakdownRequest.httpRequest(options)
                .then(body => {
                    let settings = BreakdownEnvironment.getSettings();
                    settings.statusCategories = new Map();
                    body.forEach(status => {
                        settings.statusCategories.set(status.name, status.statusCategory.key);
                    });
                    return settings.statusCategories;
                })
                .catch(error => {
                    BreakdownStatusBar.clear();
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Status categories could not be determined' + (rootCause ? ' - ' + rootCause : ''));
                });
        },


        pullFromJira() {
            let settings = BreakdownEnvironment.getSettings();
            BreakdownEnvironment.clearCurrentPullPath();
            BreakdownEnvironment.clearDownload();

            if (BreakdownEnvironment.getMode() == BreakdownEnvironment.MODE_PUSH) {
                BreakdownStatusBar.pull('Prepare pushing ' + BreakdownEnvironment.getFileNameWithoutExtension());
            } else {
                BreakdownStatusBar.pull('Pulling into ' + BreakdownEnvironment.getFileNameWithoutExtension());
                atom.notifications.addInfo('Pulling from Jira\n\nurl: ' + settings.jiraUrl + '<br>query: ' + settings.query);
            }

            return this.pullConfiguration()
                .then(() => {
                    return this.pullCustomFieldNames();
                })
                .then(() => {
                    return this.pullStatusCategories();
                })
                .then(() => {
                    return this.pullIssues({
                        query: settings.query
                    });
                })
                .then(() => {
                    this.makeDownloadDataStructure();
                    let download = BreakdownEnvironment.getDownload();
                    download.statistics.pulled = new Date();
                    BreakdownEnvironment.markCurrentPullPath();
                    BreakdownStatusBar.clear();
                    if (BreakdownEnvironment.getMode() == BreakdownEnvironment.MODE_PULL) {
                        atom.notifications.addSuccess(BreakdownUtil.formatDate(download.statistics.pulled, BreakdownUtil.DAY_FORMAT) + '\n\nData has been pulled from Jira into **' + BreakdownEnvironment.getFileName() + '**', {
                            dismissable: true
                        });
                    } else if (BreakdownEnvironment.getMode() == BreakdownEnvironment.MODE_PULL_CHART) {
                        atom.notifications.addSuccess(BreakdownUtil.formatDate(download.statistics.pulled, BreakdownUtil.DAY_FORMAT) + '\n\nData has been pulled from Jira into the **chart panel** of **' + BreakdownEnvironment.getFileName() + '**', {
                            dismissable: true
                        });
                    }

                })
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    BreakdownStatusBar.clear();

                    if (BreakdownEnvironment.getMode() == BreakdownEnvironment.MODE_PUSH) {
                        console.log('Failure during push preparation' + (rootCause ? ' due to ' + rootCause : ''));
                        atom.notifications.addWarning('Failure during push preparation' + (rootCause ? ' due to ' + rootCause : ''), {
                            dismissable: true
                        });
                    } else {
                        console.log('Failure when pulling from Jira' + (rootCause ? ' due to ' + rootCause : ''));
                        atom.notifications.addWarning('Failure when pulling from Jira' + (rootCause ? ' due to ' + rootCause : ''), {
                            dismissable: true
                        });
                    }
                    return Promise.reject();
                });
        },


        extractDataFromDownloadedIssues() {
            let download = BreakdownEnvironment.getDownload();
            download.epics = new Map();
            download.stories = new Map();
            download.subTasks = new Map();
            download.assignees = new Assignees();

            this.initializeStatistics();

            download.epics.set(BreakdownUtil.NO_PARENT_IN_SELECTION_KEY, {
                stories: new Map(),
                subTasks: new Map()
            });
            download.epics.set(BreakdownUtil.EMPTY_PARENT_KEY, {
                stories: new Map(),
                subTasks: new Map()
            });

            for (let issue of download.issues) {
                download.assignees.addIssue(issue);

                if (BreakdownUtil.isEpicType(issue)) {
                    download.statistics.epicCount++;
                    download.epics.set(BreakdownUtil.getKey(issue), {
                        issue: issue,
                        description: BreakdownUtil.getDescription(issue),
                        stories: new Map(),
                        subTasks: new Map()
                    });
                } else if (BreakdownUtil.isStoryType(issue)) {
                    download.statistics.storyCount++;
                    download.stories.set(BreakdownUtil.getKey(issue), {
                        issue: issue,
                        description: BreakdownUtil.getDescription(issue),
                        subTasks: new Map(),
                    });
                } else if (BreakdownUtil.isSubTaskType(issue)) {
                    download.statistics.subTaskCount++;
                    download.subTasks.set(BreakdownUtil.getKey(issue), {
                        issue: issue,
                        description: BreakdownUtil.getDescription(issue),
                    });
                }
            }
        },


        makeDownloadStoryDataStructure() {
            let download = BreakdownEnvironment.getDownload();
            for (let story of download.stories.values()) {
                let epicKey = BreakdownUtil.getEpicLink(story.issue);
                if (!epicKey) {
                    epicKey = BreakdownUtil.EMPTY_PARENT_KEY;
                    delete story.parentIssue;
                } else {
                    let epic = download.epics.get(epicKey);
                    if (!epic) {
                        epicKey = BreakdownUtil.NO_PARENT_IN_SELECTION_KEY;
                        delete story.parentIssue;
                    } else {
                        story.parentIssue = epic.issue;
                    }
                }


                download.epics.get(epicKey)
                    .stories.set(BreakdownUtil.getKey(story.issue), story);
            }
        },

        makeDownloadSubTaskDataStructure() {
            let download = BreakdownEnvironment.getDownload();
            for (let subTask of download.subTasks.values()) {
                let parentKey = BreakdownUtil.getParentKey(subTask.issue);
                if (parentKey) {
                    let story = download.stories.get(parentKey);
                    if (story) {
                        subTask.parentIssue = story.issue;
                        story.subTasks.set(BreakdownUtil.getKey(subTask.issue), subTask);
                    } else {
                        let epic = download.epics.get(parentKey);
                        if (epic) {
                            subTask.parentIssue = epic.issue;
                            epic.subTasks.set(BreakdownUtil.getKey(subTask.issue), subTask);
                        }
                    }
                } else {
                    delete subTask.parentIssue;
                    download.epics.get(BreakdownUtil.NO_PARENT_IN_SELECTION_KEY)
                        .subTasks.set(BreakdownUtil.getKey(subTask.issue), subTask);
                }
            }
        },


        makePointStatistics() {
            let download = BreakdownEnvironment.getDownload();
            let totalPoints = 0;
            let donePoints = 0;
            for (let epic of download.epics.values()) {
                totalPoints += BreakdownStringify.summarizePoints(epic);
                donePoints += BreakdownStringify.summarizeDonePoints(epic);
            }
            download.statistics.totalPoints = totalPoints;
            download.statistics.donePoints = donePoints;
        },

        makeDownloadDataStructure() {
            this.makeDownloadStoryDataStructure();
            this.makeDownloadSubTaskDataStructure();
            this.makePointStatistics();
        }
    };
})();
'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownStringify from './breakdown-stringify';
import BreakdownRequest from './breakdown-request';
import BreakdownStatusBar from './breakdown-status-bar';
import Assignees from './breakdown-assignees';
import BreakdownEnvironment from './breakdown-environment';
import _ from 'underscore';

export default BreakdownPull = (function() {

    return {

        initializeStatistics() {
            let download = BreakdownEnvironment.getDownload();
            download.statistics.epicCount = 0;
            download.statistics.storyCount = 0;
            download.statistics.subTaskCount = 0;
            download.statistics.issueCount = download.issues.length;
        },

        isStringifyAfterPull() {
            let settings = BreakdownEnvironment.getSettings();
            return BreakdownUtil.isTruethy(settings
                .stringifyAfterPull);
        },

        setStringifyAfterPull(stringify) {
            let settings = BreakdownEnvironment.getSettings();
            settings.stringifyAfterPull = stringify;
        },

        validatePullSettings() {
            let settings = BreakdownEnvironment.getSettings();
            let valid = true;
            if (!settings.jiraUrl) {
                console.log('No JIRA URL specified');
                atom.notifications.addWarning('Please specify your JIRA URL in the format\n\nurl: http://your.jira.url\n\nRefer to the https://atom.io/packages/breakdown package for documentation.', {
                    dismissable: true
                });
                valid = false;
            }
            if (!settings.project) {
                console.log('No JIRA project key specified');
                atom.notifications.addWarning('Please specify the key of the JIRA project to push new issues to in the format\n\nproject: PRJKEY\n\nRefer to the https://atom.io/packages/breakdown package for documentation.', {
                    dismissable: true
                });
                valid = false;
            }
            if (!settings.query) {
                console.log('No JIRA query specified');
                atom.notifications.addWarning('Please specify your JIRA query to select the issues you want to pull in the format\n\nquery: YOUR JQL QUERY\n\nRefer to the https://atom.io/packages/breakdown package for documentation.', {
                    dismissable: true
                });
                valid = false;
            }
            return valid;
        },

        pullConfiguration() {
            let settings = BreakdownEnvironment.getSettings();
            let jiraUrl = BreakdownEnvironment.getJiraUrl();
            let options = BreakdownRequest.prepareOptions({
                url: jiraUrl + '/rest/api/2/configuration'
            });
            return BreakdownRequest.request(options)
                .then(body => {
                    if (body.timeTrackingConfiguration) {
                        settings.timeTrackingConfiguration = body.timeTrackingConfiguration;
                    }
                });
        },

        pullIssues(config) {
            let download = BreakdownEnvironment.getDownload();
            let options = BreakdownRequest.prepareOptions(config);
            if (_.isUndefined(config.startAt) || config.startAt === 0) {
                download.issues = [];
            }
            return BreakdownRequest.request(options)
                .then(body => {
                    download.issues = download.issues.concat(body.issues);

                    let startAt = body.startAt;
                    let maxResults = body.maxResults;
                    let total = body.total;
                    if (startAt + maxResults < total) {
                        //recursive chaining for paginated loading of issues
                        if (this.isStringifyAfterPull()) {
                            BreakdownStatusBar.set('Pulling from JIRA ' + BreakdownStringify.stringifyProgress(startAt + maxResults, total));
                        }
                        config.startAt = startAt + maxResults;
                        config.maxResults = maxResults;
                        return this.pullIssues(config);
                    } else {
                        if (this.isStringifyAfterPull()) {
                            BreakdownStatusBar.set('Pulling from JIRA ' + BreakdownStringify.stringifyProgress(total, total));
                        }
                        this.extractDataFromDownloadedIssues();
                    }
                });
        },

        extractCustomFieldNames(issuetypes) {
            let settings = BreakdownEnvironment.getSettings();
            for (let k = 0; k < issuetypes.length &&
                (!settings.epicLinkFieldName ||
                    !settings.epicNameFieldName ||
                    !settings.storyPointsFieldName ||
                    !settings.sprintFieldName); k++) {
                let fields = issuetypes[k].fields;
                let keys = Object.keys(fields);

                for (let i = 0; i < keys.length &&
                    (!settings.epicLinkFieldName ||
                        !settings.epicNameFieldName ||
                        !settings.storyPointsFieldName ||
                        !settings.sprintFieldName); i++) {
                    if (!settings.storyPointsFieldName && fields[keys[i]].name == 'Story Points') {
                        settings.storyPointsFieldName = keys[i];
                    }
                    if (!settings.epicLinkFieldName && fields[keys[i]].name == 'Epic Link') {
                        settings.epicLinkFieldName = keys[i];
                    }
                    if (!settings.epicNameFieldName && fields[keys[i]].name == 'Epic Name') {
                        settings.epicNameFieldName = keys[i];
                    }
                    if (!settings.sprintFieldName && fields[keys[i]].name == 'Sprint') {
                        settings.sprintFieldName = keys[i];
                    }
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
                notification += '\nAre you sure you are accessing a JIRA Scrum project?';
                atom.notifications.addWarning(notification, {
                    dismissable: true
                });
            }
            return extract;

        },


        pullCustomFieldNames() {
            let settings = BreakdownEnvironment.getSettings();
            let options = BreakdownRequest.prepareOptions({
                url: settings.jiraUrl + '/rest/api/2/issue/createmeta' +
                    '?projectKeys=' + settings.project +
                    '&expand=projects.issuetypes.fields',
            });

            return BreakdownRequest.request(options)
                .then(body => {
                    //the first returned project the one defined by settings.project

                    if (body.projects.length == 0) {
                        return Promise.reject('The JIRA project ' + settings.project + ' could not be accessed');
                    }

                    let extract = this.extractCustomFieldNames(body.projects[0].issuetypes);
                    if (!extract) {
                        return Promise.reject();
                    }
                });
        },


        pullFromJira() {

            let settings = BreakdownEnvironment.getSettings();
            if (this.isStringifyAfterPull()) {
                BreakdownStatusBar.set('Pulling from JIRA');
                atom.notifications.addInfo('Pulling from JIRA\n\nurl: ' + settings.jiraUrl + '<br>query: ' + settings.query);
            } else {
                BreakdownStatusBar.set('Prepare pushing to JIRA');
            }

            return this.pullConfiguration()
                .then(() => {
                    return this.pullCustomFieldNames();
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
                    BreakdownStatusBar.clear();
                    if (this.isStringifyAfterPull()) {
                        atom.notifications.addSuccess('Data has been pulled from JIRA into **' + BreakdownEnvironment.getFile() + '** at ' + BreakdownUtil.formatDate(download.statistics.pulled), {
                            dismissable: true
                        });
                    }
                })
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    BreakdownStatusBar.clear();
                    if (this.isStringifyAfterPull()) {
                        console.log('Failure when pulling from JIRA' + (rootCause ? ' due to ' + rootCause : ''));
                        atom.notifications.addWarning('Failure when pulling from JIRA' + (rootCause ? ' due to ' + rootCause : ''), {
                            dismissable: true
                        });
                    } else {
                        console.log('Failure during push preparation' + (rootCause ? ' due to ' + rootCause : ''));
                        atom.notifications.addWarning('Failure during push preparation' + (rootCause ? ' due to ' + rootCause : ''), {
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
                        stories: new Map(),
                        subTasks: new Map()
                    });
                } else if (BreakdownUtil.isStoryType(issue)) {
                    download.statistics.storyCount++;
                    download.stories.set(BreakdownUtil.getKey(issue), {
                        issue: issue,
                        subTasks: new Map(),
                    });
                } else if (BreakdownUtil.isSubTaskType(issue)) {
                    download.statistics.subTaskCount++;
                    download.subTasks.set(BreakdownUtil.getKey(issue), {
                        issue: issue
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
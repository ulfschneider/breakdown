'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownStringify from './breakdown-stringify';
import BreakdownRequest from './breakdown-request';
import BreakdownStatusBar from './breakdown-status-bar';
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

        pullIssues(config, download, credentials) {
            let options = BreakdownRequest.prepareOptions(config, download.settings, credentials);
            if (_.isUndefined(config.startAt) || config.startAt === 0) {
                download.issues = [];
            }
            return BreakdownRequest.request(options)
                .then((body) => {
                    download.issues = download.issues.concat(body.issues);

                    let startAt = body.startAt;
                    let maxResults = body.maxResults;
                    let total = body.total;
                    if (startAt + maxResults < total) {
                        //recursive chaining for paginated loading of issues
                        if (download.settings.stringifyAfterPull) {
                            BreakdownStatusBar.set('Pulling from JIRA ' + BreakdownStringify.stringifyProgress(startAt, total));
                        }
                        config.startAt = startAt + maxResults;
                        config.maxResults = maxResults;
                        return this.pullIssues(config, download, credentials);
                    } else {
                        if (download.settings.stringifyAfterPull) {
                            BreakdownStatusBar.set('Pulling from JIRA ' + BreakdownStringify.stringifyProgress(total, total));
                        }
                        this.extractDataFromDownloadedIssues(download);
                    }
                });
        },

        extractCustomFieldNames(issuetypes, settings) {
            for (let k = 0; k < issuetypes.length &&
                (!settings.epicLinkFieldName ||
                    !settings.epicNameFieldName ||
                    !settings.storyPointsFieldName); k++) {
                let fields = issuetypes[k].fields;
                let keys = Object.keys(fields);

                for (let i = 0; i < keys.length &&
                    (!settings.epicLinkFieldName ||
                        !settings.epicNameFieldName ||
                        !settings.storyPointsFieldName); i++) {
                    if (!settings.storyPointsFieldName && fields[keys[i]].name == 'Story Points') {
                        settings.storyPointsFieldName = keys[i];
                    }
                    if (!settings.epicLinkFieldName && fields[keys[i]].name == 'Epic Link') {
                        settings.epicLinkFieldName = keys[i];
                    }
                    if (!settings.epicNameFieldName && fields[keys[i]].name == 'Epic Name') {
                        settings.epicNameFieldName = keys[i];
                    }
                }
            }

            let extract = true;
            let notification = 'One or more custom fields couldn´t be extracted:\n\n';
            if (!settings.epicNameFieldName) {
                console.log('No custom field Epic Name extracted');
                notification += '* Epic Name\n';
                extract = false;
            }
            if (!settings.epicLinkFieldName) {
                console.log('No custom field Epic Link extracted');
                notification += '* Epic Link\n';
                extract = false;
            }
            if (!settings.storyPointsFieldName) {
                console.log('No custom field Story Points extracted');
                notification += '* Story Points\n';
                extract = false;
            }
            if (!extract) {
                notification += '\nAre you sure you are accessing a JIRA Scrum project?'
                atom.notifications.addWarning(notification, {
                    dismissable: true
                });
            }
            return extract;

        },


        pullCustomFieldNames(settings, credentials) {
            let options = BreakdownRequest.prepareOptions({
                url: settings.jiraUrl + '/rest/api/2/issue/createmeta' +
                    '?projectKeys=' + settings.project +
                    '&expand=projects.issuetypes.fields',
            }, settings, credentials);
            return BreakdownRequest.request(options).
            then((body) => {
                //the first returned project the one defined by settings.project
                let extract = this.extractCustomFieldNames(body.projects[0].issuetypes, settings);
                if (!extract) {
                    return Promise.reject();
                }
            });
        },


        pullFromJira(download, credentials) {
            if (download.settings.stringifyAfterPull) {
                BreakdownStatusBar.set('Pulling from JIRA');
                console.log('Pulling from JIRA url=[' + download.settings.jiraUrl + '] query=[' + download.settings.query + ']');
                atom.notifications.addInfo('Pulling from JIRA\n\nurl: ' + download.settings.jiraUrl + '<br>query: ' + download.settings.query);
            } else {
                BreakdownStatusBar.set('Prepare pushing to JIRA');
                console.log('Prepare pushing to JIRA');
            }

            return this.pullCustomFieldNames(download.settings, credentials)
                .then(() => {
                    return this.pullIssues({
                        query: download.settings.query
                    }, download, credentials)
                })
                .then(() => {
                    this.makeDownloadDataStructure(download);
                    download.statistics.pulled = new Date();
                    BreakdownStatusBar.clear();
                    if (download.settings.stringifyAfterPull) {
                        atom.notifications.addSuccess('Data has been pulled from JIRA');
                    }
                    download.settings.askForCredentials = false;
                    return true;
                })
                .catch((error) => {
                    BreakdownStatusBar.clear();
                    let rootCause = BreakdownUtil.stringifyError(error);
                    if (download.settings.stringifyAfterPull) {
                        console.error('Failure when pulling from JIRA' + (rootCause ? ' - ' + rootCause : ''));
                        atom.notifications.addWarning('Failure when pulling from JIRA' + (rootCause ? '\n\n' + rootCause : ''), {
                            dismissable: true
                        });
                    } else {
                        console.error('Failure during push preparation' + (rootCause ? ' - ' + rootCause : ''));
                        atom.notifications.addWarning('Failure during push preparation' + (rootCause ? '\n\n' + rootCause : ''), {
                            dismissable: true
                        });
                    }
                });
        },

        extractDataFromDownloadedIssues(download) {
            download.epics = new Map();
            download.stories = new Map;
            download.subTasks = new Map();
            download.assignees = new Assignees();
            this.initializeStatistics(download);

            download.epics.set('NO PARENT', {
                stories: new Map(),
                subTasks: new Map()
            });

            for (let issue of download.issues) {
                if (BreakdownStringify.hasAssignee(issue)) {
                    download.assignees.addIssue(issue);
                }
                if (BreakdownUtil.isEpicType(issue, download.settings)) {
                    download.statistics.epicCount++;
                    download.epics.set(issue.key, {
                        issue: issue,
                        stories: new Map(),
                        subTasks: new Map()
                    });
                } else if (BreakdownUtil.isStoryType(issue, download.settings)) {
                    download.statistics.storyCount++;
                    download.stories.set(issue.key, {
                        issue: issue,
                        subTasks: new Map(),
                    });
                } else if (BreakdownUtil.isSubTaskType(issue, download.settings)) {
                    download.statistics.subTaskCount++;
                    download.subTasks.set(issue.key, {
                        issue: issue
                    });
                }
            }
        },


        makeDownloadStoryDataStructure(download) {
            for (let story of download.stories.values()) {
                let epicKey = BreakdownUtil.getEpicLink(story.issue, download.settings);
                if (!epicKey) {
                    epicKey = 'NO PARENT';
                }

                let epic = download.epics.get(epicKey);
                if (!epic) {
                    epicKey = 'NO PARENT';
                    delete story.parentIssue;
                } else {
                    story.parentIssue = epic.issue;
                }

                download.epics.get(epicKey)
                    .stories.set(BreakdownUtil.getKey(story.issue), story);
            }
        },

        makeDownloadSubTaskDataStructure(download) {
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
                    download.epics.get('NO PARENT')
                        .subTasks.set(BreakdownUtil.getKey(subTask.issue), subTask);
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

        makeDownloadDataStructure(download) {
            this.makeDownloadStoryDataStructure(download);
            this.makeDownloadSubTaskDataStructure(download);
            this.makePointStatistics(download);
        }
    }
})();
'use babel';

import BreakdownUtils from './breakdown-util';
import BreakdownStringify from './breakdown-stringify';
import BreakdownRequest from './breakdown-request';
import BreakdownStatus from './breakdown-status';
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

        pullIssues(config, download, credentials) {
            let options = BreakdownRequest.prepareOptions(config, download.settings, credentials);
            if (_.isUndefined(config.startAt) || config.startAt === 0) {
                BreakdownStatus.setStatus('Pulling JIRA issues');
                download.issues = [];
            }
            return BreakdownRequest.request(options)
                .then((body) => {
                    let object = JSON.parse(body);
                    download.issues = download.issues.concat(object.issues);

                    let startAt = object.startAt;
                    let maxResults = object.maxResults;
                    let total = object.total;
                    if (startAt + maxResults < total) {
                        //recursive chaining for paginated loading of issues
                        BreakdownStatus.setStatus('Pulling JIRA issues ' + BreakdownStringify.stringifyProgress(startAt, total));
                        config.startAt = startAt + maxResults;
                        config.maxResults = maxResults;
                        return this.pullIssues(config, download, credentials);
                    } else {
                        BreakdownStatus.setStatus('Pulling JIRA issues ' + BreakdownStringify.stringifyProgress(total, total));
                        this.extractDataFromDownloadedIssues(download);
                    }
                });
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

        pullCustomFieldNamesWithKey(key, settings, credentials) {
            if (key) {
                let options = BreakdownRequest.prepareOptions({
                    url: settings.jiraUrl + '/rest/api/2/issue/' + key + '/editmeta'
                }, settings, credentials);
                return BreakdownRequest.request(options)
                    .then((body) => {
                        this.extractCustomFieldNames(body, settings);
                    });
            } else {
                throw new Error('No key provided to pull custom fieldnames');
            }
            console.warn('Custom field names could not be extracted');
            return Promise.resolve();
        },

        pullCustomFieldNames(download, credentials) {
            console.log('Pulling custom field names');
            BreakdownStatus.setStatus('Pulling custom field names');

            let issueType = null;
            let issueKey = null;
            let issues = download.issues;
            //get the issue key for a story
            for (let i = 0; i < issues.length && !issueKey; i++) {
                issueType = BreakdownUtils.getIssueType(issues[i]);
                if (BreakdownUtils.isSameIssueType(download.settings.storyType, issueType)) {
                    issueKey = issues[i].key;
                }
            }
            return this.pullCustomFieldNamesWithKey(issueKey, download.settings, credentials);
        },


        pull(download, credentials) {
            BreakdownStatus.setStatus('Pulling JIRA data');
            console.log('Pulling JIRA url=[' + download.settings.jiraUrl + '] query=[' + download.settings.query + ']');
            atom.notifications.addInfo('Pulling JIRA url=[' + download.settings.jiraUrl + '] query=[' + download.settings.query + ']');

            return this.pullIssues({
                    query: download.settings.query,
                }, download, credentials)
                .then(() => {
                    return this.pullCustomFieldNames(download, credentials);
                })
                .then(() => {

                    this.makeDownloadDataStructure(download);
                    download.statistics.pulled = new Date();
                    console.log('JIRA data has been pulled');
                    atom.notifications.addSuccess('JIRA data has been pulled');
                    BreakdownStatus.clear();

                    download.settings.askForCredentials = false;
                    return true;
                })
                .catch((error) => {
                    BreakdownStatus.clear();
                    let rootCause = BreakdownUtils.stringifyError(error);
                    console.error('Failure when pulling JIRA data' + (rootCause ? ' - ' + rootCause : ''));
                    atom.notifications.addError('Failure when pulling JIRA data' + (rootCause ? ' - ' + rootCause : ''), {
                        dismissable: true
                    });
                });
        },

        extractDataFromDownloadedIssues(download) {
            download.epics = new Map();
            download.stories = new Map;
            download.subTasks = new Map();
            download.assignees = new Assignees();
            this.initializeStatistics(download);

            download.epics.set('NO EPIC', {
                children: new Map()
            });

            for (let issue of download.issues) {
                let issueType = BreakdownUtils.getIssueType(issue);
                if (BreakdownStringify.hasField(download.settings, 'assignee')) {
                    download.assignees.addIssue(issue);
                }
                if (BreakdownUtils.isSameIssueType(download.settings.epicType, issueType)) {
                    download.statistics.epicCount++;
                    download.epics.set(issue.key, {
                        issue: issue,
                        children: new Map()
                    });
                } else if (BreakdownUtils.isSameIssueType(download.settings.storyType, issueType)) {
                    download.statistics.storyCount++;
                    download.stories.set(issue.key, {
                        issue: issue,
                        children: new Map()
                    });
                } else if (BreakdownUtils.isSameIssueType(download.settings.subTaskType, issueType)) {
                    download.statistics.subTaskCount++;
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
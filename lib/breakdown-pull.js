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
                atom.notifications.addError('Please specify your JIRA URL in the format\n\nurl: http://your.jira.url\n\nRefer to the https://atom.io/packages/breakdown package for documentation.', {
                    dismissable: true
                });
                valid = false;
            }
            if (!settings.project) {
                console.log('No JIRA project key specified');
                atom.notifications.addError('Please specify the key of the JIRA project to push new issues to in the format\n\nproject: PRJKEY\n\nRefer to the https://atom.io/packages/breakdown package for documentation.', {
                    dismissable: true
                });
                valid = false;
            }
            if (!settings.query) {
                console.log('No JIRA query specified');
                atom.notifications.addError('Please specify your JIRA query to select the issues you want to pull in the format\n\nquery: YOUR JQL QUERY\n\nRefer to the https://atom.io/packages/breakdown package for documentation.', {
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
                    download.issues = download.issues.concat(body.issues);

                    let startAt = body.startAt;
                    let maxResults = body.maxResults;
                    let total = body.total;
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

        extractCustomFieldNames(body, settings) {
            let fields = body.fields;
            let keys = Object.keys(fields);

            for (let i = 0; i < keys.length && (!settings.epicLinkFieldName || !settings.storyPointsFieldName); i++) {
                if (!settings.epicLinkFieldName && fields[keys[i]].name == 'Epic Link') {
                    settings.epicLinkFieldName = keys[i];
                }
                if (!settings.storyPointsFieldName && fields[keys[i]].name == 'Story Points') {
                    settings.storyPointsFieldName = keys[i];
                }
            }

            if (!settings.epicLinkFieldName || !settings.storyPointsFieldName) {
                throw new Error('Custom fieldnames for Epic Link and Story Points could not be resolved');
            }
        },


        pullCustomFieldNames(settings, credentials) {
            BreakdownStatus.setStatus('Pulling custom fieldnames');
            let options = BreakdownRequest.prepareOptions({
                url: settings.jiraUrl + '/rest/api/2/issue/createmeta' +
                    '?projectKeys=' + settings.project +
                    '&issuetypeNames=' + settings.storyType +
                    '&expand=projects.issuetypes.fields',
                json: true
            }, settings, credentials);
            return BreakdownRequest.request(options).
            then((body) => {
                //the first returned project the one defined by settings.project
                //the first issuetype is defined by settings.storyType
                this.extractCustomFieldNames(body.projects[0].issuetypes[0], settings);
                BreakdownStatus.clear();
            });
        },


        pullFromJIRA(download, credentials) {
            BreakdownStatus.setStatus('Pulling JIRA data');
            console.log('Pulling JIRA url=[' + download.settings.jiraUrl + '] query=[' + download.settings.query + ']');
            atom.notifications.addInfo('Pulling JIRA url=[' + download.settings.jiraUrl + '] query=[' + download.settings.query + ']');

            return this.pullCustomFieldNames(download.settings, credentials)
                .then(() => {
                    return this.pullIssues({
                        query: download.settings.query,
                        json: true
                    }, download, credentials)
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

        makeDownloadDataStructure(download) {
            this.makeDownloadStoryDataStructure(download);
            this.makeDownloadSubTaskDataStructure(download);
            this.makePointStatistics(download);
        }
    }
})();
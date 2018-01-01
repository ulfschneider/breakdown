'use babel';

import BreakdownUtils from './breakdown-util';
import BreakdownParse from './breakdown-parse';
import BreakdownPull from './breakdown-pull';
import _ from 'underscore';

export default BreakdownPush = (function() {

    return {

        validatePushSettings(settings) {
            return BreakdownPull.validatePullSettings(settings);
        },

        getIssueDiff(originIssue, modifiedIssue, settings) {
            //issuetype, assignee, points, fixversion, summary, parent
            let diffIssue = {
                fields: {}
            };

            let originKey = BreakdownUtils.getKey(originIssue);
            let modifiedKey = BreakdownUtils.getKey(modifiedIssue);
            if (originKey !== modifiedKey) {
                //operate only on issues with same key
                throw new Error('The two issues do not have the same key: ' + originKey + ' and ' + modifiedKey);
            }

            let originIssueType = BreakdownUtils.getIssueType(originIssue);
            let modifiedIssueType = BreakdownUtils.getIssueType(modifiedIssue);
            if (originIssueType !== modifiedIssueType) {
                BreakdownUtils.setIssueType(diffIssue, modifiedIssueType);
            }

            let modifiedAssignee = BreakdownUtils.getAssignee(modifiedIssue);
            if (BreakdownUtils.getAssignee(originIssue) !== modifiedAssignee) {
                BreakdownUtils.setAssignee(diffIssue, modifiedAssignee);
            }

            let modifiedStoryPoints = BreakdownUtils.getStoryPoints(modifiedIssue, settings);
            if (BreakdownUtils.getStoryPoints(originIssue, settings) !== modifiedStoryPoints) {
                BreakdownUtils.setStoryPoints(diffIssue, modifiedStoryPoints, settings);
            }

            let originFixVersions = BreakdownUtils.getFixVersions(originIssue);
            let modifiedFixVersions = BreakdownUtils.getFixVersions(modifiedIssue);
            if (BreakdownUtils.stringifyFixVersions(originFixVersions) !== BreakdownUtils.stringifyFixVersions(modifiedFixVersions)) {
                BreakdownUtils.setFixVersions(diffIssue, modifiedFixVersions);
            }

            let modifiedSummary = BreakdownUtils.getSummary(modifiedIssue);
            if (BreakdownUtils.getSummary(originIssue) !== modifiedSummary) {
                BreakdownUtils.setSummary(diffIssue, modifiedSummary);
            }

            if (!BreakdownUtils.isEpicType(originIssue, settings) &&
                BreakdownUtils.isEpicType(modifiedIssue, settings)) {
                BreakdownUtils.setEpicLink(modifiedIssue, '', settings);
                BreakdownUtils.setParentKey(modifiedIssue, '');
            } else if (BreakdownUtils.isStoryType(modifiedIssue, settings)) {
                let originEpicLink = BreakdownUtils.getEpicLink(originIssue, settings);
                let modifiedEpicLink = BreakdownUtils.getEpicLink(modifiedIssue, settings);
                if (originEpicLink !== modifiedEpicLink) {
                    BreakdownUtils.setEpicLink(diffIssue, modifiedEpicLink, settings);
                }
            } else if (BreakdownUtils.isSubTaskType(modifiedIssue, settings)) {
                let originParentKey = BreakdownUtils.getParentKey(originIssue);
                let modifiedParentKey = BreakdownUtils.getParentKey(modifiedIssue);
                if (originParentKey !== modifiedParentKey) {
                    BreakdownUtils.setParentKey(diffIssue, modifiedParentKey);
                }
            }

            if (!_.isEmpty(diffIssue.fields)) {
                BreakdownUtils.setKey(diffIssue, BreakdownUtils.getKey(modifiedIssue));
                return diffIssue;
            }

            return {};
        },


        makeUploadIssue(token, settings) {
            let issue = {
                fields: {}
            };
            BreakdownUtils.setProjectKey(issue, settings.project);
            let key = BreakdownParse.parseKey(token);
            BreakdownUtils.setKey(issue, key);
            let summary = BreakdownParse.parseSummary(token);
            BreakdownUtils.setSummary(issue, summary);
            let assignee = BreakdownParse.parseAssignee(token);
            BreakdownUtils.setAssignee(issue, assignee);
            let fixVersion = BreakdownParse.parseFixVersion(token);
            let split = fixVersion ? fixVersion.split(',') : [];
            BreakdownUtils.setFixVersions(issue, split);

            return issue;
        },

        makeUploadEpicIssue(token, settings) {
            let epicIssue = this.makeUploadIssue(token, settings);
            BreakdownUtils.setIssueType(epicIssue, settings.epicType);
            let epicName = BreakdownUtils.getSummary(epicIssue);
            BreakdownUtils.setEpicName(epicIssue, epicName, settings);
            let points = BreakdownParse.parsePoints(token);
            BreakdownUtils.setStoryPoints(epicIssue, points, settings);
            return epicIssue;
        },

        makeUploadStoryIssue(token, settings, parentIssue) {
            let storyIssue = this.makeUploadIssue(token, settings);
            BreakdownUtils.setIssueType(storyIssue, settings.storyType);
            let points = BreakdownParse.parsePoints(token);
            BreakdownUtils.setStoryPoints(storyIssue, points, settings);
            this.maintainEpicLink(storyIssue, parentIssue, settings);
            return storyIssue;
        },

        makeUploadSubTaskIssue(token, settings, parentIssue) {
            let subTaskIssue = this.makeUploadIssue(token, settings);
            BreakdownUtils.setIssueType(subTaskIssue, settings.subTaskType);
            this.maintainParentLink(subTaskIssue, parentIssue, settings);

            return subTaskIssue;
        },

        makeUploadDataStructure(upload, download) {
            upload.uploadJiraObjects = [];

            const editor = atom.workspace.getActiveTextEditor();
            const grammar = editor.getGrammar();
            const tokens = grammar.tokenizeLines(editor.getText());

            let issue, parentEpicIssue, parentStoryIssue;
            tokens.forEach((token, rowCount) => {
                let originIssue = {};
                if (BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                    let key = BreakdownParse.rowGetValueForScope(token, 'issue.key.jira');
                    originIssue = BreakdownUtils.getIssue(download.issues, key);
                }

                if (BreakdownParse.rowHasScope(token, 'issue.delete.epic.jira')) {
                    issue = this.makeUploadEpicIssue(token, upload.settings);
                    parentEpicIssue = issue;
                    parentStoryIssue = null;
                    if (BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.uploadJiraObjects.push({
                            method: 'DELETE',
                            issue: issue
                        });
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.epic.jira') ||  
                    BreakdownParse.rowHasScope(token, 'issue.resolved.epic.jira')) {
                    issue = this.makeUploadEpicIssue(token, upload.settings);
                    parentEpicIssue = issue;
                    parentStoryIssue = null;
                    if (!BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.uploadJiraObjects.push({
                            method: 'CREATE',
                            issue: issue
                        });
                    } else {
                        let diffIssue = this.getIssueDiff(originIssue, issue, upload.settings);
                        if (!_.isEmpty(diffIssue)) {
                            upload.uploadJiraObjects.push({
                                method: 'UPDATE',
                                issue: diffIssue
                            });
                        }
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.delete.story.jira')) {
                    issue = this.makeUploadStoryIssue(token, upload.settings);
                    parentStoryIssue = issue;
                    if (BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.uploadJiraObjects.push({
                            method: 'DELETE',
                            issue: issue,
                            parentIssue: parentEpicIssue
                        });
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.story.jira') ||
                    BreakdownParse.rowHasScope(token, 'issue.resolved.story.jira')) {
                    issue = this.makeUploadStoryIssue(token, upload.settings, parentEpicIssue);
                    parentStoryIssue = issue;
                    if (!BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.uploadJiraObjects.push({
                            method: 'CREATE',
                            issue: issue,
                            parentIssue: parentEpicIssue
                        });
                    } else {
                        let diffIssue = this.getIssueDiff(originIssue, issue, upload.settings);
                        if (!_.isEmpty(diffIssue)) {
                            upload.uploadJiraObjects.push({
                                method: 'UPDATE',
                                issue: diffIssue
                            });
                        }
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.delete.sub-task.jira')) {
                    let parentIssue = (parentStoryIssue ? parentStoryIssue : parentEpicIssue);
                    issue = this.makeUploadSubTaskIssue(token, upload.settings, parentIssue);
                    if (BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.uploadJiraObjects.push({
                            method: 'DELETE',
                            issue: issue,
                            parentIssue: parentIssue
                        });
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.sub-task.jira') ||
                    BreakdownParse.rowHasScope(token, 'issue.resolved.sub-task.jira')) {
                    let parentIssue = (parentStoryIssue ? parentStoryIssue : parentEpicIssue);
                    issue = this.makeUploadSubTaskIssue(token, upload.settings, parentIssue);
                    if (!BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.uploadJiraObjects.push({
                            method: 'CREATE',
                            issue: issue,
                            parentIssue: parentIssue
                        });
                    } else {
                        let diffIssue = this.getIssueDiff(originIssue, issue, upload.settings);
                        if (!_.isEmpty(diffIssue)) {
                            upload.uploadJiraObjects.push({
                                method: 'UPDATE',
                                issue: diffIssue
                            });
                        }
                    }
                }
            });
        },

        maintainEpicLink(storyIssue, parentIssue, settings) {
            if (parentIssue && parentIssue.key) {
                BreakdownUtils.setEpicLink(storyIssue, parentIssue.key, settings);
            }
        },


        maintainParentLink(subTaskIssue, parentIssue, settings) {
            if (parentIssue && parentIssue.key) {
                BreakdownUtils.setParentKey(subTaskIssue, parentIssue.key);
            }
        },


        maintainParent(uploadJiraObject, settings) {
            let issue = uploadJiraObject.issue;
            if (BreakdownUtils.isStoryType(issue, settings)) {
                this.maintainEpicLink(issue, uploadJiraObject.parentIssue, settings);
            } else if (BreakdownUtils.isSubTaskType(issue, settings)) {
                this.maintainParentLink(issue, uploadJiraObject.parentIssue, settings);
            }
        },

        deleteIssue(deleteJiraObject, settings, credentials) {
            let issue = deleteJiraObject.issue;
            let options = BreakdownRequest.prepareOptions({
                method: 'DELETE',
                url: settings.jiraUrl + '/rest/api/2/issue/' + BreakdownUtils.getKey(issue),
                json: true
            }, settings, credentials);

            return BreakdownRequest.request(options)
                .catch((error) => {
                    let rootCause = BreakdownUtils.stringifyError(error);
                    console.error('Issue could not be deleted in JIRA, issuetype=[' + BreakdownUtils.getIssueType(issue) + '] summary=[' + BreakdownUtils.getSummary(issue) + ']' + (rootCause ? ' - ' + rootCause : ''));
                    atom.notifications.addWarning('Issue could not be deleted in JIRA\n\n' +
                        BreakdownUtils.getIssueType(issue) + ' ' +
                        BreakdownUtils.getKey(issue) + '\n\n' +
                        (rootCause ? rootCause : ''), {
                            dismissable: true
                        });
                });
        },

        updateIssue(updateJiraObject, settings, credentials) {
            let issue = updateJiraObject.issue;
            let issuetype = BreakdownUtils.getIssueType(issue);
            let epicLink = BreakdownUtils.getEpicLink(issue, settings);
            if (issuetype && epicLink) {
                //issuetype changed to story with epic link
                //therefore we have to do a 2-step update
                //1. make the issue a story without epicLink
                //2. change the epicLink
                BreakdownUtils.setEpicLink(issue, '', settings);
            }

            let options = BreakdownRequest.prepareOptions({
                method: 'PUT',
                url: settings.jiraUrl + '/rest/api/2/issue/' + BreakdownUtils.getKey(issue),
                body: issue,
                json: true
            }, settings, credentials);

            return BreakdownRequest.request(options)
                .then(() => {
                    if (issuetype && epicLink) {
                        //issuetype changed to story with epic link
                        //this is the 2. change
                        BreakdownUtils.setEpicLink(issue, epicLink, settings);
                        options.body = issue;
                        return BreakdownRequest.request(options);
                    }
                    Promise.resolve();
                })
                .catch((error) => {
                    let rootCause = BreakdownUtils.stringifyError(error);
                    console.error('Issue could not be updated in JIRA, key=[' + BreakdownUtils.getKey(issue) + ']' + (rootCause ? ' - ' + rootCause : ''));
                    atom.notifications.addWarning('Issue could not be updated in JIRA\n\n' +
                        BreakdownUtils.getKey(issue) + '\n\n' +
                        (rootCause ? rootCause : ''), {
                            dismissable: true
                        });
                });

        },

        createIssue(uploadJiraObject, settings, credentials) {

            this.maintainParent(uploadJiraObject, settings);
            let issue = uploadJiraObject.issue;
            let options = BreakdownRequest.prepareOptions({
                method: 'POST',
                url: settings.jiraUrl + '/rest/api/2/issue/',
                body: issue,
                json: true
            }, settings, credentials);

            return BreakdownRequest.request(options)
                .then((body) => {
                    BreakdownUtils.setKey(issue, body.key);
                }).catch((error) => {
                    let rootCause = BreakdownUtils.stringifyError(error);
                    console.error('Issue could not be created in JIRA, issuetype=[' + BreakdownUtils.getIssueType(issue) + '] summary=[' + BreakdownUtils.getSummary(issue) + ']' + (rootCause ? ' - ' + rootCause : ''));
                    atom.notifications.addWarning('Issue could not be created in JIRA\n\n' +
                        BreakdownUtils.getIssueType(issue) + ' ' +
                        BreakdownUtils.getSummary(issue) + '\n\n' +
                        (rootCause ? rootCause : ''), {
                            dismissable: true
                        });
                });
        },

        pushIssues(upload, credentials) {

            return upload.uploadJiraObjects.reduce((series, uploadJiraObject, count) => {
                return series.then(() => {
                    BreakdownStatus.setStatus('Push issues to JIRA ' +
                        BreakdownStringify.stringifyProgress(count, upload.uploadJiraObjects.length));
                    if (uploadJiraObject.method == 'CREATE') {
                        return this.createIssue(uploadJiraObject, upload.settings, credentials)
                    } else if (uploadJiraObject.method == 'UPDATE') {
                        return this.updateIssue(uploadJiraObject, upload.settings, credentials)
                    } else if (uploadJiraObject.method == 'DELETE') {
                        return this.deleteIssue(uploadJiraObject, upload.settings, credentials)
                    }
                });
            }, Promise.resolve());

        },

        pushToJira(upload, download, credentials) {
            BreakdownStatus.setStatus('Pushing to JIRA');
            console.log('Pushing to JIRA url=[' + upload.settings.jiraUrl + '] project=[' + upload.settings.project + ']');
            atom.notifications.addInfo('Pushing to JIRA\n\nurl: ' + upload.settings.jiraUrl + '\n\nproject: ' + upload.settings.project);

            return BreakdownPull.pullFromJira(download, credentials)
                .then(() => {
                    BreakdownPush.makeUploadDataStructure(upload, download);
                    return this.pushIssues(upload, credentials);
                }).catch((error) => {
                    BreakdownStatus.clear();
                    let rootCause = BreakdownUtils.stringifyError(error);
                    console.log('Data could not be prepared for pushing to JIRA' + (rootCause ? ' - ' + rootCause : ''));
                    atom.notifications.addWarning('Data could not be prepared for pushing to JIRA' + (rootCause ? '\n\n' + rootCause : ''), {
                        dismissable: true
                    });
                });
        }
    }
})();
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

        makeUploadDataStructure(upload) {
            upload.newJiraObjects = [];
            upload.deleteJiraObjects = [];

            const editor = atom.workspace.getActiveTextEditor();
            const grammar = editor.getGrammar();
            const tokens = grammar.tokenizeLines(editor.getText());

            let issue, parentEpicIssue, parentStoryIssue;

            tokens.forEach((token, rowCount) => {
                if (BreakdownParse.rowHasScope(token, 'issue.epic.jira')) {
                    issue = this.makeUploadEpicIssue(token, upload.settings);
                    parentEpicIssue = issue;
                    parentStoryIssue = null;
                    if (!BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.newJiraObjects.push({
                            issue: issue
                        });
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.delete.epic.jira')) {
                    issue = this.makeUploadEpicIssue(token, upload.settings);
                    parentEpicIssue = issue;
                    parentStoryIssue = null;
                    if (BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.deleteJiraObjects.push({
                            issue: issue
                        });
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.story.jira')) {
                    issue = this.makeUploadStoryIssue(token, upload.settings, parentEpicIssue);
                    parentStoryIssue = issue;
                    if (!BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.newJiraObjects.push({
                            issue: issue,
                            parentIssue: parentEpicIssue
                        });
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.delete.story.jira')) {
                    issue = this.makeUploadStoryIssue(token, upload.settings);
                    parentStoryIssue = issue;
                    if (BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.deleteJiraObjects.push({
                            issue: issue,
                            parentIssue: parentEpicIssue
                        });
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.sub-task.jira')) {
                    if (!BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        let parentIssue = (parentStoryIssue ? parentStoryIssue : parentEpicIssue);
                        issue = this.makeUploadSubTaskIssue(token, upload.settings, parentIssue);
                        upload.newJiraObjects.push({
                            issue: issue,
                            parentIssue: parentIssue
                        });
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.delete.sub-task.jira')) {
                    if (BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        let parentIssue = (parentStoryIssue ? parentStoryIssue : parentEpicIssue);
                        issue = this.makeUploadSubTaskIssue(token, upload.settings, parentIssue);
                        upload.deleteJiraObjects.push({
                            issue: issue,
                            parentIssue: parentIssue
                        });
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

        pushIssue(uploadJiraObject, settings, credentials) {

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
                    console.error('Issue could not be pushed to JIRA, issuetype=[' + BreakdownUtils.getIssueType(issue) + '] summary=[' + BreakdownUtils.getSummary(issue) + ']' + (rootCause ? ' - ' + rootCause : ''));
                    atom.notifications.addWarning('Issue could not be pushed to JIRA\n\n' +
                        BreakdownUtils.getIssueType(issue) + ' ' +
                        BreakdownUtils.getSummary(issue) + '\n\n' +
                        (rootCause ? rootCause : ''), {
                            dismissable: true
                        });
                });
        },

        pushIssues(upload, credentials) {
            let total = upload.newJiraObjects.length + upload.deleteJiraObjects.length;
            return upload.newJiraObjects.reduce((series, uploadJiraObject, count) => {
                    return series.then(() => {
                        BreakdownStatus.setStatus('Pushing to JIRA ' + BreakdownStringify.stringifyProgress(count, total));
                        return this.pushIssue(uploadJiraObject, upload.settings, credentials)
                    });
                }, Promise.resolve())
                .then(() => {
                    return upload.deleteJiraObjects.reduce((series, deleteJiraObject, count) => {
                        return series.then(() => {
                            BreakdownStatus.setStatus('Pushing to JIRA ' + BreakdownStringify.stringifyProgress(upload.newJiraObjects.length + count, total));
                            return this.deleteIssue(deleteJiraObject, upload.settings, credentials)
                        });
                    }, Promise.resolve())
                });
        },

        pushToJira(upload, credentials) {
            BreakdownStatus.setStatus('Pushing to JIRA');
            console.log('Pushing to JIRA url=[' + upload.settings.jiraUrl + '] project=[' + upload.settings.project + ']');
            atom.notifications.addInfo('Pushing to JIRA\n\nurl: ' + upload.settings.jiraUrl + '\n\nproject: ' + upload.settings.project);

            return BreakdownPull.pullCustomFieldNames(upload.settings, credentials)
                .then(() => {
                    BreakdownPush.makeUploadDataStructure(upload);
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
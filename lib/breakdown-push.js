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


        makeUploadIssueObject(token, settings) {
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

        makeUploadEpicObject(token, settings) {
            let epicIssue = this.makeUploadIssueObject(token, settings);
            BreakdownUtils.setIssueType(epicIssue, settings.epicType);
            let epicName = BreakdownUtils.getSummary(epicIssue);
            BreakdownUtils.setEpicName(epicIssue, epicName, settings);
            let points = BreakdownParse.parsePoints(token);
            BreakdownUtils.setStoryPoints(epicIssue, points, settings);
            return epicIssue;
        },

        maintainEpicLink(storyIssue, parentIssue, settings) {
            if (parentIssue && parentIssue.key) {
                BreakdownUtils.setEpicLink(storyIssue, parentIssue.key, settings);
            }
        },

        makeUploadStoryObject(token, settings, parentIssue) {
            let storyIssue = this.makeUploadIssueObject(token, settings);
            BreakdownUtils.setIssueType(storyIssue, settings.storyType);
            let points = BreakdownParse.parsePoints(token);
            BreakdownUtils.setStoryPoints(storyIssue, points, settings);
            this.maintainEpicLink(storyIssue, parentIssue, settings);
            return storyIssue;
        },

        maintainParentLink(subTaskIssue, parentIssue, settings) {
            if (parentIssue && parentIssue.key) {
                BreakdownUtils.setParentKey(subTaskIssue, parentIssue.key);
            }
        },

        makeUploadSubTaskObject(token, settings, parentIssue) {
            let subTaskIssue = this.makeUploadIssueObject(token, settings);
            BreakdownUtils.setIssueType(subTaskIssue, settings.subTaskType);
            this.maintainParentLink(subTaskIssue, parentIssue, settings);

            return subTaskIssue;
        },



        makeUploadDataStructure(upload) {
            upload.newIssues = [];
            upload.deleteIssues = [];

            const editor = atom.workspace.getActiveTextEditor();
            const grammar = editor.getGrammar();
            const tokens = grammar.tokenizeLines(editor.getText());

            let issue, parentEpic, parentStory;

            tokens.forEach((token, rowCount) => {
                if (BreakdownParse.rowHasScope(token, 'issue.epic.jira')) {
                    issue = this.makeUploadEpicObject(token, upload.settings);
                    parentEpic = issue;
                    parentStory = null;
                    if (!BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.newIssues.push({
                            issue: issue
                        });
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.delete.epic.jira')) {
                    if (BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        issue = this.makeUploadEpicObject(token, upload.settings);
                        parentEpic = issue;
                        parentStory = null;
                        upload.deleteIssues.push({
                            issue: issue
                        });
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.story.jira')) {
                    issue = this.makeUploadStoryObject(token, upload.settings, parentEpic);
                    parentStory = issue;
                    if (!BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.newIssues.push({
                            issue: issue,
                            parent: parentEpic
                        });
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.delete.story.jira')) {
                    if (BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        issue = this.makeUploadStoryObject(token, upload.settings);
                        parentStory = issue;
                        upload.deleteIssues.push({
                            issue: issue,
                            parent: parentEpic
                        });
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.sub-task.jira') && !BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                    issue = this.makeUploadSubTaskObject(token, upload.settings, (parentStory ? parentStory : parentEpic))
                    upload.newIssues.push({
                        issue: issue,
                        parent: (parentStory ? parentStory : parentEpic)
                    });
                } else if (BreakdownParse.rowHasScope(token, 'issue.delete.sub-task.jira')) {
                    if (BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        issue = this.makeUploadSubTaskObject(token, upload.settings, (parentStory ? parentStory : parentEpic))
                        upload.deleteIssues.push({
                            issue: issue,
                            parent: (parentStory ? parentStory : parentEpic)
                        });
                    }
                }
            });
        },


        maintainParent(uploadIssue, settings) {
            let issue = uploadIssue.issue;
            if (BreakdownUtils.isStoryType(issue, settings)) {
                this.maintainEpicLink(issue, uploadIssue.parent, settings);
            } else if (BreakdownUtils.isSubTaskType(issue, settings)) {
                this.maintainParentLink(issue, uploadIssue.parent, settings);
            }
        },

        deleteIssue(deleteIssue, settings, credentials) {
            let issue = deleteIssue.issue;
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

        pushIssue(uploadIssue, settings, credentials) {

            this.maintainParent(uploadIssue, settings);
            let issue = uploadIssue.issue;
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
            let total = upload.newIssues.length + upload.deleteIssues.length;
            return upload.newIssues.reduce((series, uploadIssue, count) => {
                    return series.then(() => {
                        BreakdownStatus.setStatus('Pushing to JIRA ' + BreakdownStringify.stringifyProgress(count, total));
                        return this.pushIssue(uploadIssue, upload.settings, credentials)
                    });
                }, Promise.resolve())
                .then(() => {
                    return upload.deleteIssues.reduce((series, deleteIssue, count) => {
                        return series.then(() => {
                            BreakdownStatus.setStatus('Pushing to JIRA ' + BreakdownStringify.stringifyProgress(upload.newIssues.length + count, total));
                            return this.deleteIssue(deleteIssue, upload.settings, credentials)
                        });
                    }, Promise.resolve())
                });
        },

        pushToJIRA(upload, credentials) {
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
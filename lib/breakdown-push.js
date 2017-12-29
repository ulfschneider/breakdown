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
            let epic = this.makeUploadIssueObject(token, settings);
            BreakdownUtils.setIssueType(epic, settings.epicType);
            let points = BreakdownParse.parsePoints(token);
            BreakdownUtils.setStoryPoints(epic, points, settings);
            return epic;
        },

        makeUploadStoryObject(token, settings, parentIssue) {
            let story = this.makeUploadIssueObject(token, settings);
            BreakdownUtils.setIssueType(story, settings.storyType);
            let points = BreakdownParse.parsePoints(token);
            BreakdownUtils.setStoryPoints(story, points, settings);
            if (parentIssue && parentIssue.key) {
                BreakdownUtils.setEpicLink(story, parentIssue.key, settings);
            }
            return story;
        },

        makeUploadSubTaskObject(token, settings, parentIssue) {
            let subTask = this.makeUploadIssueObject(token, settings);
            BreakdownUtils.setIssueType(subTask, settings.subTaskType);
            if (parentIssue && parentIssue.key) {
                BreakdownUtils.setParentKey(subTask, parentIssue.key);
            }

            return subTask;
        },



        makeUploadDataStructure(upload) {
            upload.newIssues = [];

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
                } else if (BreakdownParse.rowHasScope(token, 'issue.story.jira')) {
                    issue = this.makeUploadStoryObject(token, upload.settings, parentEpic);
                    parentStory = issue;
                    if (!BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.newIssues.push({
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
                }
            });

            console.log(JSON.stringify(upload));
        },

        pushIssue(issue, settings, credentials) {

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

            return upload.newIssues.reduce((series, newIssue) => {
                return series.then(() => {
                    return this.pushIssue(newIssue.issue, upload.settings, credentials)
                });
            }, Promise.resolve());
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
'use babel';

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
                fields: {
                    project: {
                        key: settings.project
                    },
                    summary: BreakdownParse.parseSummary(token),
                }
            };

            let assignee = BreakdownParse.parseAssignee(token);
            let fixVersion = BreakdownParse.parseFixVersion(token);

            if (assignee) {
                issue.fields.assignee = assignee;
            }
            if (fixVersion) {
                let split = fixVersion.split(',');
                let versions = [];
                for (let version of split) {
                    versions.push({
                        name: version
                    });
                }
                issue.fields.fixVersions = versions;
            }

            return issue;
        },

        makeUploadEpicObject(token, settings) {
            let epic = this.makeUploadIssueObject(token, settings);
            epic.fields.issuetype = {
                name: settings.epicType
            };
            let points = BreakdownParse.parsePoints(token);
            if (points) {
                epic.fields[settings.storyPointsFieldName] = points;
            }
            return epic;
        },

        makeUploadStoryObject(token, settings) {
            let story = this.makeUploadIssueObject(token, settings);
            story.fields.issuetype = {
                name: settings.storyType
            };
            let points = BreakdownParse.parsePoints(token);
            if (points) {
                story.fields[settings.storyPointsFieldName] = points;
            }
            //TODO assign epic link
            return story;
        },

        makeUploadSubTaskObject(token, settings) {
            let subTask = this.makeUploadIssueObject(token, settings);
            subTask.fields.issuetype = {
                name: settings.subTaskType
            };

            //TODO assign parent link
            return subTask;
        },

        makeUploadDataStructure(upload) {
            upload.newIssues = [];

            const editor = atom.workspace.getActiveTextEditor();
            const grammar = editor.getGrammar();
            const tokens = grammar.tokenizeLines(editor.getText());

            tokens.forEach((token, rowCount) => {
                if (BreakdownParse.rowHasScope(token, 'issue.epic.jira') && !BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                    upload.newIssues.push(this.makeUploadEpicObject(token, upload.settings));
                } else if (BreakdownParse.rowHasScope(token, 'issue.story.jira') && !BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                    upload.newIssues.push(this.makeUploadStoryObject(token, upload.settings));
                } else if (BreakdownParse.rowHasScope(token, 'issue.sub-task.jira') && !BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                    upload.newIssues.push(this.makeUploadSubTaskObject(token, upload.settings));
                }
            });

            console.log(JSON.stringify(upload));
        },

        pushIssue(uploadIssue, settings, credentials) {

            let options = BreakdownRequest.prepareOptions({
                method: 'POST',
                url: settings.jiraUrl + '/rest/api/2/issue/',
                body: uploadIssue,
                json: true
            }, settings, credentials);
            return BreakdownRequest.request(options)
                .then((body) => {
                    //TODO post succeed
                }).catch((error) => {
                    //TODO failure in post
                });
        },

        pushToJIRA(upload, credentials) {
            BreakdownStatus.setStatus('Pushing to JIRA');
            console.log('Pushing to JIRA url=[' + upload.settings.jiraUrl + '] project=[' + upload.settings.project + ']');
            atom.notifications.addInfo('Pushing to JIRA\n\nurl: ' + upload.settings.jiraUrl + '\n\nproject: ' + upload.settings.project);

            return BreakdownPull.pullCustomFieldNames(upload.settings, credentials)
                .then(() => {
                    BreakdownPush.makeUploadDataStructure(upload);
                }).catch((error) => {
                    BreakdownStatus.clear();
                    let rootCause = BreakdownUtils.stringifyError(error);
                    console.log('Data could not be prepared for pushing to JIRA' + (rootCause ? ' - ' + rootCause : ''));
                    atom.notifications.addWarning('Data could not be prepared for pushing to JIRA' + (rootCause ? ' - ' + rootCause : ''), {
                        dismissable: true
                    });
                });
        }
    }
})();
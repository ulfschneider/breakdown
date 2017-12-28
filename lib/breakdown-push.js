'use babel';

import BreakdownParse from './breakdown-parse';
import _ from 'underscore';

export default BreakdownPush = (function() {

    return {

        validatePushSettings(settings) {
            let valid = true;
            if (!settings.jiraUrl) {
                console.log('No JIRA URL specified');
                atom.notifications.addError('Please specify your JIRA URL. Refer to the https://atom.io/packages/breakdown package in case of questions.', {
                    dismissable: true
                });
                valid = false;
            }
            if (!settings.project) {
                console.log('No JIRA project specified');
                atom.notifications.addError('Please specify the JIRA project you want to create new issues in. Refer to the https://atom.io/packages/breakdown package in case of questions.', {
                    dismissable: true
                });
                valid = false;
            }
            return valid;
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
            if (points && settings.storyPointsFieldName) {
                epic.fields[settings.storyPointsFieldName] = points;
            } else if (points) {
                epic.fields['storyPoints'] = points;
            }
            return epic;
        },

        makeUploadStoryObject(token, settings) {
            let story = this.makeUploadIssueObject(token, settings);
            story.fields.issuetype = {
                name: settings.storyType
            };
            let points = BreakdownParse.parsePoints(token);
            if (points && settings.storyPointsFieldName) {
                story.fields[settings.storyPointsFieldName] = points;
            } else if (points) {
                story.fields['storyPoints'] = points;
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

        mapKeys(uploadIssue, settings) {
            if (settings.storyPointsFieldName) {
                if (!_.isUndefined(uploadIssue.fields['storyPoints'])) {
                    uploadIssue.fields[settings.storyPointsFieldName] = uploadIssue.fields['storyPoints']
                }
                delete uploadIssue.fields['storyPoints'];

            }
            if (settings.epicLinkFieldName) {
                if (!_.isUndefined(uploadIssue.fields['epicLink'])) {
                    uploadIssue.fields[settings.epicLinkFieldName] = uploadIssue.fields['epicLink']
                }
                delete uploadIssue.fields['epicLink'];
            }
        },

        pushIssue(uploadIssue, settings, credentials) {
            this.mapKeys(uploadIssue, settings);
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

        pushIssues(upload, credentials) {

        }
    }
})();
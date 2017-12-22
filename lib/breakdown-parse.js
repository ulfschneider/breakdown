'use babel';

import BreakdownUtils from './breakdown-util';
import _ from 'underscore';

export default BreakdownParse = (function() {
    return {
        isBreakdownGrammar() {
            const editor = atom.workspace.getActiveTextEditor();
            if (editor) {
                const grammar = editor.getGrammar();
                const language = grammar.name;
                return language == 'JIRA Breakdown';
            }
            return false;
        },

        rowHasScope(tokens, scope) {
            return _.find(tokens, (t) => {
                return this.tokenHasScope(t, scope);
            });
        },

        rowGetValue(tokens) {
            return BreakdownUtils.concatString(_.pluck(tokens, 'value'), '');
        },

        rowGetValueForScope(tokens, scope) {
            let token = _.find(tokens, (t) => {
                return this.tokenHasScope(t, scope);
            });
            return token ? BreakdownUtils.trim(token.value) : null;
        },

        rowGetValueForScopes(tokens, scopes) {
            let token = _.find(tokens, (t) => {
                let hasScopes = true;
                scopes.forEach((s) => {
                    if (!this.tokenHasScope(t, s)) {
                        return hasScopes = false;;
                    }
                });
                return hasScopes;
            });
            return token ? BreakdownUtils.trim(token.value) : null;
        },

        rowGetValuesForScope(tokens, scope) {
            let filteredTokens = _.filter(tokens, (t) => {
                return this.tokenHasScope(t, scope);
            });

            return _.pluck(filteredTokens, 'value');
        },

        tokenHasScope(token, scope) {
            return _.indexOf(token.scopes, scope) > -1;
        },

        readSettings(settings) {
            if (this.isBreakdownGrammar()) {
                const editor = atom.workspace.getActiveTextEditor();
                const grammar = editor.getGrammar();
                const tokens = grammar.tokenizeLines(editor.getText());
                let hasUrl = false;
                settings.query = '';
                settings.fields = [];
                settings.project = ''

                tokens.forEach((token, row) => {
                    if (BreakdownParse.rowHasScope(token, 'settings.jira-url.jira') && BreakdownParse.rowHasScope(token, 'settings.value.jira')) {
                        hasUrl = true;
                        let jiraUrl = BreakdownUtils
                            .trimTrailingSlash(BreakdownParse.rowGetValueForScope(token, 'settings.value.jira'));
                        if (BreakdownUtils.isDifferentUrl(jiraUrl, settings.jiraUrl)) {
                            settings.askForCredentials = true;
                        }
                        settings.jiraUrl = jiraUrl;
                    } else if (BreakdownParse.rowHasScope(token, 'settings.query.jira') && BreakdownParse.rowHasScope(token, 'settings.value.jira')) {
                        settings.query = BreakdownParse.rowGetValueForScope(token, 'settings.value.jira');
                    } else if (BreakdownParse.rowHasScope(token, 'settings.project.jira') && BreakdownParse.rowHasScope(token, 'settings.value.jira')) {
                        settings.project = BreakdownParse.rowGetValueForScope(token, 'settings.value.jira')
                            .toUpperCase();
                    } else if (BreakdownParse.rowHasScope(token, 'settings.fields.jira')) {
                        settings.fields = BreakdownParse.rowGetValuesForScope(token, 'settings.value.jira');
                    }
                });
                if (!hasUrl) {
                    settings.jiraUrl = '';
                }
            }
        },

        parseJIRAContent(upload) {
            this.makeUploadDataStructure(upload);
        },


        makeIssueObject(token, settings) {
            let issue = {
                fields: {
                    project: {
                        key: settings.project
                    },
                    summary: this.parseSummary(token),
                }
            };

            let assignee = this.parseAssignee(token);
            let fixVersion = this.parseFixVersion(token);

            if (assignee) {
                issue.fields.assignee = assignee;
            }
            if (fixVersion) {
                issue.fields.fixVersions = fixVersion;
            }

            return issue;
        },

        makeEpicObject(token, settings) {
            let epic = this.makeIssueObject(token, settings);
            epic.fields.issuetype = settings.epicType;
            let points = this.parsePoints(token);
            if (points) {
                epic.fields[settings.storyPointsFieldName] = points;
            }
            return epic;
        },

        makeStoryObject(token, settings) {
            let story = this.makeIssueObject(token, settings);
            story.fields.issuetype = settings.storyType;
            let points = this.parsePoints(token);
            if (points) {
                story.fields[settings.storyPointsFieldName] = points;
            }

            //TODO assign epic link
            return story;
        },

        makeSubTaskObject(token, settings) {
            let subTask = this.makeIssueObject(token, settings);
            subTask.fields.issuetype = settings.subTaskType;

            //TODO assign parent link
            return subTask;
        },

        parseSummary(token) {
            return this.rowGetValueForScope(token, 'issue.summary.jira');
        },

        parseAssignee(token) {
            return this.rowGetValueForScopes(token, ['issue.assignee.jira', 'issue.field.value.jira']);
        },

        parseFixVersion(token) {
            return this.rowGetValueForScopes(token, ['issue.fixversion.jira', 'issue.field.value.jira']);
        },

        parsePoints(token) {
            return this.rowGetValueForScopes(token, ['issue.points.jira', 'issue.field.value.jira']);
        },

        makeUploadDataStructure(upload) {
            upload.newIssues = [];

            const editor = atom.workspace.getActiveTextEditor();
            const grammar = editor.getGrammar();
            const tokens = grammar.tokenizeLines(editor.getText());

            tokens.forEach((token, row) => {
                if (BreakdownParse.rowHasScope(token, 'issue.epic.jira') && !BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                    upload.newIssues.push(this.makeEpicObject(token, upload.settings));
                } else if (BreakdownParse.rowHasScope(token, 'issue.story.jira') && !BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                    upload.newIssues.push(this.makeStoryObject(token, upload.settings));
                } else if (BreakdownParse.rowHasScope(token, 'issue.sub-task.jira') && !BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                    upload.newIssues.push(this.makeSubTaskObject(token, upload.settings));
                }
            });

            console.log(JSON.stringify(upload));
        }
    }
})();
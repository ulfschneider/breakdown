'use babel';

import BreakdownUtil from './breakdown-util';
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
            return _.find(tokens, t => {
                return this.tokenHasScope(t, scope);
            });
        },

        rowGetValue(tokens) {
            return BreakdownUtil.concatString(_.pluck(tokens, 'value'), '');
        },

        rowGetValueForScope(tokens, scope) {
            let token = _.find(tokens, t => {
                return this.tokenHasScope(t, scope);
            });
            return token ? BreakdownUtil.trim(token.value) : null;
        },

        rowGetValueForScopes(tokens, scopes) {
            let token = _.find(tokens, t => {
                let hasScopes = true;
                scopes.forEach(s => {
                    if (!this.tokenHasScope(t, s)) {
                        return hasScopes = false;;
                    }
                });
                return hasScopes;
            });
            return token ? BreakdownUtil.trim(token.value) : null;
        },

        rowGetValuesForScope(tokens, scope) {
            let filteredTokens = _.filter(tokens, t => {
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
                        let jiraUrl = BreakdownUtil
                            .trimTrailingSlash(BreakdownParse.rowGetValueForScope(token, 'settings.value.jira'));
                        if (BreakdownUtil.isDifferentUrl(jiraUrl, settings.jiraUrl)) {
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

        parseKey(token) {
            return this.rowGetValueForScope(token, 'issue.key.jira');
        },

        parseSummary(token) {
            return this.rowGetValueForScope(token, 'issue.summary.jira');
        },

        parseStatus(token) {
            return this.rowGetValueForScopes(token, ['issue.status.jira', 'issue.field.value.jira']);
        },

        parseAssignee(token) {
            return this.rowGetValueForScopes(token, ['issue.assignee.jira', 'issue.field.value.jira']);
        },

        parseFixVersion(token) {
            return this.rowGetValueForScopes(token, ['issue.fixversion.jira', 'issue.field.value.jira']);
        },

        parsePoints(token) {
            let pointParse = this.rowGetValueForScopes(token, ['issue.points.jira', 'issue.field.value.jira']);
            let points = parseInt(pointParse);
            return _.isNaN(points) ? '' : points;
        }
    }
})();
'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownEnvironment from './breakdown-environment';
import _ from 'underscore';

export default BreakdownParse = (function() {
    return {
        rowHasScope(tokens, scope) {
            return _.find(tokens, t => {
                return this.tokenHasScope(t, scope);
            });
        },

        rowGetValue(tokens) {
            return BreakdownUtil.concat(_.pluck(tokens, 'value'), '');
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
                for (let s of scopes) {
                    if (!this.tokenHasScope(t, s)) {
                        hasScopes = false;
                        break;
                    }
                }
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

        tokenCountScopes(token) {
            return token.scopes.length;
        },

        readSettings() {
            let settings = BreakdownEnvironment.getSettings();

            if (BreakdownEnvironment.getEditor()) {
                let tokens = BreakdownEnvironment.tokenizeLines();
                let hasUrl = false;
                settings.query = '';
                settings.options = [];
                settings.project = '';
                settings.fixversion = '';
                settings.points = '';

                tokens.forEach((token, row) => {
                    if (BreakdownParse.rowHasScope(token, 'settings.jira-url.jira') && BreakdownParse.rowHasScope(token, 'settings.value.jira')) {
                        hasUrl = true;
                        let jiraUrl = BreakdownUtil
                            .trimTrailingSlash(BreakdownParse.rowGetValueForScope(token, 'settings.value.jira'));
                        if (BreakdownUtil.isDifferentUrl(jiraUrl, settings.jiraUrl)) {
                            BreakdownEnvironment.clearCredentials();
                        }
                        settings.jiraUrl = jiraUrl;
                    } else if (BreakdownParse.rowHasScope(token, 'settings.query.jira') && BreakdownParse.rowHasScope(token, 'settings.value.jira')) {
                        settings.query = BreakdownParse.rowGetValueForScope(token, 'settings.value.jira');
                    } else if (BreakdownParse.rowHasScope(token, 'settings.project.jira') && BreakdownParse.rowHasScope(token, 'settings.value.jira')) {
                        settings.project = BreakdownParse.rowGetValueForScope(token, 'settings.value.jira')
                            .toUpperCase();
                    } else if (BreakdownParse.rowHasScope(token, 'settings.fixversion.jira')) {
                        settings.fixversion = BreakdownParse.rowGetValueForScope(token, 'settings.value.jira');
                    } else if (BreakdownParse.rowHasScope(token, 'settings.points.jira')) {
                        settings.points = BreakdownParse.rowGetValueForScope(token, 'settings.value.jira');
                    } else if (BreakdownParse.rowHasScope(token, 'settings.options.jira')) {
                        settings.options = BreakdownParse.rowGetValuesForScope(token, 'settings.value.jira');
                        settings.options = _.map(settings.options, option => {
                            return option.toLowerCase();
                        });
                    }
                });
                if (!hasUrl) {
                    settings.jiraUrl = atom.config.get('breakdown.jiraUrl');
                    BreakdownEnvironment.clearCredentials();
                }
                if (BreakdownUtil.isFalsyOrEmpty(_.intersection(settings.options, BreakdownUtil.PUSH_GUARDS))) {
                    settings.options = settings.options.concat(BreakdownUtil.DEFAULT_PUSH_GUARDS);
                }
                if (!settings.points) {
                    settings.points = atom.config.get('breakdown.defaultStoryPoints');
                }
            }
        },

        parseKey(token) {
            return this.rowGetValueForScope(token, 'issue.key.jira');
        },

        parseSummary(token) {
            return BreakdownUtil.trim(BreakdownUtil.concat(this.rowGetValuesForScope(token, 'issue.summary.jira'), ' '));
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

        parseComponent(token) {
            return this.rowGetValueForScopes(token, ['issue.components.jira', 'issue.field.value.jira']);
        },

        parsePoints(token) {
            return BreakdownUtil.parseInteger(this.parsePointsText(token));
        },

        parsePointsText(token) {
            return this.rowGetValueForScopes(token, ['issue.points.jira', 'issue.field.value.jira']);
        },

        parseFields(token) {
            return BreakdownUtil.concat(this.rowGetValuesForScope(token, 'issue.fields.jira'), '');
        }
    };
})();
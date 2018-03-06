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
                settings.fromDate = '';
                settings.toDate = '';

                tokens.forEach((token, row) => {
                    if (BreakdownParse.rowHasScope(token, 'settings.jira-url.bkdn') && BreakdownParse.rowHasScope(token, 'settings.value.bkdn')) {
                        hasUrl = true;
                        let jiraUrl = BreakdownUtil
                            .trimTrailingSlash(BreakdownParse.rowGetValueForScope(token, 'settings.value.bkdn'));
                        if (BreakdownUtil.isDifferentUrl(jiraUrl, settings.jiraUrl)) {
                            BreakdownEnvironment.clearCredentials();
                        }
                        settings.jiraUrl = jiraUrl;
                    } else if (BreakdownParse.rowHasScope(token, 'settings.query.bkdn') && BreakdownParse.rowHasScope(token, 'settings.value.bkdn')) {
                        settings.query = BreakdownParse.rowGetValueForScope(token, 'settings.value.bkdn');
                    } else if (BreakdownParse.rowHasScope(token, 'settings.project.bkdn') && BreakdownParse.rowHasScope(token, 'settings.value.bkdn')) {
                        settings.project = BreakdownParse.rowGetValueForScope(token, 'settings.value.bkdn')
                            .toUpperCase();
                    } else if (BreakdownParse.rowHasScope(token, 'settings.fixversion.bkdn')) {
                        settings.fixversion = BreakdownParse.rowGetValueForScope(token, 'settings.value.bkdn');
                    } else if (BreakdownParse.rowHasScope(token, 'settings.points.bkdn')) {
                        settings.points = BreakdownParse.rowGetValueForScope(token, 'settings.value.bkdn');
                    } else if (BreakdownParse.rowHasScope(token, 'settings.from-date.bkdn')) {
                        settings.fromDate = BreakdownParse.rowGetValueForScope(token, 'settings.value.bkdn');
                        settings.fromDate = BreakdownUtil.parseDate(settings.fromDate);
                    } else if (BreakdownParse.rowHasScope(token, 'settings.to-date.bkdn')) {
                        settings.toDate = BreakdownParse.rowGetValueForScope(token, 'settings.value.bkdn');
                        settings.toDate = BreakdownUtil.parseDate(settings.toDate);
                        if (settings.toDate) {
                            settings.toDate = settings.toDate.endOf('day');
                        }
                    } else if (BreakdownParse.rowHasScope(token, 'settings.options.bkdn')) {
                        settings.options = BreakdownParse.rowGetValuesForScope(token, 'settings.value.bkdn');
                        settings.options = _.map(settings.options, option => {
                            return option.toLowerCase();
                        });
                    }
                });
                if (!hasUrl) {
                    settings.jiraUrl = atom.config.get('breakdown.jiraUrl');
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
            return this.rowGetValueForScope(token, 'issue.key.bkdn');
        },

        parseSummary(token) {
            return BreakdownUtil.trim(BreakdownUtil.concat(this.rowGetValuesForScope(token, 'issue.summary.bkdn'), ' '));
        },

        parseStatus(token) {
            return this.rowGetValueForScopes(token, ['issue.status.bkdn', 'issue.field.value.bkdn']);
        },

        parseAssignee(token) {
            return this.rowGetValueForScopes(token, ['issue.assignee.bkdn', 'issue.field.value.bkdn']);
        },

        parseFixVersion(token) {
            return this.rowGetValueForScopes(token, ['issue.fixversion.bkdn', 'issue.field.value.bkdn']);
        },

        parseComponent(token) {
            return this.rowGetValueForScopes(token, ['issue.components.bkdn', 'issue.field.value.bkdn']);
        },

        parsePoints(token) {
            return BreakdownUtil.parseInteger(this.parsePointsText(token));
        },

        parsePointsText(token) {
            return this.rowGetValueForScopes(token, ['issue.points.bkdn', 'issue.field.value.bkdn']);
        },

        parseFields(token) {
            return BreakdownUtil.concat(this.rowGetValuesForScope(token, 'issue.fields.bkdn'), '');
        }
    };
})();
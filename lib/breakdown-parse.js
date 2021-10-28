'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownEnvironment from './breakdown-environment';
import _ from 'underscore';

export default BreakdownParse = (function () {
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
            let filteredTokens = this.rowGetTokensForScope(tokens, scope);
            return _.pluck(filteredTokens, 'value');
        },

        rowGetTokensForScope(tokens, scope) {
            return _.filter(tokens, t => {
                return this.tokenHasScope(t, scope);
            });
        },

        tokenHasScope(token, scope) {
            return _.indexOf(token.scopes, scope) > -1;
        },

        tokenCountScopes(token) {
            return token.scopes.length;
        },

        readSettings() {
            let settings = BreakdownEnvironment.getSettings();

            if (!BreakdownEnvironment.isHandlingDifferentEditors()) {
                let tokens = BreakdownEnvironment.tokenizeLines();
                let hasUrl = false;
                settings.query = '';
                settings.options = [];
                settings.project = '';
                settings.fixversion = '';
                settings.points = '';

                tokens.forEach((token, row) => {
                    if (this.rowHasScope(token, 'settings.jira-url.bkdn') && this.rowHasScope(token, 'settings.value.bkdn')) {
                        hasUrl = true;
                        let jiraUrl = BreakdownUtil
                            .trimTrailingSlash(this.rowGetValueForScope(token, 'settings.value.bkdn'));
                        if (BreakdownUtil.isDifferentUrl(jiraUrl, settings.jiraUrl)) {
                            BreakdownEnvironment.clearCredentials();
                        }
                        settings.jiraUrl = jiraUrl;
                    } else if (this.rowHasScope(token, 'settings.query.bkdn') && this.rowHasScope(token, 'settings.value.bkdn')) {
                        settings.query = this.rowGetValueForScope(token, 'settings.value.bkdn');
                    } else if (this.rowHasScope(token, 'settings.project.bkdn') && this.rowHasScope(token, 'settings.value.bkdn')) {
                        settings.project = this.rowGetValueForScope(token, 'settings.value.bkdn')
                            .toUpperCase();
                    } else if (this.rowHasScope(token, 'settings.fixversion.bkdn')) {
                        settings.fixversion = this.rowGetValueForScope(token, 'settings.value.bkdn');
                    } else if (this.rowHasScope(token, 'settings.points.bkdn')) {
                        settings.points = this.rowGetValueForScope(token, 'settings.value.bkdn');
                    } else if (this.rowHasScope(token, 'settings.options.bkdn')) {
                        settings.options = this.rowGetValuesForScope(token, 'settings.value.bkdn');
                        settings.options = _.map(settings.options, option => {
                            return option.toLowerCase();
                        });
                    }
                });
                if (!hasUrl) {
                    settings.jiraUrl = atom.config.get(BreakdownUtil.BREAKDOWN_PACKAGE_NAME + '.jiraUrl');
                }
                if (BreakdownUtil.isFalsyOrEmpty(_.intersection(settings.options, BreakdownUtil.PUSH_GUARDS))) {
                    settings.options = settings.options.concat(BreakdownUtil.DEFAULT_PUSH_GUARDS);
                }
                if (!settings.points) {
                    settings.points = atom.config.get(BreakdownUtil.BREAKDOWN_PACKAGE_NAME + '.defaultStoryPoints');
                }
            }
        },

        parseKey(token) {
            return this.rowGetValueForScope(token, 'issue.key.bkdn');
        },

        parseSummary(token) {
            return BreakdownUtil.trim(BreakdownUtil.concat(this.rowGetValuesForScope(token, 'issue.summary.bkdn'), ' '));
        },

        parseDescription(token) {
            return this.rowGetValueForScope(token, 'description.value.bkdn');
        },

        parseStatus(token) {
            return this.rowGetValueForScopes(token, ['issue.status.bkdn', 'issue.field.value.bkdn']);
        },

        parseOriginalEstimate(token) {
            return this.rowGetValueForScopes(token, ['issue.origestimate.bkdn', 'issue.field.value.bkdn']);
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
        },

        parseMarkers(token) {
            let markerValues = this.rowGetValuesForScope(token, 'marker.full.bkdn');
            let markers = _.map(markerValues, markerValue => {
                let delPos = markerValue.indexOf(':');
                return {
                    date: BreakdownUtil.parseDate(markerValue.substring(0, delPos)),
                    label: BreakdownUtil.trim(markerValue.substring(delPos + 1))
                }
            });
            markerValues = this.rowGetValuesForScope(token, 'marker.date.bkdn');
            markers = markers.concat(_.map(markerValues, marker => {
                return {
                    date: BreakdownUtil.parseDate(marker)
                }
            }));
            return markers;
        }
    };
})();
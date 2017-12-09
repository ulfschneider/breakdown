'use babel';

import BreakdownUtils from './breakdown-util';
import _ from 'underscore';

export default BreakdownParse = (function() {
    return {
        rowHasScope(tokens, scope) {
            return _.find(tokens, (t) => {
                return this.tokenHasScope(t, scope);
            });
        },

        rowGetValueForScope(tokens, scope) {
            let token = _.find(tokens, (t) => {
                return this.tokenHasScope(t, scope);
            });
            return token ? token.value : null;
        },

        tokenHasScope(token, scope) {
            return _.indexOf(token.scopes, scope) > -1;
        },

        readSettings(settings) {
            let editor = atom.workspace.getActiveTextEditor();
            let buffer = editor.getBuffer();
            let grammar = editor.getGrammar();
            let tokens = grammar.tokenizeLines(editor.getText());

            tokens.forEach((token, row) => {
                if (BreakdownParse.rowHasScope(token, 'settings.jira-url.jira') && BreakdownParse.rowHasScope(token, 'settings.value.jira')) {
                    let jiraUrl = BreakdownUtils
                        .trimTrailingSlash(BreakdownParse.rowGetValueForScope(token, 'settings.value.jira'));
                    if (BreakdownUtils.isDifferentUrl(jiraUrl, settings.jiraUrl)) {
                        settings.askForCredentials = true;
                    }
                    settings.jiraUrl = jiraUrl;
                } else if (BreakdownParse.rowHasScope(token, 'settings.query.jira') && BreakdownParse.rowHasScope(token, 'settings.value.jira')) {
                    settings.query = BreakdownParse.rowGetValueForScope(token, 'settings.value.jira')
                        .trim();
                }
            });
        },
    }
})();
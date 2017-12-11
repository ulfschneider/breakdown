'use babel';

import BreakdownUtils from './breakdown-util';
import BreakdownParse from './breakdown-parse';


export default BreakdownBeautify = (function() {
    return {
        beautify(settings) {
            if (BreakdownParse.isBreakdownGrammar()) {
                let text = '';
                let editor = atom.workspace.getActiveTextEditor();
                let buffer = editor.getBuffer();
                let cursorPosition = editor.getCursorScreenPosition();
                let grammar = editor.getGrammar();
                let tokens = grammar.tokenizeLines(editor.getText());

                tokens.forEach((token, row) => {
                    if (BreakdownParse.rowHasScope(token, 'issue.epic.jira') ||
                        BreakdownParse.rowHasScope(token, 'issue.story.jira') ||
                        BreakdownParse.rowHasScope(token, 'issue.sub-task.jira') ||
                        BreakdownParse.rowHasScope(token, 'settings.jira')) {
                        text += this.beautifyRow(token, settings);
                        text += '\n';
                    } else {
                        text += BreakdownParse.rowGetValue(token);
                        text += '\n';
                    }
                });

                buffer.setTextViaDiff(text);
                editor.setCursorScreenPosition(cursorPosition);
            }
        },

        beautifyRow(token, settings) {
            let row = '';
            let len = token.length;
            token.forEach((t, i) => {
                let value = t.value.trim();
                if (BreakdownParse.tokenHasScope(t, 'issue.type.epic.jira')) {
                    row += settings.epicType;
                } else if (BreakdownParse.tokenHasScope(t, 'issue.type.story.jira')) {
                    row += '\t';
                    row += settings.storyType;
                } else if (BreakdownParse.tokenHasScope(t, 'issue.type.sub-task.jira')) {
                    row += '\t\t';
                    row += settings.subTaskType;
                } else if (BreakdownParse.tokenHasScope(t, 'settings.jira-url.jira') && BreakdownParse.tokenHasScope(t, 'settings.value.jira')) {
                    row += settings.jiraUrl;
                } else if (BreakdownParse.tokenHasScope(t, 'settings.query.jira') && BreakdownParse.tokenHasScope(t, 'settings.value.jira')) {
                    row += settings.query;
                } else if (BreakdownParse.tokenHasScope(t, 'settings.fields.jira') && !BreakdownParse.tokenHasScope(t, 'settings.value.jira') &&
                    !BreakdownParse.tokenHasScope(t, 'settings.key.jira') &&
                    !BreakdownParse.tokenHasScope(t, 'settings.punctuation.separator.key-value.jira')) {
                    return; //do nothing
                } else {
                    row += value;
                }
                if (i < len - 1 && value &&
                    !(BreakdownParse.tokenHasScope(t, 'settings.key.jira') ||
                        BreakdownParse.tokenHasScope(t, 'issue.field.identifier.jira'))) {
                    row += ' ';
                }
            });
            return row;
        }


    }
})();
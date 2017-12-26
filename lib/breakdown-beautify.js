'use babel';

import BreakdownUtils from './breakdown-util';
import BreakdownParse from './breakdown-parse';


export default BreakdownBeautify = (function() {
    return {
        beautify(settings) {
            if (BreakdownParse.isBreakdownGrammar()) {
                const editor = atom.workspace.getActiveTextEditor();
                const buffer = editor.getBuffer();
                const grammar = editor.getGrammar();
                const tokens = grammar.tokenizeLines(editor.getText());

                let text = '';
                editor.unfoldAll();
                tokens.forEach((token, rowCount) => {
                    if (BreakdownParse.rowHasScope(token, 'issue.no-epic.jira') ||
                        BreakdownParse.rowHasScope(token, 'issue.epic.jira') ||
                        BreakdownParse.rowHasScope(token, 'issue.resolved.epic.jira') ||
                        BreakdownParse.rowHasScope(token, 'issue.story.jira') ||
                        BreakdownParse.rowHasScope(token, 'issue.resolved.story.jira') ||
                        BreakdownParse.rowHasScope(token, 'issue.sub-task.jira') ||
                        BreakdownParse.rowHasScope(token, 'issue.resolved.sub-task.jira') ||
                        BreakdownParse.rowHasScope(token, 'settings.jira')) {

                        text += this.beautifyRow(token, rowCount, settings);
                        text += '\n';
                    } else {
                        text += BreakdownParse.rowGetValue(token);
                        text += '\n';
                    }
                });

                buffer.setTextViaDiff(text);
            }
        },

        calcSettingsValueIndent(settings) {
            if (settings.project) {
                return 8;
            } else if (settings.fields) {
                return 7;
            } else {
                return 6;
            }
        },

        beautifyRow(token, rowCount, settings) {
            let row = '';
            let len = token.length;

            let issueType = '';
            token.forEach((t, i) => {
                let value = t.value.trim();
                if (BreakdownParse.tokenHasScope(t, 'issue.resolved.jira')) {
                    row += 'Resolved';
                } else if (BreakdownParse.tokenHasScope(t, 'issue.no-epic.jira')) {
                    row += 'NO EPIC IN SELECTION'
                } else if (BreakdownParse.tokenHasScope(t, 'issue.type.epic.jira')) {
                    row += settings.epicType;
                    issueType = settings.epicType;
                } else if (BreakdownParse.tokenHasScope(t, 'issue.type.story.jira')) {
                    row = '\t' + row;
                    row += settings.storyType;
                    issueType = settings.storyType;
                } else if (BreakdownParse.tokenHasScope(t, 'issue.type.sub-task.jira')) {
                    row = '\t\t' + row;
                    row += settings.subTaskType;
                    issueType = settings.subTaskType;
                } else if (BreakdownParse.tokenHasScope(t, 'settings.jira-url.jira') && BreakdownParse.tokenHasScope(t, 'settings.value.jira')) {
                    row += settings.jiraUrl;
                } else if (BreakdownParse.tokenHasScope(t, 'settings.query.jira') && BreakdownParse.tokenHasScope(t, 'settings.value.jira')) {
                    row += settings.query;
                } else if (BreakdownParse.tokenHasScope(t, 'settings.fields.jira') && !BreakdownParse.tokenHasScope(t, 'settings.value.jira') &&
                    !BreakdownParse.tokenHasScope(t, 'settings.key.jira') &&
                    !BreakdownParse.tokenHasScope(t, 'settings.punctuation.separator.key-value.jira')) {
                    return; //do nothing
                } else if (BreakdownParse.tokenHasScope(t, 'issue.status.jira') && BreakdownParse.tokenHasScope(t, 'issue.field.value.jira')) {
                    row += value;
                } else if (BreakdownParse.tokenHasScope(t, 'settings.project.jira') && BreakdownParse.tokenHasScope(t, 'settings.value.jira')) {
                    row += settings.project;
                } else if (BreakdownParse.tokenHasScope(t, 'settings.punctuation.separator.key-value.jira')) {
                    let indent = this.calcSettingsValueIndent(settings);
                    row += value;
                    row = BreakdownUtils.spacePaddingRight(row, indent);
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
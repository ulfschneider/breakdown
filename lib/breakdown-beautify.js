'use babel';

import BreakdownUtil from './breakdown-util';
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
                let cursor = editor.getCursorBufferPosition()
                if (tokens.length) {
                    let lineEnding = BreakdownUtil.getEditorLineEnding();
                    tokens.forEach((token, rowCount) => {
                        if (BreakdownParse.rowHasScope(token, 'issue.no-parent.jira') ||
                            BreakdownParse.rowHasScope(token, 'issue.epic.jira') ||
                            BreakdownParse.rowHasScope(token, 'issue.delete.epic.jira') ||
                            BreakdownParse.rowHasScope(token, 'issue.resolved.epic.jira') ||
                            BreakdownParse.rowHasScope(token, 'issue.story.jira') ||
                            BreakdownParse.rowHasScope(token, 'issue.delete.story.jira') ||
                            BreakdownParse.rowHasScope(token, 'issue.resolved.story.jira') ||
                            BreakdownParse.rowHasScope(token, 'issue.sub-task.jira') ||
                            BreakdownParse.rowHasScope(token, 'issue.delete.sub-task.jira') ||
                            BreakdownParse.rowHasScope(token, 'issue.resolved.sub-task.jira') ||
                            BreakdownParse.rowHasScope(token, 'settings.jira')) {

                            text += this.beautifyRow(token, rowCount, settings);
                        } else {
                            text += BreakdownParse.rowGetValue(token);
                        }
                        if (rowCount < tokens.length - 1) {
                            //do not add an empty line at the end of the text
                            text += lineEnding;
                        }
                    });
                }

                if (buffer.getText() !== text) {
                    //change the editor text only, if there really is a change
                    buffer.setTextViaDiff(text);
                    editor.setCursorBufferPosition(cursor);
                }
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
                if (BreakdownParse.tokenHasScope(t, 'issue.delete.jira')) {
                    row += 'DEL';
                } else if (BreakdownParse.tokenHasScope(t, 'issue.resolved.jira')) {
                    row += 'Resolved';
                } else if (BreakdownParse.tokenHasScope(t, 'issue.no-epic.jira')) {
                    row += value;
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
                    row = BreakdownUtil.spacePaddingRight(row, indent);
                } else {
                    row += value;
                }
                if (i < len - 1 && value &&
                    !(BreakdownParse.tokenHasScope(t, 'settings.key.jira') ||
                        BreakdownParse.tokenHasScope(t, 'issue.field.identifier.jira'))) {
                    row += ' ';
                }
            });
            return row.trimRight();
        }


    }
})();
'use babel';

import BreakdownUtils from './breakdown-util';
import BreakdownParse from './breakdown-parse';


export default BreakdownBeautify = (function() {
    return {
        beautify(settings) {
            let editor = atom.workspace.getActiveTextEditor();
            let buffer = editor.getBuffer();
            let grammar = editor.getGrammar();
            let language = grammar.name;
            let cursorPosition = editor.getCursorScreenPosition();
            if (language == 'JIRA Breakdown') {
                let tokens = grammar.tokenizeLines(editor.getText());

                tokens.forEach((token, row) => {
                    if (BreakdownParse.rowHasScope(token, 'issue.epic.jira')) {
                        this.changeBufferRow(buffer, row, token, settings);
                        editor.setIndentationForBufferRow(row, 0);
                    } else if (BreakdownParse.rowHasScope(token, 'issue.story.jira')) {
                        this.changeBufferRow(buffer, row, token, settings);
                        editor.setIndentationForBufferRow(row, 1);
                    } else if (BreakdownParse.rowHasScope(token, 'issue.sub-task.jira')) {
                        this.changeBufferRow(buffer, row, token, settings);
                        editor.setIndentationForBufferRow(row, 2);
                    } else if (BreakdownParse.rowHasScope(token, 'settings.jira')) {
                        this.changeBufferRow(buffer, row, token, settings);
                        editor.setIndentationForBufferRow(row, 0);
                    }
                })
            }

            editor.setCursorScreenPosition(cursorPosition);
        },

        changeBufferRow(buffer, row, token, settings) {
            let beautifiedLine = this.beautifyRow(token, settings);
            let length = buffer.lineLengthForRow(row);
            let range = [
                [row, 0],
                [row, length]
            ];
            var bufferLine = buffer.getTextInRange(range);
            //replace leading whitespace from bufferLine, as the beautified line
            //also does not have leading whitespace.
            var trimmedLine = bufferLine.replace(/^\s+/g, '');

            if (beautifiedLine !== trimmedLine) {
                //change buffer only, if really something has changed in the
                //beautified line
                buffer.setTextInRange(range, beautifiedLine);
            }
        },

        beautifyRow(token, settings) {
            let row = '';
            let len = token.length;
            token.forEach((t, i) => {
                if (BreakdownParse.tokenHasScope(t, 'issue.type.epic.jira')) {
                    row += settings.epicType;
                } else if (BreakdownParse.tokenHasScope(t, 'issue.type.story.jira')) {
                    row += settings.storyType;
                } else if (BreakdownParse.tokenHasScope(t, 'issue.type.sub-task.jira')) {
                    row += settings.subTaskType;
                } else if (BreakdownParse.tokenHasScope(t, 'settings.jira-url.jira') && BreakdownParse.tokenHasScope(t, 'settings.value.jira')) {
                    row += settings.jiraUrl;
                } else {
                    row += t.value.trim();
                }
                if (i < len - 1 && !BreakdownParse.tokenHasScope(t, 'settings.key.jira')) {
                    row += ' ';
                }
            });
            return row;
        }


    }
})();
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

                        if (BreakdownParse.rowHasScope(token, 'issue.no-parent-in-selection.jira') ||
                            BreakdownParse.rowHasScope(token, 'issue.empty-parent.jira') ||
                            BreakdownParse.rowHasScope(token, 'editable-content.jira') ||
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
            if (settings.fixversion) {
                return 11;
            } else if (settings.project || settings.options) {
                return 8;
            } else {
                return 6;
            }
        },

        beautifyFields(token) {
            let fields = '';

            let status = BreakdownParse.parseStatus(token);
            let assignee = BreakdownParse.parseAssignee(token);
            let points = BreakdownParse.parsePoints(token);
            let version = BreakdownParse.parseFixVersion(token);
            let component = BreakdownParse.parseComponent(token);
            fields = '(';
            fields += status ? 's:' + status + ' ' : '';
            fields += assignee ? 'a:' + assignee + ' ' : '';
            fields += points ? 'p:' + points + ' ' : '';
            fields += version ? 'v:' + version + ' ' : '';
            fields += component ? 'c:' + component + ' ' : '';
            fields = BreakdownUtil.trim(fields);
            fields += ')';

            return fields;
        },

        beautifyRow(token, rowCount, settings) {
            let row = '';
            let len = token.length;

            let summary, fields, parentkey;

            for (let i = 0; i < token.length; i++) {
                let t = token[i];
                let value = t.value.trim();

                if (BreakdownParse.tokenHasScope(t, 'issue.delete.jira')) {
                    row += BreakdownUtil.DEL;
                } else if (BreakdownParse.tokenHasScope(t, 'issue.resolved.jira')) {
                    row += BreakdownUtil.RESOLVED;
                } else if (BreakdownParse.tokenHasScope(t, 'issue.empty-parent.jira')) {
                    row += BreakdownUtil.EMPTY_PARENT;
                } else if (BreakdownParse.tokenHasScope(t, 'issue.no-parent-in-selection.jira')) {
                    row += BreakdownUtil.NO_PARENT_IN_SELECTION;
                } else if (BreakdownParse.tokenHasScope(t, 'editable-content.jira')) {
                    row += BreakdownUtil.EDITABLE_CONTENT;
                } else if (BreakdownParse.tokenHasScope(t, 'issue.type.epic.jira')) {
                    row += settings.epicType;
                } else if (BreakdownParse.tokenHasScope(t, 'issue.type.story.jira')) {
                    row = '\t' + row;
                    row += settings.storyType;
                } else if (BreakdownParse.tokenHasScope(t, 'issue.type.sub-task.jira')) {
                    row = '\t\t' + row;
                    row += settings.subTaskType;
                } else if (!summary && BreakdownParse.tokenHasScope(t, 'issue.summary.jira')) {
                    summary = BreakdownParse.parseSummary(token);
                    continue;
                } else if (BreakdownParse.tokenHasScope(t, 'issue.fields.jira')) {
                    if (!fields) {
                        fields = this.beautifyFields(token);
                    }
                    continue;
                } else if (BreakdownParse.tokenHasScope(t, 'issue.parent.key.jira')) {
                    parentkey = value.toUpperCase();
                    continue;
                } else if (BreakdownParse.tokenHasScope(t, 'issue.key.jira')) {
                    row += value.toUpperCase();
                } else if (BreakdownParse.tokenHasScope(t, 'settings.jira-url.jira') && BreakdownParse.tokenHasScope(t, 'settings.value.jira')) {
                    row += settings.jiraUrl;
                } else if (BreakdownParse.tokenHasScope(t, 'settings.query.jira') && BreakdownParse.tokenHasScope(t, 'settings.value.jira')) {
                    row += settings.query;
                } else if (BreakdownParse.tokenHasScope(t, 'settings.options.jira') &&
                    BreakdownParse.tokenHasScope(t, 'settings.key.jira')) {
                    row += 'options';
                } else if (BreakdownParse.tokenHasScope(t, 'settings.options.jira') && BreakdownParse.tokenHasScope(t, 'settings.value.jira')) {
                    row += value.toLowerCase();
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
            }

            if (summary || fields || parentkey) {
                row += summary;
                if (summary && fields) {
                    row += ' ';
                    row += fields;
                }
                if (summary && parentkey || fields && parentkey) {
                    row += ' ';
                    row += parentkey;
                }
            }

            return row.trimRight();
        }


    }
})();
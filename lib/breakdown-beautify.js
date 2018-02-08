'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownParse from './breakdown-parse';
import BreakdownEnvironment from './breakdown-environment';

export default BreakdownBeautify = (function() {
    return {
        beautify() {
            let editor = BreakdownEnvironment.getEditor();
            if (editor) {
                BreakdownParse.readSettings();
                let tokens = BreakdownEnvironment.tokenizeLines();
                let buffer = BreakdownEnvironment.getBuffer();

                let text = '';
                let cursor = editor.getCursorBufferPosition();
                if (tokens.length) {
                    let lineEnding = BreakdownEnvironment.getEditorLineEnding();
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

                            text += this.beautifyRow(token, rowCount);
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

        beautifyWhenUnlocked() {
            if (BreakdownEnvironment.isUnlocked()) {
                this.beautify();
            }
        },

        calcSettingsValueIndent() {
            let settings = BreakdownEnvironment.getSettings();
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
            let points = BreakdownParse.parsePointsText(token);
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

        beautifyRow(token, rowCount) {
            let row = '';
            let len = token.length;
            let settings = BreakdownEnvironment.getSettings();

            let summary, fields, parentkey;

            for (let i = 0; i < token.length; i++) {
                let t = token[i];
                let value = t.value.trim();

                if (BreakdownParse.tokenHasScope(t, 'issue.delete.jira')) {
                    row += BreakdownUtil.DEL;
                } else if (BreakdownParse.tokenHasScope(t, 'issue.resolved.jira')) {
                    row += BreakdownUtil.RESOLVED;
                } else if (BreakdownParse.tokenHasScope(t, 'issue.empty-parent.jira')) {
                    if (BreakdownParse.tokenHasScope(t, 'active.sprint.jira')) {
                        row += BreakdownUtil.ACTIVE_SPRINT;
                    }
                    row += BreakdownUtil.EMPTY_PARENT;
                } else if (BreakdownParse.tokenHasScope(t, 'issue.no-parent-in-selection.jira')) {
                    if (BreakdownParse.tokenHasScope(t, 'active.sprint.jira')) {
                        row += BreakdownUtil.ACTIVE_SPRINT;
                    }
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
                    let indent = this.calcSettingsValueIndent();
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


    };
})();
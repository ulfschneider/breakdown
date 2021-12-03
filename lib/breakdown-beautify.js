'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownParse from './breakdown-parse';
import BreakdownStringify from './breakdown-stringify';
import BreakdownEnvironment from './breakdown-environment';


function isEpic(token) {
	return BreakdownParse.rowHasScope(token, 'issue.epic.bkdn') ||
		BreakdownParse.rowHasScope(token, 'issue.delete.epic.bkdn') ||
		BreakdownParse.rowHasScope(token, 'issue.resolved.epic.bkdn');
}

function isStory(token) {
	return BreakdownParse.rowHasScope(token, 'issue.story.bkdn') ||
		BreakdownParse.rowHasScope(token, 'issue.delete.story.bkdn') ||
		BreakdownParse.rowHasScope(token, 'issue.resolved.story.bkdn');
}

function isSubTask(token) {
	return BreakdownParse.rowHasScope(token, 'issue.sub-task.bkdn') ||
		BreakdownParse.rowHasScope(token, 'issue.delete.sub-task.bkdn') ||
		BreakdownParse.rowHasScope(token, 'issue.resolved.sub-task.bkdn');
}

function isDescription(token) {
	return BreakdownParse.rowHasScope(token, 'issue.description.bkdn');
}

export default BreakdownBeautify = (function () {
	return {
		beautify(readSettings) {
			let editor = BreakdownEnvironment.getEditor();
			if (editor) {
				if (readSettings) {
					BreakdownParse.readSettings();
				}
				let tokens = BreakdownEnvironment.tokenizeLines();
				let buffer = BreakdownEnvironment.getBuffer();
				let lastDescriptionRow;
				let indentDescription = 0;
				let text = '';
				if (tokens.length) {

					let lineEnding = BreakdownEnvironment.getEditorLineEnding();
					tokens.forEach((token, rowCount) => {
						if (BreakdownParse.rowHasScope(token, 'issue.no-parent-in-selection.bkdn') ||
							BreakdownParse.rowHasScope(token, 'issue.empty-parent.bkdn') ||
							BreakdownParse.rowHasScope(token, 'editable-content.bkdn') ||
							BreakdownParse.rowHasScope(token, 'settings.bkdn') ||
							isEpic(token) || isStory(token) || isSubTask(token) || isDescription(token)
						) {
							let isFirstLineOfDescription = (rowCount - 1) != lastDescriptionRow;

							text += this.beautifyRow(token, {
								rowCount: rowCount,
								indentLevelOfDescription: indentDescription + (isFirstLineOfDescription ? 0 : 1)
							});

							if (isDescription(token)) {
								lastDescriptionRow = rowCount;
							} else if (isEpic(token)) {
								indentDescription = 1;
							} else if (isStory(token)) {
								indentDescription = 2;
							} else if (isSubTask(token)) {
								indentDescription = 3;
							}
						} else if (BreakdownParse.rowGetValue(token).trim()) {
							text += BreakdownParse.rowGetValue(token);
						}
						if (BreakdownParse.rowGetValue(token).trim()) {
							text += lineEnding;
						}
					});
				}

				if (buffer.getText() !== text) {
					//change the editor text only, if there really is a change
					let cursors = editor.getCursors();
					for (let cursor of cursors) {
						cursor.p = cursor.getBufferPosition();
					}
					buffer.setTextViaDiff(text);
					for (let cursor of cursors) {
						cursor.setBufferPosition(cursor.p);
					}
				}
			}
		},

		beautifyWhenUnlocked() {
			if (BreakdownEnvironment.isUnlocked()) {
				this.beautify(true);
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
			let origEstimate = BreakdownParse.parseOriginalEstimate(token);
			let version = BreakdownParse.parseFixVersion(token);
			let component = BreakdownParse.parseComponent(token);
			fields = '(';
			fields += status ? 's:' + status + ' ' : '';
			fields += assignee ? 'a:' + assignee + ' ' : '';
			fields += points ? 'p:' + points + ' ' : '';
			fields += origEstimate ? 'o:' + origEstimate + ' ' : '';
			fields += version ? 'v:' + version + ' ' : '';
			fields += component ? 'c:' + component + ' ' : '';
			fields = BreakdownUtil.trim(fields);
			fields += ')';

			return fields;
		},

		beautifyRow(token, options) {
			let row = '';
			let len = token.length;
			let settings = BreakdownEnvironment.getSettings();

			let summary, fields, parentkey, marker;

			for (let i = 0; i < token.length; i++) {
				let t = token[i];
				let value = t.value.trim();

				if (BreakdownParse.tokenHasScope(t, 'issue.delete.bkdn')) {
					row += BreakdownUtil.DEL;
				} else if (BreakdownParse.tokenHasScope(t, 'issue.resolved.bkdn')) {
					row += BreakdownUtil.RESOLVED;
				} else if (BreakdownParse.tokenHasScope(t, 'empty-parent.bkdn')) {
					row += BreakdownUtil.EMPTY_PARENT;
				} else if (BreakdownParse.tokenHasScope(t, 'no-parent-in-selection.bkdn')) {
					row += BreakdownUtil.NO_PARENT_IN_SELECTION;
				} else if (BreakdownParse.tokenHasScope(t, 'editable-content.bkdn')) {
					row += BreakdownUtil.EDITABLE_CONTENT;
				} else if (BreakdownParse.tokenHasScope(t, 'issue.type.epic.bkdn')) {
					row += settings.epicType;
				} else if (BreakdownParse.tokenHasScope(t, 'issue.type.story.bkdn')) {
					row = '\t' + row;
					row += settings.storyType;
				} else if (BreakdownParse.tokenHasScope(t, 'issue.type.sub-task.bkdn')) {
					row = '\t\t' + row;
					row += settings.subTaskType;
				} else if (BreakdownParse.tokenHasScope(t, 'issue.description.bkdn')) {
					value = BreakdownParse.parseDescription(token);
					row = ''.padStart(options.indentLevelOfDescription, '\t') + '//' + (value ? value : '');
				} else if (!summary && BreakdownParse.tokenHasScope(t, 'issue.summary.bkdn')) {
					summary = BreakdownParse.parseSummary(token);
					continue;
				} else if (BreakdownParse.tokenHasScope(t, 'issue.fields.bkdn')) {
					if (!fields) {
						fields = this.beautifyFields(token);
					}
					continue;
				} else if (BreakdownParse.tokenHasScope(t, 'issue.parent.key.bkdn')) {
					parentkey = value.toUpperCase();
					continue;
				} else if (BreakdownParse.tokenHasScope(t, 'issue.key.bkdn')) {
					row += value.toUpperCase();
				} else if (BreakdownParse.tokenHasScope(t, 'settings.jira-url.bkdn') && BreakdownParse.tokenHasScope(t, 'settings.value.bkdn')) {
					row += settings.jiraUrl;
				} else if (BreakdownParse.tokenHasScope(t, 'settings.query.bkdn') && BreakdownParse.tokenHasScope(t, 'settings.value.bkdn')) {
					row += settings.query;
				} else if (BreakdownParse.tokenHasScope(t, 'settings.options.bkdn') && !BreakdownParse.tokenHasScope(t, 'settings.punctuation.separator.key-value.bkdn')) {
					if (BreakdownParse.tokenHasScope(t, 'settings.key.bkdn')) {
						row += 'options';
					} else if (BreakdownParse.tokenHasScope(t, 'settings.value.bkdn')) {
						row += value;
					} else {
						continue;
					}
				} else if (BreakdownParse.tokenHasScope(t, 'settings.options.bkdn') && BreakdownParse.tokenHasScope(t, 'settings.value.bkdn')) {
					row += value.toLowerCase();
				} else if (BreakdownParse.tokenHasScope(t, 'settings.markers.bkdn') && BreakdownParse.tokenHasScope(t, 'settings.value.bkdn')) {
					if (!marker) {
						row += BreakdownStringify.stringifyMarker();
						marker = true;
					}
					continue;
				} else if (BreakdownParse.tokenHasScope(t, 'issue.status.bkdn') && BreakdownParse.tokenHasScope(t, 'issue.field.value.bkdn')) {
					row += value;
				} else if (BreakdownParse.tokenHasScope(t, 'settings.project.bkdn') && BreakdownParse.tokenHasScope(t, 'settings.value.bkdn')) {
					row += settings.project;
				} else if (BreakdownParse.tokenHasScope(t, 'settings.punctuation.separator.key-value.bkdn')) {
					let indent = this.calcSettingsValueIndent();
					row += value;
					row = BreakdownUtil.spacePaddingRight(row, indent);
				} else {
					row += value;
				}
				if (i < len - 1 && value &&
					!(BreakdownParse.tokenHasScope(t, 'settings.key.bkdn') ||
						BreakdownParse.tokenHasScope(t, 'issue.field.identifier.bkdn'))) {
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

'use babel';

import BreakdownUtil from './breakdown-util';
import _ from 'underscore';

export default BreakdownEnvironment = (function() {

    return {
        getEditor() {
            if (BreakdownUtil.isFalsy(this.editor)) {
                this.editor = atom.workspace.getActiveTextEditor();
            }
            return this.editor;
        },

        getEditorLineEnding() {
            let lineEnding;
            const buffer = this.getBuffer();
            if (buffer) {
                lineEnding = buffer.lineEndingForRow(0);
            }
            return lineEnding ? lineEnding : '\n';
        },

        clearEditor() {
            this.editor = null;
        },

        getBuffer() {
            if (this.getEditor()) {
                return this.getEditor()
                    .getBuffer();
            }
            return null;
        },

        tokenizeLines() {
            if (this.getEditor()) {
                const editor = this.getEditor();
                const grammar = editor.getGrammar();
                return grammar.tokenizeLines(editor.getText());
            }
            return [];
        },

        getLanguage() {
            if (this.getEditor()) {
                const editor = this.getEditor();
                const grammar = editor.getGrammar();
                if (grammar) {
                    return grammar.name;
                }
            }
            return '';
        },

        isBreakdownGrammar() {
            return this.getLanguage() == 'Breakdown';
        },

        getSettings() {
            if (BreakdownUtil.isFalsy(this.settings)) {
                this.settings = {
                    jiraUrl: '',
                    query: '',
                    epicType: 'Epic',
                    storyType: 'Story',
                    subTaskType: 'Sub-task',
                    storyPointsFieldName: '',
                    epicLinkFieldName: '',
                    epicNameFieldName: '',
                    sprintFieldName: '',
                    fields: [],
                    project: '',
                    stringifyAfterPull: false,
                    strictSSL: false,
                    timeTrackingConfiguration: {
                        workingHoursPerDay: 8,
                        workingDaysPerWeek: 5,
                        timeFormat: "pretty",
                        defaultUnit: "day"
                    }
                }
            }

            return this.settings;
        },

        getCredentials() {
            if (BreakdownUtil.isFalsy(this.credentials)) {
                this.credentials = {
                    user: '',
                    pass: ''
                }
            }
            return this.credentials;
        },

        clearCredentials() {
            BreakdownUtil.clear(this.credentials);
        },

        getDownload() {
            if (BreakdownUtil.isFalse(this.download)) {
                this.download = {
                    issues: [],
                    epics: new Map(),
                    stories: new Map(),
                    subTasks: new Map(),
                    assignees: new Map(),
                    statistics: {},
                    settings = this.getSettings()

                }
            }
            return this.download;
        },

        getUpload() {
            if (BreakdownUtil.isFalse(this.upload)) {
                this.upload = {
                    uploadJiraObjects: [],
                    epics: [],
                    rankingObjects: [],
                    statistics: {},
                    settings = this.getSettings()
                }
            }
            return this.upload;
        }
    }
});
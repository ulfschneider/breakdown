'use babel';

import BreakdownUtil from './breakdown-util';

export default BreakdownEnvironment = (function() {
    return {
        getEditor() {
            if (this.isUnlocked()) {
                this.clearEditor();
            }
            if (BreakdownUtil.isFalsy(this.editor)) {
                if (this.isBreakdownGrammar()) {
                    this.editor = atom.workspace.getActiveTextEditor();
                }
            }
            return this.editor;
        },

        isUnlocked() {
            return BreakdownUtil.isFalsy(this.locked);
        },

        isLocked() {
            return !this.isUnlocked();
        },

        unlockEditor() {
            this.clearEditor();
            this.locked = false;
        },

        lockEditor() {
            this.clearEditor();
            this.locked = true;
        },

        getEditorLineEnding() {
            let lineEnding;
            let buffer = this.getBuffer();
            if (buffer) {
                lineEnding = buffer.lineEndingForRow(0);
            }
            return lineEnding ? lineEnding : '\n';
        },

        flashEditor() {
            let list = document.getElementsByTagName('atom-text-editor');

            for (let editor of list) {
                editor.classList.add('flash');
            }


            let remove = function() {
                for (let editor of list) {
                    editor.classList.remove('flash');
                }
            }

            setTimeout(remove, 250);
        },

        clearEditor() {
            this.editor = null;
        },

        getBuffer() {
            let editor = this.getEditor();
            if (editor) {
                return editor.getBuffer();
            }
            return null;
        },

        getPath() {
            let buffer = this.getBuffer();
            if (buffer) {
                return buffer.getPath();
            }
            return '';
        },

        getFile() {
            let path = this.getPath();
            if (path) {
                let slash = path.lastIndexOf('/');
                let backslash = path.lastIndexOf('\\');
                let index = Math.max(slash, backslash);
                return path.substring(index + 1);
            }
            return '';
        },

        tokenizeLines() {
            let editor = this.getEditor();
            if (editor) {
                let grammar = editor.getGrammar();
                return grammar.tokenizeLines(editor.getText());
            }
            return [];
        },

        getLanguage() {
            let editor = atom.workspace.getActiveTextEditor();
            if (editor) {
                let grammar = editor.getGrammar();
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

        getOptions() {
            return this.getSettings()
                .options;
        },

        getJiraUrl() {
            return this.getSettings()
                .jiraUrl;
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
            if (BreakdownUtil.isFalsy(this.download)) {
                this.download = {
                    issues: [],
                    epics: new Map(),
                    stories: new Map(),
                    subTasks: new Map(),
                    assignees: new Map(),
                    statistics: {},
                }
            }
            return this.download;
        },

        getUpload() {
            if (BreakdownUtil.isFalsy(this.upload)) {
                this.upload = {
                    uploadJiraObjects: [],
                    epics: [],
                    rankingObjects: [],
                    statistics: {},
                }
            }
            return this.upload;
        }
    }
})();
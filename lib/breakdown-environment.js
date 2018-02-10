'use babel';

import BreakdownBeautify from './breakdown-beautify';
import BreakdownUtil from './breakdown-util';
import {
    CompositeDisposable
} from 'atom';

export default BreakdownEnvironment = (function() {
    let editorCache = new Map();
    let subscriptions;

    return {
        destroy() {
            if (subscriptions) {
                subscriptions.dispose();
            }
            editorCache.clear();
        },

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
        },

        setEditorText(text) {
            if (this.isHandlingDifferentEditors()) {
                editorCache.set(path, text);
                this.prepareEvents();
            } else {
                this.setCurrentEditorText(text);
            }
        },

        setCurrentEditorText(text) {
            let buffer = this.getBuffer();
            if (buffer) {
                buffer.setTextViaDiff(text);
                BreakdownBeautify.beautify();
                let fold = atom.config.get(BreakdownUtil.BREAKDOWN_PACKAGE_NAME + '.foldAfterPull');
                if (fold) {
                    let editor = this.getEditor();
                    editor.foldAll();
                    editor.setCursorScreenPosition([0, 0]);
                }
            }
        },

        isHandlingDifferentEditors() {
            let activeEditor = atom.workspace.getActiveEditor();

            if (activeEditor) {
                let activeBuffer = activeEditor.getBuffer();
                let activePath = activeBuffer.getPath();

                return activePath != this.getPath();
            }

            return true;
        },

        prepareEvents() {
            if (BreakdownUtil.isFalsy(subscriptions)) {
                subscriptions = new CompositeDisposable();
                subscriptions.add(atom.workspace.onDidChangeActiveTextEditor(editor => {
                    if (BreakdownEnvironment.isBreakdownGrammar()) {
                        let buffer = editor.getBuffer();
                        let path = buffer.getPath();
                        let text = editorCache.get(path);
                        if (text) {
                            this.setCurrentEditorText(text);
                            editorCache.delete(path);
                        }
                    }
                }));
            }
        }

    }
})();
'use babel';

import BreakdownBeautify from './breakdown-beautify';
import BreakdownUtil from './breakdown-util';
import TransitionLog from './breakdown-transition-log';
import {
    CompositeDisposable
} from 'atom';

export default BreakdownEnvironment = (function() {
    //the editorCache is a workaround to be able to
    //write pulled text into a .bkdn text buffer
    //while still working in a different editor window.
    //by relying on the default atom buffer, this
    //sometimes works and sometimes not.
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
                    this.editor = this.getActiveEditor();
                }
            }
            return this.editor;
        },

        getActiveEditor() {
            return atom.workspace.getActiveTextEditor();
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
            let editor = this.getActiveEditor();
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
                    statusCategories: new Map(),
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

        getStatusCategories() {
            return this.getSettings()
                .statusCategories;
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
                    transitionLog: new TransitionLog(),
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
                editorCache.set(this.getPath(), text);
                this.prepareEditorEvent();
            } else {
                this.setActiveEditorText(text);
            }
        },

        setActiveEditorText(text) {
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
            let activeEditor = this.getActiveEditor();

            if (activeEditor) {
                let activeBuffer = activeEditor.getBuffer();
                let activePath = activeBuffer.getPath();

                return activePath != this.getPath();
            }

            return true;
        },

        prepareEditorEvent() {
            if (BreakdownUtil.isFalsy(subscriptions)) {
                subscriptions = new CompositeDisposable();
                subscriptions.add(atom.workspace.onDidChangeActiveTextEditor(editor => {
                    if (BreakdownEnvironment.isBreakdownGrammar()) {
                        let buffer = editor.getBuffer();
                        let path = buffer.getPath();
                        let text = editorCache.get(path);
                        if (text) {
                            this.setActiveEditorText(text);
                            editorCache.delete(path);
                        }
                    }
                }));
            }
        }

    }
})();
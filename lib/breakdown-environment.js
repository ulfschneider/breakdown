'use babel';

import BreakdownBeautify from './breakdown-beautify';
import BreakdownUtil from './breakdown-util';

import {
    CompositeDisposable
} from 'atom';
import _ from 'underscore';

export default BreakdownEnvironment = (function () {
    //the editorCache is a workaround to be able to
    //write pulled text into a .bkdn text buffer
    //while still working in a different editor window.
    //by relying on the default atom buffer, this
    //sometimes works and sometimes not.
    let editorCache = new Map();
    let subscriptions;
    let mode;

    return {
        MODE_PULL: 'MODE_PULL',
        MODE_PULL_CHART: 'MODE_PULL_CHART',
        MODE_PUSH: 'MODE_PUSH',

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
            return BreakdownUtil.isFalsy(this.getLockPath());
        },

        isLocked() {
            return !this.isUnlocked();
        },

        getLockPath() {
            return this.lockPath;
        },

        unlockEditor() {
            this.clearEditor();
            this.lockPath = '';
        },

        lockEditor() {
            if (this.isUnlocked() && this.isBreakdownGrammar()) {
                this.lockPath = this.getActivePath();
                this.editor = this.getActiveEditor();
            }
        },

        setMode(mode) {
            this.mode = mode;
        },

        clearMode() {
            this.mode = '';
        },

        getMode() {
            return this.mode;
        },

        getEditorLineEnding() {
            return '\n';
        },

        flashEditor() {
            let list = document.getElementsByTagName('atom-text-editor');

            for (let editor of list) {
                editor.classList.add('flash');
            }


            let remove = function () {
                for (let editor of list) {
                    editor.classList.remove('flash');
                }
            }

            setTimeout(remove, 250);
        },

        clearEditor() {
            this.editor = null;
            this.buffer = null;
        },

        getBuffer() {
            if (this.isUnlocked()) {
                this.clearEditor();
            }

            if (BreakdownUtil.isFalsy(this.buffer)) {
                let editor = this.getEditor();
                if (editor) {
                    this.buffer = editor.getBuffer();
                }
            }
            return this.buffer;
        },

        getPath() {
            let buffer = this.getBuffer();
            if (buffer) {
                return buffer.getPath();
            }
            return '';
        },

        clearCurrentPullPath() {
            this.pullPath = '';
        },

        markCurrentPullPath() {
            this.pullPath = this.getPath();
        },

        getLastPullPath() {
            return this.pullPath;
        },

        getFileName() {
            let path = this.getPath();
            if (path) {
                let slash = path.lastIndexOf('/');
                let backslash = path.lastIndexOf('\\');
                let index = Math.max(slash, backslash);
                return path.substring(index + 1);
            }
            return '';
        },

        getFileNameWithoutExtension() {
            let fileName = this.getFileName();
            let dot = fileName.lastIndexOf('.');
            if (dot) {
                return fileName.substring(0, dot);
            } else {
                return fileName;
            }
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

        getWorkingHoursPerDay() {
            let settings = this.getSettings();
            return settings.timeTrackingConfiguration && settings.timeTrackingConfiguration.workingHoursPerDay ? settings.timeTrackingConfiguration.workingHoursPerDay : 8;
        },

        getWorkingDaysPerWeek() {
            let settings = this.getSettings();
            return settings.timeTrackingConfiguration && settings.timeTrackingConfiguration.workingDaysPerWeek ? settings.timeTrackingConfiguration.workingDaysPerWeek : 5;
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
            if (!this.credentials || !this.credentials.user || !this.credentials.pass) {
                this.credentials = {
                    user: atom.config.get(BreakdownUtil.BREAKDOWN_PACKAGE_NAME + '.user'),
                    pass: atom.config.get(BreakdownUtil.BREAKDOWN_PACKAGE_NAME + '.pass')
                }
            }
            return this.credentials;
        },

        setCredentials(user, pass) {
            this.credentials = {
                user: user,
                pass: pass
            }
        },

        clearCredentials() {
            BreakdownUtil.clear(this.credentials);
        },

        clearDownload() {
            this.download = null;
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

        setEditorText(text, lastPullPath) {
            if (lastPullPath && this.getActivePath() !== lastPullPath) {
                editorCache.set(lastPullPath, text);
                this.prepareEditorEvent();
            } else if (BreakdownUtil.isFalsy(lastPullPath) && this.isHandlingDifferentEditors()) {
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

        getActivePath() {
            let activePath = '';
            let activeEditor = this.getActiveEditor();

            if (activeEditor) {
                let activeBuffer = activeEditor.getBuffer();
                activePath = activeBuffer.getPath();
            }
            return activePath;
        },

        isHandlingDifferentEditors() {
            return (this.isLocked() && this.getActivePath() !== this.getLockPath()) ||
                this.getActivePath() !== this.getPath();
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
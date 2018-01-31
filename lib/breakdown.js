'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownStringify from './breakdown-stringify';
import BreakdownRequest from './breakdown-request';
import BreakdownPull from './breakdown-pull';
import BreakdownAutocompletionProvider from './breakdown-autocompletion';
import BreakdownPush from './breakdown-push';
import BreakdownBeautify from './breakdown-beautify';
import BreakdownParse from './breakdown-parse';
import BreakdownCredentialsView from './breakdown-credentials-view';
import BreakdownStatusBar from './breakdown-status-bar';
import {
    CompositeDisposable
} from 'atom';


export default {
    credentialsView: null,
    credentialsModalPanel: null,
    subscriptions: null,
    provider: null,

    settings: {
        jiraUrl: '',
        query: '',
        epicType: 'Epic',
        storyType: 'Story',
        subTaskType: 'Sub-task',
        storyPointsFieldName: '',
        epicLinkFieldName: '',
        epicNameFieldName: '',
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
    },


    download: {
        issues: [],
        epics: new Map(),
        stories: new Map(),
        subTasks: new Map(),
        assignees: new Map(),
        statistics: {}
    },

    upload: {
        uploadJiraObjects: [],
        epics: [],
        rankingObjects: [],
        statistics: {}
    },

    credentials: {
        user: '',
        pass: ''
    },

    activate() {
        this.download.settings = this.settings;
        this.upload.settings = this.settings;

        this.credentialsView = new BreakdownCredentialsView({
            cancel: () => {
                this.cancelOperation();
            }
        });
        this.credentialsModalPanel = atom.workspace.addModalPanel({
            item: this.credentialsView.getElement(),
            visible: false,
            autoFocus: true
        });

        this.subscriptions = new CompositeDisposable();

        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'breakdown:pull': () => {
                this.settings.stringifyAfterPull = true;
                this.initiatePull();
            }
        }));
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'breakdown:push': () => this.initiatePush()
        }));
        atom.workspace.activePaneContainer.paneContainer.element
            .addEventListener('click', this.openJiraCallback = event => {
                BreakdownRequest.openJira(event, this.settings, this.credentials);
            });

        this.subscriptions.add(atom.workspace.observeTextEditors(editor => {
            this.prepareBeautifying(editor);
        }));

        this.subscriptions.add(atom.workspace.onDidChangeActiveTextEditor(editor => {
            if (this.provider) {
                this.provider.reset();
            }
        }));

    },

    consumeStatusBar(statusBar) {
        BreakdownStatusBar.init(statusBar);
    },

    provide() {
        if (this.provider == null) {
            this.provider = new BreakdownAutocompletionProvider(this.settings, this.credentials);
        }

        return this.provider
    },

    deactivate() {
        atom.workspace.activePaneContainer.paneContainer.element.removeEventListener('click', this.openJiraCallback);
        this.credentialsModalPanel.destroy();
        this.subscriptions.dispose();
        this.credentialsView.destroy();
        BreakdownStatusBar.destroy();
        this.provider = null;
    },

    serialize() {},

    prepareBeautifying(editor) {
        let buffer = editor.getBuffer();
        this.subscriptions.add(buffer.onWillSave(() => {
            if (BreakdownParse.isBreakdownGrammar()) {
                BreakdownParse.readSettings(this.settings, this.credentials);
                BreakdownBeautify.beautify(this.settings);
            }
        }));
    },

    prepareAutocompletion() {
        this.download.components = [];
        this.download.versions = [];
    },


    pullFromJira() {
        return BreakdownPull.pullFromJira(this.download, this.credentials)
            .then(() => {
                this.provider.reload();
                BreakdownStatusBar.clear();
                if (this.settings.stringifyAfterPull) {
                    BreakdownStringify.stringifyAfterPull(this.download);
                }
            })
            .catch(error => {
                BreakdownStatusBar.clear();
                let rootCause = BreakdownUtil.stringifyError(error);

                if (rootCause) {
                    console.log('Pulled JIRA data could not be stringified' + (rootCause ? ' due to ' + rootCause : ''));
                    atom.notifications.addWarning('Pulled JIRA data could not be stringified' + (rootCause ? ' due to ' + rootCause : ''), {
                        dismissable: true
                    });
                }
            });
    },

    cancelOperation() {
        this.credentialsModalPanel.hide();
    },

    dismissNotifications() {
        const notifications = atom.notifications.getNotifications();
        notifications.forEach(notification => {
            notification.dismiss();
        });
    },

    askForCredentials() {
        return BreakdownUtil.isFalsy(this.credentials.user) ||
            BreakdownUtil.isFalsy(this.credentials.pass);
    },

    initiatePull() {
        if (BreakdownParse.isBreakdownGrammar()) {
            const editor = atom.workspace.getActiveTextEditor();
            if (editor) {
                if (this.settings.stringifyAfterPull) {
                    this.dismissNotifications();
                }

                BreakdownParse.readSettings(this.settings, this.credentials);
                if (!BreakdownPull.validatePullSettings(this.settings)) {
                    return;
                }

                if (this.askForCredentials()) {
                    this.credentialsView.setSubmit((user, pass) => {
                        this.credentials.user = user;
                        this.credentials.pass = pass;
                        this.credentialsModalPanel.hide();
                        this.pullFromJira();
                    });

                    this.credentialsModalPanel.show();
                } else {
                    this.pullFromJira();
                }
            } else {
                atom.notifications.addWarning('No editor active to pull JIRA data into.');
            }
        } else {
            atom.notifications.addInfo('This is not a JIRA Breakdown file. Please use the file ending .bkdn and refer to the https://atom.io/packages/breakdown package in case of questions.', {
                dismissable: true
            });
        }
    },


    pushToJira() {
        this.settings.stringifyAfterPull = false;
        return BreakdownPush.pushToJira(this.upload, this.download, this.credentials)
            .then(() => {
                this.settings.stringifyAfterPull = true;
                this.pullFromJira();
            })
            .catch(error => {
                //this error should only be an interruption error to not start pulling if
                //already a push was unuccessful
                let rootCause = BreakdownUtil.stringifyError(error);
                if (rootCause) {
                    console.log('Failure while pushing to JIRA ' + (rootCause ? ' due to ' + rootCause : ''));
                }
            });
    },

    initiatePush() {
        if (BreakdownParse.isBreakdownGrammar()) {
            const editor = atom.workspace.getActiveTextEditor();
            if (editor) {
                this.dismissNotifications();
                BreakdownParse.readSettings(this.settings, this.credentials);
                if (!BreakdownPush.validatePushSettings(this.settings)) {
                    return;
                }
                if (!BreakdownPush.isPushingDesired(this.settings)) {
                    atom.notifications.addWarning('Pushing is not desired for this breakdown. Remove the option **nopush** in your settings to allow pushing.', {
                        dismissable: true
                    });
                    return;
                }
                if (this.askForCredentials()) {
                    this.credentialsView.setSubmit((user, pass) => {
                        this.credentials.user = user;
                        this.credentials.pass = pass;
                        this.credentialsModalPanel.hide();
                        this.pushToJira();
                    });
                    this.credentialsModalPanel.show();
                } else {
                    this.pushToJira();
                }
            } else {
                atom.notifications.addWarning('No editor active for JIRA pushing.');
            }
        } else {
            atom.notifications.addInfo('This is no JIRA Breakdown file. Please use the file ending .bkdn and refer to the https://atom.io/packages/breakdown package in case of questions.', {
                dismissable: true
            });
        }
    }

};
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
import BreakdownEnvironment from './breakdown-environment';
import {
    CompositeDisposable
} from 'atom';

export default {
    credentialsView: null,
    credentialsModalPanel: null,
    subscriptions: null,
    autocompletionProvider: null,

    activate() {
        //credentials
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
            'breakdown:pull': () => this.initiatePull()
        }));
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'breakdown:push': () => this.initiatePush()
        }));
        atom.workspace.activePaneContainer.paneContainer.element
            .addEventListener('click', this.openJiraCallback = event => {
                BreakdownRequest.openJira(event);
            });

        this.subscriptions.add(atom.workspace.observeTextEditors(editor => {
            this.prepareBeautifying(editor);
        }));
    },

    consumeStatusBar(statusBar) {
        BreakdownStatusBar.init(statusBar);
    },

    provide() {
        if (BreakdownUtil.isFalsy(this.autocompletionProvider)) {
            this.autocompletionProvider = new BreakdownAutocompletionProvider();
        }
        return this.autocompletionProvider
    },

    deactivate() {
        this.subscriptions.dispose();
        atom.workspace.activePaneContainer.paneContainer.element.removeEventListener('click', this.openJiraCallback);

        this.credentialsView.destroy();
        this.credentialsModalPanel.destroy();

        BreakdownStatusBar.destroy();
        this.autocompletionProvider.destroy();
        BreakdownEnvironment.destroy();
    },

    serialize() { },

    prepareBeautifying(editor) {
        let buffer = editor.getBuffer();
        this.subscriptions.add(buffer.onWillSave(() => {
            BreakdownBeautify.beautifyWhenUnlocked();
        }));
    },

    pullFromJira() {
        return BreakdownPull.pullFromJira()
            .then(() => {
                BreakdownStatusBar.clear();
                if (BreakdownEnvironment.getMode() == BreakdownEnvironment.MODE_PULL) {
                    this.autocompletionProvider.reload();
                    BreakdownStringify.stringifyAfterPull();
                }
            })
            .then(() => {
                BreakdownEnvironment.clearMode();
                BreakdownEnvironment.unlockEditor();
            })
            .catch(error => {
                this.cancelOperation();
                let rootCause = BreakdownUtil.stringifyError(error);

                if (rootCause) {
                    console.log('Pulled Jira data could not be stringified' + (rootCause ? ' due to ' + rootCause : ''));
                    atom.notifications.addWarning('Pulled Jira data could not be stringified' + (rootCause ? ' due to ' + rootCause : ''), {
                        dismissable: true
                    });
                }
            });
    },

    cancelOperation() {
        BreakdownEnvironment.unlockEditor();
        BreakdownStatusBar.clear();
        BreakdownEnvironment.clearMode();
        this.credentialsModalPanel.hide();
    },

    dismissNotifications() {
        let notifications = atom.notifications.getNotifications();
        notifications.forEach(notification => {
            notification.dismiss();
        });
    },

    askForCredentials() {
        let credentials = BreakdownEnvironment.getCredentials();

        let ask = BreakdownUtil.isFalsy(credentials.user) ||
            BreakdownUtil.isFalsy(credentials.pass);
        if (!ask) {
            atom.notifications.addInfo('Using credentials from package configuration for user <strong>' + credentials.user + '</strong>');
        }
        return ask;
    },

    initiatePull() {
        if (BreakdownEnvironment.isBreakdownGrammar()) {
            if (BreakdownEnvironment.isLocked()) {
                BreakdownEnvironment.flashEditor();
            } else if (BreakdownEnvironment.isUnlocked() && BreakdownEnvironment.getEditor()) {
                BreakdownEnvironment.lockEditor();
                BreakdownEnvironment.setMode(BreakdownEnvironment.MODE_PULL);
                this.dismissNotifications();

                BreakdownParse.readSettings();
                if (!BreakdownPull.validatePullSettings()) {
                    this.cancelOperation();
                    return;
                }

                if (this.askForCredentials()) {
                    this.credentialsView.setSubmit((user, pass) => {
                        BreakdownEnvironment.setCredentials(user, pass);
                        this.credentialsModalPanel.hide();
                        this.pullFromJira();
                    });

                    this.credentialsModalPanel.show();
                } else {
                    this.pullFromJira();
                }
            }
        } else {
            atom.notifications.addWarning('This is not a Breakdown file. Please use the file ending .bkdn and refer to the https://atom.io/packages/breakdown package in case of questions.', {
                dismissable: true
            });
        }
    },

    initiateChartPull() {
        if (BreakdownEnvironment.isBreakdownGrammar()) {
            if (BreakdownEnvironment.isLocked()) {
                BreakdownEnvironment.flashEditor();
            } else if (BreakdownEnvironment.isUnlocked() && BreakdownEnvironment.getEditor()) {
                BreakdownEnvironment.lockEditor();
                BreakdownEnvironment.setMode(BreakdownEnvironment.MODE_PULL_CHART);
                this.dismissNotifications();
                BreakdownParse.readSettings();
                if (!BreakdownPull.validatePullSettings()) {
                    this.cancelOperation();
                    return;
                }

                if (this.askForCredentials()) {
                    this.credentialsView.setSubmit((user, pass) => {
                        BreakdownEnvironment.setCredentials(user, pass);
                        this.credentialsModalPanel.hide();
                        this.pullFromJira();
                    });

                    this.credentialsModalPanel.show();
                } else {
                    this.pullFromJira();
                }
            }
        } else {
            atom.notifications.addWarning('This is not a Breakdown file. Please use the file ending .bkdn and refer to the https://atom.io/packages/breakdown package in case of questions.', {
                dismissable: true
            });
        }
    },


    pushToJira() {
        return BreakdownPush.pushToJira()
            .then(() => {
                BreakdownEnvironment.setMode(BreakdownEnvironment.MODE_PULL);
                return this.pullFromJira();
            })
            .then(() => {
                BreakdownEnvironment.clearMode();
                BreakdownEnvironment.unlockEditor();
            })
            .catch(error => {
                this.cancelOperation();
                //this error should only be an interruption error to not start pulling if
                //already a push was unuccessful
                let rootCause = BreakdownUtil.stringifyError(error);
                if (rootCause) {
                    console.log('Failure while pushing to Jira ' + (rootCause ? ' due to ' + rootCause : ''));
                }
            });
    },

    initiatePush() {
        if (BreakdownEnvironment.isBreakdownGrammar()) {
            if (BreakdownEnvironment.isLocked()) {
                BreakdownEnvironment.flashEditor();
            } else if (BreakdownEnvironment.isUnlocked() && BreakdownEnvironment.getEditor()) {
                BreakdownEnvironment.lockEditor();
                BreakdownEnvironment.setMode(BreakdownEnvironment.MODE_PUSH);
                this.dismissNotifications();
                BreakdownParse.readSettings();
                if (!BreakdownPush.validatePushSettings()) {
                    this.cancelOperation();
                    return;
                }
                if (!BreakdownPush.isPushingDesired()) {
                    atom.notifications.addWarning('Pushing is not desired for this breakdown. Remove the option **nopush** in your settings to allow pushing.', {
                        dismissable: true
                    });
                    this.cancelOperation();
                    return;
                }
                if (this.askForCredentials()) {
                    this.credentialsView.setSubmit((user, pass) => {
                        BreakdownEnvironment.setCredentials(user, pass);
                        this.credentialsModalPanel.hide();
                        this.pushToJira();
                    });
                    this.credentialsModalPanel.show();
                } else {
                    this.pushToJira();
                }
            }
        } else {
            atom.notifications.addInfo('This is no Jira Breakdown file. Please use the file ending .bkdn and refer to the https://atom.io/packages/breakdown package in case of questions.', {
                dismissable: true
            });
        }
    }

};
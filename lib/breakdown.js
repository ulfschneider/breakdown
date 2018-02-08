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
        if (this.autocompletionProvider == null) {
            this.autocompletionProvider = new BreakdownAutocompletionProvider();
        }

        return this.autocompletionProvider
    },

    deactivate() {
        atom.workspace.activePaneContainer.paneContainer.element.removeEventListener('click', this.openJiraCallback);
        this.credentialsModalPanel.destroy();
        this.subscriptions.dispose();
        this.credentialsView.destroy();
        BreakdownStatusBar.destroy();
        this.provider.destroy();
    },

    serialize() {},

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
                if (BreakdownPull.isStringifyAfterPull()) {
                    BreakdownStringify.stringifyAfterPull();
                }
                this.autocompletionProvider.reload();
            })
            .then(() => {
                BreakdownEnvironment.unlockEditor();
            })
            .catch(error => {
                BreakdownEnvironment.unlockEditor();
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
        let notifications = atom.notifications.getNotifications();
        notifications.forEach(notification => {
            notification.dismiss();
        });
    },

    askForCredentials() {
        let credentials = BreakdownEnvironment.getCredentials();
        return BreakdownUtil.isFalsy(credentials.user) ||
            BreakdownUtil.isFalsy(credentials.pass);
    },

    initiatePull() {
        if (BreakdownEnvironment.isUnlocked()) {
            if (BreakdownEnvironment.getEditor()) {
                BreakdownEnvironment.lockEditor();
                BreakdownPull.setStringifyAfterPull(true);
                this.dismissNotifications();

                BreakdownParse.readSettings();
                if (!BreakdownPull.validatePullSettings()) {
                    return;
                }

                if (this.askForCredentials()) {
                    this.credentialsView.setSubmit((user, pass) => {
                        let credentials = BreakdownEnvironment.getCredentials();
                        credentials.user = user;
                        credentials.pass = pass;
                        this.credentialsModalPanel.hide();
                        this.pullFromJira();
                    });

                    this.credentialsModalPanel.show();
                } else {
                    this.pullFromJira();
                }
            } else {
                atom.notifications.addInfo('This is not a Breakdown file. Please use the file ending .bkdn and refer to the https://atom.io/packages/breakdown package in case of questions.', {
                    dismissable: true
                });
            }
        }
    },


    pushToJira() {
        BreakdownPull.setStringifyAfterPull(false);
        return BreakdownPush.pushToJira()
            .then(() => {
                BreakdownPull.setStringifyAfterPull(true);
                return this.pullFromJira();
            })
            .then(() => {
                BreakdownEnvironment.unlockEditor();
            })
            .catch(error => {
                BreakdownEnvironment.unlockEditor();
                //this error should only be an interruption error to not start pulling if
                //already a push was unuccessful
                let rootCause = BreakdownUtil.stringifyError(error);
                if (rootCause) {
                    console.log('Failure while pushing to JIRA ' + (rootCause ? ' due to ' + rootCause : ''));
                }
            });
    },

    initiatePush() {
        if (BreakdownEnvironment.isUnlocked()) {
            if (BreakdownEnvironment.getEditor()) {
                BreakdownEnvironment.lockEditor();
                this.dismissNotifications();
                BreakdownParse.readSettings();
                if (!BreakdownPush.validatePushSettings()) {
                    return;
                }
                if (!BreakdownPush.isPushingDesired()) {
                    atom.notifications.addWarning('Pushing is not desired for this breakdown. Remove the option **nopush** in your settings to allow pushing.', {
                        dismissable: true
                    });
                    return;
                }
                if (this.askForCredentials()) {
                    this.credentialsView.setSubmit((user, pass) => {
                        let credentials = BreakdownEnvironment.getCredentials();
                        credentials.user = user;
                        credentials.pass = pass;
                        this.credentialsModalPanel.hide();
                        this.pushToJira();
                    });
                    this.credentialsModalPanel.show();
                } else {
                    this.pushToJira();
                }
            } else {
                atom.notifications.addInfo('This is no JIRA Breakdown file. Please use the file ending .bkdn and refer to the https://atom.io/packages/breakdown package in case of questions.', {
                    dismissable: true
                });
            }
        }
    }

};
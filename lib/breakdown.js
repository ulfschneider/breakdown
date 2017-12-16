'use babel';

import BreakdownUtils from './breakdown-util';
import BreakdownStringify from './breakdown-stringify';
import BreakdownBeautify from './breakdown-beautify';
import BreakdownParse from './breakdown-parse';
import BreakdownCredentialsView from './breakdown-credentials-view';
import {
    CompositeDisposable
} from 'atom';
import request from 'request';
import _ from 'underscore';

const shell = require('electron')
    .shell;

export default {
    credentialsView: null,
    credentialsModalPanel: null,
    subscriptions: null,

    //TODO configure default fixversion
    //TODO configure default points
    //TODO configure default assignee
    //TODO remove click eventlistener on deactivate
    //TODO ensure to operate on the right editor (for promises)
    //TODO mark resolved line with css class


    settings: {
        jiraUrl: '',
        query: '',
        epicType: 'Epic',
        storyType: 'Story',
        subTaskType: 'Sub-task',
        storyPointsFieldName: '',
        epicLinkFieldName: '',
        fields: [],
        project: '',
        strictSSL: false
    },

    statistics: {},

    download: {
        issues: null,
        epics: null,
        stories: null,
        subTasks: null
    },

    upload: {
        newIssues: null
    },

    credentials: {
        user: '',
        pass: ''
    },

    activate(state) {
        this.credentialsView = new BreakdownCredentialsView({
            submit: (user, pass) => {
                this.credentials.user = user;
                this.credentials.pass = pass;
                this.pull();
            },
            cancel: () => {
                this.cancelPull();
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
        atom.workspace.activePaneContainer.paneContainer.element.addEventListener('click', (event) => {
            this.openIssue(event);
        });


        atom.workspace.observeTextEditors((editor) => {
            this.prepareBeautifying(editor);
        });

    },

    deactivate() {
        this.credentialsModalPanel.destroy();
        this.subscriptions.dispose();
        this.credentialsView.destroy();
    },

    serialize() {
        return {
            //   breakdownCredentialsState: this.credentialsView.serialize()
        };
    },

    prepareBeautifying(editor) {
        let buffer = editor.getBuffer();
        this.subscriptions.add(buffer.onWillSave(() => {
            if (BreakdownParse.isBreakdownGrammar()) {
                BreakdownParse.readSettings(this.settings);
                BreakdownBeautify.beautify(this.settings);
            }
        }));
    },



    request(options) {
        return new Promise((resolve, reject) => {
            request(options, (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    this.settings.askForCredentials = false;
                    resolve(body);
                } else
                if (error && error.code) {
                    reject('Error: ' + error.code);
                } else if (response && response.statusCode) {
                    if (response.statusCode == 401) {
                        this.settings.askForCredentials = true;
                    }
                    reject('HTTP status code: ' + response.statusCode);
                } else {
                    reject();
                }
            })
        })
    },

    /**
    @param {Object} config - configure the behavior
    @param {String} method - REST method: get, put, post, delete, if undefined, get is default
    @param {String} config.url - the url to load, can be undefined if config.query is given
    @param {String} config.query - a query to search for, can be undefined if config.url is given
    @param {Number} config.startAt - for pagination, the index to start loading, can be undefined
    @param {Number} config.maxResults - for pagination, what is the maximum result to be returned
     */
    prepareOptions(config) {
        let options = {};
        if (config.method) {
            options.method = config.method;
        }
        if (config.url) {
            options.url = config.url;
        } else if (config.query) {
            options.url = this.settings.jiraUrl +
                '/rest/api/2/search?' +
                'jql=' + config.query +
                (config.startAt ? '&startAt=' + config.startAt : '') +
                (config.maxResults ? '&maxResults=' + config.maxResults : '&maxResults=-1');
        } else {
            throw new Error('You either have to define a url or a query in the config object.');
        }
        options.auth = {
            'user': this.credentials.user,
            'pass': this.credentials.pass
        };
        options.strictSSL = this.settings.strictSSL;
        options.headers = {
            'content-type': 'application/json',
            'X-Atlassian-Token': 'no-check' //see https://developer.atlassian.com/jiradev/jira-platform/jira-architecture/authentication/form-token-handling#FormTokenHandling-Scripting
        }
        return options;
    },

    destroyCursor(event) {
        /*
         * Remove cursor that was created by clicking the link
         * But only if it is not the only cursor.
         */
        let editor = atom.workspace.getActiveTextEditor();
        if (editor.hasMultipleCursors()) {
            /*
             * Remove the cursor that is exactly at the position the mouse clicked
             * and not just the last added cursor.
             */
            let screenPos = atom.views.getView(editor).component.screenPositionForMouseEvent(event);
            let cursor = editor.getCursorAtScreenPosition(screenPos);
            if (cursor) {
                cursor.destroy();
            }
        }
    },

    openIssue(event) {
        if (BreakdownParse.isBreakdownGrammar() && (event.ctrlKey || event.metaKey)) {
            this.destroyCursor(event);
            for (let path of event.path) {
                if (!_.isUndefined(path.classList)) {
                    if (path.classList.contains('syntax--key')) {
                        let issue = path.innerText;

                        if (!this.settings.jiraUrl) {
                            BreakdownParse.readSettings(this.settings);
                        }

                        if (!this.settings.jiraUrl) {
                            atom.notifications.addWarn('Please specify your JIRA url in the document settings in order to open an issue in JiRA. Refer to the https://atom.io/packages/breakdown package in case of question.', {
                                dismissable: true
                            });
                        }

                        let url = this.settings.jiraUrl + '/browse/' + BreakdownUtils.replaceAll(issue, '^', '');
                        shell.openExternal(url);
                        break;
                    }
                }
            };
        }
    },

    pullIssues(config) {
        return new Promise((resolve, reject) => {
                let options = this.prepareOptions(config);
                if (_.isUndefined(config) || _.isUndefined(config.startAt) || config.startAt === 0) {
                    this.download.issues = [];
                }
                resolve(options);
            })
            .then((options) => {
                return this.request(options)
                    .then((body) => {
                        let object = JSON.parse(body);
                        this.download.issues = this.download.issues.concat(object.issues);

                        let startAt = object.startAt;
                        let maxResults = object.maxResults;
                        let total = object.total;
                        if (startAt + maxResults < total) {
                            //recursive chaining for paginated loading of issues
                            config.startAt = startAt + maxResults;
                            config.maxResults = maxResults;
                            return this.pullIssues(config);
                        } else {
                            BreakdownStringify.extractDataFromDownloadedIssues(this.download);
                        }
                    });
            });
    },

    extractCustomFieldNames(content) {
        let object = JSON.parse(content);
        let fields = object.fields;
        let keys = Object.keys(fields);

        for (let i = 0; i < keys.length && (!this.settings.epicLinkFieldName || !this.settings.storyPointsFieldName); i++) {
            if (!this.settings.epicLinkFieldName && fields[keys[i]].name == 'Epic Link') {
                this.settings.epicLinkFieldName = keys[i];
            }
            if (!this.settings.storyPointsFieldName && fields[keys[i]].name == 'Story Points') {
                this.settings.storyPointsFieldName = keys[i];
            }
        }
    },


    pullCustomFieldNames() {
        return new Promise((resolve, reject) => {
                let issueType = null;
                let issueKey = null;
                let issues = this.download.issues;
                //get the issue key for a story
                for (let i = 0; i < issues.length && !issueKey; i++) {
                    issueType = BreakdownStringify.getIssueTypeFromIssue(issues[i]);
                    if (BreakdownUtils.isSameIssueType(this.settings.storyType, issueType)) {
                        issueKey = issues[i].key;
                    }
                }
                resolve(issueKey);
            })
            .then((issueKey) => {
                if (issueKey) {
                    let options = this.prepareOptions({
                        url: this.settings.jiraUrl + '/rest/api/2/issue/' + issueKey + '/editmeta'
                    });
                    return this.request(options)
                        .then((body) => {
                            this.extractCustomFieldNames(body);
                        });
                }
                console.warn('Custom field names could not be extracted');
                return Promise.resolve(); //return with resolve, as there might be no problem with not having the custom field names
            });
    },


    pull() {
        this.credentialsModalPanel.hide();

        console.log('Pulling JIRA url=[' + this.settings.jiraUrl + '] query=[' + this.settings.query + ']');
        atom.notifications.addInfo('Pulling JIRA url=[' + this.settings.jiraUrl + '] query=[' + this.settings.query + ']');

        let editor = atom.workspace.getActiveTextEditor();
        let buffer = editor.getBuffer();
        this.pullIssues({
                query: this.settings.query
            })
            .then(() => {
                return this.pullCustomFieldNames()
            })
            .then(() => {
                buffer.setTextViaDiff(BreakdownStringify.stringifyJIRAContent(this.download));
                editor.setCursorScreenPosition([0, 0]);
                BreakdownBeautify.beautify(this.settings);
                console.log('JIRA data has been pulled\n' + BreakdownStringify.stringifyDownloadStatistics(this.download));
                atom.notifications.addSuccess('JIRA data has been pulled');

                this.settings.askForCredentials = false;
            })
            .catch((error) => {
                console.error('Failure when pulling JIRA data ' + BreakdownUtils.stringifyError(error));
                atom.notifications.addError('Failure when pulling JIRA data ' + BreakdownUtils.stringifyError(error), {
                    dismissable: true
                });
            });
    },

    cancelPull() {
        this.credentialsModalPanel.hide();
    },

    initiatePull() {
        if (BreakdownParse.isBreakdownGrammar()) {
            let editor = atom.workspace.getActiveTextEditor();
            if (editor) {
                BreakdownParse.readSettings(this.settings);
                this.download.settings = this.settings;
                this.download.statistics = this.statistics;

                if (!this.settings.jiraUrl) {
                    console.log('No JIRA URL specified');
                    atom.notifications.addError('Please specify your JIRA URL. Refer to the https://atom.io/packages/breakdown package in case of questions.', {
                        dismissable: true
                    });
                    return;
                }
                if (!this.settings.query) {
                    console.log('No JIRA query specified');
                    atom.notifications.addError('Please specify your JIRA query. Refer to the https://atom.io/packages/breakdown package in case of questions.', {
                        dismissable: true
                    });
                    return;
                }

                if (this.settings.askForCredentials) {
                    this.credentialsModalPanel.show();
                } else {
                    this.pull();
                }
            } else {
                atom.notifications.addWarn('No editor active to pull JIRA into.');
            }
        } else {
            atom.notifications.addInfo('This is no JIRA Breakdown file. Please use the file ending .bkdn. Refer to the https://atom.io/packages/breakdown package in case of questions.', {
                dismissable: true
            });
        }
    },

    initiatePush() {
        atom.notifications.addInfo('Pushing to JIRA is currently under development and not functional.');
        if (BreakdownParse.isBreakdownGrammar()) {
            let editor = atom.workspace.getActiveTextEditor();
            if (editor) {
                BreakdownParse.readSettings(this.settings);
                this.upload.settings = this.settings;
                this.upload.statistics = this.statistics;
                BreakdownParse.parseJIRAContent(this.upload);
            }

        }
    }
};
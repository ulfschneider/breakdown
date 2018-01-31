'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownRequest from './breakdown-request';
import BreakdownParse from './breakdown-parse';
import BreakdownCredentialsView from './breakdown-credentials-view';
import _ from 'underscore';

//TODO user picker
//TODO transitions ??

export default class BreakdownAutocompletionProvider {
    constructor(settings, credentials) {
        this.settings = settings;
        this.credentials = credentials;

        this.selector = '.breakdown';
        this.inclusionPriority = 1;
        this.suggestionPriority = 2;
        this.filterSuggestions = false; //the user picker won´t work with this set to true
        this.inclusionPriority = 1;
        this.excludeLowerPriority = true;

        this.versions = [];
        this.components = [];

        this.credentialsView = new BreakdownCredentialsView({
            cancel: () => {
                this.credentialsModalPanel.hide();
            },
            submit: (user, pass) => {
                this.credentials.user = user;
                this.credentials.pass = pass;
                this.credentialsModalPanel.hide();
            }
        });
        this.credentialsModalPanel = atom.workspace.addModalPanel({
            item: this.credentialsView.getElement(),
            visible: false,
            autoFocus: true
        });

    }

    reset() {
        this.versions = [];
        this.components = [];
    }

    reload() {
        this.reset();
        this.pullComponents();
        this.pullVersions();
    }


    prepareAutocompletion() {
        if (this.settings.project && this.settings.jiraUrl) {
            if (BreakdownUtil.isFalsy(this.credentials.user) ||
                BreakdownUtil.isFalsy(this.credentials.pass)) {
                this.credentialsModalPanel.show();
            }
            return this.credentials.user && this.credentials.pass;
        }

        return false;
    }

    isOffline() {
        BreakdownParse.readSettings(this.settings, this.credentials);
        return BreakdownUtil.hasOption(this.settings, 'offline');
    }

    pullComponents(query) {
        if (BreakdownUtil.isFalsy(this.components.length) &&
            !this.isOffline() &&
            this.prepareAutocompletion()) {
            let options = BreakdownRequest.prepareOptions({
                url: this.settings.jiraUrl + '/rest/api/2/project/' + this.settings.project + '/components',
            }, this.settings, this.credentials);

            BreakdownRequest.request(options)
                .then(body => {
                    if (BreakdownUtil.isFalsy(this.components.length)) {
                        this.components = _.pluck(body, 'name');
                    }
                    return this.mapSuggestions(this.components, query);
                })
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Components could not be determined' + (rootCause ? ' - ' + rootCause : ''));
                });
        }
        return Promise.resolve(this.mapSuggestions(this.components, query));
    }

    pullVersions(query) {
        if (BreakdownUtil.isFalsy(this.versions.length) &&
            !this.isOffline() &&
            this.prepareAutocompletion()) {

            let options = BreakdownRequest.prepareOptions({
                url: this.settings.jiraUrl + '/rest/api/2/project/' + this.settings.project + '/versions',
            }, this.settings, this.credentials);

            BreakdownRequest.request(options)
                .then(body => {
                    if (BreakdownUtil.isFalsy(this.versions.length)) {
                        this.versions = _.pluck(body, 'name');
                    }
                    return this.mapSuggestions(this.versions, query);
                })
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Versions could not be determined' + (rootCause ? ' - ' + rootCause : ''));
                });
        }

        return Promise.resolve(this.mapSuggestions(this.versions, query));
    }

    pullUsers(query) {
        if (query &&
            !this.isOffline() &&
            this.prepareAutocompletion()) {
            let options = BreakdownRequest.prepareOptions({
                url: this.settings.jiraUrl + '/rest/api/2/user/picker?query=' + query,
            }, this.settings, this.credentials);

            return BreakdownRequest.request(options)
                .then(body => {
                    return _.map(body.users, user => {
                        return {
                            text: user.name,
                            displayText: user.displayName
                        }
                    });
                })
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Users could not be determined' + (rootCause ? ' - ' + rootCause : ''));
                });
        }
        return Promise.resolve([]);
    }


    pullTransitions(key, query) {
        if (!this.isOffline() &&
            this.prepareAutocompletion()) {
            let options = BreakdownRequest.prepareOptions({
                url: this.settings.jiraUrl + '/rest/api/2/issue/' + key + '/transitions',
            }, this.settings, this.credentials);

            return BreakdownRequest.request(options)
                .then(body => {
                    let transitions = _.pluck(body.transitions, 'name')
                    return this.mapSuggestions(transitions, query);
                })
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Transitions could not be determined' + (rootCause ? ' - ' + rootCause : ''));
                });
        }
        return Promise.resolve([]);
    }

    searchIssueKey(editor, bufferPosition) {
        const buffer = editor.getBuffer();
        let line = buffer.lineForRow(bufferPosition.row);
        let key = line.match(/[A-Za-z]{1,10}-\d+/);

        if (key && line.indexOf(key) < bufferPosition.column) {
            return key;
        }
        return '';
    }

    backSearchQualifier(line, column) {
        line = line.substring(0, column);
        let scopeIndex = line.lastIndexOf('('); //beginning of fields section
        let qualIndex = line.lastIndexOf(':'); //end of qualifier
        let qualifier = '';
        if (qualIndex && qualIndex > scopeIndex) {
            qualifier = line.substring(qualIndex - 1, qualIndex);
        }

        return qualifier.toLowerCase() + ':';
    }

    getQualifier(editor, bufferPosition, scopeDescriptor, prefix) {
        let qualifier = '';
        let row = bufferPosition.row;
        let column = bufferPosition.column;

        if (BreakdownParse.tokenHasScope(scopeDescriptor, 'issue.fields.jira')) {
            const buffer = editor.getBuffer();
            const line = buffer.lineForRow(row);
            qualifier = this.backSearchQualifier(line, column);
        }
        return qualifier;
    }

    mapSuggestions(suggestions, query) {
        let filter = suggestions;
        if (query) {
            let lowerQuery = query.toLowerCase();
            filter = _.filter(suggestions, entry => {
                return entry.toLowerCase()
                    .indexOf(lowerQuery) > -1;
            });
        }

        return _.map(filter, suggestion => {
            return {
                text: suggestion
            }
        });
    }

    getSuggestions({
        editor,
        bufferPosition,
        scopeDescriptor,
        prefix,
        activatedManually
    }) {
        if (BreakdownParse.isBreakdownGrammar()) {
            let qualifier = this.getQualifier(editor, bufferPosition, scopeDescriptor, prefix);

            if (BreakdownUtil.equalsIgnoreCase('s:', qualifier)) {
                let key = this.searchIssueKey(editor, bufferPosition);
                if (key) {
                    return this.pullTransitions(key, prefix);
                }
            } else if (BreakdownUtil.equalsIgnoreCase('c:', qualifier)) {
                return this.pullComponents(prefix);
            } else if (BreakdownUtil.equalsIgnoreCase('v:', qualifier)) {
                return this.pullVersions(prefix);
            } else if (BreakdownUtil.equalsIgnoreCase('a:', qualifier)) {
                return this.pullUsers(prefix);
            }

            if (scopeDescriptor.scopes.length == 1) {
                return this.mapSuggestions(['Epic', 'Story', 'Sub-task'], prefix);
            }
        }
        return null;
    }
}
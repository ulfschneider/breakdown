'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownRequest from './breakdown-request';
import BreakdownParse from './breakdown-parse';
import BreakdownCredentialsView from './breakdown-credentials-view';
import BreakdownEnvironment from './breakdown-environment';
import BreakdownStatusBar from './breakdown-status-bar';
import _ from 'underscore';
import {
    CompositeDisposable
} from 'atom';


export default class BreakdownAutocompletionProvider {
    constructor() {
        this.settings = BreakdownEnvironment.getSettings();
        this.credentials = BreakdownEnvironment.getCredentials();

        this.selector = '.breakdown';
        this.inclusionPriority = 1;
        this.suggestionPriority = 2;
        this.filterSuggestions = false; //the user picker won´t work with this set to true
        this.excludeLowerPriority = true;

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

        this.reset();

        this.subscriptions = new CompositeDisposable();
        this.subscriptions.add(atom.workspace.onDidChangeActiveTextEditor(editor => {
            if (BreakdownEnvironment.isBreakdownGrammar()) {
                this.reset();
            }
        }));
    }

    reset() {
        this.versions = [];
        this.components = [];
        this.projects = [];
        this.transitionKeys = new Map();
    }

    reload() {
        this.reset();
        this.pullProjects();
        this.pullComponents();
        this.pullVersions();
    }

    destroy() {
        this.subscriptions.dispose();
    }

    prepareAutocompletion(reduced) {
        if (BreakdownUtil.isFalsy(reduced) && BreakdownUtil.isFalsy(this.settings.project)) {
            return false;
        }
        if (this.settings.jiraUrl) {
            if (BreakdownUtil.isFalsy(this.credentials.user) ||
                BreakdownUtil.isFalsy(this.credentials.pass)) {
                this.credentialsModalPanel.show();
            }
            return this.credentials.user && this.credentials.pass;
        }
        return false;
    }

    isOffline() {
        BreakdownParse.readSettings();
        return BreakdownUtil.hasOption('offline');
    }

    pullComponents(query) {
        if (BreakdownUtil.isFalsyOrEmpty(this.components) &&
            !this.isOffline() &&
            this.prepareAutocompletion()) {
            let options = BreakdownRequest.prepareOptions({
                url: this.settings.jiraUrl + '/rest/api/2/project/' + this.settings.project + '/components',
            });
            BreakdownStatusBar.set('Fetching components');
            return BreakdownRequest.request(options)
                .then(body => {
                    this.components = _.pluck(body, 'name');
                    BreakdownStatusBar.clear();
                    return this.mapSuggestions(this.components, query);
                })
                .catch(error => {
                    BreakdownStatusBar.clear();
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Components could not be determined' + (rootCause ? ' - ' + rootCause : ''));
                });
        }
        return Promise.resolve(this.mapSuggestions(this.components, query));
    }

    pullProjects(query) {
        if (BreakdownUtil.isFalsyOrEmpty(this.projects) &&
            !this.isOffline() &&
            this.prepareAutocompletion(true)) {
            let options = BreakdownRequest.prepareOptions({
                url: this.settings.jiraUrl + '/rest/api/2/project/',
            });
            BreakdownStatusBar.set('Fetching projects');
            return BreakdownRequest.request(options)
                .then(body => {
                    this.projects = _.pluck(body, 'key');
                    BreakdownStatusBar.clear();
                    return this.mapSuggestions(this.projects, query);
                })
                .catch(error => {
                    BreakdownStatusBar.clear();
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Projects could not be determined' + (rootCause ? ' - ' + rootCause : ''));
                });
        }
        return Promise.resolve(this.mapSuggestions(this.projects, query));
    }

    pullVersions(query) {
        if (BreakdownUtil.isFalsyOrEmpty(this.versions) &&
            !this.isOffline() &&
            this.prepareAutocompletion()) {

            let options = BreakdownRequest.prepareOptions({
                url: this.settings.jiraUrl + '/rest/api/2/project/' + this.settings.project + '/versions',
            });
            BreakdownStatusBar.set('Fetching versions');
            return BreakdownRequest.request(options)
                .then(body => {
                    this.versions = _.pluck(body, 'name');
                    BreakdownStatusBar.clear();
                    return this.mapSuggestions(this.versions, query);
                })
                .catch(error => {
                    BreakdownStatusBar.clear();
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Versions could not be determined' + (rootCause ? ' - ' + rootCause : ''));
                });
        }
        return Promise.resolve(this.mapSuggestions(this.versions, query));
    }

    pullUsers(query) {
        if (query &&
            !this.isOffline() &&
            this.prepareAutocompletion(true)) {
            let options = BreakdownRequest.prepareOptions({
                url: this.settings.jiraUrl + '/rest/api/2/user/picker?query=' + query,
            });
            BreakdownStatusBar.set('Fetching users');
            return BreakdownRequest.request(options)
                .then(body => {
                    let map = _.map(body.users, user => {
                        return {
                            text: user.name,
                            displayText: user.displayName
                        }
                    });
                    BreakdownStatusBar.clear();
                    return map.sort((a, b) => {
                        return a.displayText.toLowerCase()
                            .localeCompare(b.displayText.toLowerCase());
                    });
                })
                .catch(error => {
                    BreakdownStatusBar.clear();
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Users could not be determined' + (rootCause ? ' - ' + rootCause : ''));
                });
        }
        return Promise.resolve([]);
    }


    pullTransitions(key, query) {
        let transitions = this.transitionKeys.get(key);
        if (BreakdownUtil.isFalsyOrEmpty(transitions) &&
            !this.isOffline() &&
            this.prepareAutocompletion()) {
            let options = BreakdownRequest.prepareOptions({
                url: this.settings.jiraUrl + '/rest/api/2/issue/' + key + '/transitions',
            });
            BreakdownStatusBar.set('Fetching transitions');
            return BreakdownRequest.request(options)
                .then(body => {
                    let transitions = _.pluck(body.transitions, 'name');
                    this.transitionKeys.set(key, transitions);
                    BreakdownStatusBar.clear();
                    return this.mapSuggestions(transitions, query);
                })
                .catch(error => {
                    BreakdownStatusBar.clear();
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Transitions could not be determined' + (rootCause ? ' - ' + rootCause : ''));
                });
        }
        return Promise.resolve(this.mapSuggestions(transitions, query));
    }

    getBreakdownOptions(query) {
        return this.mapSuggestions(['create', 'update', 'updateself', 'delete', 'rank', 'parentkey', 'nopush', 'offline'], query);
    }

    getBreakdownSettings(query) {
        return this.mapSuggestions(['url: ', 'project: ', 'query: ', 'options: ', 'fixversion: ', 'points: '], query);
    }

    isCreateSettings(scopeDescriptor) {
        if (BreakdownParse.tokenHasScope(scopeDescriptor, 'settings.bkdn') && BreakdownParse.tokenCountScopes(scopeDescriptor) == 2) {
            return true;
        }
        //if the scope descriptor contains more than 2 elements or even no settings.bkdn, we are not about to define settings
        return false;
    }

    searchIssueKey(editor, bufferPosition) {
        let buffer = editor.getBuffer();
        let line = buffer.lineForRow(bufferPosition.row);
        let key = line.match(/[A-Za-z]{1,10}-\d+/);

        if (key && line.indexOf(key[0]) < bufferPosition.column) {
            return key[0];
        } else {
            return '';
        }
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

        if (BreakdownParse.tokenHasScope(scopeDescriptor, 'issue.fields.bkdn')) {
            let buffer = editor.getBuffer();
            let line = buffer.lineForRow(row);
            qualifier = this.backSearchQualifier(line, column);
        }
        return qualifier;
    }

    mapSuggestions(suggestions, query) {
        if (BreakdownUtil.isFalsyOrEmpty(suggestions)) {
            return [];
        }

        let filter = suggestions;
        if (query) {
            let lowerQuery = query.toLowerCase();
            filter = _.filter(suggestions, entry => {
                return entry.toLowerCase()
                    .indexOf(lowerQuery) > -1;
            });
        }

        let map = _.map(filter, suggestion => {
            return {
                text: suggestion
            }
        });

        return map.sort((a, b) => {
            return a.text.toLowerCase()
                .localeCompare(b.text.toLowerCase());
        });
    }


    getSuggestions({
        editor,
        bufferPosition,
        scopeDescriptor,
        prefix,
        activatedManually
    }) {
        if (this.isCreateSettings(scopeDescriptor)) {
            return this.getBreakdownSettings(prefix);
        } else if (BreakdownParse.tokenHasScope(scopeDescriptor, 'settings.options.bkdn')) {
            return this.getBreakdownOptions(prefix);
        } else if (BreakdownEnvironment.isLocked() && BreakdownEnvironment.isBreakdownGrammar()) {
            BreakdownEnvironment.flashEditor();
        } else if (BreakdownEnvironment.isUnlocked() &&
            BreakdownEnvironment.getEditor()) {

            if (BreakdownParse.tokenHasScope(scopeDescriptor, 'settings.project.bkdn')) {
                return this.pullProjects(prefix);
            } else if (BreakdownParse.tokenHasScope(scopeDescriptor, 'settings.fixversion.bkdn')) {
                return this.pullVersions(prefix);
            }

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


            if (BreakdownParse.tokenCountScopes(scopeDescriptor) == 1 && bufferPosition.row == 0) {
                return this.mapSuggestions(['breakdown\n']);
            } else if (BreakdownParse.tokenCountScopes(scopeDescriptor) == 1 && bufferPosition.row > 0) {
                //use row > 0 to not provide this autocompletion in the first line of text
                return this.mapSuggestions(['Epic', 'Story', 'Sub-task'], prefix);
            }
        }
        return null;
    }

    replaceLine(row, text) {
        let buffer = BreakdownEnvironment.getBuffer();
        buffer.setTextInRange([
            [row, 0],
            [row, buffer.lineLengthForRow(row)]
        ], text);
    }

    onDidInsertSuggestion({
        editor,
        triggerPosition,
        suggestion
    }) {
        if (suggestion) {
            let row = triggerPosition.row;
            if (suggestion.text == 'Epic') {
                this.replaceLine(row, 'Epic ');
            } else if (suggestion.text == 'Story') {
                this.replaceLine(row, '\tStory ');
            } else if (suggestion.text == 'Sub-task') {
                this.replaceLine(row, '\t\tSub-task ');
            }
        }
    }
}
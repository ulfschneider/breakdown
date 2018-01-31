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
        this.filterSuggestions = true;
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

    prepareAutocompletion() {
        if (BreakdownParse.isBreakdownGrammar()) {
            BreakdownParse.readSettings(this.settings, this.credentials);

            if (this.settings.project && this.settings.jiraUrl) {
                if (BreakdownUtil.isFalsy(this.credentials.user) ||
                    BreakdownUtil.isFalsy(this.credentials.pass)) {
                    this.credentialsModalPanel.show();
                }
                return this.credentials.user && this.credentials.pass;
            }
        }
        return false;
    }

    pullComponents() {
        if (this.prepareAutocompletion()) {
            let options = BreakdownRequest.prepareOptions({
                url: this.settings.jiraUrl + '/rest/api/2/project/' + this.settings.project + '/components',
            }, this.settings, this.credentials);

            BreakdownRequest.request(options)
                .then(body => {
                    this.components = _.pluck(body, 'name');
                })
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Components could not be determined' + (rootCause ? ' - ' + rootCause : ''));
                });
        }
    }

    pullVersions() {
        if (this.prepareAutocompletion()) {

            let options = BreakdownRequest.prepareOptions({
                url: this.settings.jiraUrl + '/rest/api/2/project/' + this.settings.project + '/versions',
            }, this.settings, this.credentials);

            BreakdownRequest.request(options)
                .then(body => {
                    this.versions = _.pluck(body, 'name');
                })
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Versions could not be determined' + (rootCause ? ' - ' + rootCause : ''));
                });
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

        if (BreakdownParse.tokenHasScope(scopeDescriptor, 'issue.fields.jira')) {
            const buffer = editor.getBuffer();
            const line = buffer.lineForRow(row);
            qualifier = this.backSearchQualifier(line, column);
        }
        return qualifier;
    }

    mapSuggestions(suggestions) {
        return _.map(suggestions, suggestion => {
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
        let qualifier = this.getQualifier(editor, bufferPosition, scopeDescriptor, prefix);
        if (BreakdownUtil.equalsIgnoreCase('c:', qualifier)) {
            this.pullComponents();
            return this.mapSuggestions(this.components);
        } else if (BreakdownUtil.equalsIgnoreCase('v:', qualifier)) {
            this.pullVersions();
            return this.mapSuggestions(this.versions);
        } else if (scopeDescriptor.scopes.length == 1) {
            return this.mapSuggestions(['Epic', 'Story', 'Sub-tasks']);
        }
        //for now, return nothing
        return null;
    }
}
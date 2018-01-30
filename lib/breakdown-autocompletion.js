'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownRequest from './breakdown-request';
import BreakdownParse from './breakdown-parse';
import BreakdownCredentialsView from './breakdown-credentials-view';
import _ from 'underscore';

//TODO user picker
//TODO transitions ??
//TODO failure notification when login fails
//TODO promise for return of data

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


        this.credentialsView = new BreakdownCredentialsView({
            cancel: () => {
                this.credentialsModalPanel.hide();
            },
            submit: (user, pass) => {
                this.credentials.user = user;
                this.credentials.pass = pass;
                this.credentialsModalPanel.hide();
                this.pullVersions();
                this.pullComponents();
            }
        });
        this.credentialsModalPanel = atom.workspace.addModalPanel({
            item: this.credentialsView.getElement(),
            visible: false,
            autoFocus: true
        });

        this.settings.versions = [];
        this.settings.components = [];
    }

    reset() {
        if (BreakdownParse.isBreakdownGrammar()) {
            this.settings.versions = [];
            this.settings.components = [];
            this.settings.project = '';
            this.prepareAutocompletion();
        }
    }

    prepareAutocompletion() {
        if (BreakdownParse.isBreakdownGrammar() &&
            BreakdownUtil.isFalsy(this.settings.versions.length) &&
            BreakdownUtil.isFalsy(this.settings.components.length)) {

            if (BreakdownUtil.isFalsy(this.settings.project) || BreakdownUtil.isFalsy(this.settings.jiraUrl)) {
                BreakdownParse.readSettings(this.settings, this.credentials);
            }

            if (this.settings.project && this.settings.jiraUrl) {
                if (BreakdownUtil.isFalsy(this.credentials.user) ||
                    BreakdownUtil.isFalsy(this.credentials.pass)) {
                    this.credentialsModalPanel.show();
                } else {
                    this.pullVersions();
                    this.pullComponents();
                }
            }
        }
    }

    pullComponents() {
        this.settings.components = [];
        let options = BreakdownRequest.prepareOptions({
            url: this.settings.jiraUrl + '/rest/api/2/project/' + this.settings.project + '/components',
        }, this.settings, this.credentials);

        return BreakdownRequest.request(options)
            .then(body => {
                this.settings.components = _.pluck(body, 'name');
                return this.settings.components;
            })
            .catch(error => {
                let rootCause = BreakdownUtil.stringifyError(error);
                console.log('Components could not be determined' + (rootCause ? ' - ' + rootCause : ''));
            });
    }

    pullVersions() {
        this.settings.versions = [];
        let options = BreakdownRequest.prepareOptions({
            url: this.settings.jiraUrl + '/rest/api/2/project/' + this.settings.project + '/versions',
        }, this.settings, this.credentials);

        return BreakdownRequest.request(options)
            .then(body => {
                this.settings.versions = _.pluck(body, 'name');
                return this.settings.versions;
            })
            .catch(error => {
                let rootCause = BreakdownUtil.stringifyError(error);
                console.log('Versions could not be determined' + (rootCause ? ' - ' + rootCause : ''));
            });
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

    getSuggestions({
        editor,
        bufferPosition,
        scopeDescriptor,
        prefix,
        activatedManually
    }) {
        let qualifier = this.getQualifier(editor, bufferPosition, scopeDescriptor, prefix);

        if (BreakdownUtil.equalsIgnoreCase('c:', qualifier)) {
            //components
            this.prepareAutocompletion();
            return _.map(this.settings.components, component => {
                return {
                    text: component
                }
            });
        } else if (BreakdownUtil.equalsIgnoreCase('v:', qualifier)) {
            //version
            this.prepareAutocompletion();
            return _.map(this.settings.versions, version => {
                return {
                    text: version
                }
            });
        } else if (scopeDescriptor.scopes.length == 1) {
            return [{
                text: 'Epic'
            }, {
                text: 'Story'
            }, {
                text: 'Sub-task'
            }];
        }
        //for now, return nothing
        return [];
    }
}
'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownRequest from './breakdown-request';
import BreakdownParse from './breakdown-parse';
import _ from 'underscore';

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
        if (BreakdownParse.isBreakdownGrammar()) {
            if (BreakdownUtil.isFalsy(this.settings.project) || BreakdownUtil.isFalsy(this.settings.jiraUrl)) {
                BreakdownParse.readSettings(this.settings, this.credentials);
            }

            if (this.settings.project && this.settings.jiraUrl) {
                if (BreakdownUtil.isFalsy((this.credentials.user) || BreakdownUtil.isFalse(this.credentials.pass))) {
                    //TODO ask for credentials
                }
                //TODO ok, this flow is to naive, needs refactoring
                this.pullVersions();
                this.pullComponents();
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
            })
            .catch(error => {
                let rootCause = BreakdownUtil.stringifyError(error);
                console.log('Versions could not be determined' + (rootCause ? ' - ' + rootCause : ''));
            });
    }

    getQualifier(editor, bufferPosition, scopeDescriptor, prefix) {
        let qualifier = '';
        if (BreakdownParse.tokenHasScope(scopeDescriptor, 'issue.fields.jira')) {
            const buffer = editor.getBuffer();
            const prefixLength = prefix ? prefix.length : 0;
            const beginRange = [bufferPosition.row, bufferPosition.column - prefixLength - 2];
            const endRange = [bufferPosition.row, bufferPosition.column - prefixLength];

            qualifier = buffer.getTextInRange([beginRange, endRange]);
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
        }
        //for now, return nothing
        return [];
    }

}
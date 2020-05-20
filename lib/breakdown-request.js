'use babel';
import request from 'request';
import _ from 'underscore';
import BreakdownUtil from './breakdown-util';
import BreakdownParse from './breakdown-parse';
import BreakdownEnvironment from './breakdown-environment';

const shell = require('electron')
    .shell;


export default BreakdownRequest = (function() {

    const MAX_SEARCH_RESULT = 50;

    destroyCursor = function(event) {
        /*
         * Remove cursor that was created by clicking the link
         * But only if it is not the only cursor.
         */
        let editor = BreakdownEnvironment.getEditor();
        if (editor.hasMultipleCursors()) {
            /*
             * Remove the cursor that is exactly at the position the mouse clicked
             * and not just the last added cursor.
             */
            let screenPos = atom.views.getView(editor)
                .component.screenPositionForMouseEvent(event);
            let cursor = editor.getCursorAtScreenPosition(screenPos);
            if (cursor) {
                cursor.destroy();
            }
        }
    };

    return {
        request(options) {
            return new Promise((resolve, reject) => {
                request(options, (error, response, body) => {
                    if (!error && (response.statusCode >= 200 && response.statusCode <= 208)) {
                        resolve(body);
                    } else if (error && error.code) {
                        reject('Error: ' + error.code);
                    } else if (response && response.statusCode) {
                        let explanation = '';
                        if (response.statusCode == 401) {
                            BreakdownEnvironment.clearCredentials();
                            let url = BreakdownUtil.parseUrl(options.url);
                            let jiraUrl = url.protocol + '//' + url.hostname;

                            explanation = '. If the problem persists and you are sure to use the correct username and passphrase, try to sign out and in to [JIRA](' + jiraUrl + ') with your web browser. It might be you need to answer a [CAPTCHA](https://en.wikipedia.org/wiki/CAPTCHA) to access [JIRA](' + jiraUrl + ') again.';
                        }

                        let errorMessages;
                        if (body && body.errorMessages) {
                            errorMessages = BreakdownUtil.concat(body.errorMessages, ', ');
                        }
                        reject('HTTP status code [' + response.statusCode + '](https://httpstatuses.com/' + response.statusCode + ')' +
                            (errorMessages ? ' - ' + errorMessages : '') +
                            explanation
                        );
                    } else {
                        reject('Failure in request, but no error code available');
                    }
                });
            });
        },

        /**
        @param {Object} config - configure the behavior
        @param {String} config.method - REST method: get, put, post, delete, if undefined, get is default
        @param {String} config.json - true to return and provide payload data as json, can be undefined
        @param {String} config.url - the url to load, can be undefined if config.query is given
        @param {String} config.query - a query to search for, can be undefined if config.url is given
        @param {String} config.allFields - only if config.query is given, true to query all fields, default is false
        @param {String} config.changelog - only if config.query is given, true to query changelog, default is false
        @param {Number} config.startAt - only if config.query is given, for pagination, the index to start loading, can be undefined
        @param {Number} config.maxResults - only if config.query is given, for pagination, what is the maximum result to be returned
         */
        prepareOptions(config) {
            let options = {};
            let settings = BreakdownEnvironment.getSettings();
            let credentials = BreakdownEnvironment.getCredentials();
            if (config.method) {
                options.method = config.method;
            }
            if (config.body) {
                options.body = config.body;
            }
            if (config.data) {
                options.body = config.data;
            }
            if (_.isUndefined(config.json)) {
                options.json = true;
            } else {
                options.json = config.json;
            }
            if (config.url) {
                options.url = config.url;
            } else if (config.query) {
                options.url = settings.jiraUrl +
                    '/rest/api/2/search?' +
                    'jql=' + config.query +
                    (config.startAt ? '&startAt=' + config.startAt : '') +
                    (config.maxResults ? '&maxResults=' + config.maxResults : '&maxResults=' + MAX_SEARCH_RESULT) +
                    '&fields=*all';
                if (config.allFields) {
                    options.url += '&fields=*all';
                }
                if (config.changelog) {
                    options.url += '&expand=changelog';
                }
            } else {
                throw new Error('You either have to define a url or a query in the config object.');
            }
            options.auth = {
                'user': credentials.user,
                'pass': credentials.pass
            };

            options.strictSSL = settings.strictSSL;
            options.headers = {
                'content-type': 'application/json',
                'X-Atlassian-Token': 'no-check' //see https://developer.atlassian.com/jiradev/jira-platform/jira-architecture/authentication/form-token-handling#FormTokenHandling-Scripting
            };
            return options;
        },

        openJira(event) {
            if ((event.ctrlKey || event.metaKey) &&
                BreakdownEnvironment.isLocked() &&
                BreakdownEnvironment.isBreakdownGrammar()) {
                destroyCursor(event);
                BreakdownEnvironment.flashEditor();
                return;
            }

            if ((event.ctrlKey || event.metaKey) &&
                BreakdownEnvironment.isUnlocked() &&
                BreakdownEnvironment.getEditor()) {
                destroyCursor(event);
                BreakdownParse.readSettings();
                let settings = BreakdownEnvironment.getSettings();
                if (!settings.jiraUrl) {
                    console.log('No JIRA URL specified');
                    atom.notifications.addWarning('Please specify your JIRA URL in the format\n\nurl: http://your.jira.url\n\nRefer to the https://atom.io/packages/breakdown package for documentation.', {
                        dismissable: true
                    });
                    return;
                }

                let settingsValue = false;
                for (let path of event.path) {
                    if (!_.isUndefined(path.classList)) {
                        if (path.classList.contains('syntax--key') ||
                            path.classList.contains('syntax--value') ||
                            path.classList.contains('syntax--jira-url') ||
                            path.classList.contains('syntax--project')) {

                            if (path.classList.contains('syntax--value')) {
                                settingsValue = true;
                            } else {
                                if (path.classList.contains('syntax--key')) {
                                    let issue = path.innerText;
                                    let url = settings.jiraUrl + '/browse/' + BreakdownUtil.replaceAll(issue, '^', '');
                                    shell.openExternal(url);
                                    break;
                                } else if (settingsValue && path.classList.contains('syntax--jira-url')) {
                                    let url = settings.jiraUrl;
                                    shell.openExternal(url);
                                    break;
                                } else if (settingsValue && path.classList.contains('syntax--project')) {
                                    let project = settings.project;
                                    let url = settings.jiraUrl + '/browse/' + project;
                                    shell.openExternal(url);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    };
})();
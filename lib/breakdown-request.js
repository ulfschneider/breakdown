'use babel';
import fetch from 'node-fetch';
import http from 'http';
import https from 'https';
import _ from 'underscore';
import BreakdownUtil from './breakdown-util';
import BreakdownParse from './breakdown-parse';
import BreakdownEnvironment from './breakdown-environment';

const shell = require('electron')
    .shell;
const httpAgent = new http.Agent();
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

export default BreakdownRequest = (function () {
    const MAX_SEARCH_RESULT = 50;

    destroyCursor = function (event) {
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
        /**
        @param {Object} config - configure the behavior
        @param {String} config.method - REST method: get, put, post, delete, if undefined, get is default
        @param {String} config.url - the url to load, can be undefined if config.query is given
        @param {String} config.query - a query to search for, can be undefined if config.url is given
        @param {String} config.fields - only if config.query is given, configure what fields to query, if not defined, all fields are queried
        @param {String} config.changelog - only if config.query is given, true to query changelog, default is false
        @param {Number} config.startAt - only if config.query is given, for pagination, the index to start loading, can be undefined
        @param {Number} config.maxResults - only if config.query is given, for pagination, what is the maximum result to be returned
         */
        prepareOptions(config) {
            let options = {};
            let settings = BreakdownEnvironment.getSettings();
            let credentials = BreakdownEnvironment.getCredentials();
            options.agent = function (_parsedURL) {
                if (_parsedURL.protocol == 'http:') {
                    return httpAgent;
                } else {
                    return httpsAgent;
                }
            };
            options.headers = {
                'Authorization': "Basic " + Buffer.from(credentials.user + ":" + credentials.pass).toString('base64'),
                'Content-Type': 'application/json',
                'X-Atlassian-Token': 'no-check' //see https://developer.atlassian.com/jiradev/jira-platform/jira-architecture/authentication/form-token-handling#FormTokenHandling-Scripting
            };


            if (config.method) {
                options.method = config.method;
            } else {
                options.method = 'GET';
            }
            if (config.body) {
                options.body = (typeof config.body === 'string' || config.body instanceof String) ? config.body : JSON.stringify(config.body);
            }
            if (config.data) {
                options.body = (typeof config.data === 'string' || config.data instanceof String) ? config.data : JSON.stringify(config.data);
            }
            if (config.url) {
                options.url = config.url;
            } else if (config.query) {
                options.url = settings.jiraUrl +
                    '/rest/api/2/search?' +
                    'jql=' + config.query +
                    (config.startAt ? '&startAt=' + config.startAt : '') +
                    (config.maxResults ? '&maxResults=' + config.maxResults : '&maxResults=' + MAX_SEARCH_RESULT);
                if (config.fields) {
                    options.url += '&fields=' + config.fields;
                } else {
                    options.url += '&fields=*all';
                }
                if (config.changelog) {
                    options.url += '&expand=changelog';
                }
            } else {
                throw new Error('You either have to define a url or a query in the config object.');
            }

            return options;
        },

        httpRequest(options) {
            options = this.prepareOptions(options); //clone and prepare
            let url = options.url;
            delete options.url;
            return new Promise(async (resolve, reject) => {
                try {
                    let response = await fetch(url, options);
                    if ((response.status >= 200 && response.status <= 208)) {
                        const text = await response.text();
                        const json = text === "" ? {} : JSON.parse(text);
                        resolve(json);
                    } else if (response.status) {
                        let explanation = '';
                        if (response.status == 401) {
                            BreakdownEnvironment.clearCredentials();
                            let url = BreakdownUtil.parseUrl(url);
                            let jiraUrl = url.protocol + '//' + url.hostname;

                            explanation = '. If the problem persists and you are sure to use the correct username and passphrase, try to sign out and in to [Jira](' + jiraUrl + ') with your web browser. It might be you need to answer a [CAPTCHA](https://en.wikipedia.org/wiki/CAPTCHA) to access [Jira](' + jiraUrl + ') again. Another reason for not getting access could be, your [Jira](' + jiraUrl + ') server only allows REST API access with an API Token Authentication. You can create an access token from your [Jira](' + jiraUrl + ') profile menu (at the top right corner of your [Jira](' + jiraUrl + ') window) and use that token as a passphrase when working with breakdown (instead of your usual passphrase).';
                        }

                        reject('HTTP status code [' + response.status + ' ' + response.statusText + '](https://httpstatuses.com/' + response.status + ') '
                            + explanation);
                    } else {
                        reject('Failure in request, but no error code available');
                    }
                } catch (e) {
                    reject(e);
                }
            });
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
                    console.log('No Jira URL specified');
                    atom.notifications.addWarning('Please specify your Jira URL in the format\n\nurl: http://your.jira.url\n\nRefer to the https://atom.io/packages/breakdown package for documentation.', {
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
'use babel';
import request from 'request';
import _ from 'underscore';
import BreakdownUtils from './breakdown-util';
import BreakdownParse from './breakdown-parse';
const shell = require('electron')
    .shell;


export default BreakdownRequest = (function() {

    destroyCursor = function(event) {
        /*
         * Remove cursor that was created by clicking the link
         * But only if it is not the only cursor.
         */
        const editor = atom.workspace.getActiveTextEditor();
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
                    if (!error && (response.statusCode == 200 || response.statusCode == 201)) {
                        options.settings.askForCredentials = false;
                        resolve(body);
                    } else
                    if (error && error.code) {
                        reject('Error: ' + error.code);
                    } else if (response && response.statusCode) {
                        if (response.statusCode == 401) {
                            options.settings.askForCredentials = true;
                        }
                        reject('HTTP status code: [' + response.statusCode + '](https://httpstatuses.com/' + response.statusCode + ')');
                    } else {
                        reject();
                    }
                })
            })
        },

        /**
        @param {Object} config - configure the behavior
        @param {String} config.method - REST method: get, put, post, delete, if undefined, get is default
        @param {String} config.json - true to return and provide payload data as json, can be undefined
        @param {String} config.url - the url to load, can be undefined if config.query is given
        @param {String} config.query - a query to search for, can be undefined if config.url is given
        @param {Number} config.startAt - for pagination, the index to start loading, can be undefined
        @param {Number} config.maxResults - for pagination, what is the maximum result to be returned
        @param {Object} settings - the global settings object
        @param {String} settings.jiraUrl - the url of the JIRA system, will be used as a backup if config.url is not given
        @param {Boolean} settings.strictSSL - true to define that ssl certificate issues are to be verified
        @param {Object} credentials - the  credentials object
        @param {String} credentials.user - the username
        @param {String} credentials.pass - the passphrase
         */
        prepareOptions(config, settings, credentials) {
            let options = {};
            if (config.method) {
                options.method = config.method;
            }
            if (config.body) {
                options.body = config.body;
            }
            if (config.data) {
                options.body = config.data;
            }
            if (config.json) {
                options.json = config.json;
            }
            if (config.url) {
                options.url = config.url;
            } else if (config.query) {
                options.url = settings.jiraUrl +
                    '/rest/api/2/search?' +
                    'jql=' + config.query +
                    (config.startAt ? '&startAt=' + config.startAt : '') +
                    (config.maxResults ? '&maxResults=' + config.maxResults : '&maxResults=-1');
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
            options.settings = settings;
            return options;
        },

        openIssue(event, settings) {
            if (BreakdownParse.isBreakdownGrammar() && (event.ctrlKey || event.metaKey)) {
                destroyCursor(event);
                for (let path of event.path) {
                    if (!_.isUndefined(path.classList)) {
                        if (path.classList.contains('syntax--key')) {
                            let issue = path.innerText;

                            if (!settings.jiraUrl) {
                                BreakdownParse.readSettings(settings);
                            }

                            if (!settings.jiraUrl) {
                                atom.notifications.addWarning('Please specify your JIRA url in the document settings in order to open an issue in JIRA. Refer to the https://atom.io/packages/breakdown package in case of question.', {
                                    dismissable: true
                                });
                            }

                            let url = settings.jiraUrl + '/browse/' + BreakdownUtils.replaceAll(issue, '^', '');
                            shell.openExternal(url);
                            break;
                        }
                    }
                };
            }
        },
    }
})();
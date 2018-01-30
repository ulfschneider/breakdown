'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownRequest from './breakdown-request';
import _ from 'underscore';

export default BreakdownAutocompletion = (function() {
    return {
        prepareAutocompletion(download, credentials) {
            if (BreakdownParse.isBreakdownGrammar()) {
                BreakdownParse.readSettings(download.settings, credentials);
                BreakdownAutocompletion.pullComponents(download, credentials);
                BreakdownAutocompletion.pullVersions(download, credentials);
            }
        },

        pullComponents(download, credentials) {
            download.components = [];
            let settings = download.settings;
            let options = BreakdownRequest.prepareOptions({
                url: settings.jiraUrl + '/rest/api/2/project/' + settings.project + '/components',
            }, settings, credentials);

            return BreakdownRequest.request(options)
                .then(body => {
                    download.components = _.pluck(body, 'name');
                })
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Components could not be determined' + (rootCause ? ' - ' + rootCause : ''));
                });
        },

        pullVersions(download, credentials) {
            download.versions = [];
            let settings = download.settings;
            let options = BreakdownRequest.prepareOptions({
                url: settings.jiraUrl + '/rest/api/2/project/' + settings.project + '/versions',
            }, settings, credentials);

            return BreakdownRequest.request(options)
                .then(body => {
                    download.versions = _.pluck(body, 'name');
                })
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Versions could not be determined' + (rootCause ? ' - ' + rootCause : ''));
                });
        }
    };
})();
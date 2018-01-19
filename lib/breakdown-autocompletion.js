'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownRequest from './breakdown-request';
import _ from 'underscore';

export default BreakdownAutocompletion = (function() {
    return {
        pullComponentNames(download, credentials) {
            let options = BreakdownRequest.prepareOptions({
                url: download.settings.jiraUrl + '/rest/api/2/project/' + download.settings.project + '/components',
            }, download.settings, credentials);

            return BreakdownRequest.request(options)
                .then(body => {
                    download.components = _.pluck(body, 'name');
                })
        },

        pullVersions(download, credentials) {
            let options = BreakdownRequest.prepareOptions({
                url: download.settings.jiraUrl + '/rest/api/2/project/' + download.settings.project + '/versions',
            }, download.settings, credentials);

            return BreakdownRequest.request(options)
                .then(body => {
                    download.versions = _.pluck(body, 'name');
                })
        }

    }
})();
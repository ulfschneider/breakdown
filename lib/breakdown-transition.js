'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownRequest from './breakdown-request';
import BreakdownEnvironment from './breakdown-environment';
import _ from 'underscore';

export default BreakdownTransition = (function() {

    return {
        getTransitionFromStatus(transitions, status) {
            return _.find(transitions, transition => {
                return BreakdownUtil.equalsIgnoreCase(transition.name, status.trim());
            });
        },

        getTransitions(key) {
            let options = BreakdownRequest.prepareOptions({
                url: BreakdownEnvironment.getJiraUrl() + '/rest/api/2/issue/' + key + '/transitions'
            });

            return BreakdownRequest.request(options)
                .then(body => {
                    return body.transitions;
                });
        },

        pullStatusCategories() {
            BreakdownStatusBar.set('Fetching status categories');
            let options = BreakdownRequest.prepareOptions({
                url: BreakdownEnvironment.getJiraUrl() + '/rest/api/2/status'
            });

            return BreakdownRequest.request(options)
                .then(body => {
                    let settings = BreakdownEnvironment.getSettings();
                    settings.statusCategories = new Map();
                    body.forEach(status => {
                        settings.statusCategories.set(status.name, status.statusCategory.key);
                    });
                    BreakdownStatusBar.clear();
                    return settings.statusCategories;
                })
                .catch(error => {
                    BreakdownStatusBar.clear();
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Status categories could not be determined' + (rootCause ? ' - ' + rootCause : ''));
                });
        },

        doTransition(key, status) {
            let upload = BreakdownEnvironment.getUpload();
            return this.getTransitions(key)
                .then(transitions => {
                    let transition = this.getTransitionFromStatus(transitions, status);
                    if (transition) {
                        let options = BreakdownRequest.prepareOptions({
                            url: BreakdownEnvironment.getJiraUrl() + '/rest/api/2/issue/' + key + '/transitions',
                            method: 'POST',
                            body: {
                                transition: transition.id
                            },
                        });
                        return BreakdownRequest.request(options)
                            .then(() => {
                                upload.statistics.transitioned.push(BreakdownUtil.createIssueMarkupLink(key) + ' transitioned to status **' + status + '**');

                            })
                            .catch(error => {
                                let rootCause = BreakdownUtil.stringifyError(error);
                                upload.statistics.failed.transition.push(BreakdownUtil.createIssueMarkupLink(key) + ' could not be transitioned to status **' + status + '**' + (rootCause ? ' due to ' + rootCause : ''));

                                console.log('Transition to status=[' + status + '] is not possible for key=[' + key + ']' + (rootCause ? ' due to ' + rootCause : ''));
                            });
                    } else {
                        console.log('Transition to status=[' + status + '] is not possible for key=[' + key + ']');
                        upload.statistics.failed.transition.push(BreakdownUtil.createIssueMarkupLink(key) + ' could not be transitioned to status **' + status + '**');
                    }
                });
        }
    };
})();
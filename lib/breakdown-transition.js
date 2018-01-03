'use babel';

import BreakdownUtils from './breakdown-util';
import BreakdownRequest from './breakdown-request';
import _ from 'underscore';

export default BreakdownTransition = (function() {



    return {
        getTransitionFromStatus(transitions, status) {
            return _.find(transitions, (transition) => {
                return BreakdownUtil.equalsIgnoreCase(transition.name, status.trim());
            });
        },

        //get transitions for issue
        //https://developer.atlassian.com/cloud/jira/platform/rest/#api-api-2-issue-issueIdOrKey-transitions-get
        //GET /rest/api/2/issue/{issueIdOrKey}/transitions
        getTransitions(key, settings, credentials) {
            let options = BreakdownRequest.prepareOptions({
                url: settings.jiraUrl + '/rest/api/2/issue/' + key + '/transitions'
            }, settings, credentials);

            return BreakdownRequest.request(options)
                .then((body) => {
                    return body.transitions;
                });
        },

        //do transition
        //https://developer.atlassian.com/cloud/jira/platform/rest/#api-api-2-issue-issueIdOrKey-transitions-post
        //POST /rest/api/2/issue/{issueIdOrKey}/transitions
        doTransition(key, status, settings, credentials) {
            return this.getTransitions(key, settings, credentials)
                .then((transitions) => {
                    let transition = this.getTransitionFromStatus(transitions, status);
                    if (transition) {
                        let options = BreakdownRequest.prepareOptions({
                            url: settings.jiraUrl + '/rest/api/2/issue/' + key + '/transitions',
                            method: 'POST',
                            body: {
                                transition: transition.id
                            },
                        }, settings, credentials);
                        return BreakdownRequest.request(options);
                    } else {
                        console.error('Transition to status=[' + status + '] is not possible for key=[' + key + ']');
                        atom.notifications.addWarning('Transition to status **' + status +
                            '** is not possible for ' + key);
                    }
                });
        }
    }
})();
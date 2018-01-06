'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownRequest from './breakdown-request';
import _ from 'underscore';

export default BreakdownTransition = (function() {

    return {
        getTransitionFromStatus(transitions, status) {
            return _.find(transitions, transition => {
                return BreakdownUtil.equalsIgnoreCase(transition.name, status.trim());
            });
        },

        getTransitions(key, settings, credentials) {
            let options = BreakdownRequest.prepareOptions({
                url: settings.jiraUrl + '/rest/api/2/issue/' + key + '/transitions'
            }, settings, credentials);

            return BreakdownRequest.request(options)
                .then(body => {
                    return body.transitions;
                });
        },

        doTransition(key, status, settings, credentials) {
            return this.getTransitions(key, settings, credentials)
                .then(transitions => {
                    let transition = this.getTransitionFromStatus(transitions, status);
                    if (transition) {
                        let options = BreakdownRequest.prepareOptions({
                            url: settings.jiraUrl + '/rest/api/2/issue/' + key + '/transitions',
                            method: 'POST',
                            body: {
                                transition: transition.id
                            },
                        }, settings, credentials);
                        return BreakdownRequest.request(options)
                            .catch(error => {
                                let rootCause = BreakdownUtil.stringifyError(error);
                                console.log('Transition to status=[' + status + '] is not possible for key=[' + key + ']' + (rootCause ? ' - ' + rootCause : ''));
                                atom.notifications.addWarning('Transition to status **' + status +
                                    '** is not possible for ' + key + (rootCause ? '\n\n' + rootCause : ''));
                            });
                    } else {
                        console.log('Transition to status=[' + status + '] is not possible for key=[' + key + ']');
                        atom.notifications.addWarning('Transition to status **' + status +
                            '** is not possible for ' + key);
                    }
                });
        }
    }
})();
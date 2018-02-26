'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownEnvironment from './breakdown-environment';
import BreakdownStatusBar from './breakdown-status-bar';

export default BreakdownStatistics = (function() {
    return {
        pullIssueChangelog(key) {
            let settings = BreakdownEnvironment.getSettings();
            let jiraUrl = BreakdownEnvironment.getJiraUrl();
            let options = BreakdownRequest.prepareOptions({
                url: jiraUrl + '/rest/api/2/issue/' + key + '?expand=changelog'
            });
            return BreakdownRequest.request(options)
                .then(body => {
                    return body.changelog;
                });
        },

        addIssueToChangelog(issue, changelog) {
            let download = BreakdownEnvironment.getDownload();
            let statistics = download.statistics;
            console.log(JSON.stringify(changelog));
        },

        pullChangelog() {
            let download = BreakdownEnvironment.getDownload();
            let statistics = download.statistics;
            statistics.changelog = new Map();
            return download.issues.reduce((series, issue, count) => {
                return series.then(() => {
                    BreakdownStatusBar.set('Pulling changelog ' + BreakdownUtil.progressBar(count / download.issues.length))
                    return this.pullIssueChangelog(BreakdownUtil.getKey(issue))
                        .then(changelog => {
                            this.addIssueToChangelog(issue, changelog);
                        })
                        .catch(error => {
                            let rootCause = BreakdownUtil.stringifyError(error);
                            console.log('Failure pulling changelog ' + (rootCause ? ' due to ' + rootCause : ''));
                        });
                });
            }, Promise.resolve());
        },
    };
})();
'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownRequest from './breakdown-request';
import _ from 'underscore';

export default BreakdownRank = (function() {

    return {
        makeRankDataStructure(upload, download) {
            upload.rankingObjects = [];
            //TODO parse all stories from editor
            //TODO compare order with all stories from download
            //TODO make rank data structure
        },

        rankIssues(upload, credentials) {
            return upload.rankingObjects.reduce((series, rankingObject, count) => {
                return series.then(() => {
                    BreakdownStatusBar.set('Ranking in JIRA ' +
                        BreakdownStringify.stringifyProgress(count + 1, upload.rankingObjects.length));
                    if (rankingObject.rankBeforeIssueKey) {
                        return this.rankBeforeIssue(rankingObject.rankBeforeIssueKey, rankingObjects.issueKeys, upload.settings, credentials);
                    } else {
                        return this.rankAfterIssue(rankingObject.rankAfterIssueKey, rankingObjects.issueKeys, upload.settings, credentials);
                    }
                });
            }, Promise.resolve());
        },

        rankBeforeIssue(beforeIssueKey, issueKeys, settings, credentials) {
            let data = {
                issues: issueKeys,
                rankBeforeIssue: beforeIssueKey
            };
            let options = BreakdownRequest.prepareOptions({
                method: 'PUT',
                url: settings.jiraUrl + '/rest/agile/1.0/issue/rank',
                body: data,
            }, settings, credentials);

            return BreakdownRequest.request(options)
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Ranking before key=[' + beforeIssueKey + '] is not possible for keys=[' + BreakdownUtil.concatString(issueKeys) + ']' + (rootCause ? ' - ' + rootCause : ''));
                    atom.notifications.addWarning('Ranking before ' + beforeIssueKey + ' is not possible for ' + BreakdownUtil.concatString(issueKeys) + (rootCause ? '\n\n' + rootCause : ''));
                });
        },

        rankAfterIssue(afterIssueKey, issueKeys, settings, credentials) {
            let data = {
                issues: issueKeys,
                rankAfterIssue: afterIssueKey
            };
            let options = BreakdownRequest.prepareOptions({
                method: 'PUT',
                url: settings.jiraUrl + '/rest/agile/1.0/issue/rank',
                body: data,
            }, settings, credentials);

            return BreakdownRequest.request(options)
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Ranking after key=[' + afterIssueKey + '] is not possible for keys=[' + BreakdownUtil.concatString(issueKeys) + ']' + (rootCause ? ' - ' + rootCause : ''));
                    atom.notifications.addWarning('Ranking after ' + afterIssueKey + ' is not possible for ' + BreakdownUtil.concatString(issueKeys) + (rootCause ? '\n\n' + rootCause : ''));
                });
        }

    }
})();
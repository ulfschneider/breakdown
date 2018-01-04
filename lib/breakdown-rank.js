'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownRequest from './breakdown-request';
import _ from 'underscore';

export default BreakdownRank = (function() {

    return {
        isRankingDesired(settings) {
            return _.find(settings.fields, field => {
                return BreakdownUtil.equalsIgnoreCase(BreakdownUtil.trim(field), 'rank');
            });
        },

        makeRankDataStructure(upload, download) {
            upload.rankingObjects = [];
            let rankedKeys = new Set();

            for (let epicKey of upload.epics.keys()) {
                let uploadEpic = upload.epics.get(epicKey);
                let downloadEpic = download.epics.get(epicKey);

                if (uploadEpic && downloadEpic) {

                    let editorStories = uploadEpic.stories;
                    let downloadStoryKeys = [...downloadEpic.stories.keys()];

                    downloadStoryKeys.forEach((downloadKey, downloadIndex) => {
                        let rankingObject = {
                            rankBeforeIssueKey: downloadKey,
                            issueKeys: []
                        };
                        for (let editorIndex = 0; editorIndex < editorStories.length; editorIndex++) {
                            let editorKey = BreakdownUtil.getKey(editorStories[editorIndex]);
                            let hasDownloadStory = _.indexOf(downloadStoryKeys, editorKey) >= 0;

                            if (downloadKey != editorKey) {
                                if (hasDownloadStory && !rankedKeys.has(editorKey) &&
                                    _.indexOf(downloadStoryKeys, editorKey) > downloadIndex) {
                                    rankingObject.issueKeys.push(editorKey);
                                    rankedKeys.add(editorKey);
                                } else if (!hasDownloadStory && !rankedKeys.has(editorKey)) {
                                    if (editorIndex > 0) {
                                        upload.rankingObjects.push({
                                            rankAfterIssueKey: BreakdownUtil.getKey(editorStories[editorIndex - 1]),
                                            issueKeys: [editorKey]
                                        });
                                    } else if (editorIndex < editorStories.length - 1) {
                                        upload.rankingObjects.push({
                                            rankBeforeIssueKey: BreakdownUtil.getKey(editorStories[editorIndex + 1]),
                                            issueKeys: [editorKey]
                                        });
                                    }
                                    rankedKeys.add(editorKey);
                                }
                            } else {
                                break;
                            }
                        }
                        if (rankingObject.issueKeys.length) {
                            upload.rankingObjects.push(rankingObject);
                        }
                    });
                }
            }
        },

        rankIssues(upload, credentials) {
            return upload.rankingObjects.reduce((series, rankingObject, count) => {
                return series.then(() => {
                    BreakdownStatusBar.set('Ranking in JIRA ' +
                        BreakdownStringify.stringifyProgress(count + 1, upload.rankingObjects.length));
                    if (rankingObject.rankBeforeIssueKey) {
                        return this.rankBeforeIssue(rankingObject.rankBeforeIssueKey, rankingObject.issueKeys, upload.settings, credentials);
                    } else {
                        return this.rankAfterIssue(rankingObject.rankAfterIssueKey, rankingObject.issueKeys, upload.settings, credentials);
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
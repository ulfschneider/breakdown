'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownRequest from './breakdown-request';
import _ from 'underscore';

export default BreakdownRank = (function() {

    return {
        isRankingDesired(settings) {
            return _.find(settings.fields, field => {
                return BreakdownUtil.equalsIgnoreCase(field, 'rank');
            });
        },

        addStoryToEpic(upload, epicIssue, storyIssue) {
            let epicKey = BreakdownUtil.getKey(epicIssue);

            if (!epicKey) {
                //use last epic
                _.last(upload.epics).stories.push(storyIssue);
            } else {
                let epic = _.find(upload.epics, epic => {
                    return epicKey == BreakdownUtil.getKey(epic.issue)
                });
                epic.stories.push(storyIssue);
            }
        },

        addEpic(upload, epicIssue) {
            upload.epics.push({
                issue: epicIssue,
                stories: []
            });
        },

        getEpic(upload, key) {
            for (let epic of upload.epics) {
                if (BreakdownUtil.getKey(epic.issue) == key) {
                    return epic;
                }
            }
            return {};
        },

        makeStoryRankDataStructure(upload, download) {

            let rankedKeys = new Set();

            for (let uploadEpic of upload.epics) {
                let epicKey = BreakdownUtil.getKey(uploadEpic.issue);
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
                                //downloadKey == editorKey
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


        makeRankDataStructure(upload, download) {
            upload.rankingObjects = [];
            this.makeStoryRankDataStructure(upload, download);
            //TODO this.makeEpicRankDataStructure(upload, download);
        },

        rankIssues(upload, credentials) {
            return upload.rankingObjects.reduce((series, rankingObject, count) => {
                return series.then(() => {
                    BreakdownStatusBar.set('Ranking in JIRA ' +
                        BreakdownStringify.stringifyProgress(count + 1, upload.rankingObjects.length));
                    if (rankingObject.rankBeforeIssueKey) {
                        return this.rankBeforeIssue(rankingObject.rankBeforeIssueKey, rankingObject.issueKeys, upload.settings, credentials);
                    } else if (rankingObject.rankAfterIssueKey) {
                        return this.rankAfterIssue(rankingObject.rankAfterIssueKey, rankingObject.issueKeys, upload.settings, credentials);
                    }
                });
            }, Promise.resolve());
        },

        rankBeforeIssue(issueKey, rankingIssueKeys, settings, credentials) {

            let options = BreakdownRequest.prepareOptions({
                method: 'PUT',
                url: settings.jiraUrl + '/rest/agile/1.0/issue/rank',
                body: {
                    rankBeforeIssue: issueKey,
                    issues: rankingIssueKeys
                },
            }, settings, credentials);

            return BreakdownRequest.request(options)
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Ranking of keys=[' + BreakdownUtil.concatString(rankingIssueKeys) + '] before key=[' + issueKey + '] is not possible' + (rootCause ? ' - ' + rootCause : ''));
                    atom.notifications.addWarning('Ranking of ' + BreakdownUtil.concatString(rankingIssueKeys) + ' before ' + issueKey + ' is not possible' + (rootCause ? '\n\n' + rootCause : ''), {
                        dismissable: true
                    });
                });
        },

        rankAfterIssue(issueKey, rankingIssueKeys, settings, credentials) {

            let options = BreakdownRequest.prepareOptions({
                method: 'PUT',
                url: settings.jiraUrl + '/rest/agile/1.0/issue/rank',
                body: {
                    rankAfterIssue: issueKey,
                    issues: rankingIssueKeys
                },
            }, settings, credentials);

            return BreakdownRequest.request(options)
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Ranking of keys=[' + BreakdownUtil.concatString(rankingIssueKeys) + '] after key=[' + issueKey + '] is not possible' + (rootCause ? ' - ' + rootCause : ''));
                    atom.notifications.addWarning('Ranking of ' + BreakdownUtil.concatString(rankingIssueKeys) + ' after ' + issueKey + ' is not possible' + (rootCause ? '\n\n' + rootCause : ''), {
                        dismissable: true
                    });
                });
        },

        /*

    
                makeEpicRankDataStructure(upload, download) {
                    let rankedKeys = new Set();

                    let editorEpics = upload.epics;
                    let downloadEpicKeys = [...download.epics.keys()];

                    downloadEpicKeys.forEach((downloadKey, downloadIndex) => {
                        if (downloadKey != BreakdownUtil.NO_PARENT_KEY) {

                            for (let editorIndex = 0; editorIndex < editorEpics.length; editorIndex++) {
                                let editorKey = BreakdownUtil.getKey(editorEpics[editorIndex].issue);
                                let hasDownloadEpic = _.indexOf(downloadEpicKeys, editorKey) >= 0;

                                if (editorKey != BreakdownUtil.NO_PARENT_KEY) {

                                    if (downloadKey != editorKey) {
                                        if (hasDownloadEpic && !rankedKeys.has(editorKey) &&
                                            _.indexOf(downloadEpicKeys, editorKey) > downloadIndex) {
                                            upload.rankingObjects.push({
                                                rankBeforeEpic: downloadKey,
                                                issue: editorKey
                                            });
                                            rankedKeys.add(editorKey);
                                        } else if (!hasDownloadEpic && !rankedKeys.has(editorKey)) {
                                            if (editorIndex > 0) {
                                                upload.rankingObjects.push({
                                                    rankAfterEpic: BreakdownUtil.getKey(editorEpics[editorIndex - 1]),
                                                    issue: editorKey
                                                });
                                            } else if (editorIndex < editorEpics.length - 1) {
                                                upload.rankingObjects.push({
                                                    rankBeforeEpic: BreakdownUtil.getKey(editorEpics[editorIndex + 1]),
                                                    issue: editorKey
                                                });
                                            }
                                            rankedKeys.add(editorKey);
                                        }
                                    } else {
                                        //downloadKey == editorKey
                                        break;
                                    }
                                }
                            }
                        }
                    });
                },

                rankEpic(rankingObject, settings, credentials) {
                    let key, body;
                    if (rankingObject.rankAfterEpic) {
                        key = rankigObject.rankAfterEpic;
                        body = {
                            rankAfterEpic: key
                        }
                    } else if (rankingObject.rankBeforeEpic) {
                        key = rankingObject.rankBeforeEpic;
                        body = {
                            rankBeforeEpic: key
                        }
                    }

                    let options = BreakdownRequest.prepareOptions({
                        method: 'PUT',
                        url: settings.jiraUrl + '/rest/agile/1.0/' + rankingObject.issue + '/rank',
                        body: body,
                    }, settings, credentials);

                    return BreakdownRequest.request(options)
                        .catch(error => {
                            let rootCause = BreakdownUtil.stringifyError(error);
                            console.log('Ranking in relation to key=[' + key + '] is not possible for key=[' + rankingObject.issue + ']' + (rootCause ? ' - ' + rootCause : ''));
                            atom.notifications.addWarning('Ranking in relation to ' + key + ' is not possible for ' + rankingObject.issue + (rootCause ? '\n\n' + rootCause : ''), {
                                dismissable: true
                            });
                        });
                },
        */
    }
})();
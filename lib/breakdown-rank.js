'use babel';

import BreakdownPush from './breakdown-push';
import BreakdownUtil from './breakdown-util';
import BreakdownRequest from './breakdown-request';
import _ from 'underscore';

export default BreakdownRank = (function() {

    let lastEpic;

    function rankEditorStoriesAgainstDownload(upload, editorStories, downloadStoryKeys, rankedKeys) {
        downloadStoryKeys.forEach((downloadKey, downloadIndex) => {
            let rankingObject = {
                rankBeforeIssueKey: downloadKey,
                issueKeys: []
            };
            for (let editorIndex = 0; editorIndex < editorStories.length; editorIndex++) {
                let editorStory = editorStories[editorIndex];

                let editorKey = BreakdownUtil.getKey(editorStory);
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

    function rankEditorStories(upload, editorStories, rankedKeys) {

        for (let editorIndex = 0; editorIndex < editorStories.length; editorIndex++) {
            let editorStory = editorStories[editorIndex];
            let editorKey = BreakdownUtil.getKey(editorStory);

            if (!rankedKeys.has(editorKey)) {
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
        }
    }

    return {
        isRankingDesired(settings) {
            return _.find(settings.options, field => {
                return BreakdownUtil.equalsIgnoreCase(field, 'rank');
            });
        },

        clear(upload) {
            upload.epics = [];
        },

        addStoryToEpic(upload, epicIssue, storyIssue) {
            let epicKey = BreakdownUtil.getKey(epicIssue);

            if (!epicKey && lastEpic) {
                lastEpic.stories.push(storyIssue);
            } else {
                let epic = this.getEpic(upload, epicKey);
                epic.stories.push(storyIssue);
            }
        },

        addEpic(upload, epicIssue) {
            let key = BreakdownUtil.getKey(epicIssue);
            let epic = this.getEpic(upload, key);
            if (!epic) {
                epic = {
                    issue: epicIssue,
                    stories: []
                };
                lastEpic = epic;
                upload.epics.push(epic);
            }
        },

        getEpic(upload, key) {
            return _.find(upload.epics, (epic => {
                return BreakdownUtil.getKey(epic.issue) == key;
            }));
        },

        makeStoryRankDataStructure(upload, download) {

            let rankedKeys = new Set();
            for (let uploadEpic of upload.epics) {
                let epicKey = BreakdownUtil.getKey(uploadEpic.issue);
                let downloadEpic = download.epics.get(epicKey);

                if (uploadEpic && downloadEpic) {
                    let editorStories = uploadEpic.stories;
                    let downloadStoryKeys = [...downloadEpic.stories.keys()];
                    rankEditorStoriesAgainstDownload(upload, editorStories, downloadStoryKeys, rankedKeys)
                } else {
                    let editorStories = uploadEpic.stories;
                    rankEditorStories(upload, editorStories, rankedKeys);
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
                    if (this.isRankingDesired(upload.settings)) {
                        BreakdownStatusBar.set('Ranking in JIRA ' +
                            BreakdownStringify.stringifyProgress(count + 1, upload.rankingObjects.length));
                    }
                    if (rankingObject.rankBeforeIssueKey) {
                        return this.rankBeforeIssue(rankingObject.rankBeforeIssueKey, rankingObject.issueKeys, upload, credentials);
                    } else if (rankingObject.rankAfterIssueKey) {
                        return this.rankAfterIssue(rankingObject.rankAfterIssueKey, rankingObject.issueKeys, upload, credentials);
                    }
                });
            }, Promise.resolve());
        },

        rankBeforeIssue(issueKey, rankingIssueKeys, upload, credentials) {
            let settings = upload.settings;

            if (!this.isRankingDesired(settings)) {
                upload.statistics.failed.rank.push(BreakdownUtil.createIssueMarkupLink(rankingIssueKeys, settings) + ' rank before ' + BreakdownUtil.createIssueMarkupLink(issueKey, settings) + ' due to missing **rank** option');
                console.log('Ranking of keys=[' + BreakdownUtil.concat(rankingIssueKeys) + '] before key=[' + issueKey + '] is not possible due to missing rank option');
                return Promise.resolve();
            }

            let options = BreakdownRequest.prepareOptions({
                method: 'PUT',
                url: settings.jiraUrl + '/rest/agile/1.0/issue/rank',
                body: {
                    rankBeforeIssue: issueKey,
                    issues: rankingIssueKeys
                },
            }, settings, credentials);

            return BreakdownRequest.request(options)
                .then(() => {
                    upload.statistics.ranked.push(BreakdownUtil.createIssueMarkupLink(rankingIssueKeys, settings) + ' ranked before ' + BreakdownUtil.createIssueMarkupLink(issueKey, settings));
                })
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    upload.statistics.failed.rank.push(BreakdownUtil.createIssueMarkupLink(rankingIssueKeys, settings) + ' rank before ' + BreakdownUtil.createIssueMarkupLink(issueKey, settings) + (rootCause ? ' due to ' + rootCause : ''));
                    console.log('Ranking of keys=[' + BreakdownUtil.concat(rankingIssueKeys) + '] before key=[' + issueKey + '] is not possible' + (rootCause ? ' due to ' + rootCause : ''));
                });
        },

        rankAfterIssue(issueKey, rankingIssueKeys, upload, credentials) {
            let settings = upload.settings;

            if (!this.isRankingDesired(settings)) {
                upload.statistics.failed.rank.push(BreakdownUtil.createIssueMarkupLink(rankingIssueKeys, settings) + ' rank after ' + BreakdownUtil.createIssueMarkupLink(issueKey, settings) + ' due to missing **rank** option');
                console.log('Ranking of keys=[' + BreakdownUtil.concat(rankingIssueKeys) + '] after key=[' + issueKey + '] is not possible due to missing rank option');
                return Promise.resolve();
            }

            let options = BreakdownRequest.prepareOptions({
                method: 'PUT',
                url: settings.jiraUrl + '/rest/agile/1.0/issue/rank',
                body: {
                    rankAfterIssue: issueKey,
                    issues: rankingIssueKeys
                },
            }, settings, credentials);

            return BreakdownRequest.request(options)
                .then(() => {
                    upload.statistics.ranked.push(BreakdownUtil.createIssueMarkupLink(rankingIssueKeys, settings) + ' ranked after ' + BreakdownUtil.createIssueMarkupLink(issueKey, settings));
                })
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    upload.statistics.failed.rank.push(BreakdownUtil.createIssueMarkupLink(rankingIssueKeys, settings) + ' rank after ' + BreakdownUtil.createIssueMarkupLink(issueKey, settings) + (rootCause ? ' due to ' + rootCause : ''));
                    console.log('Ranking of keys=[' + BreakdownUtil.concat(rankingIssueKeys) + '] after key=[' + issueKey + '] is not possible' + (rootCause ? ' due to ' + rootCause : ''));
                });
        },

        /*


                makeEpicRankDataStructure(upload, download) {
                    let rankedKeys = new Set();

                    let editorEpics = upload.epics.values();
                    let downloadEpicKeys = [...download.epics.keys()];

                    downloadEpicKeys.forEach((downloadKey, downloadIndex) => {
                        if (downloadKey != BreakdownUtil.NO_PARENT_IN_SELECTION_KEY) {

                            for (let editorIndex = 0; editorIndex < editorEpics.length; editorIndex++) {
                                let editorKey = BreakdownUtil.getKey(editorEpics[editorIndex].issue);
                                let hasDownloadEpic = _.indexOf(downloadEpicKeys, editorKey) >= 0;

                                if (editorKey != BreakdownUtil.NO_PARENT_IN_SELECTION_KEY) {

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
                            console.log('Ranking in relation to key=[' + key + '] is not possible for key=[' + rankingObject.issue + ']' + (rootCause ? ' due to ' + rootCause : ''));
                            atom.notifications.addWarning('Ranking in relation to ' + key + ' is not possible for ' + rankingObject.issue + (rootCause ? ' due to ' + rootCause : ''), {
                                dismissable: true
                            });
                        });
                },
        */
    }
})();
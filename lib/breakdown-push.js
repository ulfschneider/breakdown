'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownParse from './breakdown-parse';
import BreakdownPull from './breakdown-pull';
import BreakdownTransition from './breakdown-transition';
import BreakdownRank from './breakdown-rank';
import _ from 'underscore';

export default BreakdownPush = (function() {

    return {

        validatePushSettings(settings) {
            return BreakdownPull.validatePullSettings(settings);
        },

        getIssueDiff(originIssue, modifiedIssue, settings) {
            //issuetype, assignee, points, fixversion, summary, parent
            let diffIssue = {
                fields: {}
            };

            let originKey = BreakdownUtil.getKey(originIssue);
            let modifiedKey = BreakdownUtil.getKey(modifiedIssue);
            if (originKey !== modifiedKey) {
                //operate only on issues with same key
                throw new Error('The two issues do not have the same key: ' + originKey + ' and ' + modifiedKey);
            }

            let originIssueType = BreakdownUtil.getIssueType(originIssue);
            let modifiedIssueType = BreakdownUtil.getIssueType(modifiedIssue);
            if (originIssueType !== modifiedIssueType) {
                BreakdownUtil.setIssueType(diffIssue, modifiedIssueType);
            }

            let modifiedStatus = BreakdownUtil.getStatus(modifiedIssue);
            if (BreakdownUtil.getStatus(originIssue) !== modifiedStatus) {
                BreakdownUtil.setStatus(diffIssue, modifiedStatus);
            }


            let modifiedAssignee = BreakdownUtil.getAssignee(modifiedIssue);
            if (BreakdownUtil.getAssignee(originIssue) !== modifiedAssignee) {
                BreakdownUtil.setAssignee(diffIssue, modifiedAssignee);
            }

            let modifiedStoryPoints = BreakdownUtil.getStoryPoints(modifiedIssue, settings);
            if (BreakdownUtil.getStoryPoints(originIssue, settings) !== modifiedStoryPoints) {
                BreakdownUtil.setStoryPoints(diffIssue, modifiedStoryPoints, settings);
            }

            let originFixVersions = BreakdownUtil.getFixVersions(originIssue);
            let modifiedFixVersions = BreakdownUtil.getFixVersions(modifiedIssue);
            if (BreakdownUtil.stringifyFixVersions(originFixVersions) !== BreakdownUtil.stringifyFixVersions(modifiedFixVersions)) {
                BreakdownUtil.setFixVersions(diffIssue, modifiedFixVersions);
            }

            let modifiedSummary = BreakdownUtil.getSummary(modifiedIssue);
            if (BreakdownUtil.getSummary(originIssue) !== modifiedSummary) {
                BreakdownUtil.setSummary(diffIssue, modifiedSummary);
                if (BreakdownUtil.isEpicType(modifiedIssue, settings)) {
                    BreakdownUtil.setEpicName(diffIssue, modifiedSummary, settings);
                }
            }

            if (!BreakdownUtil.isEpicType(originIssue, settings) &&
                BreakdownUtil.isEpicType(modifiedIssue, settings)) {
                BreakdownUtil.setEpicLink(modifiedIssue, '', settings);
                BreakdownUtil.setParentKey(modifiedIssue, '');
            } else if (BreakdownUtil.isStoryType(modifiedIssue, settings)) {
                let originEpicLink = BreakdownUtil.getEpicLink(originIssue, settings);
                let modifiedEpicLink = BreakdownUtil.getEpicLink(modifiedIssue, settings);
                if (originEpicLink !== modifiedEpicLink) {
                    BreakdownUtil.setEpicLink(diffIssue, modifiedEpicLink, settings);
                }
            } else if (BreakdownUtil.isSubTaskType(modifiedIssue, settings)) {
                let originParentKey = BreakdownUtil.getParentKey(originIssue);
                let modifiedParentKey = BreakdownUtil.getParentKey(modifiedIssue);
                if (originParentKey !== modifiedParentKey) {
                    BreakdownUtil.setParentKey(diffIssue, modifiedParentKey);
                }
            }

            if (!_.isEmpty(diffIssue.fields)) {
                BreakdownUtil.setKey(diffIssue, BreakdownUtil.getKey(modifiedIssue));
                return diffIssue;
            }

            return {};
        },


        makeUploadIssue(token, settings) {
            let issue = {
                fields: {}
            };
            BreakdownUtil.setProjectKey(issue, settings.project);
            let key = BreakdownParse.parseKey(token);
            BreakdownUtil.setKey(issue, key);
            let summary = BreakdownParse.parseSummary(token);
            BreakdownUtil.setSummary(issue, summary);
            let status = BreakdownParse.parseStatus(token);
            BreakdownUtil.setStatus(issue, status);
            let assignee = BreakdownParse.parseAssignee(token);
            BreakdownUtil.setAssignee(issue, assignee);
            let fixVersion = BreakdownParse.parseFixVersion(token);
            let split = fixVersion ? fixVersion.split(',') : [];
            BreakdownUtil.setFixVersions(issue, split);

            return issue;
        },

        makeUploadEpicIssue(token, settings) {
            let epicIssue = this.makeUploadIssue(token, settings);
            BreakdownUtil.setIssueType(epicIssue, settings.epicType);
            let epicName = BreakdownUtil.getSummary(epicIssue);
            BreakdownUtil.setEpicName(epicIssue, epicName, settings);
            let points = BreakdownParse.parsePoints(token);
            BreakdownUtil.setStoryPoints(epicIssue, points, settings);
            return epicIssue;
        },

        makeUploadStoryIssue(token, settings, parentIssue) {
            let storyIssue = this.makeUploadIssue(token, settings);
            BreakdownUtil.setIssueType(storyIssue, settings.storyType);
            let points = BreakdownParse.parsePoints(token);
            BreakdownUtil.setStoryPoints(storyIssue, points, settings);
            this.maintainEpicLink(storyIssue, parentIssue, settings);
            return storyIssue;
        },

        makeUploadSubTaskIssue(token, settings, parentIssue) {
            let subTaskIssue = this.makeUploadIssue(token, settings);
            BreakdownUtil.setIssueType(subTaskIssue, settings.subTaskType);
            this.maintainParentLink(subTaskIssue, parentIssue, settings);

            return subTaskIssue;
        },

        makeUploadDataStructure(upload, download) {
            upload.uploadJiraObjects = [];

            const editor = atom.workspace.getActiveTextEditor();
            const grammar = editor.getGrammar();
            const tokens = grammar.tokenizeLines(editor.getText());

            let issue, parentEpicIssue, parentStoryIssue;
            tokens.forEach((token, rowCount) => {
                let originIssue = {};
                if (BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                    let key = BreakdownParse.rowGetValueForScope(token, 'issue.key.jira');
                    originIssue = BreakdownUtil.getIssue(download.issues, key);
                }

                if (BreakdownParse.rowHasScope(token, 'issue.delete.epic.jira')) {
                    issue = this.makeUploadEpicIssue(token, upload.settings);
                    parentEpicIssue = issue;
                    parentStoryIssue = null;
                    if (BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.uploadJiraObjects.push({
                            method: 'DELETE',
                            issue: issue
                        });
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.epic.jira') ||  
                    BreakdownParse.rowHasScope(token, 'issue.resolved.epic.jira')) {
                    issue = this.makeUploadEpicIssue(token, upload.settings);
                    parentEpicIssue = issue;
                    parentStoryIssue = null;
                    if (!BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.uploadJiraObjects.push({
                            method: 'CREATE',
                            issue: issue
                        });
                    } else if (originIssue) {
                        let diffIssue = this.getIssueDiff(originIssue, issue, upload.settings);
                        if (!_.isEmpty(diffIssue)) {
                            upload.uploadJiraObjects.push({
                                method: 'UPDATE',
                                issue: diffIssue
                            });
                        }
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.delete.story.jira')) {
                    issue = this.makeUploadStoryIssue(token, upload.settings);
                    parentStoryIssue = issue;
                    if (BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.uploadJiraObjects.push({
                            method: 'DELETE',
                            issue: issue,
                            parentIssue: parentEpicIssue
                        });
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.story.jira') ||
                    BreakdownParse.rowHasScope(token, 'issue.resolved.story.jira')) {
                    issue = this.makeUploadStoryIssue(token, upload.settings, parentEpicIssue);
                    parentStoryIssue = issue;
                    if (!BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.uploadJiraObjects.push({
                            method: 'CREATE',
                            issue: issue,
                            parentIssue: parentEpicIssue
                        });
                    } else if (originIssue) {
                        let diffIssue = this.getIssueDiff(originIssue, issue, upload.settings);
                        if (!_.isEmpty(diffIssue)) {
                            upload.uploadJiraObjects.push({
                                method: 'UPDATE',
                                issue: diffIssue
                            });
                        }
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.delete.sub-task.jira')) {
                    let parentIssue = (parentStoryIssue ? parentStoryIssue : parentEpicIssue);
                    issue = this.makeUploadSubTaskIssue(token, upload.settings, parentIssue);
                    if (BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.uploadJiraObjects.push({
                            method: 'DELETE',
                            issue: issue,
                            parentIssue: parentIssue
                        });
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.sub-task.jira') ||
                    BreakdownParse.rowHasScope(token, 'issue.resolved.sub-task.jira')) {
                    let parentIssue = (parentStoryIssue ? parentStoryIssue : parentEpicIssue);
                    issue = this.makeUploadSubTaskIssue(token, upload.settings, parentIssue);
                    if (!BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.uploadJiraObjects.push({
                            method: 'CREATE',
                            issue: issue,
                            parentIssue: parentIssue
                        });
                    } else if (originIssue) {
                        let diffIssue = this.getIssueDiff(originIssue, issue, upload.settings);
                        if (!_.isEmpty(diffIssue)) {
                            upload.uploadJiraObjects.push({
                                method: 'UPDATE',
                                issue: diffIssue
                            });
                        }
                    }
                }
            });
        },

        maintainEpicLink(storyIssue, parentIssue, settings) {
            if (parentIssue && parentIssue.key) {
                BreakdownUtil.setEpicLink(storyIssue, parentIssue.key, settings);
            }
        },


        maintainParentLink(subTaskIssue, parentIssue, settings) {
            if (parentIssue && parentIssue.key) {
                BreakdownUtil.setParentKey(subTaskIssue, parentIssue.key);
            }
        },


        maintainParent(uploadJiraObject, settings) {
            let issue = uploadJiraObject.issue;
            if (BreakdownUtil.isStoryType(issue, settings)) {
                this.maintainEpicLink(issue, uploadJiraObject.parentIssue, settings);
            } else if (BreakdownUtil.isSubTaskType(issue, settings)) {
                this.maintainParentLink(issue, uploadJiraObject.parentIssue, settings);
            }
        },

        deleteIssue(deleteJiraObject, settings, credentials) {
            let issue = deleteJiraObject.issue;
            let options = BreakdownRequest.prepareOptions({
                method: 'DELETE',
                url: settings.jiraUrl + '/rest/api/2/issue/' + BreakdownUtil.getKey(issue)
            }, settings, credentials);

            return BreakdownRequest.request(options)
                .catch((error) => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.warn('Issue could not be deleted in JIRA, issuetype=[' + BreakdownUtil.getIssueType(issue) + '] summary=[' + BreakdownUtil.getSummary(issue) + ']' + (rootCause ? ' - ' + rootCause : ''));
                    atom.notifications.addWarning('Issue could not be deleted in JIRA\n\n' +
                        BreakdownUtil.getIssueType(issue) + ' ' +
                        BreakdownUtil.getKey(issue) + '\n\n' +
                        (rootCause ? rootCause : ''), {
                            dismissable: true
                        });
                });
        },

        updateIssue(updateJiraObject, settings, credentials) {
            let issue = updateJiraObject.issue;
            let issuetype = BreakdownUtil.getIssueType(issue);
            let status = BreakdownUtil.getStatus(issue);
            BreakdownUtil.deleteStatus(issue); //we cannot set status directly
            let epicLink = BreakdownUtil.getEpicLink(issue, settings);
            if (issuetype && epicLink) {
                //issuetype changed to story with epic link
                //therefore we have to do a 2-step update
                //1. make the issue a story without epicLink
                //2. change the epicLink
                BreakdownUtil.setEpicLink(issue, '', settings);
            }

            let options = BreakdownRequest.prepareOptions({
                method: 'PUT',
                url: settings.jiraUrl + '/rest/api/2/issue/' + BreakdownUtil.getKey(issue),
                body: issue
            }, settings, credentials);

            return BreakdownRequest.request(options)
                .then(() => {
                    if (issuetype && epicLink) {
                        //issuetype changed to story with epic link
                        //this is the 2. change
                        BreakdownUtil.setEpicLink(issue, epicLink, settings);
                        options.body = issue;
                        return BreakdownRequest.request(options);
                    }
                })
                .then(() => {
                    if (status) {
                        return BreakdownTransition.doTransition(BreakdownUtil.getKey(issue), status, settings, credentials);
                    }
                })
                .catch((error) => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.warn('Issue could not be updated in JIRA, key=[' + BreakdownUtil.getKey(issue) + ']' + (rootCause ? ' - ' + rootCause : ''));
                    atom.notifications.addWarning('Issue could not be updated in JIRA\n\n' +
                        BreakdownUtil.getKey(issue) + '\n\n' +
                        (rootCause ? rootCause : ''), {
                            dismissable: true
                        });
                });

        },

        createIssue(uploadJiraObject, settings, credentials) {

            this.maintainParent(uploadJiraObject, settings);
            let issue = uploadJiraObject.issue;
            let status = BreakdownUtil.getStatus(issue);
            BreakdownUtil.deleteStatus(issue); //we cannot set status directly

            let options = BreakdownRequest.prepareOptions({
                method: 'POST',
                url: settings.jiraUrl + '/rest/api/2/issue/',
                body: issue
            }, settings, credentials);

            return BreakdownRequest.request(options)
                .then(body => {
                    BreakdownUtil.setKey(issue, body.key);
                })
                .then(() => {
                    if (status) {
                        return BreakdownTransition.doTransition(BreakdownUtil.getKey(issue), status, settings, credentials);
                    }
                })
                .catch((error) => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.warn('Issue could not be created in JIRA, issuetype=[' + BreakdownUtil.getIssueType(issue) + '] summary=[' + BreakdownUtil.getSummary(issue) + ']' + (rootCause ? ' - ' + rootCause : ''));
                    atom.notifications.addWarning('Issue could not be created in JIRA\n\n' +
                        BreakdownUtil.getIssueType(issue) + ' ' +
                        BreakdownUtil.getSummary(issue) + '\n\n' +
                        (rootCause ? rootCause : ''), {
                            dismissable: true
                        });
                });
        },

        pushIssues(upload, credentials) {

            return upload.uploadJiraObjects.reduce((series, uploadJiraObject, count) => {
                return series.then(() => {
                    BreakdownStatusBar.set('Pushing to JIRA ' +
                        BreakdownStringify.stringifyProgress(count + 1, upload.uploadJiraObjects.length));
                    if (uploadJiraObject.method == 'CREATE') {
                        return this.createIssue(uploadJiraObject, upload.settings, credentials)
                    } else if (uploadJiraObject.method == 'UPDATE') {
                        return this.updateIssue(uploadJiraObject, upload.settings, credentials)
                    } else if (uploadJiraObject.method == 'DELETE') {
                        return this.deleteIssue(uploadJiraObject, upload.settings, credentials)
                    }
                });
            }, Promise.resolve());
        },

        pushToJira(upload, download, credentials) {
            BreakdownStatusBar.set('Pushing to JIRA');
            console.log('Pushing to JIRA url=[' + upload.settings.jiraUrl + '] project=[' + upload.settings.project + ']');
            atom.notifications.addInfo('Pushing to JIRA\n\nurl: ' + upload.settings.jiraUrl + '<br>project: ' + upload.settings.project);

            return BreakdownPull.pullFromJira(download, credentials)
                .then(() => {
                    BreakdownPush.makeUploadDataStructure(upload, download);
                    return this.pushIssues(upload, credentials);
                })
                .then(() => {
                    BreakdownRanking.makeRankDataStructure(upload, download);
                    return BreakdownRanking.rankIssues(upload, credentials);
                })
                .then(() => {
                    if (upload.uploadJiraObjects.length) {
                        atom.notifications.addSuccess('Data has been pushed to JIRA');
                    } else {
                        atom.notifications.addSuccess('Nothing to push to JIRA');
                    }
                })
                .catch((error) => {
                    BreakdownStatusBar.clear();
                    let rootCause = BreakdownUtil.stringifyError(error);
                    console.log('Data could not be pushed to JIRA' + (rootCause ? ' - ' + rootCause : ''));
                    atom.notifications.addWarning('Data could not be pushed to JIRA' + (rootCause ? '\n\n' + rootCause : ''), {
                        dismissable: true
                    });
                });
        }
    }
})();
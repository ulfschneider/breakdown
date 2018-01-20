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

        getIssueDiff(originIssue, modifiedIssue, modifiedParentIssue, settings) {
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
                BreakdownUtil.setIssueType(diffIssue, modifiedIssueType, BreakdownUtil.METHOD_UPDATE);
            }

            let modifiedStatus = BreakdownUtil.getStatus(modifiedIssue);
            if (BreakdownUtil.getStatus(originIssue) !== modifiedStatus) {
                BreakdownUtil.setStatus(diffIssue, modifiedStatus, BreakdownUtil.METHOD_UPDATE);
            }


            let modifiedAssignee = BreakdownUtil.getAssignee(modifiedIssue);
            if (BreakdownUtil.getAssignee(originIssue) !== modifiedAssignee) {
                BreakdownUtil.setAssignee(diffIssue, modifiedAssignee, BreakdownUtil.METHOD_UPDATE);
            }

            let modifiedStoryPoints = BreakdownUtil.getStoryPoints(modifiedIssue, settings);
            if (BreakdownUtil.getStoryPoints(originIssue, settings) !== modifiedStoryPoints) {
                BreakdownUtil.setStoryPoints(diffIssue, modifiedStoryPoints, settings, BreakdownUtil.METHOD_UPDATE);
            }

            let originFixVersions = BreakdownUtil.getFixVersions(originIssue);
            let modifiedFixVersions = BreakdownUtil.getFixVersions(modifiedIssue);
            if (BreakdownUtil.stringifyFixVersions(originFixVersions) !== BreakdownUtil.stringifyFixVersions(modifiedFixVersions)) {
                BreakdownUtil.setFixVersions(diffIssue, modifiedFixVersions, BreakdownUtil.METHOD_UPDATE);
            }

            let originComponents = BreakdownUtil.getComponents(originIssue);
            let modifiedComponents = BreakdownUtil.getComponents(modifiedIssue);
            if (BreakdownUtil.stringifyComponents(originComponents) !== BreakdownUtil.stringifyComponents(modifiedComponents)) {
                BreakdownUtil.setComponents(diffIssue, modifiedComponents, BreakdownUtil.METHOD_UPDATE);
            }

            let modifiedSummary = BreakdownUtil.getSummary(modifiedIssue);
            if (BreakdownUtil.getSummary(originIssue) !== modifiedSummary) {
                BreakdownUtil.setSummary(diffIssue, modifiedSummary);
                if (BreakdownUtil.isEpicType(modifiedIssue, settings)) {
                    BreakdownUtil.setEpicName(diffIssue, modifiedSummary, settings, BreakdownUtil.METHOD_UPDATE);
                }
            }


            let modifiedParentKey = BreakdownUtil.getKey(modifiedParentIssue);

            if (!BreakdownUtil.isEpicType(originIssue, settings) &&
                BreakdownUtil.isEpicType(modifiedIssue, settings)) {
                //non-epic became an epic
                BreakdownUtil.setEpicLink(modifiedIssue, '', settings, BreakdownUtil.METHOD_UPDATE);
                BreakdownUtil.setEpicName(modifiedIssue, modifiedSummary, BreakdownUtil.METHOD_UPDATE);
                BreakdownUtil.setParentKey(modifiedIssue, '', BreakdownUtil.METHOD_UPDATE);
            } else if (BreakdownUtil.isStoryType(modifiedIssue, settings) && modifiedParentKey != BreakdownUtil.NO_PARENT_IN_SELECTION_KEY) {

                let originEpicLink = BreakdownUtil.getEpicLink(originIssue, settings);
                let modifiedEpicLink = BreakdownUtil.getEpicLink(modifiedIssue, settings);

                if (originEpicLink != modifiedEpicLink) {
                    BreakdownUtil.setEpicLink(diffIssue, modifiedEpicLink, settings, BreakdownUtil.METHOD_UPDATE);

                }
            } else if (BreakdownUtil.isSubTaskType(modifiedIssue, settings) && modifiedParentKey != BreakdownUtil.NO_PARENT_IN_SELECTION_KEY) {
                let originParentKey = BreakdownUtil.getParentKey(originIssue);
                let modifiedParentKey = BreakdownUtil.getParentKey(modifiedIssue);
                if (originParentKey !== modifiedParentKey) {
                    BreakdownUtil.setParentKey(diffIssue, modifiedParentKey, BreakdownUtil.METHOD_UPDATE);
                }
            }

            if (!_.isEmpty(diffIssue.fields)) {
                BreakdownUtil.setKey(diffIssue, BreakdownUtil.getKey(modifiedIssue), BreakdownUtil.METHOD_UPDATE);
                //the issue type is always needed, even if not modified
                BreakdownUtil.setIssueType(diffIssue, modifiedIssueType, BreakdownUtil.METHOD_UPDATE);
                return diffIssue;
            }

            return {};
        },


        makeUploadIssue(token, settings, method) {
            let issue = {
                fields: {}
            };
            BreakdownUtil.setProjectKey(issue, settings.project, method);
            let key = BreakdownParse.parseKey(token);
            BreakdownUtil.setKey(issue, key, method);
            let summary = BreakdownParse.parseSummary(token);
            BreakdownUtil.setSummary(issue, summary, method);
            let status = BreakdownParse.parseStatus(token);
            BreakdownUtil.setStatus(issue, status, method);
            let assignee = BreakdownParse.parseAssignee(token);
            BreakdownUtil.setAssignee(issue, assignee, method);
            let fixVersion = BreakdownParse.parseFixVersion(token);
            BreakdownUtil.setFixVersion(issue, fixVersion, method);
            let component = BreakdownParse.parseComponent(token);
            BreakdownUtil.setComponent(issue, component, method);

            return issue;
        },

        makeUploadEpicIssue(token, settings, method) {
            let epicIssue = this.makeUploadIssue(token, settings, method);
            BreakdownUtil.setIssueType(epicIssue, settings.epicType, method);
            let epicName = BreakdownUtil.getSummary(epicIssue);
            BreakdownUtil.setEpicName(epicIssue, epicName, settings, method);
            let points = BreakdownParse.parsePoints(token);
            BreakdownUtil.setStoryPoints(epicIssue, points, settings, method);
            return epicIssue;
        },

        makeUploadStoryIssue(token, settings, parentIssue, method) {
            let storyIssue = this.makeUploadIssue(token, settings, method);
            BreakdownUtil.setIssueType(storyIssue, settings.storyType, method);
            let points = BreakdownParse.parsePoints(token);
            BreakdownUtil.setStoryPoints(storyIssue, points, settings, method);
            this.maintainEpicLink(storyIssue, parentIssue, settings);
            return storyIssue;
        },

        makeUploadSubTaskIssue(token, settings, parentIssue, method) {
            let subTaskIssue = this.makeUploadIssue(token, settings, method);
            BreakdownUtil.setIssueType(subTaskIssue, settings.subTaskType, method);
            this.maintainParentLink(subTaskIssue, parentIssue, settings);

            return subTaskIssue;
        },

        validateDuplicateUploadKeys() {
            const editor = atom.workspace.getActiveTextEditor();
            const grammar = editor.getGrammar();
            const tokens = grammar.tokenizeLines(editor.getText());
            let keys = new Set();
            for (let token of tokens) {
                if (BreakdownParse.rowHasScope(token, 'issue.key.jira') &&
                    (BreakdownParse.rowHasScope(token, 'issue.delete.epic.jira') ||
                        BreakdownParse.rowHasScope(token, 'issue.epic.jira') ||
                        BreakdownParse.rowHasScope(token, 'issue.resolved.epic.jira') ||
                        BreakdownParse.rowHasScope(token, 'issue.delete.story.jira') ||
                        BreakdownParse.rowHasScope(token, 'issue.story.jira') ||
                        BreakdownParse.rowHasScope(token, 'issue.resolved.story.jira') ||
                        BreakdownParse.rowHasScope(token, 'issue.delete.sub-task.jira') ||
                        BreakdownParse.rowHasScope(token, 'issue.sub-task.jira') ||
                        BreakdownParse.rowHasScope(token, 'issue.resolved.sub-task.jira'))) {
                    let key = BreakdownParse.parseKey(token);

                    if (keys.has(key)) {
                        atom.notifications.addWarning('The duplicate key ' + key + ' is not allowed to be pushed to JIRA. Pushing has been stopped.', {
                            dismissable: true
                        });
                        return false;
                    } else {
                        keys.add(key);
                    }
                }
            }
            return true;
        },

        maintainDefaultFieldSettings(issue, settings) {
            if (settings.fixversion) {
                BreakdownUtil.setFixVersion(issue, settings.fixversion);
            }
            if (settings.points) {
                BreakdownUtil.setStoryPoints(issue, settings.points, settings);
            }
        },

        makeUploadDataStructure(upload, download) {
            upload.uploadJiraObjects = [];
            BreakdownRank.clear(upload);

            const editor = atom.workspace.getActiveTextEditor();
            const grammar = editor.getGrammar();
            const tokens = grammar.tokenizeLines(editor.getText());

            let issue, parentEpicIssue, parentStoryIssue, method;

            tokens.forEach((token, rowCount) => {
                let originIssue = {};
                if (BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                    method = BreakdownUtil.METHOD_UPDATE;

                    let key = BreakdownParse.rowGetValueForScope(token, 'issue.key.jira');
                    originIssue = BreakdownUtil.getIssue(download.issues, key);
                } else {
                    method = BreakdownUtil.METHOD_CREATE;
                }

                if (BreakdownParse.rowHasScope(token, 'issue.no-parent-in-selection.jira')) {

                    issue = {};
                    BreakdownUtil.setKey(issue, BreakdownUtil.NO_PARENT_IN_SELECTION_KEY);
                    parentEpicIssue = issue;
                    parentStoryIssue = null;

                    BreakdownRank.addEpic(upload, issue);
                } else if (BreakdownParse.rowHasScope(token, 'issue.empty-parent.jira')) {
                    let issue = {};
                    BreakdownUtil.setKey(issue, BreakdownUtil.EMPTY_PARENT_KEY);
                    parentEpicIssue = issue;
                    parentStoryIssue = null;

                    BreakdownRank.addEpic(upload, issue);
                } else if (BreakdownParse.rowHasScope(token, 'issue.delete.epic.jira')) {
                    issue = this.makeUploadEpicIssue(token, upload.settings, BreakdownUtil.METHOD_DELETE);
                    parentEpicIssue = issue;
                    parentStoryIssue = null;

                    BreakdownRank.addEpic(upload, parentEpicIssue);
                    if (BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.uploadJiraObjects.push({
                            method: BreakdownUtil.METHOD_DELETE,
                            issue: issue
                        });
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.epic.jira') ||  
                    BreakdownParse.rowHasScope(token, 'issue.resolved.epic.jira')) {
                    issue = this.makeUploadEpicIssue(token, upload.settings, method);
                    parentEpicIssue = issue;
                    parentStoryIssue = null;
                    BreakdownRank.addEpic(upload, parentEpicIssue);
                    if (method == BreakdownUtil.METHOD_CREATE) {
                        this.maintainDefaultFieldSettings(issue, upload.settings);
                        upload.uploadJiraObjects.push({
                            method: BreakdownUtil.METHOD_CREATE,
                            issue: issue
                        });
                    } else if (originIssue) {
                        let diffIssue = this.getIssueDiff(originIssue, issue, parentEpicIssue, upload.settings);
                        if (!_.isEmpty(diffIssue)) {
                            upload.uploadJiraObjects.push({
                                method: BreakdownUtil.METHOD_UPDATE,
                                issue: diffIssue
                            });
                        }
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.delete.story.jira')) {
                    issue = this.makeUploadStoryIssue(token, upload.settings, BreakdownUtil.METHOD_DELETE);
                    parentStoryIssue = issue;
                    BreakdownRank.addStoryToEpic(upload, parentEpicIssue, issue);
                    if (BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.uploadJiraObjects.push({
                            method: BreakdownUtil.METHOD_DELETE,
                            issue: issue,
                            parentIssue: parentEpicIssue
                        });
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.story.jira') ||
                    BreakdownParse.rowHasScope(token, 'issue.resolved.story.jira')) {
                    issue = this.makeUploadStoryIssue(token, upload.settings, parentEpicIssue, method);
                    parentStoryIssue = issue;
                    BreakdownRank.addStoryToEpic(upload, parentEpicIssue, issue);
                    if (method == BreakdownUtil.METHOD_CREATE) {
                        this.maintainDefaultFieldSettings(issue, upload.settings);
                        upload.uploadJiraObjects.push({
                            method: BreakdownUtil.METHOD_CREATE,
                            issue: issue,
                            parentIssue: parentEpicIssue
                        });
                    } else if (originIssue) {
                        let diffIssue = this.getIssueDiff(originIssue, issue, parentEpicIssue, upload.settings);
                        if (!_.isEmpty(diffIssue)) {
                            upload.uploadJiraObjects.push({
                                method: BreakdownUtil.METHOD_UPDATE,
                                issue: diffIssue,
                                parentIssue: parentEpicIssue
                            });
                        }
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.delete.sub-task.jira')) {
                    let parentIssue = (parentStoryIssue ? parentStoryIssue : parentEpicIssue);
                    issue = this.makeUploadSubTaskIssue(token, upload.settings, parentIssue, BreakdownUtil.METHOD_DELETE);
                    if (BreakdownParse.rowHasScope(token, 'issue.key.jira')) {
                        upload.uploadJiraObjects.push({
                            method: BreakdownUtil.METHOD_DELETE,
                            issue: issue,
                            parentIssue: parentIssue
                        });
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.sub-task.jira') ||
                    BreakdownParse.rowHasScope(token, 'issue.resolved.sub-task.jira')) {
                    let parentIssue = (parentStoryIssue ? parentStoryIssue : parentEpicIssue);
                    issue = this.makeUploadSubTaskIssue(token, upload.settings, parentIssue, method);
                    if (method == BreakdownUtil.METHOD_CREATE) {
                        upload.uploadJiraObjects.push({
                            method: BreakdownUtil.METHOD_CREATE,
                            issue: issue,
                            parentIssue: parentIssue
                        });
                    } else if (originIssue) {
                        let diffIssue = this.getIssueDiff(originIssue, issue, parentEpicIssue, upload.settings);
                        if (!_.isEmpty(diffIssue)) {
                            upload.uploadJiraObjects.push({
                                method: BreakdownUtil.METHOD_UPDATE,
                                issue: diffIssue,
                                parentIssue: parentIssue
                            });
                        }
                    }
                }
            });
        },

        maintainEpicLink(storyIssue, parentIssue, settings) {
            let parentKey = BreakdownUtil.getKey(parentIssue);
            if (parentKey != BreakdownUtil.NO_PARENT_IN_SELECTION_KEY &&
                parentKey != BreakdownUtil.EMPTY_PARENT_KEY) {
                BreakdownUtil.setEpicLink(storyIssue, parentKey, settings, BreakdownUtil.METHOD_UPDATE);
            } else if (parentKey == BreakdownUtil.EMPTY_PARENT_KEY) {
                BreakdownUtil.setEpicLink(storyIssue, '', settings, BreakdownUtil.METHOD_UPDATE);
            }
        },


        maintainParentLink(subTaskIssue, parentIssue, settings) {
            let parentKey = BreakdownUtil.getKey(parentIssue);
            if (parentKey != BreakdownUtil.NO_PARENT_IN_SELECTION_KEY &&
                parentKey != BreakdownUtil.EMPTY_PARENT_KEY) {
                BreakdownUtil.setParentKey(subTaskIssue, parentKey, BreakdownUtil.METHOD_UPDATE);
            } else if (parentKey == BreakdownUtil.EMPTY_PARENT_KEY) {
                BreakdownUtil.setParentKey(subTaskIssue, '', BreakdownUtil.METHOD_UPDATE);
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
                .catch(error => {
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
            this.maintainParent(updateJiraObject, settings);

            let issue = updateJiraObject.issue;

            let issuetype = BreakdownUtil.getIssueType(issue);
            let status = BreakdownUtil.getStatus(issue);
            BreakdownUtil.deleteStatus(issue); //we cannot set status directly
            let epicLink = BreakdownUtil.getEpicLink(issue, settings);
            if (issuetype && epicLink) {
                //issuetype changed to story with epic link
                //therefore we have to do a 2-step update
                //1. make the issue a story without epicLink
                //2. set the epicLink
                BreakdownUtil.setEpicLink(issue, '', settings);
            }

            let options = BreakdownRequest.prepareOptions({
                method: 'PUT',
                url: settings.jiraUrl + '/rest/api/2/issue/' + BreakdownUtil.getKey(issue),
                body: issue
            }, settings, credentials);

            return BreakdownRequest.request(options)
                .then(body => {
                    if (issuetype && epicLink) {
                        //issuetype changed to story with epic link
                        //this is the epic link for the changed story
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
                .catch(error => {
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
                .catch(error => {
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
                    if (uploadJiraObject.method == BreakdownUtil.METHOD_CREATE) {
                        return this.createIssue(uploadJiraObject, upload.settings, credentials)
                    } else if (uploadJiraObject.method == BreakdownUtil.METHOD_UPDATE) {
                        return this.updateIssue(uploadJiraObject, upload.settings, credentials)
                    } else if (uploadJiraObject.method == BreakdownUtil.METHOD_DELETE) {
                        return this.deleteIssue(uploadJiraObject, upload.settings, credentials)
                    }
                });
            }, Promise.resolve());
        },

        pushToJira(upload, download, credentials) {
            BreakdownStatusBar.set('Pushing to JIRA');
            atom.notifications.addInfo('Pushing to JIRA\n\nurl: ' + upload.settings.jiraUrl + '<br>project: ' + upload.settings.project);
            if (this.validateDuplicateUploadKeys()) {
                return BreakdownPull.pullFromJira(download, credentials)
                    .then(() => {
                        BreakdownPush.makeUploadDataStructure(upload, download);
                        return this.pushIssues(upload, credentials);
                    })
                    .then(() => {
                        if (BreakdownRank.isRankingDesired(upload.settings)) {
                            BreakdownRank.makeRankDataStructure(upload, download);
                            return BreakdownRank.rankIssues(upload, credentials);
                        }
                    })
                    .then(() => {
                        if (upload.uploadJiraObjects.length ||
                            (BreakdownRank.isRankingDesired(upload.settings) && upload.rankingObjects.length)) {
                            atom.notifications.addSuccess('Data has been pushed to JIRA');
                        } else {
                            atom.notifications.addSuccess('Nothing to push to JIRA');
                        }
                    })
                    .catch(error => {
                        BreakdownStatusBar.clear();
                        let rootCause = BreakdownUtil.stringifyError(error);
                        console.log('Data could not be pushed to JIRA' + (rootCause ? ' - ' + rootCause : ''));
                        atom.notifications.addWarning('Data could not be pushed to JIRA' + (rootCause ? '\n\n' + rootCause : ''), {
                            dismissable: true
                        });
                        return Promise.reject();
                    });
            } else {
                return Promise.reject();
            }
        }
    }
})();
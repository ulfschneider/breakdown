'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownParse from './breakdown-parse';
import BreakdownPull from './breakdown-pull';
import BreakdownTransition from './breakdown-transition';
import BreakdownRank from './breakdown-rank';
import BreakdownEnvironment from './breakdown-environment';
import _ from 'underscore';

export default BreakdownPush = (function () {

    return {

        initializeStatistics() {
            let upload = BreakdownEnvironment.getUpload();
            upload.statistics = {
                created: [],
                updated: [],
                transitioned: [],
                deleted: [],
                ranked: [],
                failed: {
                    create: [],
                    update: [],
                    transition: [],
                    delete: [],
                    rank: []
                }
            };
        },

        displayStatistics() {
            let upload = BreakdownEnvironment.getUpload();
            let success = ''
            if (upload.uploadJiraObjects.length || upload.rankingObjects.length) {
                success = BreakdownUtil.formatDate(upload.statistics.pushed, BreakdownUtil.DAY_FORMAT) + '\n\nData has been pushed from **' + BreakdownEnvironment.getFileNameWithoutExtension() + '** to JIRA';
            } else {
                atom.notifications.addSuccess('Nothing to push to JIRA from ' + BreakdownEnvironment.getFileNameWithoutExtension());
                return;
            }

            if (upload.statistics.created.length ||
                upload.statistics.updated.length ||
                upload.statistics.transitioned.length ||
                upload.statistics.ranked.length ||
                upload.statistics.deleted.length) {
                if (upload.statistics.created.length) {
                    success += '\n\nCreated issues\n\n* ';
                    success += BreakdownUtil.concat(upload.statistics.created, ', ');
                }
                if (upload.statistics.updated.length) {
                    success += '\n\nUpdated issues\n\n* ';
                    success += BreakdownUtil.concat(upload.statistics.updated, ', ');
                }
                if (upload.statistics.transitioned.length) {
                    success += '\n\nTransitioned issues\n';
                    BreakdownUtil.decorate(upload.statistics.transitioned, '\n* ');
                    success += BreakdownUtil.concat(upload.statistics.transitioned, '');
                }
                if (upload.statistics.ranked.length) {
                    success += '\n\nRanked issues\n';
                    BreakdownUtil.decorate(upload.statistics.ranked, '\n* ');
                    success += BreakdownUtil.concat(upload.statistics.ranked, '');
                }
                if (upload.statistics.deleted.length) {
                    success += '\n\nDeleted issues\n\n* ';
                    success += BreakdownUtil.concat(upload.statistics.deleted, ', ');
                }
                atom.notifications.addSuccess(success, {
                    dismissable: true
                });
            }

            if (upload.statistics.failed.create.length ||
                upload.statistics.failed.update.length ||
                upload.statistics.failed.transition.length ||
                upload.statistics.failed.rank.length ||
                upload.statistics.failed.delete.length) {
                let failed = '';
                if (upload.statistics.failed.create.length) {
                    failed += '\n\nIssues not created\n';
                    BreakdownUtil.decorate(upload.statistics.failed.create, '\n* ');
                    failed += BreakdownUtil.concat(upload.statistics.failed.create, '');
                }
                if (upload.statistics.failed.update.length) {
                    failed += '\n\nIssues not updated\n';
                    BreakdownUtil.decorate(upload.statistics.failed.update, '\n* ');
                    failed += BreakdownUtil.concat(upload.statistics.failed.update, '');
                }
                if (upload.statistics.failed.transition.length) {
                    failed += '\n\nIssues not transitioned\n';
                    BreakdownUtil.decorate(upload.statistics.failed.transition, '\n* ');
                    failed += BreakdownUtil.concat(upload.statistics.failed.transition, '');
                }
                if (upload.statistics.failed.rank.length) {
                    failed += '\n\nIssues not ranked\n';
                    BreakdownUtil.decorate(upload.statistics.failed.rank, '\n* ');
                    failed += BreakdownUtil.concat(upload.statistics.failed.rank, '');
                }
                if (upload.statistics.failed.delete.length) {
                    failed += '\n\nIssues not deleted\n';
                    BreakdownUtil.decorate(upload.statistics.failed.delete, '\n* ');
                    failed += BreakdownUtil.concat(upload.statistics.failed.delete, '');
                }
                atom.notifications.addWarning(failed, {
                    dismissable: true
                });
            }

        },


        isPushingDesired() {
            return !BreakdownUtil.hasOption(BreakdownUtil.OPTION_NOPUSH);
        },

        validatePushSettings() {
            return BreakdownPull.validatePullSettings();
        },

        getIssueDiff(originIssue, modifiedIssue, modifiedParentIssue) {

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

            let modifiedStoryPoints = BreakdownUtil.getStoryPoints(modifiedIssue);
            if (BreakdownUtil.getStoryPoints(originIssue) !== modifiedStoryPoints) {
                BreakdownUtil.setStoryPoints(diffIssue, modifiedStoryPoints, BreakdownUtil.METHOD_UPDATE);
            }

            if (!BreakdownUtil.isSubTaskType(modifiedIssue)) {
                //do not maintain fixfersions for sub-tasks
                let originFixVersions = BreakdownUtil.getFixVersions(originIssue);
                let modifiedFixVersions = BreakdownUtil.getFixVersions(modifiedIssue);
                if (BreakdownUtil.stringifyFixVersions(originFixVersions) !== BreakdownUtil.stringifyFixVersions(modifiedFixVersions)) {
                    BreakdownUtil.setFixVersions(diffIssue, modifiedFixVersions, BreakdownUtil.METHOD_UPDATE);
                }
            }

            let originComponents = BreakdownUtil.getComponents(originIssue);
            let modifiedComponents = BreakdownUtil.getComponents(modifiedIssue);
            if (BreakdownUtil.stringifyComponents(originComponents) !== BreakdownUtil.stringifyComponents(modifiedComponents)) {
                BreakdownUtil.setComponents(diffIssue, modifiedComponents, BreakdownUtil.METHOD_UPDATE);
            }

            let modifiedEstimate = BreakdownUtil.getOriginalEstimate(modifiedIssue);
            if (BreakdownUtil.getOriginalEstimate(originIssue) !== modifiedEstimate) {
                BreakdownUtil.setOriginalEstimate(diffIssue, modifiedEstimate, BreakdownUtil.METHOD_UPDATE);
            }

            let modifiedSummary = BreakdownUtil.getSummary(modifiedIssue);
            if (BreakdownUtil.getSummary(originIssue) !== modifiedSummary) {
                BreakdownUtil.setSummary(diffIssue, modifiedSummary);
                if (BreakdownUtil.isEpicType(modifiedIssue)) {
                    BreakdownUtil.setEpicName(diffIssue, modifiedSummary, BreakdownUtil.METHOD_UPDATE);
                }
            }

            let modifiedDescription = BreakdownUtil.getDescription(modifiedIssue);
            let originDescription = BreakdownUtil.getDescription(originIssue);
            if (BreakdownUtil.joinLines(originDescription) !== BreakdownUtil.joinLines(modifiedDescription)) {
                BreakdownUtil.setDescription(diffIssue, modifiedDescription);
            }

            let modifiedParentKey = BreakdownUtil.getKey(modifiedParentIssue);

            if (!BreakdownUtil.isEpicType(originIssue) &&
                BreakdownUtil.isEpicType(modifiedIssue)) {
                //non-epic became an epic
                BreakdownUtil.setEpicLink(modifiedIssue, '', BreakdownUtil.METHOD_UPDATE);
                BreakdownUtil.setEpicName(modifiedIssue, modifiedSummary, BreakdownUtil.METHOD_UPDATE);
                BreakdownUtil.setParentKey(modifiedIssue, '', BreakdownUtil.METHOD_UPDATE);
            } else if (BreakdownUtil.isStoryType(modifiedIssue) && modifiedParentKey != BreakdownUtil.NO_PARENT_IN_SELECTION_KEY) {

                let originEpicLink = BreakdownUtil.getEpicLink(originIssue);
                let modifiedEpicLink = BreakdownUtil.getEpicLink(modifiedIssue);

                if (originEpicLink != modifiedEpicLink) {
                    BreakdownUtil.setEpicLink(diffIssue, modifiedEpicLink, BreakdownUtil.METHOD_UPDATE);

                }
            } else if (BreakdownUtil.isSubTaskType(modifiedIssue) && modifiedParentKey != BreakdownUtil.NO_PARENT_IN_SELECTION_KEY) {
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
            } else {
                return {};
            }
        },


        makeUploadIssue(token, method) {
            let settings = BreakdownEnvironment.getSettings();
            let issue = {
                fields: {}
            };

            let key = BreakdownParse.parseKey(token);
            BreakdownUtil.setKey(issue, key, method);

            if (BreakdownUtil.isFalsyOrEmpty(key)) {
                BreakdownUtil.setProjectKey(issue, settings.project, method);
            }

            let summary = BreakdownParse.parseSummary(token);
            BreakdownUtil.setSummary(issue, summary, method);
            let status = BreakdownParse.parseStatus(token);
            BreakdownUtil.setStatus(issue, status, method);
            let assignee = BreakdownParse.parseAssignee(token);
            BreakdownUtil.setAssignee(issue, assignee, method);
            let component = BreakdownParse.parseComponent(token);
            BreakdownUtil.setComponent(issue, component, method);
            return issue;
        },

        injectUploadDescription(token, issue) {
            let description = BreakdownParse.parseDescription(token);
            BreakdownUtil.addDescription(issue, description);
            return description;
        },

        makeUploadEpicIssue(token, method) {
            let settings = BreakdownEnvironment.getSettings();
            let epicIssue = this.makeUploadIssue(token, method);
            BreakdownUtil.setIssueType(epicIssue, settings.epicType, method);
            let epicName = BreakdownUtil.getSummary(epicIssue);
            BreakdownUtil.setEpicName(epicIssue, epicName, method);
            let points = BreakdownParse.parsePoints(token);
            BreakdownUtil.setStoryPoints(epicIssue, points, method);
            let fixVersion = BreakdownParse.parseFixVersion(token);
            BreakdownUtil.setFixVersion(epicIssue, fixVersion, method);

            return epicIssue;
        },

        makeUploadStoryIssue(token, parentIssue, method) {
            let settings = BreakdownEnvironment.getSettings();
            let storyIssue = this.makeUploadIssue(token, method);
            BreakdownUtil.setIssueType(storyIssue, settings.storyType, method);
            let points = BreakdownParse.parsePoints(token);
            BreakdownUtil.setStoryPoints(storyIssue, points, method);
            this.maintainEpicLink(storyIssue, parentIssue);
            let fixVersion = BreakdownParse.parseFixVersion(token);
            BreakdownUtil.setFixVersion(storyIssue, fixVersion, method);

            return storyIssue;
        },

        makeUploadSubTaskIssue(token, parentIssue, method) {
            let settings = BreakdownEnvironment.getSettings();
            let subTaskIssue = this.makeUploadIssue(token, method);

            BreakdownUtil.setIssueType(subTaskIssue, settings.subTaskType, method);
            this.maintainParentLink(subTaskIssue, parentIssue);
            let origEstimate = BreakdownParse.parseOriginalEstimate(token);
            BreakdownUtil.setOriginalEstimate(subTaskIssue, origEstimate, method);

            return subTaskIssue;
        },

        validateDuplicateUploadKeys() {
            let tokens = BreakdownEnvironment.tokenizeLines();
            let keys = new Set();
            for (let token of tokens) {
                if (BreakdownParse.rowHasScope(token, 'issue.key.bkdn') &&
                    (BreakdownParse.rowHasScope(token, 'issue.delete.epic.bkdn') ||
                        BreakdownParse.rowHasScope(token, 'issue.epic.bkdn') ||
                        BreakdownParse.rowHasScope(token, 'issue.resolved.epic.bkdn') ||
                        BreakdownParse.rowHasScope(token, 'issue.delete.story.bkdn') ||
                        BreakdownParse.rowHasScope(token, 'issue.story.bkdn') ||
                        BreakdownParse.rowHasScope(token, 'issue.resolved.story.bkdn') ||
                        BreakdownParse.rowHasScope(token, 'issue.delete.sub-task.bkdn') ||
                        BreakdownParse.rowHasScope(token, 'issue.sub-task.bkdn') ||
                        BreakdownParse.rowHasScope(token, 'issue.resolved.sub-task.bkdn'))) {
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

        maintainDefaultFieldSettings(issue) {
            let settings = BreakdownEnvironment.getSettings();
            if (!BreakdownUtil.isSubTaskType(issue)
                && settings.fixversion
                && !BreakdownUtil.getFixVersions(issue).length) {
                BreakdownUtil.setFixVersion(issue, settings.fixversion);
            }
            if (!BreakdownUtil.isSubTaskType(issue)
                && settings.points
                && !BreakdownUtil.getStoryPoints(issue)) {
                BreakdownUtil.setStoryPoints(issue, settings.points);
            }
        },

        indicateModifications() {
            let upload = BreakdownEnvironment.getUpload();
            for (let jiraObject of upload.uploadJiraObjects) {
                if (jiraObject.method == BreakdownUtil.METHOD_UPDATE) {
                    let diffIssue = this.getIssueDiff(jiraObject.originIssue, jiraObject.issue, jiraObject.parentIssue);
                    if (!_.isEmpty(diffIssue)) {
                        jiraObject.issue = diffIssue;
                    } else {
                        jiraObject.method = null;
                    }
                } else if (jiraObject.method == BreakdownUtil.METHOD_CREATE) {
                    this.maintainDefaultFieldSettings(jiraObject.issue);
                }
            }
        },

        makeUploadDataStructure() {
            let upload = BreakdownEnvironment.getUpload();
            let download = BreakdownEnvironment.getDownload();
            upload.uploadJiraObjects = [];
            BreakdownRank.clear();
            let issue, parentEpicIssue, parentStoryIssue, parentSubTaskIssue, method;
            let tokens = BreakdownEnvironment.tokenizeLines();

            tokens.forEach((token, rowCount) => {
                let jiraObject = {};
                if (BreakdownParse.rowHasScope(token, 'issue.key.bkdn')) {
                    let key = BreakdownParse.rowGetValueForScope(token, 'issue.key.bkdn');
                    jiraObject.originIssue = BreakdownUtil.getIssue(download.issues, key);
                    jiraObject.method = BreakdownUtil.METHOD_UPDATE;
                } else {
                    jiraObject.method = BreakdownUtil.METHOD_CREATE;
                }

                if (BreakdownParse.rowHasScope(token, 'issue.no-parent-in-selection.bkdn')) {

                    issue = {};
                    BreakdownUtil.setKey(issue, BreakdownUtil.NO_PARENT_IN_SELECTION_KEY);
                    parentEpicIssue = issue;
                    parentStoryIssue = null;
                    parentSubTaskIssue = null;

                    BreakdownRank.addEpic(issue);
                } else if (BreakdownParse.rowHasScope(token, 'issue.empty-parent.bkdn')) {
                    let issue = {};
                    BreakdownUtil.setKey(issue, BreakdownUtil.EMPTY_PARENT_KEY);
                    parentEpicIssue = issue;
                    parentStoryIssue = null;
                    parentSubTaskIssue = null;

                    BreakdownRank.addEpic(issue);
                } else if (BreakdownParse.rowHasScope(token, 'issue.delete.epic.bkdn')) {
                    jiraObject.method = BreakdownUtil.METHOD_DELETE;
                    issue = this.makeUploadEpicIssue(token, jiraObject.method);
                    parentEpicIssue = issue;
                    parentStoryIssue = null;
                    parentSubTaskIssue = null;

                    BreakdownRank.addEpic(parentEpicIssue);

                    if (BreakdownParse.rowHasScope(token, 'issue.key.bkdn')) {
                        jiraObject.issue = issue;
                        upload.uploadJiraObjects.push(jiraObject);
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.epic.bkdn') ||
                    BreakdownParse.rowHasScope(token, 'issue.resolved.epic.bkdn')) {
                    issue = this.makeUploadEpicIssue(token, jiraObject.method);
                    parentEpicIssue = issue;
                    parentStoryIssue = null;
                    parentSubTaskIssue = null;

                    BreakdownRank.addEpic(parentEpicIssue);
                    jiraObject.issue = issue;
                    upload.uploadJiraObjects.push(jiraObject);

                } else if (BreakdownParse.rowHasScope(token, 'issue.delete.story.bkdn')) {
                    jiraObject.method = BreakdownUtil.METHOD_DELETE;
                    issue = this.makeUploadStoryIssue(token, jiraObject.method);
                    parentStoryIssue = issue;
                    parentSubTaskIssue = null;

                    BreakdownRank.addStoryToEpic(parentEpicIssue, issue);

                    if (BreakdownParse.rowHasScope(token, 'issue.key.bkdn')) {
                        jiraObject.issue = issue;
                        jiraObject.parentIssue = parentEpicIssue;
                        upload.uploadJiraObjects.push(jiraObject);
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.story.bkdn') ||
                    BreakdownParse.rowHasScope(token, 'issue.resolved.story.bkdn')) {
                    issue = this.makeUploadStoryIssue(token, parentEpicIssue, jiraObject.method);
                    parentStoryIssue = issue;
                    parentSubTaskIssue = null;

                    BreakdownRank.addStoryToEpic(parentEpicIssue, issue);
                    jiraObject.issue = issue;
                    jiraObject.parentIssue = parentEpicIssue;
                    upload.uploadJiraObjects.push(jiraObject);

                } else if (BreakdownParse.rowHasScope(token, 'issue.delete.sub-task.bkdn')) {
                    let parentIssue = (parentStoryIssue ? parentStoryIssue : parentEpicIssue);
                    jiraObject.method = BreakdownUtil.METHOD_DELETE;
                    issue = this.makeUploadSubTaskIssue(token, parentIssue, jiraObject.method);
                    parentSubTaskIssue = issue;

                    if (BreakdownParse.rowHasScope(token, 'issue.key.bkdn')) {
                        jiraObject.issue = issue;
                        upload.uploadJiraObjects.push(jiraObject);
                    }
                } else if (BreakdownParse.rowHasScope(token, 'issue.sub-task.bkdn') ||
                    BreakdownParse.rowHasScope(token, 'issue.resolved.sub-task.bkdn')) {
                    let parentIssue = (parentStoryIssue ? parentStoryIssue : parentEpicIssue);
                    issue = this.makeUploadSubTaskIssue(token, parentIssue, jiraObject.method);
                    parentSubTaskIssue = issue;
                    jiraObject.issue = issue;
                    jiraObject.parentIssue = parentIssue;
                    upload.uploadJiraObjects.push(jiraObject);
                } else if (BreakdownParse.rowHasScope(token, 'description.value.bkdn')) {
                    let parentIssue;
                    if (parentSubTaskIssue) {
                        parentIssue = parentSubTaskIssue;
                    } else if (parentStoryIssue) {
                        parentIssue = parentStoryIssue;
                    } else if (parentEpicIssue) {
                        parentIssue = parentEpicIssue;
                    }
                    this.injectUploadDescription(token, parentIssue);
                }
            });
            this.indicateModifications();
        },

        maintainEpicLink(storyIssue, parentIssue) {
            let parentKey = BreakdownUtil.getKey(parentIssue);
            if (parentKey != BreakdownUtil.NO_PARENT_IN_SELECTION_KEY &&
                parentKey != BreakdownUtil.EMPTY_PARENT_KEY) {
                BreakdownUtil.setEpicLink(storyIssue, parentKey, BreakdownUtil.METHOD_UPDATE);
            } else if (parentKey == BreakdownUtil.EMPTY_PARENT_KEY) {
                BreakdownUtil.setEpicLink(storyIssue, '', BreakdownUtil.METHOD_UPDATE);
            }
        },


        maintainParentLink(subTaskIssue, parentIssue) {
            let parentKey = BreakdownUtil.getKey(parentIssue);
            if (parentKey != BreakdownUtil.NO_PARENT_IN_SELECTION_KEY &&
                parentKey != BreakdownUtil.EMPTY_PARENT_KEY) {
                BreakdownUtil.setParentKey(subTaskIssue, parentKey, BreakdownUtil.METHOD_UPDATE);
            } else if (parentKey == BreakdownUtil.EMPTY_PARENT_KEY) {
                BreakdownUtil.setParentKey(subTaskIssue, '', BreakdownUtil.METHOD_UPDATE);
            }
        },


        maintainParent(uploadJiraObject) {
            let issue = uploadJiraObject.issue;
            if (BreakdownUtil.isStoryType(issue)) {
                this.maintainEpicLink(issue, uploadJiraObject.parentIssue);
            } else if (BreakdownUtil.isSubTaskType(issue)) {
                this.maintainParentLink(issue, uploadJiraObject.parentIssue);
            }
        },


        hasPushLimit() {
            return BreakdownUtil.hasOption(BreakdownUtil.OPTION_DELETE) ||
                BreakdownUtil.hasOption(BreakdownUtil.OPTION_UPDATE) ||
                BreakdownUtil.hasOption(BreakdownUtil.OPTION_UPDATE_SELF) ||
                BreakdownUtil.hasOption(BreakdownUtil.OPTION_CREATE);
        },

        isNoDeleteDesired() {
            return !BreakdownUtil.hasOption(BreakdownUtil.OPTION_DELETE) && this.hasPushLimit();
        },

        isNoUpdateDesired(updateJiraObject) {
            return this.hasPushLimit() &&
                !BreakdownUtil.hasOption(BreakdownUtil.OPTION_UPDATE) &&
                !this.isUpdateSelf(updateJiraObject);
        },

        isUpdateSelf(updateJiraObject) {
            if (BreakdownUtil.hasOption(BreakdownUtil.OPTION_UPDATE_SELF)) {
                let credentials = BreakdownEnvironment.getCredentials();
                let originAssignee = BreakdownUtil.getAssignee(updateJiraObject.originIssue);
                let self = credentials.user;
                let newAssignee = BreakdownUtil.getAssignee(updateJiraObject.issue);

                return self && (BreakdownUtil.equalsIgnoreCase(self, originAssignee) || BreakdownUtil.equalsIgnoreCase(self, newAssignee));
            }
            return false;
        },

        isNoCreateDesired() {
            return !BreakdownUtil.hasOption(BreakdownUtil.OPTION_CREATE) && this.hasPushLimit();
        },

        deleteIssue(deleteJiraObject) {
            let issue = deleteJiraObject.issue;
            let upload = BreakdownEnvironment.getUpload();
            if (this.isNoDeleteDesired()) {
                upload.statistics.failed.delete.push(BreakdownUtil.createIssueMarkupLink(BreakdownUtil.getKey(issue)) + ' due to missing **delete** option');
                console.log('Issue key=[' + BreakdownUtil.getKey(issue) + '] could not be deleted in JIRA due to missing delete option');
                return Promise.resolve();
            }


            let options = BreakdownRequest.prepareOptions({
                method: 'DELETE',
                url: BreakdownEnvironment.getJiraUrl() + '/rest/api/2/issue/' + BreakdownUtil.getKey(issue)
            });

            return BreakdownRequest.request(options)
                .then(() => {
                    upload.statistics.deleted.push(BreakdownUtil.createIssueMarkupLink(BreakdownUtil.getKey(issue)));
                })
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    upload.statistics.failed.delete.push(BreakdownUtil.createIssueMarkupLink(BreakdownUtil.getKey(issue)) + (rootCause ? ' due to ' + rootCause : ''));
                    console.log('Issue key=[' + BreakdownUtil.getKey(issue) + '] could not be deleted in JIRA' + BreakdownUtil.getIssueType(issue) + ']' + (rootCause ? ' due to ' + rootCause : ''));
                });
        },

        updateIssue(updateJiraObject) {
            this.maintainParent(updateJiraObject);
            let issue = updateJiraObject.issue;
            let upload = BreakdownEnvironment.getUpload();

            if (this.isNoUpdateDesired(updateJiraObject)) {
                upload.statistics.failed.update.push(BreakdownUtil.createIssueMarkupLink(BreakdownUtil.getKey(issue)) + ' due to missing **update** option or unfulfilled **updateself** option');
                console.log('Issue key=[' + BreakdownUtil.getKey(issue) + '] could not be updated in JIRA due to missing update option or unfulfilled updateself option');
                return Promise.resolve();
            }

            let issuetype = BreakdownUtil.getIssueType(issue);
            let status = BreakdownUtil.getStatus(issue);
            BreakdownUtil.deleteStatus(issue); //we cannot set status directly
            let epicLink = BreakdownUtil.getEpicLink(issue);
            if (issuetype && epicLink) {
                //issuetype changed to story with epic link
                //therefore we have to do a 2-step update
                //1. make the issue a story without epicLink
                //2. set the epicLink
                BreakdownUtil.setEpicLink(issue, '');
            }

            let options = BreakdownRequest.prepareOptions({
                method: 'PUT',
                url: BreakdownEnvironment.getJiraUrl() + '/rest/api/2/issue/' + BreakdownUtil.getKey(issue),
                body: issue
            });

            return BreakdownRequest.request(options)
                .then(body => {
                    if (issuetype && epicLink) {
                        //issuetype changed to story with epic link
                        //this is the epic link for the changed story
                        BreakdownUtil.setEpicLink(issue, epicLink);
                        options.body = issue;
                        return BreakdownRequest.request(options);
                    }
                })
                .then(() => {
                    if (status) {
                        return BreakdownTransition.doTransition(BreakdownUtil.getKey(issue), status);
                    } else {
                        upload.statistics.updated.push(BreakdownUtil.createIssueMarkupLink(BreakdownUtil.getKey(issue)));
                    }
                })
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    upload.statistics.failed.update.push(BreakdownUtil.createIssueMarkupLink(BreakdownUtil.getKey(issue)) + (rootCause ? ' due to ' + rootCause : ''));

                    console.log('Issue key=[' + BreakdownUtil.getKey(issue) + '] could not be updated in JIRA' + (rootCause ? ' due to ' + rootCause : ''));
                });

        },

        createIssue(createJiraObject) {
            this.maintainParent(createJiraObject);
            let issue = createJiraObject.issue;
            let upload = BreakdownEnvironment.getUpload();

            if (this.isNoCreateDesired()) {
                upload.statistics.failed.create.push(BreakdownUtil.getIssueType(issue) + ' ' + BreakdownUtil.getSummary(issue) + ' due to missing **create** option');
                console.log('Issue issuetype=[' + BreakdownUtil.getIssueType(issue) + '] summary=[' + BreakdownUtil.getSummary(issue) + '] could not be created in JIRA due to missing create option');
                return Promise.resolve();
            }

            let status = BreakdownUtil.getStatus(issue);
            BreakdownUtil.deleteStatus(issue); //we cannot set status directly
            let options = BreakdownRequest.prepareOptions({
                method: 'POST',
                url: BreakdownEnvironment.getJiraUrl() + '/rest/api/2/issue/',
                body: issue
            });

            return BreakdownRequest.request(options)
                .then(body => {
                    BreakdownUtil.setKey(issue, body.key);
                })
                .then(() => {
                    upload.statistics.created.push(BreakdownUtil.createIssueMarkupLink(BreakdownUtil.getKey(issue)));
                    if (status) {
                        return BreakdownTransition.doTransition(BreakdownUtil.getKey(issue), status);
                    }
                })
                .catch(error => {
                    let rootCause = BreakdownUtil.stringifyError(error);
                    upload.statistics.failed.create.push(BreakdownUtil.getIssueType(issue) + ' ' + BreakdownUtil.getSummary(issue) + (rootCause ? ' due to ' + rootCause : ''));
                    console.log('Issue issuetype=[' + BreakdownUtil.getIssueType(issue) + '] summary=[' + BreakdownUtil.getSummary(issue) + '] could not be created in JIRA ' + (rootCause ? 'due to ' + rootCause : ''));
                });
        },

        pushIssues() {
            let upload = BreakdownEnvironment.getUpload();
            return upload.uploadJiraObjects.reduce((series, uploadJiraObject, count) => {
                return series.then(() => {
                    BreakdownStatusBar.push('Pushing to JIRA ' +
                        BreakdownStringify.stringifyProgress(count + 1, upload.uploadJiraObjects.length) + ' from ' + BreakdownEnvironment.getFileNameWithoutExtension());
                    if (uploadJiraObject.method == BreakdownUtil.METHOD_CREATE) {
                        return this.createIssue(uploadJiraObject);
                    } else if (uploadJiraObject.method == BreakdownUtil.METHOD_UPDATE) {
                        return this.updateIssue(uploadJiraObject);
                    } else if (uploadJiraObject.method == BreakdownUtil.METHOD_DELETE) {
                        return this.deleteIssue(uploadJiraObject);
                    }
                });
            }, Promise.resolve());
        },

        pushToJira() {
            let settings = BreakdownEnvironment.getSettings();
            BreakdownStatusBar.push('Pushing to JIRA from ' + BreakdownEnvironment.getFileNameWithoutExtension());
            atom.notifications.addInfo('Pushing to JIRA\n\nurl: ' + settings.jiraUrl + '<br>project: ' + settings.project);
            this.initializeStatistics();
            if (this.validateDuplicateUploadKeys()) {
                return BreakdownPull.pullFromJira()
                    .then(() => {
                        this.makeUploadDataStructure();
                        return this.pushIssues();
                    })
                    .then(() => {
                        BreakdownRank.makeRankDataStructure();
                        return BreakdownRank.rankIssues();
                    })
                    .then(() => {
                        let upload = BreakdownEnvironment.getUpload();
                        upload.statistics.pushed = new Date();
                        this.displayStatistics();
                    })
                    .catch(error => {
                        BreakdownStatusBar.clear();
                        let rootCause = BreakdownUtil.stringifyError(error);
                        console.log('Data could not be pushed to JIRA' + (rootCause ? ' due to ' + rootCause : ''));
                        atom.notifications.addWarning('Data could not be pushed to JIRA' + (rootCause ? ' due to ' + rootCause : ''), {
                            dismissable: true
                        });
                        return Promise.reject();
                    });
            } else {
                return Promise.reject();
            }
        }
    };
})();

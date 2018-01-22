'use babel';

import BreakdownUtil from './breakdown-util';
import BreakdownParse from './breakdown-parse';
import _ from 'underscore';

export default BreakdownStringify = (function() {

    return {
        stringifyAfterPull(download) {
            const editor = atom.workspace.getActiveTextEditor();
            if (editor && BreakdownParse.isBreakdownGrammar()) {
                download.settings.stringifyAfterPull = false;
                const buffer = editor.getBuffer();
                buffer.setTextViaDiff(this.stringifyJiraContent(download));
                BreakdownBeautify.beautify(download.settings);

                if (atom.config.get(BreakdownUtil.BREAKDOWN_PACKAGE_NAME + '.foldAfterPull')) {
                    editor.foldAll();
                    editor.setCursorScreenPosition([0, 0]);
                }
            }
        },

        stringifyParentKey(issue, settings) {
            let result = '';
            if (BreakdownUtil.hasOption(settings, 'parentkey')) {
                let epic = BreakdownUtil.getEpicLink(issue, settings);
                let parent = BreakdownUtil.getParentKey(issue);
                if (epic) {
                    result += '^';
                    result += epic;
                } else if (parent) {
                    result += '^';
                    result += parent;
                }
            }
            return result;
        },

        stringifyJiraObject(jiraObject, settings) {
            let result = '';
            let issue = jiraObject.issue;
            if (issue) {
                if (BreakdownUtil.isStoryType(issue, settings)) {
                    result += '\t';
                } else if (BreakdownUtil.isSubTaskType(issue, settings)) {
                    result += '\t\t';
                }
                if (BreakdownUtil.isResolved(issue)) {
                    result += 'Resolved ';
                }
                result += BreakdownUtil.getIssueType(issue);
                result += ' ';
                result += BreakdownUtil.getKey(issue)
                result += ' ';
                result += issue.fields.summary;
                result += this.stringifyFields(jiraObject, settings);
                let parentKey = this.stringifyParentKey(issue, settings);
                if (parentKey) {
                    result += ' ';
                    result += parentKey;
                }

                result += BreakdownUtil.getEditorLineEnding();
            }
            return result;
        },

        stringifyProgress(fraction, total, sum) {
            let result = '';
            if (total) {
                if (sum) {
                    result += 'Σ=';
                }
                result += fraction;
                result += '/';
                result += total;
                result += ' ';
                result += BreakdownUtil.progressBar(fraction / total);
            }
            return result;
        },

        stringifyFields(jiraObject, settings) {
            let result = '';
            let totalPoints = 0;
            let donePoints = 0;
            let issue = jiraObject.issue;
            let issuetype = BreakdownUtil.getIssueType(issue);

            if (BreakdownUtil.isEpicType(issue, settings)) {
                totalPoints = this.summarizePoints(jiraObject, settings);
                donePoints = this.summarizeDonePoints(jiraObject, settings);
            }

            if (this.hasPrimaryFields(issue, settings) || totalPoints) {
                result += ' (';
                if (this.hasStatus(issue, settings)) {
                    result += ' s:';
                    result += BreakdownUtil.getStatus(issue);
                }
                if (this.hasAssignee(issue, settings)) {
                    result += ' a:'
                    result += BreakdownUtil.getAssignee(issue);
                }
                if (this.hasPoints(issue, settings) || totalPoints) {
                    result += ' p:';
                    let points = BreakdownUtil.getStoryPoints(issue, settings);
                    if (points) {
                        result += points;
                    }
                    if (totalPoints) {
                        if (points) {
                            result += ' ';
                        }
                        result += this.stringifyProgress(donePoints, totalPoints, true);
                    }
                }
                if (this.hasFixVersion(issue, settings)) {
                    let fixversions = BreakdownUtil.getFixVersions(issue);
                    result += ' v:';
                    result += BreakdownUtil.stringifyFixVersions(fixversions);
                }
                if (this.hasComponents(issue, settings)) {
                    let components = BreakdownUtil.getComponents(issue);
                    result += ' c:';
                    result += BreakdownUtil.stringifyComponents(components);
                }

                result += ' ) '
            }
            return result;
        },


        stringifySettings(download) {
            let result = '';
            let lineEnding = BreakdownUtil.getEditorLineEnding();
            result += 'breakdown';
            result += lineEnding;

            result += 'url: '
            result += download.settings.jiraUrl;
            result += lineEnding;

            if (download.settings.project) {
                result += 'project: ';
                result += download.settings.project;
                result += lineEnding;
            }

            result += 'query: ';
            result += download.settings.query;
            result += lineEnding;

            if (download.settings.options.length) {
                result += 'options: ';
                result += BreakdownUtil.concat(download.settings.options, ' ');
                result += lineEnding;
            }

            if (download.settings.fixversion) {
                result += 'fixversion: ';
                result += download.settings.fixversion;
                result += lineEnding;
            }
            if (download.settings.points) {
                result += 'points: ';
                result += download.settings.points;
                result += lineEnding;
            }


            result += '---';
            result += lineEnding;

            return result;
        },

        stringifyUnresolvedIssues(unresolvedIssues, settings) {
            let lineEnding = BreakdownUtil.getEditorLineEnding();
            let result = '\t\t';
            result += unresolvedIssues.length;
            result += ' issues unresolved:';
            result += lineEnding;

            unresolvedIssues.forEach((issue, index) => {
                result += '\t\t';
                result += BreakdownUtil.getKey(issue);
                result += ' ';
                result += BreakdownUtil.getIssueType(issue);
                result += ', ';
                result += BreakdownUtil.getStatus(issue);
                result += ': ';
                result += BreakdownUtil.getSummary(issue);
                let parentKey = this.stringifyParentKey(issue, settings);
                if (parentKey) {
                    result += ' ';
                    result += parentKey;
                }

                if (index < unresolvedIssues.length - 1) {
                    result += lineEnding;
                }
            });
            return result;
        },

        stringifyResolvedIssues(resolvedIssues, settings) {
            let lineEnding = BreakdownUtil.getEditorLineEnding();
            let result = '\t\t';
            result += resolvedIssues.length;
            result += ' issues resolved:';
            result += lineEnding;

            resolvedIssues.forEach((issue, index) => {
                result += '\t\t';
                result += 'Resolved ';
                result += BreakdownUtil.getKey(issue);
                result += ' ';
                result += BreakdownUtil.getIssueType(issue);
                result += ', ';
                result += BreakdownUtil.getStatus(issue);
                result += ': ';
                result += BreakdownUtil.getSummary(issue);
                let parentKey = this.stringifyParentKey(issue, settings);
                if (parentKey) {
                    result += ' ';
                    result += parentKey;
                }

                if (index < resolvedIssues.length - 1) {
                    result += lineEnding;
                }
            });
            return result;
        },


        stringifyDownloadStatistics(download) {
            let lineEnding = BreakdownUtil.getEditorLineEnding();
            let result = 'Statistics';
            result += lineEnding;

            //pulled date
            if (download.statistics.pulled) {
                result += 'Pulled at ';
                result += download.statistics.pulled;
                result += lineEnding;
            }

            //assignees
            let assigneeCount = download.assignees.size();
            if (assigneeCount) {
                let resolvedCount = download.assignees.resolvedIssueCount();
                let issueCount = download.assignees.issueCount();
                result += 'Issue Resolution '
                result += this.stringifyProgress(resolvedCount, issueCount, true);
                result += lineEnding;
                download.assignees
                    .forEach(assignee => {
                        let unresolvedCount = assignee.unresolvedIssueCount();
                        let resolvedCount = assignee.resolvedIssueCount();
                        let issueCount = assignee.issueCount();

                        if (issueCount) {
                            result += '\t';
                            result += assignee.getName();
                            result += ', ';
                            result += this.stringifyProgress(resolvedCount, issueCount, true);

                            if (unresolvedCount) {
                                result += lineEnding;
                                result += this.stringifyUnresolvedIssues(assignee.getUnresolvedIssues(), download.settings);
                            }
                            if (resolvedCount) {
                                result += lineEnding;
                                result += this.stringifyResolvedIssues(assignee.getResolvedIssues(), download.settings);
                            }
                            result += lineEnding;
                        }
                    });
            }

            //total points and progress
            let totalPoints = download.statistics.totalPoints;
            let donePoints = download.statistics.donePoints;
            if (totalPoints) {
                result += 'Points ';
                result += this.stringifyProgress(donePoints, totalPoints, true);
                result += lineEnding;
            }

            //issue numbers
            result += 'Issue numbers: '
            result += download.settings.epicType + ' Σ=' + download.statistics.epicCount;
            result += ', ';
            result += download.settings.storyType + ' Σ=' + download.statistics.storyCount;
            result += ', ';
            result += download.settings.subTaskType + ' Σ=' + download.statistics.subTaskCount;
            result += lineEnding;

            result += '---';
            result += lineEnding;
            return result;
        },

        stringifyJiraContent(download) {
            let result = '';
            let lineEnding = BreakdownUtil.getEditorLineEnding();
            result += this.stringifySettings(download);
            result += this.stringifyDownloadStatistics(download);
            result += lineEnding;
            result += BreakdownUtil.EDITABLE_CONTENT;
            result += lineEnding + lineEnding;
            for (let epicKey of download.epics.keys()) {
                //format the epic line
                let epic = download.epics.get(epicKey);

                if (epicKey == BreakdownUtil.NO_PARENT_IN_SELECTION_KEY && (epic.stories.size || epic.subTasks.size)) {
                    result += BreakdownUtil.NO_PARENT_IN_SELECTION;
                    let totalPoints = this.summarizePoints(epic, download.settings);
                    let donePoints = this.summarizeDonePoints(epic, download.settings);

                    if (totalPoints) {
                        result += ' p:'
                        result += this.stringifyProgress(donePoints, totalPoints, true);
                    }
                    result += lineEnding;
                } else if (epicKey == BreakdownUtil.EMPTY_PARENT_KEY && (epic.stories.size || epic.subTasks.size)) {
                    result += BreakdownUtil.EMPTY_PARENT;
                    let totalPoints = this.summarizePoints(epic, download.settings);
                    let donePoints = this.summarizeDonePoints(epic, download.settings);

                    if (totalPoints) {
                        result += ' p:'
                        result += this.stringifyProgress(donePoints, totalPoints, true);
                    }
                    result += lineEnding;
                } else {
                    result += this.stringifyJiraObject(epic, download.settings);
                }

                //format the subTask line below an epic
                for (let subTask of epic.subTasks.values()) {
                    if (subTask.issue) {
                        result += this.stringifyJiraObject(subTask, download.settings);
                    }
                }

                //format the story line below an epic
                for (let story of epic.stories.values()) {
                    if (story.issue) {
                        result += this.stringifyJiraObject(story, download.settings);
                    }

                    //format the sub-task line below a story
                    for (let subTask of story.subTasks.values()) {
                        if (subTask.issue) {
                            result += this.stringifyJiraObject(subTask, download.settings);
                        }
                    }
                }
            }
            return result;
        },

        hasPrimaryFields(issue, settings) {
            return this.hasStatus(issue) || this.hasAssignee(issue) || this.hasPoints(issue, settings) || this.hasFixVersion(issue);
        },

        hasStatus(issue) {
            return BreakdownUtil.getStatus(issue);
        },

        hasAssignee(issue) {
            return BreakdownUtil.getAssignee(issue);
        },

        hasPoints(issue, settings) {
            return BreakdownUtil.getStoryPoints(issue, settings);
        },

        hasFixVersion(issue) {
            return BreakdownUtil.getFixVersions(issue)
                .length;
        },

        hasComponents(issue) {
            return BreakdownUtil.getComponents(issue)
                .length;
        },

        summarizePoints(jiraObject, settings, onlyDonePoints) {

            let result = 0;
            let issue = jiraObject.issue;

            if (issue && this.hasPoints(issue, settings)) {
                if (BreakdownUtil.isFalsy(onlyDonePoints) ||
                    onlyDonePoints && BreakdownUtil.isResolved(issue)) {
                    result += BreakdownUtil.getStoryPoints(issue, settings);
                }
            }
            if (jiraObject.stories) {
                jiraObject.stories.forEach(child => {
                    let issue = child.issue;
                    if (this.hasPoints(issue, settings)) {
                        if (BreakdownUtil.isFalsy(onlyDonePoints) ||
                            onlyDonePoints && BreakdownUtil.isResolved(issue)) {
                            let points = BreakdownUtil.getStoryPoints(issue, settings);
                            result += points;
                        }
                    }
                });
            }
            return result;
        },

        summarizeDonePoints(jiraObject, settings) {
            return this.summarizePoints(jiraObject, settings, true);
        },
    }
})();
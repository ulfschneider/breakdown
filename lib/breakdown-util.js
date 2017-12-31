'use babel';
import _ from 'underscore';

export default BreakdownUtils = (function() {

    return {
        isFalseOrUndefined(o) {
            if (_.isUndefined(o)) {
                return true;
            } else {
                return o == false;
            }
        },

        trim(s) {
            return s ? s.trim() : s;
        },

        trimTrailingSlash(s) {
            return s.trim()
                .replace(/\/+$/, '')
                .trim();
        },

        replaceAll(s, from, to) {
            return s.split(from)
                .join(to);
        },

        paddingRight(s, len, pad) {
            if (pad) {
                while (s.length <= len - pad.length) {
                    s += pad;
                }
            }
            return s;
        },

        spacePaddingRight(s, len) {
            return this.paddingRight(s, len, ' ');
        },

        progressBar(fraction, size) {
            size = size ? size : 10;
            let bar = '';

            let completion = Math.floor(size * fraction);
            bar = this.paddingRight(bar, completion, '▆');
            bar = this.paddingRight(bar, size, '▁');
            bar += Math.round(fraction * 100) + '%';

            return bar;
        },

        concatString(stringArray, concatenator) {
            let result = '';
            concatenator = _.isUndefined(concatenator) ? ', ' : concatenator;
            if (stringArray && stringArray.length) {
                let len = stringArray.length;
                stringArray.forEach((s, i) => {
                    result += s;
                    if (i < len - 1) {
                        result += concatenator;
                    }
                });
            }
            return result;
        },

        equalsIgnoreCase(a, b) {
            if (a && b) {
                return a.toLowerCase() == b.toLowerCase();
            }
            return false;
        },

        isSameIssueType(a, b) {
            return this.equalsIgnoreCase(a, b);
        },

        isEpicType(issue, settings) {
            return this.isSameIssueType(this.getIssueType(issue), settings.epicType);
        },


        isStoryType(issue, settings) {
            return this.isSameIssueType(this.getIssueType(issue), settings.storyType);
        },

        isSubTaskType(issue, settings) {
            return this.isSameIssueType(this.getIssueType(issue), settings.subTaskType);
        },


        isDifferentUrl(a, b) {
            return !this.equalsIgnoreCase(a, b);
        },

        stringifyError(error) {
            if (error && error.stack) {
                return error.stack;
            } else if (error) {
                return error;
            } else {
                return '';
            }
        },

        getEditorLineEnding() {
            let lineEnding = '\n';
            const editor = atom.workspace.getActiveTextEditor();
            if (editor) {
                const buffer = editor.getBuffer();
                lineEnding = buffer.lineEndingForRow(0);
            }
            return lineEnding ? lineEnding : '\n';
        },

        isResolved(issue) {
            return issue.fields.resolutiondate;
        },

        getKey(issue) {
            return issue.key;
        },

        getParentKey(issue) {
            return issue.fields.parent ? issue.fields.parent.key : '';
        },

        getEpicLink(issue, settings) {
            return settings.epicLinkFieldName && issue.fields[settings.epicLinkFieldName] ? issue.fields[settings.epicLinkFieldName] : '';
        },

        getEpicName(issue, settings) {
            return settings.epicNameFieldName && issue.fields[settings.epicLinkFieldName] ? issue.fields[settings.epicNameFieldName] : '';
        },


        getProjectKey(issue) {
            return issue.fields.project ? issue.fields.project.key : '';
        },

        getSummary(issue) {
            return issue.fields.summary ? issue.fields.summary : '';
        },

        getStatus(issue) {
            return issue.fields.status ? issue.fields.status.name : '';
        },

        getStoryPoints(issue, settings) {
            return settings.storyPointsFieldName && issue.fields[settings.storyPointsFieldName] ? issue.fields[settings.storyPointsFieldName] : '';
        },

        getAssignee(issue) {
            return issue.fields.assignee ? issue.fields.assignee.name : '';
        },

        getFixVersions(issue) {
            return issue.fields.fixVersions ? issue.fields.fixVersions : [];
        },

        getIssueType(issue) {
            return issue.fields.issuetype.name;
        },

        setKey(issue, key) {
            if (key) {
                issue.key = key;
            } else {
                delete issue.key;
            }
        },

        setParentKey(issue, key) {
            if (key) {
                issue.fields.parent = {
                    key: key
                }
            } else {
                delete issue.fields.parent;
            }
        },

        setEpicLink(issue, key, settings) {
            if (settings.epicLinkFieldName) {
                if (key) {
                    issue.fields[settings.epicLinkFieldName] = key;
                } else {
                    delete issue.fields[settings.epicLinkFieldName];
                }
            }
        },

        setEpicName(issue, name, settings) {
            if (settings.epicLinkFieldName) {
                if (name) {
                    issue.fields[settings.epicNameFieldName] = name;
                } else {
                    delete issue.fields[settings.epicNameFieldName];
                }
            }
        },


        setProjectKey(issue, key) {
            if (key) {
                issue.fields.project = {
                    key: key
                }
            } else {
                delete issue.fields.project;
            }
        },

        setSummary(issue, summary) {
            if (summary) {
                issue.fields.summary = summary;
            } else {
                delete issue.fields.summary;
            }
        },

        setStoryPoints(issue, points, settings) {
            if (settings.storyPointsFieldName) {
                if (points) {
                    issue.fields[settings.storyPointsFieldName] = points;
                } else {
                    delete issue.fields[settings.storyPointsFieldName];
                }
            }
        },

        setAssignee(issue, assignee) {
            if (assignee) {
                issue.fields.assignee = {
                    name: assignee
                }
            } else {
                delete issue.fields.assignee;
            }
        },

        setFixVersions(issue, versionArray) {
            let versions = [];
            for (let version of versionArray) {
                versions.push({
                    name: version
                });
            }
            if (versions.length) {
                issue.fields.fixVersions = versions;
            } else {
                delete issue.fields.fixVersions;
            }
        },

        setIssueType(issue, issueType) {
            issue.fields.issuetype = {
                name: issueType
            };
        },


    }
})();
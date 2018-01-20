'use babel';
import _ from 'underscore';

export default BreakdownUtil = (function() {

    return {
        NO_PARENT_IN_SELECTION_KEY: 'NO PARENT',
        NO_PARENT_IN_SELECTION: 'PARENT IS NOT IN SELECTION',
        EMPTY_PARENT_KEY: 'EMPTY PARENT',
        EMPTY_PARENT: 'WITHOUT PARENT',
        EDITABLE_CONTENT: 'Below this line starts the editable breakdown content',
        RESOLVED: 'Resolved',
        DELETE: 'DEL',

        BREAKDOWN_PACKAGE_NAME: 'breakdown',
        METHOD_CREATE: 'CREATE',
        METHOD_UPDATE: 'UPDATE',
        METHOD_DELETE: 'DELETE',


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

        parseInteger(s) {
            let i = parseInt(String(s));
            return _.isNaN(i) ? 0 : i;
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
            if (completion < size) {
                bar = this.paddingRight(bar, completion, '▀');
                bar = this.paddingRight(bar, size, '─');
            } else {
                bar = '●';
            }
            bar += ' ';
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

        parseUrl(url) {
            return new URL(url);
        },

        getIssue(issues, key) {
            if (issues && key) {
                for (let issue of issues) {
                    if (this.getKey(issue) == key) {
                        return issue;
                    }
                }
            }
            return null;
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
            return issue.fields.resolutiondate ? issue.fields.resolutiondate : '';
        },

        hasOption(settings, field) {
            return _.find(settings.options, f => {
                return this.equalsIgnoreCase(f, field);
            });
        },


        getKey(issue) {
            return issue && issue.key ? issue.key : ''
        },

        getParentKey(issue) {
            return issue.fields.parent && issue.fields.parent.key ? issue.fields.parent.key : '';
        },

        getEpicLink(issue, settings) {
            return settings.epicLinkFieldName && issue.fields[settings.epicLinkFieldName] ? issue.fields[settings.epicLinkFieldName] : '';
        },

        getEpicName(issue, settings) {
            return settings.epicNameFieldName && issue.fields[settings.epicLinkFieldName] ? issue.fields[settings.epicNameFieldName] : '';
        },


        getProjectKey(issue) {
            return issue.fields.project && issue.fields.project.key ? issue.fields.project.key : '';
        },

        getSummary(issue) {
            return issue.fields.summary ? issue.fields.summary : '';
        },

        getStatus(issue) {
            return issue.fields.status && issue.fields.status.name ? issue.fields.status.name : '';
        },

        getStoryPoints(issue, settings) {
            return settings.storyPointsFieldName && issue.fields[settings.storyPointsFieldName] ? issue.fields[settings.storyPointsFieldName] : '';
        },

        getAssignee(issue) {
            return issue.fields.assignee && issue.fields.assignee.name ? issue.fields.assignee.name : '';
        },

        getFixVersions(issue) {
            let versions = [];
            if (issue.fields.fixVersions) {
                for (let version of issue.fields.fixVersions) {
                    versions.push(version.name);
                }
            }
            return versions;
        },

        stringifyFixVersions(fixVersions) {
            return this.concatString(fixVersions, ',');
        },


        getComponents(issue) {
            let components = [];
            if (issue.fields.components) {
                for (let component of issue.fields.components) {
                    components.push(component.name);
                }
            }
            return components;
        },

        stringifyComponents(components) {
            return this.concatString(components, ',');
        },

        getIssueType(issue) {
            return issue.fields.issuetype && issue.fields.issuetype.name ? issue.fields.issuetype.name : '';
        },

        setKey(issue, key, method) {
            if (key) {
                issue.key = key;
            } else if (this.equalsIgnoreCase(method, this.METHOD_UPDATE)) {
                issue.key = null;
            } else {
                delete issue.key;
            }
        },

        setParentKey(issue, key, method) {
            if (key) {
                issue.fields.parent = {
                    key: key
                }
            } else if (this.equalsIgnoreCase(method, this.METHOD_UPDATE)) {
                issue.fields.parent = null;
            } else {
                delete issue.fields.parent;
            }
        },

        setEpicLink(issue, key, settings, method) {
            if (settings.epicLinkFieldName) {
                if (key) {
                    issue.fields[settings.epicLinkFieldName] = key;
                } else if (this.equalsIgnoreCase(method, this.METHOD_UPDATE)) {
                    issue.fields[settings.epicLinkFieldName] = null;
                } else {
                    delete issue.fields[settings.epicLinkFieldName];
                }
            }
        },

        setEpicName(issue, name, settings, method) {
            if (settings.epicLinkFieldName) {
                if (name) {
                    issue.fields[settings.epicNameFieldName] = name;
                } else if (this.equalsIgnoreCase(method, this.METHOD_UPDATE)) {
                    issue.fields[settings.epicNameFieldName] = null;
                } else {
                    delete issue.fields[settings.epicNameFieldName];
                }
            }
        },


        setProjectKey(issue, key, method) {
            if (key) {
                issue.fields.project = {
                    key: key
                }
            } else if (this.equalsIgnoreCase(method, this.METHOD_UPDATE)) {
                issue.fields.project = null;
            } else {
                delete issue.fields.project;
            }
        },

        setSummary(issue, summary, method) {
            if (summary) {
                issue.fields.summary = summary;
            } else if (this.equalsIgnoreCase(method, this.METHOD_UPDATE)) {
                issue.fields.summary = null;
            } else {
                delete issue.fields.summary;
            }
        },

        setStatus(issue, status, method) {
            if (status) {
                issue.fields.status = {
                    name: status
                }
            } else if (this.equalsIgnoreCase(method, this.METHOD_UPDATE)) {
                issue.fields.status = null;
            } else {
                delete issue.fields.status;
            }
        },

        deleteStatus(issue) {
            delete issue.fields.status;
        },


        setStoryPoints(issue, points, settings, method) {
            if (settings.storyPointsFieldName) {
                let intPoints = this.parseInteger(points);
                if (intPoints) {
                    issue.fields[settings.storyPointsFieldName] = intPoints;
                } else if (this.equalsIgnoreCase(method, this.METHOD_UPDATE)) {
                    issue.fields[settings.storyPointsFieldName] = null;
                } else {
                    delete issue.fields.status;
                }
            }
        },

        setAssignee(issue, assignee, method) {
            if (assignee) {
                issue.fields.assignee = {
                    name: assignee
                }
            } else if (this.equalsIgnoreCase(method, this.METHOD_UPDATE)) {
                issue.fields.assignee = null;
            } else {
                delete issue.fields.assignee;
            }
        },

        setFixVersions(issue, versionArray, method) {
            let versions = [];
            for (let version of versionArray) {
                versions.push({
                    name: BreakdownUtil.trim(version)
                });
            }
            if (versions.length || this.equalsIgnoreCase(method, this.METHOD_UPDATE)) {
                issue.fields.fixVersions = versions;
            } else {
                delete issue.fields.fixVersions;
            }
        },

        setFixVersion(issue, version, method) {
            let versionArray = version ? version.split(',') : [];
            this.setFixVersions(issue, versionArray, method);
        },

        setComponents(issue, componentArray, method) {
            let components = [];
            for (let component of componentArray) {
                components.push({
                    name: BreakdownUtil.trim(component)
                });
            }
            if (components.length | this.equalsIgnoreCase(method, this.METHOD_UPDATE)) {
                issue.fields.components = components;
            } else {
                delete issue.fields.components;
            }
        },

        setComponent(issue, component, method) {
            let componentArray = component ? component.split(',') : [];
            this.setComponents(issue, componentArray, method);
        },

        setIssueType(issue, issueType, method) {
            if (issueType) {
                issue.fields.issuetype = {
                    name: issueType
                }
            } else if (this.equalsIgnoreCase(method, this.METHOD_UPDATE)) {
                issue.fields.issueType = null;
            } else {
                delete issue.fields.issueType;
            }
        }


    }
})();
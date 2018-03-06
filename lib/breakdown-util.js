'use babel';
import BreakdownEnvironment from './breakdown-environment';
import moment from 'moment';
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
        ACTIVE_SPRINT: '⟳ ',

        BREAKDOWN_PACKAGE_NAME: 'breakdown',
        METHOD_CREATE: 'CREATE',
        METHOD_UPDATE: 'UPDATE',
        METHOD_DELETE: 'DELETE',
        PUSH_CREATE: 'create',
        PUSH_DELETE: 'delete',
        PUSH_UPDATE: 'update',
        PUSH_UPDATE_SELF: 'updateself',
        NO_PUSH: 'nopush',
        PUSH_GUARDS: ['create', 'delete', 'update', 'updateself', 'nopush'],
        DEFAULT_PUSH_GUARDS: ['create', 'updateself'],
        DAY_FORMAT: 'dddd D-MMM HH:mm',
        DATE_FORMAT: 'YYYY-MM-DD',

        NEW: 'new',
        INDETERMINATE: 'indeterminate',
        DONE: 'done',



        isFalsy(thing) {
            if (_.isUndefined(thing)) {
                return true;
            } else if (_.isNull(thing)) {
                return true;
            } else {
                return !thing;
            }
        },

        isTruethy(thing) {
            return !this.isFalsy(thing);
        },

        isFalsyOrEmpty(thing) {
            let falsy = this.isFalsy(thing);
            return falsy ? falsy : _.isEmpty(thing);
        },

        isSorted(thing, comparator) {
            return _.every(thing, function(value, index) {
                if (comparator) {
                    return index == 0 || comparator(thing[index - 1], value) < 0;
                } else {
                    return index == 0 || thing[index - 1] <= value;
                }
            });
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

        parseDate(date) {
            let parseDate = moment(date);
            return parseDate.isValid() ? parseDate : '';
        },

        formatDate(date, format) {
            return moment(date)
                .format(format ? format : this.DATE_FORMAT);
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

        toBase64(string) {
            return Buffer.from(string)
                .toString('base64');
        },

        toAscii(string) {
            return Buffer.from(string, 'base64')
                .toString('ascii');
        },

        toInlineSvgImg(width, height, data) {
            let inline = '';
            inline += '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + width + '" height="' + height + '">'
            inline += data;
            inline += '</svg>';
            return 'data:image/svg+xml;base64,' + this.toBase64(inline);
        },

        getStyleDeclaration(selector) {
            let result = {};
            for (sheet of document.styleSheets) {
                for (rule of sheet.cssRules) {
                    if (rule.selectorText == selector) {
                        for (style of rule.style) {
                            result[style] = rule.style.getPropertyValue(style);
                        }
                    }
                }
            }
            return result;
        },

        progressBar(fraction, size) {
            size = size ? size : 10;
            let bar = '';

            let completion = Math.floor(size * fraction);
            if (completion < size) {
                bar = this.paddingRight(bar, completion, '■'); //■ ▀
                bar = this.paddingRight(bar, size, '…'); //- ─ ╌ ┄ …
                bar += ' ';
                bar += Math.round(fraction * 100) + '%';
            } else {
                bar = '✔';
            }

            return bar;
        },

        clear(object) {
            if (_.isObject(object)) {
                for (let prop in object) {
                    delete object[prop];
                }
            }
        },


        concat(arr, concatenator) {
            let result = '';
            concatenator = _.isUndefined(concatenator) ? ', ' : concatenator;
            if (arr && arr.length) {
                let len = arr.length;
                arr.forEach((s, i) => {
                    result += s;
                    if (i < len - 1) {
                        result += concatenator;
                    }
                });
            }
            return result;
        },

        decorate(arr, prefix, postfix) {
            if (arr && arr.length) {
                for (let i = 0; i < arr.length; i++) {
                    if (prefix) {
                        arr[i] = prefix + arr[i];
                    }
                    if (postfix) {
                        arr[i] = arr[i] + postfix;
                    }
                }
            }
            return arr;
        },

        stringifySeconds(seconds, workingHoursPerDay, workingDaysPerWeek) {

            const SECOND = 1;
            const MINUTE = SECOND * 60;
            const HOUR = MINUTE * 60;
            const DAY = HOUR * (workingHoursPerDay ? workingHoursPerDay : 8);
            const WEEK = DAY * (workingDaysPerWeek ? workingDaysPerWeek : 5);
            let result = '';
            if (seconds) {
                let weeks = Math.floor(seconds / WEEK);
                if (weeks) {
                    result += weeks + 'w ';
                    seconds = seconds - weeks * WEEK;
                }

                let days = Math.floor(seconds / DAY);
                if (days) {
                    result += days + 'd ';
                    seconds = seconds - days * DAY;
                }

                let hours = Math.floor(seconds / HOUR);
                if (hours) {
                    result += hours + 'h ';
                    seconds = seconds - hours * HOUR;
                }

                let minutes = Math.floor(seconds / MINUTE);
                if (minutes) {
                    result += minutes + 'm';
                }
            }

            return this.trim(result);
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

        createIssueMarkupLink(key) {
            let link = '';
            if (_.isArray(key)) {
                let keys = [];
                key.forEach(k => {
                    keys.push(this.createIssueMarkupLink(k));
                });
                link = this.concat(keys, ', ');
            } else {
                if (key) {
                    link = '[' + key + '](' + BreakdownEnvironment.getJiraUrl() + '/browse/' + key + ')';
                }
            }
            return link;
        },

        isSameIssueType(a, b) {
            return this.equalsIgnoreCase(a, b);
        },

        isEpicType(issue) {
            let settings = BreakdownEnvironment.getSettings();
            return this.isSameIssueType(this.getIssueType(issue), settings.epicType);
        },


        isStoryType(issue) {
            let settings = BreakdownEnvironment.getSettings();
            return this.isSameIssueType(this.getIssueType(issue), settings.storyType);
        },

        isSubTaskType(issue) {
            let settings = BreakdownEnvironment.getSettings();
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

        sortMap(map, comparator) {
            let keys = [...map.keys()];
            if (!this.isSorted(keys, comparator)) {
                keys = keys.sort(comparator);
                let newMap = new Map();
                for (key of keys) {
                    newMap.set(key, map.get(key));
                }
                return newMap;
            }
            return map;
        },

        isResolved(issue) {
            return issue.fields.resolutiondate ? issue.fields.resolutiondate : '';
        },

        isNewStatus(status) {
            return this.getStatusCategory(status) == this.NEW;
        },

        isIndeterminateStatus(status) {
            return this.getStatusCategory(status) == this.INDETERMINATE;
        },

        isDoneStatus(status) {
            return this.getStatusCategory(status) == this.DONE;
        },

        getStatusCategory(status) {
            let categories = BreakdownEnvironment.getStatusCategories();
            return categories.get(status);
        },

        isInActiveSprint(issue) {
            let settings = BreakdownEnvironment.getSettings();
            if (settings.sprintFieldName) {
                let sprint = issue.fields[settings.sprintFieldName];
                if (this.isTruethy(sprint)) {
                    return this.isTruethy(_.find(sprint, data => {
                        return data.indexOf('state=ACTIVE') >= 0;
                    }));
                }
            }
            return false;
        },

        hasActiveSprint(issues) {
            for (let issue of issues) {
                if (this.isInActiveSprint(issue)) {
                    return true;
                }
            }
            return false;
        },

        hasOption(field) {
            return _.find(BreakdownEnvironment.getOptions(), f => {
                return this.equalsIgnoreCase(f, field);
            });
        },


        getKey(issue) {
            return issue && issue.key ? issue.key : '';
        },

        getParentKey(issue) {
            return issue.fields.parent && issue.fields.parent.key ? issue.fields.parent.key : '';
        },

        getEpicLink(issue) {
            let settings = BreakdownEnvironment.getSettings();
            return settings.epicLinkFieldName && issue.fields[settings.epicLinkFieldName] ? issue.fields[settings.epicLinkFieldName] : '';
        },

        getEpicName(issue) {
            let settings = BreakdownEnvironment.getSettings();
            return settings.epicNameFieldName && issue.fields[settings.epicLinkFieldName] ? this.trim(issue.fields[settings.epicNameFieldName]) : '';
        },

        getProjectKey(issue) {
            return issue.fields.project && issue.fields.project.key ? issue.fields.project.key : '';
        },

        getSummary(issue) {
            return issue.fields.summary ? this.trim(issue.fields.summary) : '';
        },

        getStatus(issue) {
            return issue.fields.status && issue.fields.status.name ? issue.fields.status.name : '';
        },

        getStoryPoints(issue) {
            let settings = BreakdownEnvironment.getSettings();
            let value = settings.storyPointsFieldName && issue.fields[settings.storyPointsFieldName] ? issue.fields[settings.storyPointsFieldName] : 0;
            return value ? Math.round(value) : value;
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
            return this.concat(fixVersions, ',');
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
            return this.concat(components, ',');
        },

        getIssueType(issue) {
            return issue.fields.issuetype && issue.fields.issuetype.name ? issue.fields.issuetype.name : '';
        },

        getRemainingEstimateSeconds(issue) {
            return issue.fields.timetracking && issue.fields.timetracking.remainingEstimateSeconds ? issue.fields.timetracking.remainingEstimateSeconds : 0;
        },

        getTimeSpentSeconds(issue) {
            return issue.fields.timetracking && issue.fields.timetracking.timeSpentSeconds ? issue.fields.timetracking.timeSpentSeconds : 0;
        },

        summarizeRemainingEstimateSeconds(issues) {
            let seconds = 0;
            issues.forEach(issue => {
                seconds += this.getRemainingEstimateSeconds(issue);

            });
            return seconds;
        },

        summarizeTimeSpentSeconds(issues) {
            let seconds = 0;
            issues.forEach(issue => {
                seconds += this.getTimeSpentSeconds(issue);

            });
            return seconds;
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
                };
            } else if (this.equalsIgnoreCase(method, this.METHOD_UPDATE)) {
                issue.fields.parent = null;
            } else {
                delete issue.fields.parent;
            }
        },

        setEpicLink(issue, key, method) {
            let settings = BreakdownEnvironment.getSettings();
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

        setEpicName(issue, name, method) {
            let settings = BreakdownEnvironment.getSettings();
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
                };
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
                };
            } else if (this.equalsIgnoreCase(method, this.METHOD_UPDATE)) {
                issue.fields.status = null;
            } else {
                delete issue.fields.status;
            }
        },

        deleteStatus(issue) {
            delete issue.fields.status;
        },


        setStoryPoints(issue, points, method) {
            let settings = BreakdownEnvironment.getSettings();
            if (settings.storyPointsFieldName) {
                let intPoints = this.parseInteger(points);
                if (intPoints) {
                    issue.fields[settings.storyPointsFieldName] = intPoints;
                } else if (this.equalsIgnoreCase(method, this.METHOD_UPDATE)) {
                    issue.fields[settings.storyPointsFieldName] = null;
                } else {
                    delete issue.fields[settings.storyPointsFieldName];
                }
            }
        },

        setAssignee(issue, assignee, method) {
            if (assignee) {
                issue.fields.assignee = {
                    name: assignee
                };
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
                };
            } else if (this.equalsIgnoreCase(method, this.METHOD_UPDATE)) {
                issue.fields.issueType = null;
            } else {
                delete issue.fields.issueType;
            }
        }
    };
})();
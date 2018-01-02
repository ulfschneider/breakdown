'use babel';
import _ from 'underscore';

export default BreakdownUtil = (function() {

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
      bar = this.paddingRight(bar, completion, '█');
      bar = this.paddingRight(bar, size, '▁');
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

    hasSettingsField(settings, field) {
      return _.find(settings.fields, (f) => {
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
      let result = '';

      fixVersions.forEach((version, i) => {
        result += version;
        if (i < fixVersions.length - 1) {
          result += ',';
        }
      });

      return result;
    },

    getIssueType(issue) {
      return issue.fields.issuetype && issue.fields.issuetype.name ? issue.fields.issuetype.name : '';
    },

    setKey(issue, key) {
      issue.key = key ? key : null;
    },

    setParentKey(issue, key) {
      issue.fields.parent = {
        key: key ? key : null
      }
    },

    setEpicLink(issue, key, settings) {
      if (settings.epicLinkFieldName) {
        issue.fields[settings.epicLinkFieldName] = key ? key : null;
      }
    },

    setEpicName(issue, name, settings) {
      if (settings.epicLinkFieldName) {
        issue.fields[settings.epicNameFieldName] = name ? name : null;
      }
    },


    setProjectKey(issue, key) {
      issue.fields.project = {
        key: key ? key : null
      }
    },

    setSummary(issue, summary) {
      issue.fields.summary = summary ? summary : null;
    },

    setStoryPoints(issue, points, settings) {
      if (settings.storyPointsFieldName) {
        issue.fields[settings.storyPointsFieldName] = points ? points : null;
      }
    },

    setAssignee(issue, assignee) {
      issue.fields.assignee = {
        name: assignee ? assignee : null
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
        issue.fields.fixVersions = null;
      }
    },

    setIssueType(issue, issueType) {
      issue.fields.issuetype = {
        name: issueType ? issueType : null
      };
    },


  }
})();
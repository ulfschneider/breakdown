# JIRA Breakdown for Atom

Display and manipulate a JIRA breakdown of your project.

![Pull JIRA Data](/doc/pull.gif)

## Installation

### Atom GUI

1. Install [Atom](https://atom.io)
2. Launch Atom
3. Open Settings View using <kbd>⌘-,</kbd> on a Mac and <kbd>CTRL-,</kbd> on other platforms
4. Click the Install tab on the left side
5. Enter breakdown in the search box and press Enter
6. Click the "Install" button that appears

### Command line

Alternatively you can use your terminal to install the breakdown package.

1. Install [Atom](https://atom.io)
2. In the terminal, install the breakdown package via apm

```
apm install breakdown
```

## Issues and Improvements

Please file an issue on [GitHub](https://github.com/ulfschneider/breakdown/issues) for bugs or desired improvements. Refer to the [release notes](https://github.com/ulfschneider/breakdown/releases) to get information about release contents.

## How to use

To pull JIRA data into your Atom editor or push new issues from Atom to JIRA, create a file with a `.bkdn` filetype, e.g. `myjira.bkdn`. The file must start with your configuration and at least contain the following first five lines:

```
breakdown
url: http://address.of.your.jira
project: the key of the JIRA project you want to create new issues in
query: any JIRA JQL query to select your download dataset
---
```

Optionally, you can configure some JIRA fields which would be incorporated into your breakdown.

```
fields: status assignee points fixversion parentkey
```

Where

- `status` will display each issue status
- `assignee` will display the assignee for an issue and will produce a statistic of open issues per assignee
- `points` will display story points per issue and will display the overall progress in resolved vs. open story points
- `fixversion` will display the fixversion per issue
- `parentkey`will display the epic link key for stories and the parent issue key for sub-tasks

### Pull from JIRA

Select in the Packages menu **Breakdown / Pull from JIRA** to get your selected JIRA dataset into Atom. Whenever you pull the JIRA dataset into your Atom editor, all contents of the editor will be overwritten by your JIRA dataset (you have the UNDO function in the editor).

### Working with the Editor

In this explanation the <kbd>CMD</kbd> key stands for <kbd>⌘</kbd> on a Mac and <kbd>CTRL</kbd> on other platforms.

By default, after a pull all editor lines are folded. Folding can be controlled with the following keys

- Unfold all lines: <kbd>CMD-K</kbd> and <kbd>CMD-0</kbd>
- Display only epic level: <kbd>CMD-K</kbd> and <kbd>CMD-1</kbd>
- Display epic and story level: <kbd>CMD-K</kbd> and <kbd>CMD-2</kbd>
- Display epic, story and sub-task level: <kbd>CMD-K</kbd> and <kbd>CMD-3</kbd>

Saving the editor contents with <kbd>CMD-S</kbd> will beautify your text with correct spacing and indentation.

Open an issue inside of JIRA by <kbd>CMD-MOUSECLICK</kbd> on the issue key.

New JIRA issues can be created inside of the Atom editor and subsequently be pushed to JIRA. It´s always one issue per line. Each new issue must contain at least the JIRA issuetype and the summary. In the following example a new epic is created, containing a new story which again contains a new sub-task:

```
Epic This will become a new epic
  Story This will become a new story inside of a new epic
    Sub This will become a new sub-task inside of a new story inside of a new epic
```

Issues can be removed by placing a deletion mark in front of the issue inside of Atom, followed by a push to JIRA:

```
DEL Epic RESTTEST-26 This epic will be removed when pushed
```

### Push to JIRA

Select in the Packages menu **Breakdown / Push to JIRA** to push new issues to JIRA. Currently you cannot push modifications of already created issues - it´s only possible to push new created issues. A push is always followed by an automatic pull. If some issues could not be pushed, you will receive a warning notification with the reason code. In addition those issues will disappear from the editor. Use the editor UNDO function to let those issues reappear.




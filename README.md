# JIRA Breakdown for Atom

Display and manipulate a JIRA breakdown of your project.

## Installation

### Atom GUI

1. Install [Atom](https://atom.io)
2. Launch Atom
3. Open Settings View using Cmd+, on macOS or Ctrl+, on other platforms
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
breakdown
url: http://address.of.your.jira
project: the key of the JIRA project you want to create new issues in
query: any JIRA JQL query to select your download dataset
fields: status assignee points fixversion parentkey
---
```

### Pull from JIRA

Select then in the Packages menu **Breakdown / Pull from JIRA** to get your selected JIRA dataset into Atom. Whenever you pull the JIRA dataset into your Atom editor, all contents of the editor will be overwritten by your JIRA dataset.

By default, after a pull all editor lines are folded. You can control folding with

- CTRL+K CTRL+0 (Win) / CMD+K CMD+0 (Mac): to unfold all lines
- CTRL+K CTRL+1 (Win) / CMD+K CMD+1 (Mac): to display only the epic level
- CTRL+K CTRL+2 (Win) / CMD+K CMD+2 (Mac): to display the epic and story level
- CTRL+K CTRL+3 (Win) / CMD+K CMD+3 (Mac): to display the epic, story and sub-task level

### Push to JIRA

Select then in the Packages menu **Breakdown / Push to JIRA** to create new issues inside of JIRA. First, in Atom you create one issue per line. Each new issue must contain at least the JIRA issuetype and the summary. To create a new epic, containing a new story which again contains a new sub-task, you would write in Atom:

```
Epic This will become a new epic
  Story This will become a new story inside of a new epic
    Sub This will become a new sub-task inside of a new story inside of a new epic
```

Currently you cannot modify already created issues - it´s only possible to create new issues. Any push will always be followed by an automatical pull.

## Release notes

### v0.6.0

- Display assignees with issue keys in overall statistics #9

### v0.5.0

- Display done points in overarching statistics #5

### v0.4.1

- Fix: When pulling without result set, an exception is thrown in promise when determining custom field names #8

### v0.4.0

- Indicate resolved JIRA issues with a different color to identify quickly, what´s already done #2
- Close all notifications with new pull/push command #7
- Fix: Pulled date is not being refreshed after pull

### v0.3.0

- Display date and time of last pull in the settings header
- Fix: Destroy additional cursor that was created by click with meta-key on JIRA link (Mac)
- Change from Apache 2.0 to MIT license

### v0.2.0

- Sum of story points for epics
- Completion progress bar for epics
- CTRL-Click on JIRA key will open the JIRA issue in the web browser

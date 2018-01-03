# JIRA Breakdown for Atom

Display and manipulate a breakdown structure of your JIRA Scrum project.

![Breakdown Demo](/doc/breakdown.gif)

## Installation

### Atom GUI

1. Install [Atom](https://atom.io)
2. Launch Atom
3. Open Settings View using <kbd>⌘-,</kbd> on a Mac and <kbd>CTRL-,</kbd> on other platforms
4. Click the Install tab on the left side
5. Enter breakdown in the search box and press Enter
6. Click the "Install" button that appears

### Command line

Alternatively, use your terminal to install the breakdown package.

1. Install [Atom](https://atom.io)
2. In the terminal, install the breakdown package via apm

```
apm install breakdown
```

## Issues and improvements

Please file an issue on [GitHub](https://github.com/ulfschneider/breakdown/issues) for bugs or desired improvements. Refer to the [release notes](https://github.com/ulfschneider/breakdown/releases) to get information about release contents.

## How to use

To pull JIRA data into your Atom editor or push new issues and changes from Atom to JIRA, create a file with a `.bkdn` filetype, e.g. `myjira.bkdn`. The file must start with your configuration and at least contain the following first five lines:

```
breakdown
url: <JIRA URL>
project: <key of JIRA project you want to create new issues in>
query: <any JIRA JQL query to select your download dataset>
---
```

Optionally, you can configure to get the epic link key for stories visualized and the parent issue key for sub-tasks.

```
fields: parentkey
```

> **A word of caution:** Whenever you change the configuration of your ```.bkdn``` file, your direct next step should be to pull the data from JIRA that is described by your configuration. Otherwise you might run into inconsistence issues when changing contents in Atom and pushing back those changes to JIRA!


## Pulling from JIRA

In the Packages menu, select **Breakdown → Pull from JIRA** to get your selected JIRA dataset into Atom. Whenever you pull the JIRA dataset into your Atom editor, all contents of the editor will be overwritten by the downloaded JIRA dataset.

## Working with the editor

> In this explanation the <kbd>CMD</kbd> key stands for <kbd>⌘</kbd> on a Mac and <kbd>CTRL</kbd> on other platforms.

By default, after a pull all editor lines are folded. Folding can be controlled with the following keys

- Unfold all lines: <kbd>CMD-K</kbd> and <kbd>CMD-0</kbd>
- Display only epic level: <kbd>CMD-K</kbd> and <kbd>CMD-1</kbd>
- Display epic and story level: <kbd>CMD-K</kbd> and <kbd>CMD-2</kbd>
- Display epic, story and sub-task level: <kbd>CMD-K</kbd> and <kbd>CMD-3</kbd>

Saving the editor contents with <kbd>CMD-S</kbd> will beautify your text with correct spacing and indentation.

You can open an issue inside of JIRA by doing a <kbd>CMD-MOUSECLICK</kbd> on the issue key.

## Creating and modifying issues

JIRA issues can be created and modified inside of the Atom editor. It´s always one issue per line. A new issue must contain at least the JIRA issuetype and the summary. The changes need to be pushed to JIRA to be effective. 

In the following example a new epic is created, containing a new story which again contains a new sub-task:

```
Epic This will become a new epic
  Story This will become a new story inside of a new epic
    Sub This will become a new sub-task inside of a new story inside of a new epic
```

For any issue, the following JIRA fields can be modified: *status, assignee, story points, fixversion* and *summary.* For epics and stories even changing the *issuetype* is allowed. A full-fledged issue will be displayed like:

```
Story REST-32 ( s:In Progress a:admin p:13 v:Version 3.0 ) As a developer, I want to have the story status highlighted
```

An issue will start with the issuetype, which can be an *epic,* a *story* or a *sub-task*. It´s allowed to change epics into stories and stories into epics.

Issues which are already available in JIRA will have the JIRA issue key.

The issue key is followed by a paranthesis section, containing:

* ```s:<status>``` to indicate the issue status
* ```a:<assignee>``` to indicate the JIRA user who is assigned to the issue
* ```p:<story points>``` to indicate the story points for the issue, this is only valid for epics and stories and must be an integer number
* ```v:<fixversion>``` to indicate the fixversion for the issue

The last part of the issue is the *summary*, which is free text.

## Changing issue parents

Move stories from one epic to the other by using the cut and paste option of your Atom editor. Cut away a story from one epic and place it under the epic where you want it to be.

## Deleting issues

Issues can be removed by placing a deletion mark in front of the issue:

```
DEL Epic REST-26 ( s:In Progress p:13 ) This epic will be removed when pushed
```

## What is not possible from within Atom

* You cannot convert sub-tasks into stories or epics and you cannot move sub-tasks to different parents.
* To delete a story with sub-tasks you first have to delete the sub-tasks.

## Pushing to JIRA

In the Packages menu, select **Breakdown → Push to JIRA** to push your changes to JIRA. A push is always followed by an automatic pull to bring a current dataset back into your editor. If some issues could not be pushed, you will receive a warning notification with the reason code. In addition, those issues will *disappear from the editor.* Use the editor UNDO function to let those issues reappear.




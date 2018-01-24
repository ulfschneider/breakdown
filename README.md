# JIRA Breakdown for Atom

Display and manipulate a breakdown structure of your JIRA Scrum project - even offline and only eventually connected to your JIRA system.

![Breakdown Pull](/doc/breakdown-pull.gif)

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

To pull JIRA data into your Atom editor or push new issues and changes from Atom to JIRA, create a file with a `.bkdn` filetype, e.g. `myjira.bkdn`. The file must start with your configuration section and at least contain the following first five lines:

```
breakdown
url: <JIRA URL>
project: <key of JIRA project you want to create new issues in>
query: <any JIRA JQL query to select your download dataset>
---
```

## A word of caution

Whenever you change the ```url``` or the ```query``` of your ```.bkdn``` file, your direct next step should be to pull the data from JIRA that is described by your configuration. Otherwise you might run into inconsistencies when changing contents in Atom and pushing back those changes to JIRA!

## Pulling from JIRA

In the Packages menu, select **Breakdown → Pull from JIRA** to get your selected JIRA dataset into Atom. Whenever you pull the JIRA dataset into your Atom editor, all contents of the editor will be overwritten by the downloaded JIRA dataset.

Optionally, you can define in your configuration section to visualize the epic link key for stories and the parent issue key for sub-tasks.

```
options: parentkey
```


## Working with the editor

> In this explanation the <kbd>CMD</kbd> key stands for <kbd>⌘</kbd> on a Mac and <kbd>CTRL</kbd> on other platforms.

By default, after a pull all editor lines are folded. In the editor, folding can be controlled with the following keys

- Unfold all lines: <kbd>CMD-K</kbd> and <kbd>CMD-0</kbd>
- Display only epic level: <kbd>CMD-K</kbd> and <kbd>CMD-1</kbd>
- Display epic and story level: <kbd>CMD-K</kbd> and <kbd>CMD-2</kbd>
- Display epic, story and sub-task level: <kbd>CMD-K</kbd> and <kbd>CMD-3</kbd>

Saving the editor contents with <kbd>CMD-S</kbd> will beautify your text with correct spacing and indentation.

You can open an issue inside of JIRA by doing a <kbd>CMD-MOUSECLICK</kbd> on the issue key.

## Creating and modifying issues

JIRA issues can be created and modified inside of the Atom editor. It´s always one issue per line. A new issue must contain at least the JIRA issuetype and the summary. The changes need to be pushed to JIRA to be effective. 

![Breakdown Create and Push](/doc/breakdown-create-push.gif)

In the following example a new epic is created, containing a new story which again contains a new sub-task:

```
Epic This will become a new epic
  Story This will become a new story inside of a new epic
    Sub This will become a new sub-task inside of a new story inside of a new epic
```

For any issue, the following JIRA fields can be modified: *status, assignee, story points, fixversion, components* and *summary.* For epics and stories even changing the *issuetype* is allowed. A full-fledged issue will be displayed like:

```
Story REST-32 As a developer, I want to have the story status highlighted (s:In Progress a:admin p:13 v:Version 3.0 c:Frontend)
```

An issue will start with the issuetype, which can be an *epic,* a *story* or a *sub-task*. It´s allowed to change epics into stories and stories into epics.

Issues which are already available in JIRA will have the JIRA issue key.

The next part of the issue is the *summary*, which is free text.

The summary is followed by a paranthesis section, containing:

* ```s:<status>``` to indicate the issue status
* ```a:<assignee>``` to indicate the JIRA user who is assigned to the issue
* ```p:<story points>``` to indicate the story points for the issue, this is only valid for epics and stories and must be an integer number
* ```v:<fixversion>``` to indicate the fixversion for the issue
* ```c:<component>``` to indicate the component for the issue



## Ranking 

Atom has a nice function to move entire lines up and down with <kbd>CTRL-↑</kbd> and <kbd>CTRL-↓</kbd>, on Mac it´s <kbd>CTRL-⌘-↑</kbd> and <kbd>CTRL-⌘-↓</kbd>.

Breakdown for Atom leverages this function, as it allows you to change your ranking in an quick and easy manner by still keeping a good overview of your entire breakdown structure. 

If your query is not **SORTED BY Rank ASC**, you will **mess up** the ranking of your project when you apply the ranking inside of Atom and push the changes back to JIRA. For this reason ranking is a guarded feature in Breakdown for Atom - you have to activate it in your configuration section by adding the ```rank``` entry to your ```options```, like   

```
options: rank
```

To change the rank for a story with sub-tasks, select the story line and all sub-tasks below, then apply the same command to move all selected lines at once.

Currently you cannot rank epics or sub-tasks, only the ranking of stories is supported.

![Breakdown Rank](/doc/breakdown-rank.gif)

## Changing parents

Move stories from one epic to the other by using the cut and paste option of your Atom editor. Cut away a story from one epic and place it under the epic where you want it to be.

## Deleting issues

Issues can be removed by placing a deletion mark in front of the issue:

```
DEL Epic REST-26 ( s:In Progress p:13 ) This epic will be removed when pushed
```

![Breakdown Resolve Delete](/doc/breakdown-resolve-delete.gif)


## What is not possible from within Atom

* Only stories are allowed to be ranked. The ranking of epics or sub-tasks is not supported.
* You cannot convert sub-tasks into stories or epics and you cannot move sub-tasks to different parents.
* To delete a story with sub-tasks you first have to delete the sub-tasks.

## Pushing to JIRA

In the Packages menu, select **Breakdown → Push to JIRA** to push your changes to JIRA. A push is always followed by an automatic pull to bring a current dataset back into your editor. If some issues could not be pushed, you will receive a warning notification with the reason code. In addition, those issues will *disappear from the editor.* Use the editor UNDO function to let those issues reappear.

For the creation of epics and stories from within Atom, you can optionally define in your configuration section a default *fixversion* and the default amount of *story points* to assign to those epics and stories when pushing them to JIRA. So you don´t need to specify those values for each new created issue in Atom. However, you can overwrite the setting in each issue. Configure with:

```
fixversion: <your default fixversion>
points: <the default amount of points>
```

## Guarded pushing

If you want to make sure to not accidently push back to JIRA, activate ```nopush``` in your ```options``` section, like: 

```
options: nopush
```

If you only allow specific push operations, instead of forbidding the entire pushing, you can combine the following options

* ```pushcreate``` will only allow the creation of new issues but not the modification or deletion.
* ```pushupdate``` will only allow updating of already existing issues, but not creation or deletion.
* ```pushdelete''' will only allow deleting issues, but not creation or modification.

For example, an option setting of

```
options: pushcreate pushupdate
```

will allow to create and update issues, but not to delete issues.

## Package configuration

In addition to the configuration section of the ```.bkdn``` file, you can make some settings at the level of the breakdown package. Press <kbd>CMD-,</kbd> and navigate to the *packages* tab. Search for the *breakdown* package and click on *Settings.* You will find the following configuration options:

* **JIRA URL**: This URL will be used in case you don´t provide a URL in the config section of your ```.bkdn``` file.
* **Default Story Points**:The default amount of story points to assign to new created epics or stories.
* **Fold all editor lines after a pull**: By default, all editor lines will be folded after pulling from JIRA.




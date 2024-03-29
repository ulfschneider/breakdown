# Jira Breakdown for Atom

Display and manipulate a breakdown structure of your Jira Scrum project - even offline and only eventually connected to your Jira system.

## Contents

- [Installation](#installation)
    - [Atom GUI](#atom-gui)
    - [Command line](#command-line)
- [Issues and improvements](#issues-and-improvements)
- [How to use](#how-to-use)
- [A word of caution](#a-word-of-caution)
- [Pulling from Jira](#pulling-from-jira)
- [Working with the editor](#working-with-the-editor)
- [Creating and modifying issues](#creating-and-modifying-issues)
- [Issue descriptions](#issue-descriptions)
- [Acceptance Criteria](#acceptance-criteria)
- [Issue descriptions](#issue-descriptions)
- [Ranking](#ranking)
- [Changing parents](#changing-parents)
- [Deleting issues](#deleting-issues)
- [What is not possible from within Atom](#what-is-not-possible-from-within-atom)
- [Pushing to Jira](#pushing-to-jira)
- [Guarded pushing](#guarded-pushing)
- [Configuration reference](#configuration-reference)
- [Package configuration](#package-configuration)

## Installation

### Atom GUI

1.  Install [Atom](https://atom.io)
2.  Launch Atom
3.  Open Settings View using <kbd>⌘-,</kbd> on a Mac and <kbd>CTRL-,</kbd> on other platforms
4.  Click the Install tab on the left side
5.  Enter breakdown in the search box and press Enter
6.  Click the "Install" button that appears

### Command line

Alternatively, use your terminal to install the breakdown package.

1.  Install [Atom](https://atom.io)
2.  In the terminal, install the breakdown package via apm

```
apm install breakdown
```

## Issues and improvements

Please file an issue on [GitHub](https://github.com/ulfschneider/breakdown/issues) for bugs or desired improvements. Refer to the [release notes](https://github.com/ulfschneider/breakdown/releases) to get information about release contents.

## Credentials

> In this explanation the <kbd>CMD</kbd> key stands for <kbd>⌘</kbd> on a Mac and <kbd>CTRL</kbd> on other platforms.

Breakdown will ask you for your Jira credentials when required. You can configure the Breakdown package to have your credentials stored for you, so you would provide them only one-time, which is more convenient. To configure the Breakdown package accordingly, in Atom, press <kbd>CMD-,</kbd> to enter the Atom configuration, go to **Packages**, go to **filter packages by name** and key in **breakdown**. For the Breakdown package click on **Settings**. In the upcoming settings pane, provide your **Username** and your **API Token** (you password could go in here as well but that´s not recommended).

## How to use

To pull Jira data into your Atom editor or push new issues and changes from Atom to Jira, create a file with a `.bkdn` filetype, e.g. `myjira.bkdn`. The file must start with your configuration section and at least contain the following first five lines:

```
breakdown
url: <Jira URL>
project: <key of Jira project you want to create new issues in>
query: <any Jira JQL query to select your download dataset>
---
```

## A word of caution

Whenever you change the `url` or the `query` of your `.bkdn` file, your direct next step should be to pull the data from Jira that is described by your configuration. Otherwise, you might run into inconsistencies when changing contents in Atom and pushing back those changes to Jira!

## Pulling from Jira

Select **Packages → Breakdown → Pull from Jira** to get your selected Jira dataset into Atom. Whenever you pull the Jira dataset into your Atom editor, all contents of the editor will be overwritten by the downloaded Jira dataset.

Optionally, you can define in your configuration section to visualize the epic link key for stories and the parent issue key for sub-tasks.

```
options: parentkey
```

Any story that is contained in the current sprint will be prefixed by `⟳`. An epic that contains stories which are in the current sprint will also be prefixed with `⟳`.

## Working with the editor

By default, after a pull, all editor lines are folded. In the editor, folding can be controlled with the following keys

-   Unfold all lines: <kbd>CMD-K</kbd> and <kbd>CMD-0</kbd>
-   Display only epic level: <kbd>CMD-K</kbd> and <kbd>CMD-1</kbd>
-   Display epic and story level: <kbd>CMD-K</kbd> and <kbd>CMD-2</kbd>
-   Display epic, story and sub-task level: <kbd>CMD-K</kbd> and <kbd>CMD-3</kbd>

Saving the editor contents with <kbd>CMD-S</kbd> will beautify your text with correct spacing and indentation.

You can open an issue inside of Jira by doing a <kbd>CMD-MOUSECLICK</kbd> on the issue key.

Remove all empty lines that came during your formatting via **Packages → Breakdown → Trim empty lines**.

## Creating and modifying issues

Jira issues can be created and modified inside of the Atom editor. It´s always one issue per line. A new issue must contain at least the Jira issue type and the summary. The changes need to be pushed to Jira to be effective.

In the following example a new epic is created, containing a new story which again contains a new sub-task:

```
Epic This will become a new epic
    Story This will become a new story inside of a new epic
        Sub This will become a new sub-task inside of a new story inside of a new epic
```

For any issue, the following Jira fields can be modified: _status, assignee, story points, fixversion, components, summary, and descriptionn_ For epics and stories even changing the _issuetype_ is allowed. A full-fledged issue will be displayed like:

```
Story REST-32 As a developer, I want to have the story status highlighted (s:In Progress a:admin p:13 v:Version 3.0 c:Frontend)
```

An issue will start with the issue type, which can be an _epic,_ a _story_ or a _sub-task_. It´s allowed to change epics into stories and stories into epics.

Issues which are already available in Jira will have the Jira issue key.

The next part of the issue is the _summary_, which is free text.

The summary is followed by a parentheses section, containing:

-   `s:<status>` to indicate the issue status; **The status must exist in Jira and the current user must have permission to transition into that status**.
-   `a:<assignee>` to indicate the Jira user who is assigned to the issue; **The assignee must exist in Jira**.
-   `p:<story points>` to indicate the story points for the issue; <mark>this is only valid for epics and stories and must be an integer number</mark>
-   `o:<original estimate>` to indicate the original estimate; <mark>setting the original estimate is only possible for sub-tasks and must be provided in the Jira format (e.g., 2w 3d) – mind the space between 2w and 3d!</mark>; aggregated estimate values are displayed for all issues, if available
-   `v:<fixversion>` to indicate the fixversion for the issue; **The fixVersion must exist in Jira**.
-   `c:<component>` to indicate the component for the issue; separate multiple components by comma; **The component must exist in Jira**.

You get autocompletion suggestions for all of the fields in the parentheses section - except for the story points. Autocompletion will only work while you are connected to your Jira server. In a situation where you are working offline, you should add the `offline` option to your configuration. This will avoid network failures in the context of autocompletion.

```
options: offline
```

## Issue descriptions

The issue description typically contains more text than what can be put into the summary field.
You can create issue descriptions by starting a new line below of an issue with the double slash `//`.

It would look like

```
Story REST-32 As a developer, I want to have the story status highlighted (s:In Progress a:admin p:13 v:Version 3.0 c:Frontend)
    //A highlighted story status will allow to quickly identify if a story is completed.
    //Let´s make life a little bit easier here!
```

## Acceptance Criteria

Similar to descriptions, the acceptance criteria can be added to Stories and Epics.
The acceptance criteria has to be introduce by the keyword **Acceptance** in one line, followed by the description of the acceptance criteria in multiple subsequent lines.

I would look like

```
Story REST-32 As a developer, I want to have the story status highlighted (s:In Progress a:admin p:13 v:Version 3.0 c:Frontend)
    //A highlighted story status will allow to quickly identify if a story is completed.
    //Let´s make life a little bit easier here!
    Acceptance
    //Story is shown green when in done status category, and not green otherwise
```

## Ranking

Atom has a nice function to move entire lines up and down with <kbd>CTRL-↑</kbd> and <kbd>CTRL-↓</kbd>, on Mac it´s <kbd>CTRL-⌘-↑</kbd> and <kbd>CTRL-⌘-↓</kbd>.

Breakdown for Atom leverages this function, as it allows you to change your ranking quickly and easily by still keeping a good overview of your entire breakdown structure.

If your query is not **SORTED BY Rank ASC**, you will **mess up** the ranking of your project when you apply the ranking inside of Atom and push the changes back to Jira. For this reason, ranking is a guarded feature in Breakdown for Atom - you have to activate it in your configuration section by adding the `rank` entry to your `options`, like   

```
options: rank
```

To change the rank for a story with sub-tasks, select the lines that contain the story and all sub-tasks below, then apply the same command to move all selected lines at once.

Currently, you cannot rank epics or sub-tasks; only the ranking of stories is supported.

> When ranking an issue this way, the issue description (if there is any) needs to be collapsed, otherwise it will not move along with the issue!


## Changing parents

Move stories from one epic to the other by using the cut and paste option of your Atom editor. Cut away a story from one epic and place it under the epic where you want it to be.

## Deleting issues

Issues can be removed by placing a deletion mark in front of the issue:

```
DEL Epic REST-26 ( s:In Progress p:13 ) This epic will be removed when pushed
```

## What is not possible from within Atom

-   Only stories are allowed to be ranked. The ranking of epics or sub-tasks is not supported.
-   You cannot convert sub-tasks into stories or epics, and you cannot move sub-tasks to different parents.
-   To delete a story with sub-tasks you first have to remove the sub-tasks.

## Pushing to Jira

Select **Packages → Breakdown → Push to Jira** to push your changes to Jira. A push is always followed by an automatic pull to bring a current dataset back into your editor. If some issues could not be pushed, you will receive a warning notification with the reason code. Also, those issues will _disappear from the editor._ Use the editor UNDO function to let those issues reappear.

For the creation of epics and stories from within Atom, you can optionally define in your configuration section a default _fixversion_ and the default amount of _story points_ to assign to those epics and stories when pushing them to Jira. So you don´t need to specify those values for each newly created issue in Atom. However, you can overwrite the setting in each issue. Configure with:

```
fixversion: <your default fixversion>
points: <the default amount of points>
```

## Guarded pushing

By default, every `.bkdn` file has two push guards activated in the options section of the configuration. These are `create` and `updateself` (even if you do not provide the options at all, they will be added automatically and visualized after a push or pull operation).

```
options: create updateself
```

The two push guards ensure that you can only push new issues, as well as modifications of issues with the current user being the issue assignee. Which means: you can create new issues and update your´s.

The following push guards are allowed to be combined:

-   `create` will allow the creation of new issues.
-   `update` will only allow updating of already existing issues.
-   `updateself` will allow updating of already existing issues with the current user being the issue assignee. In more simple terms: update only your own issues.
-   `delete` will allow the deletion of issues.

The entire pushing can be disabled by activating `nopush` in the `options` section, like:

```
options: nopush
```

## Configuration reference

Below is a configuration section with all possible configurations. Mandatory are only the settings for `url`, `project` and `query`.

```
breakdown
url: <Jira URL>
project: <key of Jira project you want to create new issues in>
query: <any Jira JQL query to select your download dataset>
fixversion: <your default fixversion>
points: <the default amount of points>
options: create update updateself delete nopush rank offline parentkey statistics
---
```

Options:

-   `create` will allow the creation of new issues.
-   `update` will only allow updating of already existing issues.
-   `updateself` will allow updating of already existing issues with the current user being the issue assignee. In more simple terms: update only your issues.
-   `delete` will allow the deletion of issues.
-   `nopush` disable pushing to Jira.
-   `rank` if your query is not **SORTED BY Rank ASC**, you will **mess up** the ranking of your project when you apply the ranking inside of Atom and push the changes back to Jira. For this reason, ranking is a guarded feature in Breakdown for Atom - you have to activate it in your configuration section by adding the `rank` option.
-   `offline` autocompletion will only work while you are connected to your Jira server. In a situation where you are working offline, you should add the `offline` option to your configuration. This will avoid network failures in the context of autocompletion.
-   `parentkey` will visualize the epic link key for stories and the parent issue key for sub-tasks.
-   `statistics` will visualize statistics about the issues, including all assignees that can be derived from the Jira query and the resolution of the tasks each assignee is involved in.

## Package configuration

In addition to the configuration section of the `.bkdn` file, you can make some settings at the level of the breakdown package. Press <kbd>CMD-,</kbd> and navigate to the _packages_ tab. Search for the _breakdown_ package and click on _Settings._ You will find the following configuration options:

-   **Jira URL**: This URL will be used in case you don´t provide a URL in the config section of your `.bkdn` file.
-   **Default Story Points**: The default amount of story points to assign to new created epics or stories.
-   **Fold all editor lines after a pull**: By default, all editor lines will be folded after pulling from Jira.
-   **Username**: A user to authenticate against Jira. 
-   **API Token**: An API Token to authenticate against Jira.

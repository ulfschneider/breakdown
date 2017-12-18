# JIRA Breakdown for Atom

Display and manipulate a JIRA breakdown of your project. As this package is at a very early stage, currently you can only pull JIRA data into Atom and display that data in a breakdown structure. Pushing changes back to JIRA is the next function to come - but it´s not there yet.

## Installation

1. Install [Atom](https://atom.io)
2. In the terminal, install the breakdown package via apm

```
apm install breakdown
```

Fire up Atom and you are ready to start.

## How to use

To pull JIRA data into your Atom editor, create a file with a `.bkdn` filetype, e.g. `myjira.bkdn`. The file must start with your configuration and at least contain the following first four lines:

```
jira-breakdown
url: http://address.of.your.jira
query: any JIRA JQL query to select your download dataset
---
```

Optionally, you can configure also some JIRA fields which would be incorporated into your breakdown.

```
jira-breakdown
url: http://address.of.your.jira
query: any JIRA JQL query to select your download dataset
fields: status assignee points fixversion parentkey
---
```

Select then in the Packages menu **Breakdown / Pull JIRA**. Whenever you pull the JIRA dataset into your Atom editor, all contents of the editor will be overwritten by your JIRA dataset.

## Release notes

## v0.4.0

- Indicate resolved JIRA issues with a different color to identify quickly, what´s already done.
- Fix: Pulled date is not being refreshed after pull

### v0.3.0

- Display date and time of last pull in the settings header
- Fix: Destroy additional cursor that was created by click with meta-key on JIRA link (Mac)
- Change from Apache 2.0 to MIT license

### v0.2.0

- Sum of story points for epics
- Completion progress bar for epics
- CTRL-Click on JIRA key will open the JIRA issue in the web browser

# JIRA Breakdown for Atom

Display and manipulate a JIRA breakdown of your project. As this package is at a very early stage. Currently you can only pull for JIRA data into Atom and display that data in a breakdown structure. Pushing changes back to JIRA is the next function to come - but it´s not there yet.

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
query: any JIRA JQL query to select your download data set
---
```

Optionally, you can configure also some JIRA fields which would be incorporated into your breakdown.

```
jira-breakdown
url: http://address.of.your.jira
query: any JIRA JQL query to select your download data set
fields: status assignee points fixversion parentkey
---
```

Select then in the Packages menu **Breakdown / Pull JIRA**. Whenever you pull the JIRA dataset into your Atom editor, all contents of the editor will be overwritten by your JIRA dataset.

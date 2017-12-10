# JIRA Breakdown for Atom

Display and manipulate a JIRA breakdown of your project. As this package is in a very early stage, currently you can only pull for JIRA data and display that data in a breakdown structure. Pushing changes back to JIRA is the next function to come - but it´s not there yet.

## Installation

1. Install [Atom](https://atom.io)
2. In the terminal, install the breakdown package via apm

  ```sh
  apm install breakdown
  ```

3. Now you are ready to start.

## Example

To pull JIRA data into your Atom editor, create a file with a .bkdn filetype and open it in Atom. The file must start with the following four lines:

```
jira-breakdown
url: http://address.of.your.jira
query: any JIRA JQL query to select your download data set
---
```

Optionally, you can provide also some JIRA fields you want to have displayed in Atom.

```
jira-breakdown
url: http://address.of.your.jira
query: any JIRA JQL query to select your download data set
fields: status assignee points fixversion parentkey
---
```

Select then in the Packages menu Breakdown -> Pull JIRA. Whenever you pull the JIRA dataset into your Atom editor, all contents of the editor will be overwritten by your JIRA dataset.

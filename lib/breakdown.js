'use babel';

import BreakdownView from './breakdown-view';
import {
  CompositeDisposable
} from 'atom';

export default {

  breakdownView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.breakdownView = new BreakdownView(state.breakdownViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.breakdownView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'breakdown:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.breakdownView.destroy();
  },

  serialize() {
    return {
      breakdownViewState: this.breakdownView.serialize()
    };
  },

  toggle() {
    console.log('Breakdown was toggled!');
    let editor = atom.workspace.getActiveTextEditor();
    let grammar = editor.getGrammar();
    let language = grammar.name;
    atom.notifications.addInfo('The grammar is ' + language);

    let tokens = grammar.tokenizeLines(editor.getText());
    editor.insertText(JSON.stringify(tokens));
  }

};
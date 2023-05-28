import { Terminal } from 'terminal-kit';
import { Action } from './action';
import { findLetter, state } from './state';

const keyBindings = {
  CTRL_A: 'startOfInput',
  ENTER: 'submit',
  KP_ENTER: 'submit',
  ESCAPE: 'cancel',
  BACKSPACE: 'backDelete',
  DELETE: 'delete',
  LEFT: 'backward',
  RIGHT: 'forward',
  UP: 'historyPrevious',
  DOWN: 'historyNext',
  HOME: 'startOfInput',
  END: 'endOfInput',
  CTRL_E: 'endOfInput',
  TAB: 'autoComplete',
  CTRL_R: 'autoCompleteUsingHistory',
  CTRL_LEFT: 'previousWord',
  CTRL_RIGHT: 'nextWord',
  ALT_D: 'deleteNextWord',
  CTRL_W: 'deletePreviousWord',
  CTRL_D: 'delete',
  CTRL_C: 'cancel',
  CTRL_Z: 'cancel',
  CTRL_U: 'deleteAllBefore',
  CTRL_K: 'deleteAllAfter'
};

export type EditFrame = { t: 'edit', id: number | undefined };

export async function showEditDialog(frame: EditFrame, term: Terminal): Promise<Action> {
  term.red('EDIT TEXT OF LETTER\n> ');
  term.hideCursor(false);
  let def = '';
  if (frame.id !== undefined) {
    def = findLetter(state, frame.id).body;
  }
  const result = await (term.inputField({ 'default': def, keyBindings })).promise;
  if (result == undefined) {
    return { t: 'back' };
  }
  else {
    return { t: 'setLetterText', id: frame.id, text: result };
  }
}

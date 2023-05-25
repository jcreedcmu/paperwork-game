import { Terminal } from 'terminal-kit';
import { Action } from './action';
import { findLetter, state } from './state';

export type EditFrame = { t: 'edit', id: number | undefined };

export async function showEditDialog(frame: EditFrame, term: Terminal): Promise<Action> {
  term('> ');
  term.hideCursor(false);
  let def = '';
  if (frame.id !== undefined) {
    def = findLetter(state, frame.id).body;
  }
  const result = await (term.inputField({ 'default': def })).promise;
  if (result == undefined) {
    return { t: 'back' };
  }
  else {
    return { t: 'setLetterText', id: frame.id, text: result };
  }
}

import { Terminal } from 'terminal-kit';
import { Action } from './action';

export type EditFrame = { t: 'edit', id: number | undefined };

export async function showEditDialog(frame: EditFrame, term: Terminal): Promise<Action> {
  term('> ');
  const result = await (term.inputField()).promise;
  if (result == undefined) {
    return { t: 'back' };
  }
  else {
    return { t: 'setLetterText', id: frame.id, text: result };
  }
}

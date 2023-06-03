import { ScreenBuffer, Terminal } from 'terminal-kit';
import { Action } from './action';
import { State, findLetter } from './state';

// const keyBindings = {
//   CTRL_A: 'startOfInput',
//   ENTER: 'submit',
//   KP_ENTER: 'submit',
//   ESCAPE: 'cancel',
//   BACKSPACE: 'backDelete',
//   DELETE: 'delete',
//   LEFT: 'backward',
//   RIGHT: 'forward',
//   UP: 'historyPrevious',
//   DOWN: 'historyNext',
//   HOME: 'startOfInput',
//   END: 'endOfInput',
//   CTRL_E: 'endOfInput',
//   TAB: 'autoComplete',
//   CTRL_R: 'autoCompleteUsingHistory',
//   CTRL_LEFT: 'previousWord',
//   CTRL_RIGHT: 'nextWord',
//   ALT_D: 'deleteNextWord',
//   CTRL_W: 'deletePreviousWord',
//   CTRL_D: 'delete',
//   CTRL_C: 'cancel',
//   CTRL_Z: 'cancel',
//   CTRL_U: 'deleteAllBefore',
//   CTRL_K: 'deleteAllAfter'
// };

export type EditFrame = { t: 'edit', id: number | undefined, text: string };

export function renderEditPane(buf: ScreenBuffer, state: State, frame: EditFrame): void {
  buf.moveTo(0, 0);
  buf.put({ attr: { color: 'red' }, newLine: true }, 'EDIT TEXT OF LETTER\n> ');
  buf.put({}, frame.text);
}

// return { t: 'setLetterText', id: frame.id, text: result };

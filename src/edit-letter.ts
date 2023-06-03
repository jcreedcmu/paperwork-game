import { ScreenBuffer, Terminal } from 'terminal-kit';
import { Action, doAction } from './action';
import { State, findLetter } from './state';
import { unreachable } from './util';

export type EditFrame = { t: 'edit', id: number | undefined, text: string };

export function renderEditPane(buf: ScreenBuffer, state: State, frame: EditFrame): void {
  buf.put({ attr: { color: 'red' }, newLine: true }, 'EDIT TEXT OF LETTER\n> ');
  buf.put({}, frame.text);
}

export type EditUiAction =
  | { t: 'left' }
  | { t: 'right' }
  | { t: 'deleteLeft' }
  | { t: 'home' }
  | { t: 'end' }
  | { t: 'submit' }
  | { t: 'kill' }
  | { t: 'insert', key: string }
  ;

export function doEditUiAction(state: State, frame: EditFrame, action: EditUiAction): void {
  switch (action.t) {
    case 'left': break;
    case 'right': break;
    case 'deleteLeft': break;
    case 'home': break;
    case 'end': break;
    case 'kill': break;
    case 'submit': {
      doAction(state, { t: 'setLetterText', id: frame.id, text: frame.text });
    } break;
    case 'insert':
      frame.text += action.key;
      break;
    default: unreachable(action);
  }
}

export function editUiAction(action: EditUiAction): Action {
  return { t: 'editUiAction', action }
}

import { ScreenBuffer } from 'terminal-kit';
import { Action, doAction } from './action';
import { State } from './state';
import { unreachable } from './util';

export type EditFrame = { t: 'edit', id: number | undefined, text: string, cursorPos: number };

export function makeEditFrame(id: number | undefined, text: string): EditFrame {
  return { t: 'edit', id, text, cursorPos: text.length }
}

export function renderEditPane(buf: ScreenBuffer, state: State, frame: EditFrame): void {
  buf.put({ attr: { color: 'red' }, newLine: true }, 'EDIT TEXT OF LETTER\n> ');
  buf.put({}, frame.text);
  buf.moveTo(frame.cursorPos + 2, 1);
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
    case 'left': frame.cursorPos = Math.max(0, frame.cursorPos - 1); break;
    case 'right': frame.cursorPos = Math.min(frame.text.length, frame.cursorPos + 1); break;
    case 'deleteLeft': {
      if (frame.cursorPos > 0) {
        frame.text = frame.text.substr(0, frame.cursorPos - 1) + frame.text.substr(frame.cursorPos);
        frame.cursorPos--;
      }
    } break;
    case 'home': frame.cursorPos = 0; break;
    case 'end': frame.cursorPos = frame.text.length; break;
    case 'kill': frame.text = frame.text.substr(0, frame.cursorPos); break;
    case 'submit': {
      doAction(state, { t: 'setLetterText', id: frame.id, text: frame.text });
    } break;
    case 'insert': {
      if (action.key.length == 1) {
        frame.text = frame.text.substr(0, frame.cursorPos) + action.key + frame.text.substr(frame.cursorPos);
        frame.cursorPos++;
      }
    } break;
    default: unreachable(action);
  }
}

export function editUiAction(action: EditUiAction): Action {
  return { t: 'editUiAction', action }
}

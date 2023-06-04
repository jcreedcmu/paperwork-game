import { ScreenBuffer, Terminal } from 'terminal-kit';
import { renderDisplay, stringOfDoc } from './doc';
import { renderEditPane } from './edit-letter';
import { renderLog } from './logger';
import { UiStackFrame, renderMenu } from './menu';
import { Item, State, resources } from './state';
import { unreachable } from './util';
import { TextBuffer } from './buffer';

export const STATUS_COLUMN = 30;
export function stringOfItem(item: Item): string {
  switch (item.t) {
    case 'letter': return item.body;
    case 'doc': return stringOfDoc(item.doc);
  }
}

function renderState(buf: TextBuffer, state: State) {
  buf.moveTo(STATUS_COLUMN, 1);
  buf.green().put('time:').put('' + state.time);

  let row = 2;
  resources.forEach((res, i) => {
    if (state.inv.res[res] > 0) {
      buf.moveTo(STATUS_COLUMN, row);
      buf.blue().put(`${res}: `).put('' + state.inv.res[res]);
      row++;
    }
  });
  row++;
  state.inv.items.forEach((item, i) => {
    buf.moveTo(STATUS_COLUMN, row);
    buf.red().put(`* ${stringOfItem(item)}`);
    row++;
  });
}

function renderStateForFrame(frame: UiStackFrame): boolean {
  switch (frame.t) {
    case 'menu': return true;
    case 'edit': return false;
    case 'display': return false;
    case 'debug': return false;
  }
}

function renderToBuffer(buf: TextBuffer, state: State): void {
  const frame = state.uiStack[0];
  switch (frame.t) {
    case 'menu': renderMenu(buf, state, frame); break;
    case 'debug': /* unimplemented */ break;
    case 'edit': renderEditPane(buf, state, frame); break;
    case 'display': renderDisplay(buf, state, frame); break;
    default:
      unreachable(frame);
  }
  if (renderStateForFrame(frame)) {
    renderState(buf, state);
  }
}

export const WIDTH = 80;
export const HEIGHT = 25;

function showCursorOfState(state: State): boolean {
  const frame = state.uiStack[0];
  switch (frame.t) {
    case 'debug': return true;
    case 'edit': return true;
    case 'menu': return false;
    case 'display': return false;
  }
}

export function render(term: Terminal, state: State): void {
  const buf = new TextBuffer(WIDTH, HEIGHT, term);
  buf.fill(' ');
  renderLog(buf, state.log);
  buf.home();
  renderToBuffer(buf, state);
  buf.draw();
  buf.setCursorVisibility(!showCursorOfState(state));
}

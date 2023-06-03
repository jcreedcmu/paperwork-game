import { ScreenBuffer, Terminal } from 'terminal-kit';
import { Action } from './action';
import { showDisplayDoc } from './doc';
import { renderEditPane } from './edit-letter';
import { UiStackFrame, renderMenu } from './menu';
import { LogLine, resources, State } from './state';
import { showDebug } from './debug';
import { unreachable } from './util';
import { STATUS_COLUMN, stringOfItem, term } from '.';

function renderState(buf: ScreenBuffer, state: State) {
  buf.moveTo(STATUS_COLUMN, 1);
  buf.put({ attr: { color: 'green' } }, 'time:');
  buf.put({}, '' + state.time);

  let row = 2;
  resources.forEach((res, i) => {
    if (state.inv.res[res] > 0) {
      buf.moveTo(STATUS_COLUMN, row);
      buf.put({ attr: { color: 'blue' } }, `${res}: `);
      buf.put({}, '' + state.inv.res[res]);
      row++;
    }
  });
  row++;
  state.inv.items.forEach((item, i) => {
    buf.moveTo(STATUS_COLUMN, row);
    buf.put({ attr: { color: 'red' } }, `* ${stringOfItem(item)}`);
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

// async function showUi(state: State): Promise<Action> {
//   const frame = state.uiStack[0];
//   term.clear();
//   term.hideCursor(true);
//   if (renderStateForFrame(frame)) {
//     // renderState(state); // DEPRECATED
//   }
//   term.moveTo(1, 1);

//   try {
//     switch (frame.t) {
//       case 'menu': throw 'Deprecated'; // return await showMenu(state, term, frame);
//       case 'edit': return await showEditDialog(state, frame, term);
//       case 'display': return await showDisplayDoc(frame, term, frame.which);
//       case 'debug': return await showDebug(term);
//     }
//   }
//   finally {
//     term.hideCursor(false);
//   }
// }

function renderToBuffer(buf: ScreenBuffer, state: State): void {
  const frame = state.uiStack[0];
  switch (frame.t) {
    case 'menu': renderMenu(buf, state, frame); break;
    case 'debug': /* unimplemented */ break;
    case 'edit': renderEditPane(buf, state, frame); break;
    case 'display':
      break;
    default:
      unreachable(frame);
  }
  if (renderStateForFrame(frame)) {
    renderState(buf, state);
  }
}
const WIDTH = 80;
const HEIGHT = 25;
function renderLog(buf: ScreenBuffer, log: LogLine[]): void {
  const lines = log.slice(-10).reverse();
  lines.forEach((line, ix) => {
    buf.moveTo(WIDTH - 20, ix);
    buf.put({ attr: { color: 'white' } }, `[${line.time}] `);
    buf.put({}, line.msg);
  });
}
export function render(term: Terminal, state: State): void {
  const buf = new ScreenBuffer({ width: WIDTH, height: HEIGHT, dst: term });
  buf.fill({ char: ' ' });
  renderLog(buf, state.log);
  renderToBuffer(buf, state);
  buf.draw({ delta: true });
}

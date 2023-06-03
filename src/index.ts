import { ScreenBuffer, Terminal, terminal } from 'terminal-kit';
import { Action, doAction, logger, quit, resolveFutures } from './action';
import { showDisplayDoc, stringOfDoc } from './doc';
import { showEditDialog } from './edit-letter';
import { MenuFrame, UiStackFrame, renderMenu } from './menu';
import { initState, Item, LogLine, resources, State } from './state';
import { showDebug } from './debug';

const term: Terminal = terminal;

declare module "terminal-kit" {
  class ScreenBuffer {
    put(
      options: Partial<ScreenBuffer.PutOptions> & { newLine?: boolean },
      format: string,
      ...formatArgumets: any[]
    ): void;
    fill(options: { char: string, attr?: ScreenBuffer.Attributes | number }): void;
  }
}

const STATUS_COLUMN = 30;
const LOG_ROW = 15;

function stringOfItem(item: Item): string {
  switch (item.t) {
    case 'letter': return item.body;
    case 'doc': return stringOfDoc(item.doc);
  }
}

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

async function showUi(state: State): Promise<Action> {
  const frame = state.uiStack[0];
  term.clear();
  term.hideCursor(true);
  if (renderStateForFrame(frame)) {
    // renderState(state); // DEPRECATED
  }
  term.moveTo(1, 1);

  try {
    switch (frame.t) {
      case 'menu': throw 'Deprecated'; // return await showMenu(state, term, frame);
      case 'edit': return await showEditDialog(state, frame, term);
      case 'display': return await showDisplayDoc(frame, term, frame.which);
      case 'debug': return await showDebug(term);
    }
  }
  finally {
    term.hideCursor(false);
  }
}



function renderToBuffer(buf: ScreenBuffer, state: State): void {
  const frame = state.uiStack[0];
  switch (frame.t) {
    case 'menu':
      renderMenu(buf, state, frame);
      break;
    case 'debug':
      break;
    case 'edit':
      break;
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

function render(term: Terminal, state: State): void {
  const buf = new ScreenBuffer({ width: WIDTH, height: HEIGHT, dst: term });
  buf.fill({ char: ' ' });
  renderLog(buf, state.log);
  renderToBuffer(buf, state);
  buf.draw({ delta: true });
}

export type KeyMap = Record<string, Action>;

const debugKeyMap: KeyMap = {};
const menuKeyMap: KeyMap = {
  UP: { t: 'menuPrev' },
  DOWN: { t: 'menuNext' },
};
const editKeyMap: KeyMap = {};
const displayKeyMap: KeyMap = {};
const defaultKeyMap: KeyMap = { ESCAPE: { t: 'exit' } };

function keyMapOfFrame(frame: UiStackFrame): KeyMap {
  switch (frame.t) {
    case 'debug': return debugKeyMap;
    case 'menu': return menuKeyMap;
    case 'edit': return editKeyMap;
    case 'display': return displayKeyMap;
  }
}

function actionOfKey(state: State, key: string): Action {
  const keymaps = state.uiStack.map(keyMapOfFrame);
  keymaps.push(defaultKeyMap);
  logger(state, key);

  for (const keymap of keymaps) {
    const m = keymap[key];
    if (m !== undefined)
      return m;
  }

  return { t: 'none' };
}

import * as events from 'events';
import { unreachable } from './util';

async function go() {
  const state = initState();
  term.clear();
  render(term, state);

  term.hideCursor(true);
  term.grabInput(true);
  term.on('key', (key: string) => {
    const action = actionOfKey(state, key);
    doAction(state, term, action);
    resolveFutures(term, state);
    render(term, state);
  });

  //   const action = await showUi(state);
}

go();

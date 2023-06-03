import * as terminalKit from 'terminal-kit';
import { Action, doAction, quit, resolveFutures } from './action';
import { showDisplayDoc, stringOfDoc } from './doc';
import { showEditDialog } from './edit-letter';
import { UiStackFrame, showMenu } from './menu';
import { initState, Item, resources, State } from './state';
import { showDebug } from './debug';

const term: terminalKit.Terminal = terminalKit.terminal;

term.addListener('key', (x: string) => {
  if (x == 'ESCAPE' || x == 'q') {
    quit(term);
  }
});

const STATUS_COLUMN = 30;
const LOG_ROW = 15;

function stringOfItem(item: Item): string {
  switch (item.t) {
    case 'letter': return item.body;
    case 'doc': return stringOfDoc(item.doc);
  }
}

function renderState(state: State) {
  term.moveTo(STATUS_COLUMN, 1);
  term.green('time: '); term('' + state.time);

  let row = 2;
  resources.forEach((res, i) => {
    if (state.inv.res[res] > 0) {
      term.moveTo(STATUS_COLUMN, row);
      term.blue(`${res}: `); term('' + state.inv.res[res]);
      row++;
    }
  });
  row++;
  state.inv.items.forEach((item, i) => {
    term.moveTo(STATUS_COLUMN, row);
    term.red(`* `); term.red(stringOfItem(item));
    row++;
  });

  if (state.log.length > 0) {
    const lines = state.log.slice(-10).reverse();
    lines.forEach((line, i) => {
      term.moveTo(STATUS_COLUMN, LOG_ROW + i);
      term.gray(line);
    });
  }
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
    renderState(state);
  }
  term.moveTo(1, 1);

  try {
    switch (frame.t) {
      case 'menu': return await showMenu(state, term, frame);
      case 'edit': return await showEditDialog(state, frame, term);
      case 'display': return await showDisplayDoc(frame, term, frame.which);
      case 'debug': return await showDebug(term);
    }
  }
  finally {
    term.hideCursor(false);
  }
}

async function go() {
  const state = initState();
  while (1) {
    const action = await showUi(state);
    doAction(state, term, action);
    resolveFutures(term, state);
  }
}

go();

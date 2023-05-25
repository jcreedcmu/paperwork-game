import * as terminalKit from 'terminal-kit';
import { Action, MenuAction, stringOfMenuAction } from './action';
import { EditFrame, showEditDialog } from './dialog';
import { randElt, unreachable } from './util';

const term: terminalKit.Terminal = terminalKit.terminal;

function quit() {
  term.clear();
  term.reset();
  process.exit(0);
}

function win() {
  term.clear();
  term.green('you win!\n');
  process.exit(0);
}

term.addListener('key', (x: string) => {
  if (x == 'ESCAPE' || x == 'q') {
    quit();
  }
});

const resources = ['cash', 'bottle', 'paper', 'pencil'] as const;
const collectResources: Resource[] = ['bottle', 'paper', 'pencil'];

// A resource is just a thing that you can have some number of --- and
// the number of them that you have is the only information that is
// kept track of. They don't have any notion of identity.
type Resource = (typeof resources)[number];

// An item, on the other hand, does has a distinct identity, and does
// not 'stack'.
type Item =
  | LetterItem;

export type LetterItem = { t: 'letter', id: number, body: string };

type Menu = 'main' | 'compose';
type MenuFrame = { t: 'menu', which: Menu, ix: number };
type UiStackFrame =
  | MenuFrame
  | EditFrame
  ;

type State = {
  uiStack: UiStackFrame[],
  idCounter: number,
  time: number,
  selectedIndex: number | undefined,
  inv: {
    items: Item[],
    res: Record<Resource, number>
  },
}

const state: State = {
  uiStack: [{ t: 'menu', which: 'main', ix: 0 }],
  selectedIndex: undefined,
  idCounter: 0,
  time: 0,
  inv: {
    items: [],
    res: Object.fromEntries(resources.map(x => [x, 0])) as Record<Resource, number>
  },
};

function showState(state: State) {
  console.log(JSON.stringify(state));
}

const STATUS_COLUMN = 30;

function findLetter(id: number): LetterItem {
  const ix = state.inv.items.findIndex(x => x.id == id);
  if (ix == -1) {
    throw new Error(`no item with id ${id}`);
  }
  const item = state.inv.items[ix];
  if (item.t != 'letter') {
    throw new Error(`item with id ${id} not a letter`);
  }
  return item;
}

function stringOfItem(item: Item): string {
  switch (item.t) {
    case 'letter': return item.body;
  }
}

function renderState() {
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
}

async function showMenu(frame: MenuFrame): Promise<MenuAction> {
  switch (frame.which) {
    case 'main': return await mainMenu(frame);
    case 'compose': return await composeMenu(frame);
  }
}

async function showUi(uiStackFrame: UiStackFrame): Promise<Action> {
  term.clear();
  term.hideCursor(true);
  renderState();
  term.moveTo(1, 1);

  try {
    switch (uiStackFrame.t) {
      case 'menu': return await showMenu(uiStackFrame);
      case 'edit': return await showEditDialog(uiStackFrame, term);
    }
  }
  finally {
    term.hideCursor(false);
  }
}

async function actionMenu(title: string, frame: MenuFrame, actions: MenuAction[], options?: terminalKit.Terminal.SingleColumnMenuOptions):
  Promise<MenuAction> {
  term.red(title);
  const selectedIndex = Math.min(frame.ix, actions.length - 1);
  const cont = term.singleColumnMenu(actions.map(stringOfMenuAction), { ...options, selectedIndex });
  const result = await cont.promise;
  frame.ix = result.selectedIndex;
  return actions[result.selectedIndex];
}

function hasLetters(): boolean {
  return state.inv.items.some(x => x.t == 'letter');
}

function canWriteLetter(): boolean {
  return state.inv.res.paper > 0 && state.inv.res.pencil > 0;
}

function canCompose(): boolean {
  return hasLetters() || canWriteLetter();
}

async function mainMenu(frame: MenuFrame): Promise<MenuAction> {
  const menuItems: MenuAction[] = [
    { t: 'sleep' },
    { t: 'collect' },
  ];
  if (state.inv.res.bottle > 0) {
    menuItems.push({ t: 'recycle' });
  }
  if (state.inv.res.cash >= 10) {
    menuItems.push({ t: 'purchase' });
  }
  if (canCompose()) {
    menuItems.push({ t: 'enterComposeMenu' });
  }
  menuItems.push({ t: 'exit' });
  return await actionMenu('MAIN MENU', frame, menuItems);
}

async function composeMenu(frame: MenuFrame): Promise<MenuAction> {
  const menuItems: MenuAction[] = [];
  state.inv.items.forEach((item, ix) => {
    if (item.t == 'letter') {
      menuItems.push({ t: 'editLetter', id: item.id, body: item.body });
    }
  });
  if (canWriteLetter()) {
    menuItems.push({ t: 'newLetter' });
  }
  menuItems.push({ t: 'back' });

  return await actionMenu('COMPOSE MENU', frame, menuItems);
}

function setLetterText(id: number, text: string): void {
  const ix = state.inv.items.findIndex(x => x.id == id);
  if (ix == -1) {
    throw new Error(`no item with id ${id}`);
  }
  const item = state.inv.items[ix];
  if (item.t != 'letter') {
    throw new Error(`item with id ${id} not a letter`);
  }
  item.body = text;
}

async function doAction(action: Action): Promise<void> {
  switch (action.t) {
    case 'exit': quit(); break;
    case 'sleep': state.time++; break;
    case 'collect': {
      state.inv.res[randElt(collectResources)]++; state.time++;
    } break;
    case 'recycle': state.inv.res.cash += state.inv.res.bottle; state.inv.res.bottle = 0; state.time++; break;
    case 'purchase': win(); break;
    case 'enterComposeMenu': state.uiStack.unshift({ t: 'menu', which: 'compose', ix: 0 }); break;
    case 'back': state.uiStack.shift(); break;
    case 'newLetter': {
      state.uiStack.unshift({ t: 'edit', id: undefined });
    }
      break;
    case 'editLetter':
      state.uiStack.unshift({ t: 'edit', id: action.id });
      break;
    case 'setLetterText': {
      const { id, text } = action;
      if (id == undefined) {
        state.inv.res.paper--;
        const newId = state.idCounter++;
        const id = state.idCounter++;
        state.inv.items.push({ t: 'letter', id, body: text });
      }
      else {
        findLetter(id).body = text;
      }
      state.uiStack.shift();
    } break;
    default: unreachable(action);
  }
}

const history: string[] = [];
async function go() {
  while (1) {
    const action = await showUi(state.uiStack[0]);
    doAction(action);
  }
}

go();

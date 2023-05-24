import * as terminalKit from 'terminal-kit';
import { randElt, unreachable } from './util';
const term = terminalKit.terminal;

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
  | { t: 'letter', id: number, body: string };

type Menu = 'main' | 'compose';
type UiStackFrame =
  | { t: 'menu', which: Menu, ix: number };

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

type Action =
  | { t: 'sleep' }
  | { t: 'collect' }
  | { t: 'exit' }
  | { t: 'recycle' }
  | { t: 'purchase' }
  | { t: 'composeMenu' }
  | { t: 'newLetter' }
  | { t: 'editLetter', ix: number, body: string }
  | { t: 'back' }
  ;

const STATUS_COLUMN = 30;

function getLetterBody(id: number): string {
  const ix = state.inv.items.findIndex(x => x.id == id);
  if (ix == -1) {
    throw new Error(`no item with id ${id}`);
  }
  const item = state.inv.items[ix];
  if (item.t != 'letter') {
    throw new Error(`item with id ${id} not a letter`);
  }
  return item.body;
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

function getMenuHandler(which: Menu): () => Promise<Action> {
  switch (which) {
    case 'main': return mainMenu;
    case 'compose': return composeMenu;
  }
}

async function showMenu(which: Menu): Promise<Action> {
  try {
    const menuHandler = getMenuHandler(which);
    return await menuHandler();
  }
  finally {
    term.hideCursor(false);
  }
}
async function showUi(uiStackFrame: UiStackFrame): Promise<Action> {
  term.clear();
  term.hideCursor(true);
  renderState();
  term.moveTo(1, 1);

  switch (uiStackFrame.t) {
    case 'menu': return await showMenu(uiStackFrame.which);
  }
}

function stringOfAction(action: Action): string {
  switch (action.t) {
    case 'sleep': return 'sleep';
    case 'collect': return 'collect';
    case 'purchase': return 'purchase freedom';
    case 'exit': return 'exit';
    case 'recycle': return 'recycle bottles';
    case 'composeMenu': return 'compose...';
    case 'newLetter': return 'new letter';
    case 'editLetter': return `edit letter ("${action.body.substring(0, 10)}")`;
    case 'back': return '<-';
  }
}

async function actionMenu(title: string, actions: Action[], options?: terminalKit.Terminal.SingleColumnMenuOptions):
  Promise<Action> {
  term.red(title);
  const selectedIndex = Math.min(state.uiStack[0].ix, actions.length - 1);
  const cont = term.singleColumnMenu(actions.map(stringOfAction), { ...options, selectedIndex });
  const result = await cont.promise;
  state.uiStack[0].ix = result.selectedIndex;
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

async function mainMenu(): Promise<Action> {
  const menuItems: Action[] = [
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
    menuItems.push({ t: 'composeMenu' });
  }
  menuItems.push({ t: 'exit' });
  return await actionMenu('MAIN MENU', menuItems);
}

async function composeMenu(): Promise<Action> {
  const menuItems: Action[] = [];
  state.inv.items.forEach((item, ix) => {
    if (item.t == 'letter') {
      menuItems.push({ t: 'editLetter', ix, body: item.body });
    }
  });
  if (canWriteLetter()) {
    menuItems.push({ t: 'newLetter' });
  }
  menuItems.push({ t: 'back' });

  return await actionMenu('COMPOSE MENU', menuItems);
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
    case 'composeMenu': state.uiStack.unshift({ t: 'menu', which: 'compose', ix: 0 }); break;
    case 'back': state.uiStack.shift(); break;
    case 'newLetter': {
      //  state.menuStack.unshift({ which: 'edit', id: newId });
      state.inv.res.paper--;
      const id = state.idCounter++;
      state.inv.items.push({ t: 'letter', id, body: 'a letter' });
    }
      break;
    case 'editLetter': break;
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

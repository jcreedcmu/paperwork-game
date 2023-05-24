import * as terminalKit from 'terminal-kit';
import { randElt } from './util';
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
  | { t: 'letter', body: string };

type Menu = 'main' | 'compose';
type MenuStackFrame = 'compose';

type State = {
  menuStack: MenuStackFrame[],
  time: number,
  selectedIndex: number | undefined,
  inv: {
    items: Item[],
    res: Record<Resource, number>
  },
}

const state: State = {
  menuStack: [],
  selectedIndex: undefined,
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
  | 'sleep'
  | 'collect'
  | 'exit'
  | 'recycle'
  | 'purchase'
  | 'compose'
  | 'back'
  ;

function renderState() {
  term.moveTo(20, 1);
  term.green('time: '); term('' + state.time);

  let row = 2;
  resources.forEach((res, i) => {
    if (state.inv.res[res] > 0) {
      term.moveTo(20, row);
      term.blue(`${res}: `); term('' + state.inv.res[res]);
      row++;
    }
  });
}

function menuOfMenuStack(menuStack: MenuStackFrame[]): Menu {
  if (menuStack.length == 0) return 'main';
  else switch (menuStack[0]) {
    case 'compose': return 'compose';
  }
}

function getMenuHandler(which: Menu): () => Promise<Action> {
  switch (which) {
    case 'main': return mainMenu;
    case 'compose': return composeMenu;
  }
}

async function showMenu(which: Menu): Promise<Action> {
  term.clear();
  term.hideCursor(true);
  renderState();
  term.moveTo(1, 1);
  try {
    const menuHandler = getMenuHandler(which);
    return await menuHandler();
  }
  finally {
    term.hideCursor(false);
  }
}

async function mainMenu(): Promise<Action> {
  term.red('MAIN MENU');
  const menu: Action[] = ['sleep', 'collect', 'recycle', 'compose'];
  if (state.inv.res.cash > 10) {
    menu.push('purchase');
  }
  menu.push('exit');
  const cont = term.singleColumnMenu(menu, { selectedIndex: state.selectedIndex });
  const result = await cont.promise;
  state.selectedIndex = result.selectedIndex;
  return menu[result.selectedIndex];
}

function unreachable(v: never): void { }

async function composeMenu(): Promise<Action> {
  term.red('COMPOSE MENU');
  const cont = term.singleColumnMenu(['back']);
  const result = await cont.promise;
  return 'back';
}

async function doAction(action: Action): Promise<void> {
  switch (action) {
    case 'exit': quit(); break;
    case 'sleep': state.time++; break;
    case 'collect': {
      state.inv.res[randElt(collectResources)]++; state.time++;
    } break;
    case 'recycle': state.inv.res.cash += state.inv.res.bottle; state.inv.res.bottle = 0; state.time++; break;
    case 'purchase': win(); break;
    case 'compose': state.menuStack.push('compose'); break;
    case 'back': state.menuStack.pop(); break;
    default: unreachable(action);
  }
}

const history: string[] = [];
async function go() {
  while (1) {
    const action = await showMenu(menuOfMenuStack(state.menuStack));
    doAction(action);
  }
}

go();

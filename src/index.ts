import * as terminalKit from 'terminal-kit';
import { randElt } from './util';
const term = terminalKit.terminal;

function quit() {
  term.clear();
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

type Resource = (typeof resources)[number];
type State = {
  time: number,
  selectedIndex: number | undefined,
  inv: { res: Record<Resource, number> },
}

const state: State = {
  selectedIndex: undefined,
  time: 0,
  inv: { res: Object.fromEntries(resources.map(x => [x, 0])) as Record<Resource, number> },
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

async function mainMenu(): Promise<Action> {
  term.clear();
  term.hideCursor(true);
  renderState();
  term.moveTo(1, 1);
  try {
    return await _mainMenu();
  }
  finally {
    term.hideCursor(false);
  }
}

async function _mainMenu(): Promise<Action> {
  term.red('MAIN MENU');
  const menu: Action[] = ['sleep', 'collect', 'recycle'];
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

function doAction(action: Action): void {
  switch (action) {
    case 'exit': quit(); break;
    case 'sleep': state.time++; break;
    case 'collect': {
      state.inv.res[randElt(collectResources)]++; state.time++;
    } break;
    case 'recycle': state.inv.res.cash += state.inv.res.bottle; state.inv.res.bottle = 0; state.time++; break;
    case 'purchase': win(); break;
    default: unreachable(action);
  }
}

const history: string[] = [];
async function go() {
  while (1) {
    const action = await mainMenu();
    doAction(action);
  }
}

go();

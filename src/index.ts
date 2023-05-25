import * as terminalKit from 'terminal-kit';
import { Action, MenuAction, stringOfMenuAction } from './action';
import { EditFrame, showEditDialog } from './dialog';
import { randElt, unreachable } from './util';
import { state, Item, resources, findLetter, collectResources, State, Future, LetterItem } from './state';
import { LetterMenu, MenuFrame, UiStackFrame } from "./menu";


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

const STATUS_COLUMN = 30;
const LOG_ROW = 15;
const FREEDOM_PRICE = 100;

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

  if (state.log.length > 0) {
    const lines = state.log.slice(-10).reverse();
    lines.forEach((line, i) => {
      term.moveTo(STATUS_COLUMN, LOG_ROW + i);
      term.gray(line);
    });
  }
}

async function showMenu(frame: MenuFrame): Promise<MenuAction> {
  switch (frame.which.t) {
    case 'main': return await mainMenu(frame);
    case 'inventory': return await inventoryMenu(frame);
    case 'letter': return await letterMenu(frame, frame.which);
  }
}

function renderStateForFrame(frame: UiStackFrame): boolean {
  switch (frame.t) {
    case 'menu': return true;
    case 'edit': return false;
  }
}

async function showUi(frame: UiStackFrame): Promise<Action> {
  term.clear();
  term.hideCursor(true);
  if (renderStateForFrame(frame)) {
    renderState();
  }
  term.moveTo(1, 1);

  try {
    switch (frame.t) {
      case 'menu': return await showMenu(frame);
      case 'edit': return await showEditDialog(frame, term);
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

function hasItems(): boolean {
  return state.inv.items.length > 0;
}

function canWriteLetter(): boolean {
  return state.inv.res.paper > 0 && state.inv.res.pencil > 0;
}

async function mainMenu(frame: MenuFrame): Promise<MenuAction> {
  const menuItems: MenuAction[] = [
    { t: 'sleep' },
    { t: 'collect' },
  ];
  if (state.inv.res.bottle > 0) {
    menuItems.push({ t: 'recycle' });
  }
  if (state.inv.res.cash >= FREEDOM_PRICE) {
    menuItems.push({ t: 'purchase' });
  }
  if (canWriteLetter()) {
    menuItems.push({ t: 'newLetter' });
  }
  if (hasItems()) {
    menuItems.push({ t: 'enterInventoryMenu' });
  }
  menuItems.push({ t: 'exit' });
  return await actionMenu('MAIN MENU', frame, menuItems);
}

async function inventoryMenu(frame: MenuFrame): Promise<MenuAction> {
  const menuItems: MenuAction[] = [];
  state.inv.items.forEach((item, ix) => {
    if (item.t == 'letter') {
      menuItems.push({ t: 'enterLetterMenu', id: item.id, body: item.body });
    }
  });
  menuItems.push({ t: 'back' });

  return await actionMenu('INVENTORY MENU', frame, menuItems);
}

async function letterMenu(frame: MenuFrame, which: LetterMenu): Promise<MenuAction> {
  const menuItems: MenuAction[] = [
    { t: 'editLetter', id: which.id },
    { t: 'sendLetter', id: which.id },
    { t: 'back' },
  ];
  return await actionMenu('LETTER MENU', frame, menuItems);
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

function goBack(state: State): void {
  state.uiStack.shift();
}

async function doAction(action: Action): Promise<void> {
  switch (action.t) {
    case 'exit': quit(); break;
    case 'sleep':
      state.time++;
      break;
    case 'collect': {
      state.inv.res[randElt(collectResources)]++;
      state.time++;
    } break;
    case 'recycle':
      state.inv.res.cash += state.inv.res.bottle;
      state.inv.res.bottle = 0;
      break;
    case 'purchase': win(); break;
    case 'enterInventoryMenu': state.uiStack.unshift({ t: 'menu', which: { t: 'inventory' }, ix: 0 }); break;
    case 'back': goBack(state); break;
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
        findLetter(state, id).body = text;
      }
      goBack(state);
    } break;
    case 'enterLetterMenu':
      state.uiStack.unshift({ t: 'menu', which: { t: 'letter', id: action.id }, ix: 0 });
      break;
    case 'sendLetter':
      const letter = findLetter(state, action.id);
      addFuture(state, 3, resolveLetter(letter));
      state.inv.items = state.inv.items.filter(x => x.id != action.id);
      goBack(state);
      break;
    case 'bigMoney':
      logger('got big money');
      state.inv.res.cash += 50;
      break;
    case 'nothing':
      logger('letter had no effect');
      break;
    default: unreachable(action);
  }
}

function logger(msg: string): void {
  state.log.push(`[${state.time}] ${msg}`);
}

function resolveLetter(letter: LetterItem): Action {
  if (letter.body.match('money')) {
    return { t: 'bigMoney' };
  }
  else {
    return { t: 'nothing' };
  }
}

function addFuture(state: State, delta_time: number, action: Action): void {
  state.futures.push({ action, time: state.time + delta_time });
}

function resolveFutures(state: State): void {
  const time = state.time;
  const fsNow = state.futures.filter(x => x.time <= time);
  const fsLater = state.futures.filter(x => x.time > time);
  state.futures = fsLater;
  fsNow.forEach(f => doAction(f.action));
}

const history: string[] = [];
async function go() {
  while (1) {
    const action = await showUi(state.uiStack[0]);
    doAction(action);
    resolveFutures(state);
  }
}

go();

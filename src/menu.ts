import { Terminal } from 'terminal-kit';
import { MenuAction, stringOfMenuAction } from './action';
import { EditFrame } from './dialog';
import { State, canWriteLetter, hasItems } from './state';

export type LetterMenu = { t: 'letter', id: number };

export type Menu =
  | { t: 'main' }
  | { t: 'inventory' }
  | LetterMenu;

export type MenuFrame = { t: 'menu', which: Menu, ix: number };

export type UiStackFrame =
  | MenuFrame
  | EditFrame;

export async function showMenu(state: State, term: Terminal, frame: MenuFrame): Promise<MenuAction> {
  switch (frame.which.t) {
    case 'main': return await mainMenu(state, term, frame);
    case 'inventory': return await inventoryMenu(state, term, frame);
    case 'letter': return await letterMenu(state, term, frame, frame.which);
  }
}

async function actionMenu(term: Terminal, title: string, frame: MenuFrame, actions: MenuAction[], options?: Terminal.SingleColumnMenuOptions):
  Promise<MenuAction> {
  term.red(title);
  const selectedIndex = Math.min(frame.ix, actions.length - 1);
  const cont = term.singleColumnMenu(actions.map(stringOfMenuAction), { ...options, selectedIndex });
  const result = await cont.promise;
  frame.ix = result.selectedIndex;
  return actions[result.selectedIndex];
}

const FREEDOM_PRICE = 100;

async function mainMenu(state: State, term: Terminal, frame: MenuFrame): Promise<MenuAction> {
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
  return await actionMenu(term, 'MAIN MENU', frame, menuItems);
}

async function inventoryMenu(state: State, term: Terminal, frame: MenuFrame): Promise<MenuAction> {
  const menuItems: MenuAction[] = [];
  state.inv.items.forEach((item, ix) => {
    if (item.t == 'letter') {
      menuItems.push({ t: 'enterLetterMenu', id: item.id, body: item.body });
    }
  });
  menuItems.push({ t: 'back' });

  return await actionMenu(term, 'INVENTORY MENU', frame, menuItems);
}

async function letterMenu(state: State, term: Terminal, frame: MenuFrame, which: LetterMenu): Promise<MenuAction> {
  const menuItems: MenuAction[] = [
    { t: 'editLetter', id: which.id },
    { t: 'sendLetter', id: which.id },
    { t: 'back' },
  ];
  return await actionMenu(term, 'LETTER MENU', frame, menuItems);
}
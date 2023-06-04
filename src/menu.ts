import { ScreenBuffer } from 'terminal-kit';
import { Action, MenuAction, doAction, stringOfMenuAction } from './action';
import { Document } from './doc';
import { EditFrame } from './edit-letter';
import { State, canWriteLetter, hasInboxItems, hasItems } from './state';
import { mod } from './util';

export type LetterMenu = { t: 'letter', id: number };

export type Menu =
  | { t: 'main' }
  | { t: 'inventory' }
  | { t: 'inbox' }
  | LetterMenu;

export type DisplayFrame = { t: 'display', which: Document };
export type MenuFrame = { t: 'menu', which: Menu, ix: number };
export type DebugFrame = { t: 'debug' };

export type UiStackFrame =
  | DebugFrame
  | MenuFrame
  | EditFrame
  | DisplayFrame;

export function menuItemsOfFrame(state: State, frame: MenuFrame): MenuAction[] {
  switch (frame.which.t) {
    case 'main': {
      const menuItems: MenuAction[] = [
        // { t: 'debug' },
        { t: 'sleep' },
        { t: 'collect' },
      ];

      if (state.inv.res.bottle > 0) {
        menuItems.push({ t: 'recycle' });
      }
      if (state.inv.res.cash >= FREEDOM_PRICE) {
        menuItems.push({ t: 'purchase' });
      }
      if (canWriteLetter(state)) {
        menuItems.push({ t: 'newLetter' });
      }
      if (hasItems(state)) {
        menuItems.push({ t: 'enterInventoryMenu' });
      }
      if (hasInboxItems(state)) {
        menuItems.push({ t: 'enterInboxMenu' });
      }
      menuItems.push({ t: 'exit' });
      return menuItems;
    }

    case 'inventory': {
      const menuItems: MenuAction[] = [];
      state.inv.items.forEach((item, ix) => {
        if (item.t == 'letter') {
          menuItems.push({ t: 'enterLetterMenu', id: item.id, body: item.body });
        }
      });
      menuItems.push({ t: 'back' });
      return menuItems;
    }

    case 'inbox': {
      const menuItems: MenuAction[] = [];
      state.inv.inbox.forEach((ibit, ix) => {
        if (ibit.item.t == 'doc') {
          menuItems.push({ t: 'displayDoc', doc: ibit.item.doc });
        }
      });
      menuItems.push({ t: 'back' });
      return menuItems;
    }

    case 'letter':
      return [
        { t: 'editLetter', id: frame.which.id },
        { t: 'backOf', action: { t: 'sendLetter', id: frame.which.id } },
        { t: 'back' },
      ];
  }
}

function getMenuTitle(frame: MenuFrame): string {
  switch (frame.which.t) {
    case 'main': return 'MAIN MENU';
    case 'inventory': return 'INVENTORY MENU';
    case 'letter': return 'LETTER MENU';
    case 'inbox': return 'INBOX MENU';
  }
}

export function renderMenu(buf: ScreenBuffer, state: State, frame: MenuFrame): void {
  buf.put({ attr: { color: 'red', bold: true } }, getMenuTitle(frame));
  const items = menuItemsOfFrame(state, frame);

  items.forEach((item, ix) => {
    const itemStr = stringOfMenuAction(item);
    const selected = frame.ix == ix;
    buf.moveTo(0, ix + 2);
    buf.put({ attr: { inverse: selected } }, itemStr);
  });
}

const FREEDOM_PRICE = 100;

export type MenuUiAction =
  | { t: 'menuNext' }
  | { t: 'menuPrev' }
  | { t: 'menuSelect' }
  ;

export function menuUiAction(action: MenuUiAction): Action {
  return { t: 'menuUiAction', action }
}

function menuInc(state: State, frame: MenuFrame, delta: number): void {
  const menuLength = menuItemsOfFrame(state, frame).length;
  frame.ix = mod(frame.ix + delta, menuLength);
}

function menuSelect(state: State, frame: MenuFrame): void {
  const items = menuItemsOfFrame(state, frame);
  doAction(state, items[frame.ix]);
}

export function doMenuUiAction(state: State, frame: MenuFrame, action: MenuUiAction): void {
  switch (action.t) {
    case 'menuNext': menuInc(state, frame, 1); break;
    case 'menuPrev': menuInc(state, frame, -1); break;
    case 'menuSelect': menuSelect(state, frame); break;
  }
}

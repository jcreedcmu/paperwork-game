import { ScreenBuffer } from 'terminal-kit';
import { Action, MenuAction, doAction } from './action';
import { Document, stringOfDoc } from './doc';
import { EditFrame } from './edit-letter';
import { State, canWriteLetter, hasInboxItems, hasItems } from './state';
import { mod } from './util';
import { getCustomBindings } from './keys';

export type Menu =
  | { t: 'main' }
  | { t: 'inventory' }
  | { t: 'inbox' }
  ;

export type DisplayFrame = { t: 'display', which: Document };
export type MenuFrame = { t: 'menu', which: Menu, ix: number };
export type DebugFrame = { t: 'debug' };

export type UiStackFrame =
  | DebugFrame
  | MenuFrame
  | EditFrame
  | DisplayFrame;

export type MenuItem = { name: string, action: Action };

export function menuItemsOfFrame(state: State, frame: MenuFrame): MenuItem[] {
  switch (frame.which.t) {
    case 'main': {
      const menuItems: MenuItem[] = [
        // { t: 'debug' },
        { name: 'sleep', action: { t: 'sleep' } },
        { name: 'collect', action: { t: 'collect' } },
      ];

      if (state.inv.res.bottle > 0) {
        menuItems.push({ name: 'recycle', action: { t: 'recycle' } });
      }
      if (state.inv.res.cash >= FREEDOM_PRICE) {
        menuItems.push({ name: 'purchase freedom', action: { t: 'purchase' } });
      }
      if (canWriteLetter(state)) {
        menuItems.push({ name: 'new letter', action: { t: 'newLetter' } });
      }
      if (hasItems(state)) {
        menuItems.push({ name: 'inventory...', action: { t: 'enterInventoryMenu' } });
      }
      if (hasInboxItems(state)) {
        menuItems.push({ name: 'inbox...', action: { t: 'enterInboxMenu' } });
      }
      menuItems.push({ name: 'exit', action: { t: 'exit' } });
      return menuItems;
    }

    case 'inventory': {
      const menuItems: MenuItem[] = [];
      state.inv.items.forEach((item, ix) => {
        if (item.t == 'letter') {
          let name = `letter ("${item.body.substring(0, 10)}")`;
          if (item.money > 0) {
            name = `(\$${item.money}) ` + name;
          }
          menuItems.push({
            name,
            action: { t: 'editLetter', id: item.id }
          });
        }
      });
      menuItems.push({ name: '<-', action: { t: 'back' } });
      return menuItems;
    }

    case 'inbox': {
      const menuItems: MenuItem[] = [];
      state.inv.inbox.forEach((ibit, ix) => {
        if (ibit.item.t == 'doc') {
          menuItems.push({ name: stringOfDoc(ibit.item.doc), action: { t: 'displayDoc', doc: ibit.item.doc } });
        }
      });
      menuItems.push({ name: '<-', action: { t: 'back' } });
      return menuItems;
    }
  }
}

function getMenuTitle(frame: MenuFrame): string {
  switch (frame.which.t) {
    case 'main': return 'MAIN MENU';
    case 'inventory': return 'INVENTORY MENU';
    case 'inbox': return 'INBOX MENU';
  }
}

export function renderMenu(buf: ScreenBuffer, state: State, frame: MenuFrame): void {
  buf.put({ attr: { color: 'red', bold: true } }, getMenuTitle(frame));
  const items = menuItemsOfFrame(state, frame);

  items.forEach((item, ix) => {
    const itemStr = item.name;
    const selected = frame.ix == ix;
    buf.moveTo(0, ix + 2);
    buf.put({ attr: { inverse: selected } }, itemStr);
  });

  const customBindingsRow = Math.max(items.length + 3, 10);

  const bindings = getCustomBindings(state, frame);
  const keys = Object.keys(bindings).sort();
  keys.forEach((key, ix) => {
    const action = bindings[key].name;
    buf.moveTo(0, customBindingsRow + ix);
    buf.put({ attr: { color: 'blue' } }, `(${key})`);
    buf.put({}, ` ${action}`);
  });
}

const FREEDOM_PRICE = 100;

export type MenuUiAction =
  | { t: 'menuNext' }
  | { t: 'menuPrev' }
  | { t: 'menuSelect' }
  ;

function menuInc(state: State, frame: MenuFrame, delta: number): void {
  const menuLength = menuItemsOfFrame(state, frame).length;
  frame.ix = mod(frame.ix + delta, menuLength);
}

function menuSelect(state: State, frame: MenuFrame): void {
  const items = menuItemsOfFrame(state, frame);
  doAction(state, items[frame.ix].action);
}

export function doMenuUiAction(state: State, frame: MenuFrame, action: MenuUiAction): void {
  switch (action.t) {
    case 'menuNext': menuInc(state, frame, 1); break;
    case 'menuPrev': menuInc(state, frame, -1); break;
    case 'menuSelect': menuSelect(state, frame); break;
  }
}

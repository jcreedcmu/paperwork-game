import { ScreenBuffer } from 'terminal-kit';
import { Action, doAction } from './action';
import { Document, stringOfDoc } from './doc';
import { EditFrame } from './edit-letter';
import { Item, ItemId, State, WrapItemId, canWriteLetter, findItem, getInbox, hasInboxItems, requireEnvelope, requireStack, Location } from './state';
import { mod, unreachable } from './util';
import { getCustomBindings } from './keys';
import { TextBuffer } from './buffer';
import { FormEditFrame, stringOfForm } from './form';
import { stringOfEnvelope, stringOfItem, stringOfStack } from './render';
import { getResource } from './resource';

export type Menu =
  | { t: 'main' }
  | { t: 'inbox' }
  | { t: 'container', id: number }
  ;

export type DisplayFrame = { t: 'display', which: Document };
export type MenuFrame = { t: 'menu', which: Menu, ix: number };
export type DebugFrame = { t: 'debug' };

export type UiStackFrame =
  | DebugFrame
  | MenuFrame
  | EditFrame
  | DisplayFrame
  | FormEditFrame;

export type MenuItem = { name: string, action: Action };

function getItemMenuItem(item: Item, loc: Location): MenuItem {
  switch (item.t) {
    case 'letter':
      let name = `letter ("${item.body.substring(0, 10)}")`;
      if (item.money > 0) {
        name = `(\$${item.money}) ` + name;
      }
      return {
        name,
        action: { t: 'editLetter', id: item.id }
      };
      break;
    case 'doc':
      let action: Action = { t: 'displayDoc', doc: item.doc };
      if (loc.t == 'inbox') {
        action = { t: 'markUnread', ibix: loc.ix, k: action };
      }
      return {
        name: stringOfDoc(item.doc),
        action
      };
      break;
    case 'form': {
      let name = stringOfForm(item.form);
      if (item.money > 0) {
        name = `(\$${item.money}) ` + name;
      }
      let action: Action = { t: 'editForm', id: item.id, form: item.form };
      if (loc.t == 'inbox') {
        action = { t: 'markUnread', ibix: loc.ix, k: action };
      }
      return { name, action };
    } break;
    case 'envelope':
      return {
        name: stringOfEnvelope(item),
        action: { t: 'enterContainerMenu', id: item.id }
      };
      break;
    case 'stack':
      return {
        name: stringOfStack(item),
        action: { t: 'pickupPart', amount: 'one', softFail: true, loc }
      };
      break;
  }
}

export function menuItemsOfFrame(state: State, frame: MenuFrame): MenuItem[] {
  switch (frame.which.t) {
    case 'main': {
      const menuItems: MenuItem[] = [
        // { t: 'debug' },
        { name: 'sleep', action: { t: 'sleep' } },
        { name: 'collect', action: { t: 'collect' } },
      ];

      if (getResource(state, 'bottle') > 0) {
        menuItems.push({ name: 'recycle', action: { t: 'recycle' } });
      }
      if (getResource(state, 'cash') >= FREEDOM_PRICE) {
        menuItems.push({ name: 'purchase freedom', action: { t: 'purchase' } });
      }
      if (canWriteLetter(state)) {
        menuItems.push({ name: 'new letter', action: { t: 'newLetter' } });
      }
      if (hasInboxItems(state) || state.inv.hand !== undefined) {
        const unreadCount = getInbox(state).filter(x => x.unread).length;
        const unread = unreadCount > 0 ? ` (${unreadCount})` : '';
        menuItems.push({ name: `inbox${unread}...`, action: { t: 'enterInboxMenu' } });
      }
      menuItems.push({ name: 'exit', action: { t: 'exit' } });
      return menuItems;
    }
    case 'inbox': {
      const menuItems: MenuItem[] = [];
      getInbox(state).forEach((ibit, ix) => {
        const unreadMarker = ibit.unread ? '! ' : '  ';
        const menuItem = getItemMenuItem(findItem(state, ibit.id), { t: 'inbox', ix });
        menuItem.name = unreadMarker + menuItem.name;
        menuItems.push(menuItem);
      });
      menuItems.push({ name: '  <-', action: { t: 'back' } });
      return menuItems;
    }
    case 'container': {
      const menuItems: MenuItem[] = [];

      const item = requireEnvelope(findItem(state, frame.which.id));

      for (let ix = 0; ix < item.size; ix++) {
        const itemId = item.contents[ix];
        if (itemId === undefined) {
          const action: Action = state.inv.hand === undefined
            ? { t: 'none' }
            : { t: 'drop', loc: { t: 'rigidContainer', id: item.id, ix } };
          menuItems.push({ name: '---', action });
        }
        else {
          menuItems.push(getItemMenuItem(findItem(state, itemId), { t: 'rigidContainer', id: item.id, ix }));
        }

      }
      menuItems.push({ name: '<-', action: { t: 'back' } });
      return menuItems;
    }
  }
}

function getMenuTitle(frame: MenuFrame): string {
  switch (frame.which.t) {
    case 'main': return 'MAIN MENU';
    case 'inbox': return 'INBOX MENU';
    case 'container': return 'CONTAINER MENU';
  }
}

export function renderMenu(buf: TextBuffer, state: State, frame: MenuFrame): void {
  buf.red().bold().put(getMenuTitle(frame));
  const items = menuItemsOfFrame(state, frame);

  items.forEach((item, ix) => {
    const itemStr = item.name;
    const selected = frame.ix == ix;
    buf.moveTo(0, ix + 2);
    buf.inverse(selected).put(itemStr);
  });

  const customBindingsRow = Math.max(items.length + 3, 10);

  const bindings = getCustomBindings(state, frame);
  const keys = Object.keys(bindings).sort();
  keys.forEach((key, ix) => {
    const action = bindings[key].name;
    buf.moveTo(0, customBindingsRow + ix);
    buf.blue().put(`(${key})`).put(` ${action}`);
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

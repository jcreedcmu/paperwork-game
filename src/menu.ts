import { ScreenBuffer } from 'terminal-kit';
import { Action, doAction } from './action';
import { Document, stringOfDoc } from './doc';
import { EditFrame } from './edit-letter';
import { State, canWriteLetter, findItem, getInbox, hasInboxItems } from './state';
import { mod, unreachable } from './util';
import { getCustomBindings } from './keys';
import { TextBuffer } from './buffer';
import { FormEditFrame, stringOfForm } from './form';
import { stringOfEnvelope, stringOfStack } from './render';
import { getResource } from './resource';

export type Menu =
  | { t: 'main' }
  | { t: 'inbox' }
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
      if (hasInboxItems(state)) {
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
        const item = findItem(state, ibit.id);

        // FIXME(#17): Improve unread marker handling in inbox item rendering
        switch (item.t) {
          case 'letter':
            let name = `letter ("${item.body.substring(0, 10)}")`;
            if (item.money > 0) {
              name = `(\$${item.money}) ` + name;
            }
            menuItems.push({
              name: unreadMarker + name,
              action: { t: 'editLetter', id: item.id }
            });
            break;
          case 'doc':
            menuItems.push({
              name: unreadMarker + stringOfDoc(item.doc),
              action: { t: 'displayDoc', doc: item.doc, ibix: ix }
            });
            break;
          case 'form':
            menuItems.push({
              name: unreadMarker + stringOfForm(item.form),
              action: { t: 'editForm', id: ibit.id, form: item.form, ibix: ix }
            });
            break;
          case 'envelope':
            menuItems.push({
              name: unreadMarker + stringOfEnvelope(item),
              action: { t: 'none' } // FIXME(#18): Implement envelope content editing menu
            });
            break;
          case 'stack':
            menuItems.push({
              name: unreadMarker + stringOfStack(item),
              action: { t: 'pickup', id: ibit.id, loc: { t: 'inbox', ix } }
            });
            break;
          default: unreachable(item);
        }
      });
      menuItems.push({ name: '  <-', action: { t: 'back' } });
      return menuItems;
    }
  }
}

function getMenuTitle(frame: MenuFrame): string {
  switch (frame.which.t) {
    case 'main': return 'MAIN MENU';
    case 'inbox': return 'INBOX MENU';
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

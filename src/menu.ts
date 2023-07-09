import { Action, doAction, enterFlexContainerMenu, enterInboxMenu, enterRigidContainerMenu, enterSkillsMenu } from './action';
import { TextBuffer } from './buffer';
import { Document, stringOfDoc } from './doc';
import { EditFrame } from './edit-letter';
import { FormEditFrame, stringOfForm } from './form';
import { getCustomBindings } from './keys';
import { stringOfEnvelope, stringOfStack } from './render';
import { getResource } from './resource';
import { SkillsFrame } from './skills';
import { Item, Location, State, canWriteLetter, findItem, getInbox, hasInboxItems, isInbox, isUnread, requireFlexContainer, requireRigidContainer } from './state';
import { mod } from './util';

export type Menu =
  | { t: 'main' }
  | { t: 'rigidContainer', id: number }
  | { t: 'flexContainer', id: number }
  ;

export type DisplayFrame = { t: 'display', which: Document };
export type MenuFrame = { t: 'menu', which: Menu, ix: number };
export type DebugFrame = { t: 'debug' };

export type UiStackFrame =
  | DebugFrame
  | MenuFrame
  | EditFrame
  | DisplayFrame
  | SkillsFrame
  | FormEditFrame;

export type MenuItem = { name: string, action: Action };

function getItemMenuItem(state: State, item: Item, loc: Location): MenuItem {
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
      if (loc.t == 'flexContainer' && isInbox(state, loc.id)) {
        action = { t: 'markUnread', id: item.id, k: action };
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
      let action: Action = { t: 'editForm', id: item.id, form: item.form, saveCont: { t: 'regularForm' } };
      if (loc.t == 'flexContainer' && isInbox(state, loc.id)) {
        action = { t: 'markUnread', id: item.id, k: action };
      }
      return { name, action };
    } break;
    case 'envelope':
      return {
        name: stringOfEnvelope(item),
        action: enterRigidContainerMenu(item.id)
      };
      break;
    case 'stack':
      return {
        name: stringOfStack(item),
        action: { t: 'pickupPart', amount: 'one', softFail: true, loc }
      };
      break;
    case 'otherRigidContainer':
      return {
        name: 'otherRigidContainer',
        action: { t: 'none' },
      }
    case 'flexContainer':
      return {
        name: 'flexContainer',
        action: enterFlexContainerMenu(item.id),
      }
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
        const unreadCount = getInbox(state).filter(itemId => isUnread(state, itemId)).length;
        const unread = unreadCount > 0 ? ` (${unreadCount})` : '';
        menuItems.push({ name: `inbox${unread}...`, action: enterInboxMenu(state) });
      }
      menuItems.push({ name: 'skills', action: enterSkillsMenu() });
      menuItems.push({ name: 'exit', action: { t: 'exit' } });
      return menuItems;
    }
    case 'rigidContainer': {
      const menuItems: MenuItem[] = [];

      const item = requireRigidContainer(findItem(state, frame.which.id));

      for (let ix = 0; ix < item.size; ix++) {
        const itemId = item.contents[ix];
        if (itemId === undefined) {
          const action: Action = state.inv.hand === undefined
            ? { t: 'none' }
            : { t: 'drop', loc: { t: 'rigidContainer', id: item.id, ix } };
          menuItems.push({ name: '---', action });
        }
        else {
          menuItems.push(getItemMenuItem(state, findItem(state, itemId), { t: 'rigidContainer', id: item.id, ix }));
        }

      }
      menuItems.push({ name: '<-', action: { t: 'back' } });
      return menuItems;
    }
    case 'flexContainer': {
      const menuItems: MenuItem[] = [];

      const item = requireFlexContainer(findItem(state, frame.which.id));

      for (let ix = 0; ix < item.contents.length; ix++) {
        const itemId = item.contents[ix];
        const unreadMarker = isUnread(state, itemId) ? '! ' : '  ';
        const menuItem = getItemMenuItem(state, findItem(state, itemId), { t: 'flexContainer', id: item.id, ix });
        menuItem.name = unreadMarker + menuItem.name;
        menuItems.push(menuItem);
      }
      menuItems.push({ name: '<-', action: { t: 'back' } });
      return menuItems;
    }
  }
}

function getMenuTitle(state: State, frame: MenuFrame): string {
  switch (frame.which.t) {
    case 'main': return 'MAIN MENU';
    case 'rigidContainer': return 'CONTAINER MENU';
    case 'flexContainer': return isInbox(state, frame.which.id) ? 'INBOX MENU' : 'CONTAINER MENU';
  }
}

export function renderMenu(buf: TextBuffer, state: State, frame: MenuFrame): void {
  buf.red().bold().put(getMenuTitle(state, frame));
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

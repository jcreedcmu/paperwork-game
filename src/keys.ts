import { Action } from './action';
import { DEBUG } from './debug';
import { editUiAction } from './edit-letter';
import { formEditUiAction } from './form';
import { logger } from './logger';
import { MenuFrame, MenuItem, MenuUiAction, UiStackFrame } from './menu';
import { Item, Location, State, WrapItem, WrapItemId, findItem, getInbox, itemCanHoldMoney, requireFlexContainer, requireRigidContainer } from './state';
import { mapval } from './util';

export type DefaultAction =
  | { t: 'const', action: Action }
  | { t: 'selfInsert', k: (x: string) => Action }
  ;

export type KeyMap = {
  // actual keybindings
  bind: Record<string, Action>

  // Something to do if we don't find key in map
  def?: DefaultAction,
};

const debugKeyMap: KeyMap = { bind: {} };

function menuUiAction(action: MenuUiAction): Action {
  return { t: 'menuUiAction', action }
}

const basicMenuBindings: Record<string, Action> = {
  UP: menuUiAction({ t: 'menuPrev' }),
  DOWN: menuUiAction({ t: 'menuNext' }),
  ENTER: menuUiAction({ t: 'menuSelect' }),
  RIGHT: menuUiAction({ t: 'menuSelect' }),
  LEFT: { t: 'maybeBack' },
};

export type Bindings = Record<string, MenuItem>;


function customBindingsOfItem(state: State, item: Item | undefined, loc: Location): Bindings {
  if (item == undefined)
    return {};
  switch (item.t) {
    case 'letter': {
      const bindings: Bindings = {
        'e': { name: 'edit', action: { t: 'editLetter', id: item.id } },
        's': { name: 'send', action: { t: 'send', id: item.id } },
      };
      return bindings;
    }
    case 'doc': return {};
    case 'form': {
      const bindings: Bindings = {
        's': { name: 'send', action: { t: 'send', id: item.id } },
      };
      return bindings;
    }
    case 'envelope': return {
      'a': {
        name: 'Address', action: {
          t: 'editForm',
          form: { t: 'Envelope Address' },
          id: item.id,
          saveCont: { t: 'envelope' },
        }
      }
    };
    case 'otherRigidContainer': return {};
    case 'flexContainer': return {};
    case 'stack':
      if (state.inv.hand === undefined)
        return {
          '1': { name: 'take one', action: { t: 'pickupPart', amount: 'one', loc } },
          '2': { name: 'take half', action: { t: 'pickupPart', amount: 'half', loc } },
        };
      else
        return {};
  }
}

function getSelectedInboxItem(state: State, frame: MenuFrame): WrapItem | undefined {
  const wi: WrapItemId | undefined = getInbox(state)[frame.ix];
  if (wi === undefined)
    return wi;
  return { item: findItem(state, wi.id) };
}

function getBindingsOfSelection(state: State, item: Item | undefined, loc: Location): Bindings {
  const bind = customBindingsOfItem(state, item, loc);
  if (item !== undefined && state.inv.hand === undefined)
    bind[' '] = { name: 'pickup', action: { t: 'pickup', loc } };
  else if (state.inv.hand !== undefined) {
    bind[' '] = { name: 'drop', action: { t: 'drop', loc } };
  }
  if (item !== undefined) {
    bind['t'] = { name: 'trash', action: { t: 'trash', loc } };
    if (itemCanHoldMoney(item)) {
      bind['+'] = { name: 'add money', action: { t: 'addMoney', id: item.id } };
      bind['-'] = { name: 'remove money', action: { t: 'removeMoney', id: item.id } };
    }
  }
  return bind;
}

export function getCustomBindings(state: State, frame: MenuFrame): Bindings {
  switch (frame.which.t) {
    case 'main': return {};
    case 'inbox': {
      const ix = frame.ix;
      const item = getSelectedInboxItem(state, frame)?.item;
      return getBindingsOfSelection(state, item, { t: 'inbox', ix });
    }
    case 'rigidContainer': {
      const ix = frame.ix;
      const containerId = frame.which.id;
      const container = requireRigidContainer(findItem(state, containerId));
      const selectedItemId = container.contents[ix];
      const item = selectedItemId === undefined ? undefined : findItem(state, selectedItemId);
      return getBindingsOfSelection(state, item, { t: 'rigidContainer', id: containerId, ix });
    }
    case 'flexContainer': {
      const ix = frame.ix;
      const containerId = frame.which.id;
      const container = requireFlexContainer(findItem(state, containerId));
      const selectedItemId = container.contents[ix];
      const item = selectedItemId === undefined ? undefined : findItem(state, selectedItemId);
      return getBindingsOfSelection(state, item, { t: 'flexContainer', id: containerId, ix });
    }
  }
}

function menuKeyMap(state: State, frame: MenuFrame): KeyMap {
  const customBindings: Record<string, Action> = mapval(getCustomBindings(state, frame), b => b.action);
  return { bind: { ...basicMenuBindings, ...customBindings } };
}

const editKeyMap: KeyMap = {
  bind: {
    LEFT: editUiAction({ t: 'left' }),
    RIGHT: editUiAction({ t: 'right' }),
    CTRL_A: editUiAction({ t: 'home' }),
    CTRL_E: editUiAction({ t: 'end' }),
    CTRL_K: editUiAction({ t: 'kill' }),
    BACKSPACE: editUiAction({ t: 'deleteLeft' }),
    ENTER: editUiAction({ t: 'submit' }),
    ESCAPE: { t: 'back' },
  },
  def: { t: 'selfInsert', k: key => editUiAction({ t: 'insert', key }) },
};

const editFormKeyMap: KeyMap = {
  bind: {
    UP: formEditUiAction({ t: 'up' }),
    DOWN: formEditUiAction({ t: 'down' }),
    LEFT: formEditUiAction({ t: 'left' }),
    RIGHT: formEditUiAction({ t: 'right' }),
    CTRL_A: formEditUiAction({ t: 'home' }),
    CTRL_E: formEditUiAction({ t: 'end' }),
    CTRL_K: formEditUiAction({ t: 'kill' }),
    BACKSPACE: formEditUiAction({ t: 'deleteLeft' }),
    ENTER: formEditUiAction({ t: 'enter' }),
    TAB: formEditUiAction({ t: 'nextField' }),
    ESCAPE: { t: 'back' },
  },
  def: { t: 'selfInsert', k: key => formEditUiAction({ t: 'insert', key }) },
};

const displayKeyMap: KeyMap = {
  bind: {},
  def: { t: 'const', action: { t: 'back' } },
};

const skillsKeyMap: KeyMap = {
  bind: {},
  def: { t: 'const', action: { t: 'back' } },
};

const defaultKeyMap: KeyMap = {
  bind: {
    ESCAPE: { t: 'exit' },
    CTRL_C: { t: 'exit' },
  }
};

function keyMapOfFrame(state: State, frame: UiStackFrame): KeyMap {
  switch (frame.t) {
    case 'debug': return debugKeyMap;
    case 'menu': return menuKeyMap(state, frame);
    case 'edit': return editKeyMap;
    case 'display': return displayKeyMap;
    case 'editForm': return editFormKeyMap;
    case 'skills': return skillsKeyMap;
  }
}

export function actionOfDefaultBinding(state: State, key: string, def: DefaultAction): Action {
  switch (def.t) {
    case 'const': return def.action;
    case 'selfInsert': return def.k(key);
  }
}

export function actionOfKey(state: State, key: string): Action {
  const keymap = keyMapOfFrame(state, state.uiStack[0]);

  if (DEBUG.key)
    logger(state, key);

  const m = keymap.bind[key];
  if (m !== undefined)
    return m;
  if (keymap.def !== undefined) {
    return actionOfDefaultBinding(state, key, keymap.def);
  }
  else {
    const m = defaultKeyMap.bind[key];
    if (m !== undefined)
      return m;
  }
  return { t: 'none' };
}

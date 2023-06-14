import { Action, MenuAction } from './action';
import { logger } from './logger';
import { editUiAction } from './edit-letter';
import { Menu, MenuFrame, MenuItem, MenuUiAction, UiStackFrame } from './menu';
import { WrapItem, Item, State } from './state';
import { mapval } from './util';
import { formEditUiAction } from './form';

export type DefaultAction =
  | { t: 'const', action: Action }
  | { t: 'selfInsert', k: (x: string) => Action }
  ;

export type KeyMap = {
  // ignore all succeeding keymaps with precedence ≤ this.
  // default: -1
  skip?: number,

  // precedence. default: 0
  prec?: number,

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


function customBindingsOfItem(state: State, item: Item | undefined, ix: number): Bindings {
  if (item == undefined)
    return {};
  switch (item.t) {
    case 'letter': {
      const bindings: Bindings = {
        'e': { name: 'edit', action: { t: 'editLetter', id: item.id } },
        's': { name: 'send', action: { t: 'sendLetter', id: item.id } },
        '+': { name: 'add money', action: { t: 'addMoney', id: item.id } },
        '-': { name: 'remove money', action: { t: 'removeMoney', id: item.id } },
      };
      return bindings;
    }
    case 'doc': return {};
    case 'form': return {};
    case 'envelope': return {};
  }
}

function getSelectedInboxItem(state: State, frame: MenuFrame): WrapItem | undefined {
  return state.inv.inbox[frame.ix];
}

export function getCustomBindings(state: State, frame: MenuFrame): Bindings {
  switch (frame.which.t) {
    case 'main': return {};
    case 'inbox': {
      const ix = frame.ix;
      const item = getSelectedInboxItem(state, frame)?.item;
      const bind = customBindingsOfItem(state, item, ix);
      if (item !== undefined && state.inv.hand === undefined)
        bind[' '] = { name: 'pickup', action: { t: 'pickup', id: item.id, loc: { t: 'inbox', ix } } };
      else if (state.inv.hand !== undefined) {
        bind[' '] = { name: 'drop', action: { t: 'drop', loc: { t: 'inbox', ix } } };
      }
      return bind;
    }
  }
}

function menuKeyMap(state: State, frame: MenuFrame): KeyMap {
  const customBindings: Record<string, Action> = mapval(getCustomBindings(state, frame), b => b.action);
  return { bind: { ...basicMenuBindings, ...customBindings } };
}

const editKeyMap: KeyMap = {
  skip: 0,
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
  skip: 0,
  bind: {
    LEFT: formEditUiAction({ t: 'left' }),
    RIGHT: formEditUiAction({ t: 'right' }),
    CTRL_A: formEditUiAction({ t: 'home' }),
    CTRL_E: formEditUiAction({ t: 'end' }),
    CTRL_K: formEditUiAction({ t: 'kill' }),
    BACKSPACE: formEditUiAction({ t: 'deleteLeft' }),
    ENTER: formEditUiAction({ t: 'submit' }),
    TAB: formEditUiAction({ t: 'nextField' }),
    ESCAPE: { t: 'back' },
  },
  def: { t: 'selfInsert', k: key => formEditUiAction({ t: 'insert', key }) },
};

const displayKeyMap: KeyMap = {
  skip: 0,
  bind: {},
  def: { t: 'const', action: { t: 'back' } },
};

const defaultKeyMap: KeyMap = {
  prec: 1e9, bind: {
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
  }
}

export function actionOfDefaultBinding(state: State, key: string, def: DefaultAction): Action {
  switch (def.t) {
    case 'const': return def.action;
    case 'selfInsert': return def.k(key);
  }
}

export function actionOfKey(state: State, key: string): Action {
  const keymaps = state.uiStack.map(frame => keyMapOfFrame(state, frame));
  keymaps.push(defaultKeyMap);
  // logger(state, key);

  let skip = -1;
  for (const keymap of keymaps) {
    if ((keymap.prec || 0) <= skip)
      continue;
    const m = keymap.bind[key];
    if (m !== undefined)
      return m;
    if (keymap.def !== undefined) {
      return actionOfDefaultBinding(state, key, keymap.def);
    }
    skip = Math.max(skip, (keymap.skip ?? -1));
  }

  return { t: 'none' };
}

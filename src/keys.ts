import { Action, logger } from './action';
import { UiStackFrame } from './menu';
import { State } from './state';


export type KeyMap = {
  // ignore all succeeding keymaps with precedence ≤ this.
  // default: -1
  skip?: number,

  // precedence. default: 0
  prec?: number,

  // actual keybindings
  bind: Record<string, Action>
};

const debugKeyMap: KeyMap = { bind: {} };
const menuKeyMap: KeyMap = {
  bind: {
    UP: { t: 'menuPrev' },
    DOWN: { t: 'menuNext' },
    ENTER: { t: 'menuSelect' },
  }
};
const editKeyMap: KeyMap = {
  skip: 0,
  bind: {
    ESCAPE: { t: 'back' },
  }
};
const displayKeyMap: KeyMap = { bind: {} };
const defaultKeyMap: KeyMap = {
  prec: 1e9, bind: {
    ESCAPE: { t: 'exit' },
    CTRL_C: { t: 'exit' },
  }
};

function keyMapOfFrame(frame: UiStackFrame): KeyMap {
  switch (frame.t) {
    case 'debug': return debugKeyMap;
    case 'menu': return menuKeyMap;
    case 'edit': return editKeyMap;
    case 'display': return displayKeyMap;
  }
}
export function actionOfKey(state: State, key: string): Action {
  const keymaps = state.uiStack.map(keyMapOfFrame);
  keymaps.push(defaultKeyMap);
  logger(state, key);

  let skip = -1;
  for (const keymap of keymaps) {
    if ((keymap.prec || 0) <= skip)
      continue;
    const m = keymap.bind[key];
    if (m !== undefined)
      return m;
    skip = Math.max(skip, (keymap.skip ?? -1));
  }

  return { t: 'none' };
}

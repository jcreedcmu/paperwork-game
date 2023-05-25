import { EditFrame } from "./dialog";

export type LetterMenu = { t: 'letter', id: number };

export type Menu =
  | { t: 'main' }
  | { t: 'inventory' }
  | LetterMenu;

export type MenuFrame = { t: 'menu', which: Menu, ix: number };

export type UiStackFrame =
  | MenuFrame
  | EditFrame;

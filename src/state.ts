import { Action } from "./action";
import { DocCode } from "./doc";
import { UiStackFrame } from "./menu";

export const resources = ['cash', 'bottle', 'paper', 'pencil'] as const;
export const collectResources: Resource[] = ['bottle', 'paper', 'pencil'];

// A resource is just a thing that you can have some number of --- and
// the number of them that you have is the only information that is
// kept track of. They don't have any notion of identity.
type Resource = (typeof resources)[number];

export type LetterItem = { t: 'letter', id: number, body: string };
export type DocItem = { t: 'doc', id: number, code: DocCode };

// An item, on the other hand, does has a distinct identity, and does
// not 'stack'.
export type Item =
  | LetterItem
  | DocItem;

export type InboxItem = { t: 'inbox', unread: boolean, item: Item };

export type Future = { time: number, action: Action };

export type State = {
  log: string[],
  futures: Future[],
  uiStack: UiStackFrame[],
  idCounter: number,
  time: number,
  selectedIndex: number | undefined,
  inv: {
    inbox: InboxItem[],
    items: Item[],
    res: Record<Resource, number>
  },
}

export const state: State = {
  log: [],
  futures: [],
  uiStack: [{ t: 'menu', which: { t: 'main' }, ix: 0 }],
  selectedIndex: undefined,
  idCounter: 0,
  time: 0,
  inv: {
    inbox: [],
    items: [],
    res: Object.fromEntries(resources.map(x => [x, 0])) as Record<Resource, number>
  },
};

export function showState(state: State) {
  console.log(JSON.stringify(state));
}

export function findLetter(state: State, id: number): LetterItem {
  const ix = state.inv.items.findIndex(x => x.id == id);
  if (ix == -1) {
    throw new Error(`no item with id ${id}`);
  }
  const item = state.inv.items[ix];
  if (item.t != 'letter') {
    throw new Error(`item with id ${id} not a letter`);
  }
  return item;
}

export function setLetterText(id: number, text: string): void {
  const ix = state.inv.items.findIndex(x => x.id == id);
  if (ix == -1) {
    throw new Error(`no item with id ${id}`);
  }
  const item = state.inv.items[ix];
  if (item.t != 'letter') {
    throw new Error(`item with id ${id} not a letter`);
  }
  item.body = text;
}

export function hasItems(): boolean {
  return state.inv.items.length > 0;
}

export function canWriteLetter(): boolean {
  return state.inv.res.paper > 0 && state.inv.res.pencil > 0;
}

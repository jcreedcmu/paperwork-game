import { Action } from "./action";
import { Document } from "./doc";
import { Form, FormItem } from "./form";
import { LogLine } from "./logger";
import { UiStackFrame } from "./menu";

export const resources = ['cash', 'bottle', 'paper', 'pencil'] as const;
export const collectResources: Resource[] = ['bottle', 'paper', 'pencil'];

// A resource is just a thing that you can have some number of --- and
// the number of them that you have is the only information that is
// kept track of. They don't have any notion of identity.
type Resource = (typeof resources)[number];

export type LetterItem = { t: 'letter', body: string, money: number };
export type DocItem = { t: 'doc', doc: Document };
export type EnvelopeItem = { t: 'envelope', size: number, contents: Item[] };

// An item, on the other hand, does has a distinct identity, and does
// not 'stack'.
export type SubItem =
  | LetterItem
  | DocItem
  | FormItem
  | EnvelopeItem
  ;

export type Item = { id: number } & SubItem;

export type Location =
  | { t: 'inbox', ix: number };

export type WrapItemId = { unread: boolean, id: number };
export type WrapItem = { unread: boolean, item: Item };
export type WrapSubItem = { unread: boolean, item: SubItem };

export type Future = { time: number, action: Action };

export function findItem(state: State, id: number): Item {
  if (state.items[id] === undefined) {
    let msg = `can't find item with id ${id}`;
    msg += '\n\nstate.items: ' + JSON.stringify(state.items, null, 2);
    throw new Error(msg);
  }
  return { id: id, ...state.items[id] };
}

export function setItem(state: State, item: Item): void {
  const { id, ...rest } = item;
  state.items[id] = rest;
}

export type State = {
  items: Record<number, SubItem>,
  log: LogLine[],
  futures: Future[],
  uiStack: UiStackFrame[],
  idCounter: number,
  time: number,
  selectedIndex: number | undefined,
  inv: {
    hand: number | undefined,
    inbox: WrapItemId[],
    res: Record<Resource, number>
  },
}

export function initState(): State {
  return {
    items: {},
    log: [],
    futures: [],
    uiStack: [{ t: 'menu', which: { t: 'main' }, ix: 0 }],
    selectedIndex: undefined,
    idCounter: 0,
    time: 0,
    inv: {
      hand: undefined,
      inbox: [],
      res: Object.fromEntries(resources.map(x => [x, 0])) as Record<Resource, number>
    },
  };
}

export function showState(state: State) {
  console.log(JSON.stringify(state));
}

export function findLetter(state: State, id: number): LetterItem & { id: number } {
  const item = findItem(state, id);
  if (item.t != 'letter') {
    throw new Error(`item with id ${id} not a letter`);
  }
  return item;
}

export function setLetterText(state: State, id: number, text: string): void {
  const oldItem = findItem(state, id);
  if (oldItem.t != 'letter') {
    throw new Error(`item with id ${id} not a letter`);
  }
  oldItem.body = text;
  setItem(state, oldItem);
}

export function hasInboxItems(state: State): boolean {
  return state.inv.inbox.length > 0;
}

export function canWriteLetter(state: State): boolean {
  return state.inv.res.paper > 0 && state.inv.res.pencil > 0;
}

export function createItem(state: State, item: SubItem): number {
  const id = state.idCounter++;
  state.items[id] = item;
  return id;
}

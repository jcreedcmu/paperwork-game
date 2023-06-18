import { Resource, getResource, resources } from "./resource";
import { Action } from "./action";
import { Document } from "./doc";
import { Form, FormItem } from "./form";
import { LogLine } from "./logger";
import { UiStackFrame } from "./menu";
import { unreachable } from "./util";

export type LetterItem = { t: 'letter', body: string, money: number };
export type DocItem = { t: 'doc', doc: Document };
export type EnvelopeItem = { t: 'envelope', size: number, contents: Item[] };
export type StackItem = { t: 'stack', res: Resource, quantity: number };

// An item, on the other hand, does has a distinct identity, and does
// not 'stack'.
export type SubItem =
  | LetterItem
  | DocItem
  | FormItem
  | EnvelopeItem
  | StackItem
  ;

export type Item = { id: number } & SubItem;

export type Location =
  | { t: 'inbox', ix: number };

export type WrapItemId = { unread: boolean, id: number };
export type WrapItem = { unread: boolean, item: Item };
export type WrapSubItem = { unread: boolean, item: SubItem };

export type Future = { time: number, action: Action };

export type ItemId = number;
export type State = {
  items_: Record<ItemId, SubItem>,
  itemLocs_: Record<ItemId, Location | undefined>,
  log: LogLine[],
  futures: Future[],
  uiStack: UiStackFrame[],
  idCounter: number,
  time: number,
  selectedIndex: number | undefined,
  inv: {
    hand: number | undefined,
    inbox_: WrapItemId[],
    res_: Record<Resource, number>
  },
}

export function initState(): State {
  return {
    items_: {},
    itemLocs_: {},
    log: [],
    futures: [],
    uiStack: [{ t: 'menu', which: { t: 'main' }, ix: 0 }],
    selectedIndex: undefined,
    idCounter: 0,
    time: 0,
    inv: {
      hand: undefined,
      inbox_: [],
      res_: Object.fromEntries(resources.map(x => [x, 0])) as Record<Resource, number>
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


export function canWriteLetter(state: State): boolean {
  return getResource(state, 'paper') > 0 && getResource(state, 'pencil') > 0;
}

// Everything to do with state.items_, state.itemLocs_ should be below

export function findItem(state: State, id: number): Item {
  if (state.items_[id] === undefined) {
    let msg = `can't find item with id ${id}`;
    msg += '\n\nstate.items: ' + JSON.stringify(state.items_, null, 2);
    throw new Error(msg);
  }
  return { id: id, ...state.items_[id] };
}

export function setItem(state: State, item: Item): void {
  const { id, ...rest } = item;
  state.items_[id] = rest;
}

export function createItem(state: State, item: SubItem): number {
  const id = state.idCounter++;
  state.items_[id] = item;
  state.itemLocs_[id] = undefined;
  return id;
}

export function removeItem(state: State, id: ItemId): void {
  delete state.items_[id];
  delete state.itemLocs_[id];
}

// everything to do with state.inv.inbox_ should be below

export function hasInboxItems(state: State): boolean {
  return state.inv.inbox_.length > 0;
}

export function removeLocation(state: State, loc: Location): ItemId {
  switch (loc.t) {
    case 'inbox': {
      const inbox = state.inv.inbox_;
      const id = inbox.splice(loc.ix, 1)[0].id;
      state.itemLocs_[id] = undefined;
      // adjust tail
      inbox.slice(loc.ix).forEach((item, ix) => {
        state.itemLocs_[item.id] = { t: 'inbox', ix: loc.ix + ix };
      });
      return id;
    }
  }
}

export function deleteAtLocation(state: State, loc: Location): void {
  const id = removeLocation(state, loc);
  removeItem(state, id);
}

export function insertIntoLocation(state: State, id: number, loc: Location): void {
  switch (loc.t) {
    case 'inbox': {
      const inbox = state.inv.inbox_;
      inbox.splice(loc.ix, 0, { unread: false, id });
      // adjust tail (including just-inserted item)
      inbox.slice(loc.ix).forEach((item, ix) => {
        state.itemLocs_[item.id] = { t: 'inbox', ix: loc.ix + ix };
      });
    } break;
    default:
      unreachable(loc.t);
  }
}

export function appendToInbox(state: State, item: WrapItemId): number {
  state.inv.inbox_.push(item);
  const ix = state.inv.inbox_.length - 1;
  state.itemLocs_[item.id] = { t: 'inbox', ix };
  return ix;
}

export function getLocation(state: State, itemId: ItemId): Location | undefined {
  return state.itemLocs_[itemId];
}

export function setInboxUnread(state: State, index: number, unread: boolean): void {
  state.inv.inbox_[index].unread = unread;
}

export function getInbox(state: State): WrapItemId[] {
  return state.inv.inbox_;
}

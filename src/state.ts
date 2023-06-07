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

export type LetterItem = { t: 'letter', id: number, body: string, money: number };
export type DocItem = { t: 'doc', id: number, doc: Document };

// An item, on the other hand, does has a distinct identity, and does
// not 'stack'.
export type Item =
  | LetterItem
  | DocItem
  | FormItem
  ;

export type Location =
  | { t: 'inbox', ix: number };

export type WrapItem = { unread: boolean, item: Item };

export type Future = { time: number, action: Action };

export type State = {
  log: LogLine[],
  futures: Future[],
  uiStack: UiStackFrame[],
  idCounter: number,
  time: number,
  selectedIndex: number | undefined,
  inv: {
    hand: Item | undefined,
    inbox: WrapItem[],
    res: Record<Resource, number>
  },
}

export function initState(): State {
  return {
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

export function findLetter(state: State, id: number): LetterItem {
  const ix = state.inv.inbox.findIndex(x => x.item.id == id);
  if (ix == -1) {
    throw new Error(`no item with id ${id}`);
  }
  const wi = state.inv.inbox[ix];
  if (wi.item.t != 'letter') {
    throw new Error(`item with id ${id} not a letter`);
  }
  return wi.item;
}

export function setLetterText(state: State, id: number, text: string): void {
  const ix = state.inv.inbox.findIndex(x => x.item.id == id);
  if (ix == -1) {
    throw new Error(`no item with id ${id}`);
  }
  const wi = state.inv.inbox[ix];
  if (wi.item.t != 'letter') {
    throw new Error(`item with id ${id} not a letter`);
  }
  wi.item.body = text;
}

export function hasInboxItems(state: State): boolean {
  return state.inv.inbox.length > 0;
}

export function canWriteLetter(state: State): boolean {
  return state.inv.res.paper > 0 && state.inv.res.pencil > 0;
}

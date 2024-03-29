import { Action, doAction } from "./action";
import { Document } from "./doc";
import { FormItem } from "./form";
import { LogLine } from "./logger";
import { UiStackFrame } from "./menu";
import { Resource, getResource, resources } from "./resource";
import { Skill, Skills, initSkills, skills } from "./skills";
import { unreachable } from "./util";

export type LetterItem = { t: 'letter', body: string, money: number };
export type DocItem = { t: 'doc', doc: Document };

export type EnvelopeItem = {
  t: 'envelope',
  address: string,
  size: number,
  contents: (ItemId | undefined)[]
};

export type FlexContainerItem = {
  t: 'flexContainer',
  contents: ItemId[]
};

export type OtherRigidContainerItem = { t: 'otherRigidContainer', size: number, contents: (ItemId | undefined)[] };
export type StackItem = { t: 'stack', res: Resource, quantity: number };

// An item, on the other hand, does has a distinct identity, and does
// not 'stack'.
export type SubItem =
  | LetterItem
  | DocItem
  | FormItem
  | RigidContainerItem
  | FlexContainerItem
  | StackItem
  ;

export type RigidContainerItem =
  | EnvelopeItem
  | OtherRigidContainerItem
  ;
// potentially other disjuncts here

export type Item = { id: number } & SubItem;

export type Location =
  | { t: 'rigidContainer', id: number, ix: number }
  | { t: 'flexContainer', id: number, ix: number };

export type WrapItem = { item: Item };
export type WrapSubItem = { item: SubItem };

export type Future = { time: number, action: Action };

export type ItemId = number;

export type State = {
  items_: Record<ItemId, SubItem>,
  specialItems: {
    root: ItemId,
    inbox: ItemId,
    outbox: ItemId,
  }
  unread: Record<ItemId, boolean>,
  itemLocs_: Record<ItemId, Location | undefined>,
  log: LogLine[],
  futures: Future[],
  uiStack: UiStackFrame[],
  idCounter: number,
  time: number,
  selectedIndex: number | undefined,
  inv: {
    skills: Skills,
    hand: ItemId | undefined,
    res_: Record<Resource, number>
  },
}

export function initState(): State {
  const rv: State = {
    items_: {},
    specialItems: {
      root: 0,
      inbox: 0,
      outbox: 0,
    },
    unread: {},
    itemLocs_: {},
    log: [],
    futures: [],
    uiStack: [{ t: 'menu', which: { t: 'main' }, ix: 0 }],
    selectedIndex: undefined,
    idCounter: 0,
    time: 0,
    inv: {
      skills: initSkills(),
      hand: undefined,
      res_: Object.fromEntries(resources.map(x => [x, 0])) as Record<Resource, number>
    },
  };
  rv.specialItems.root = createItem(rv, { t: 'flexContainer', contents: [] });
  rv.specialItems.inbox = createItem(rv, { t: 'flexContainer', contents: [] });
  rv.specialItems.outbox = createItem(rv, { t: 'flexContainer', contents: [] });
  appendToFlexContainer(rv, rv.specialItems.root, rv.specialItems.inbox);
  appendToFlexContainer(rv, rv.specialItems.root, rv.specialItems.outbox);
  return rv;
}

export function showState(state: State) {
  console.log(JSON.stringify(state));
}

export function requireStack(item: Item): StackItem & { id: number } {
  if (item.t != 'stack') {
    throw new Error(`item with id ${item.id} not a stack`);
  }
  return item;
}

export function isRigidContainer(item: SubItem): item is RigidContainerItem {
  return item.t == 'envelope' || item.t == 'otherRigidContainer';
}

export function isFlexContainer(item: SubItem): item is FlexContainerItem {
  return item.t == 'flexContainer';
}

export function requireRigidContainer(item: Item): RigidContainerItem & { id: number } {
  if (!isRigidContainer(item)) {
    throw new Error(`item with id ${item.id} not a rigid container`);
  }
  return item;
}

export function requireFlexContainer(item: Item): FlexContainerItem & { id: number } {
  if (!isFlexContainer(item)) {
    throw new Error(`item with id ${item.id} not a flex container`);
  }
  return item;
}

export function requireEnvelope(item: Item): EnvelopeItem & { id: number } {
  if (item.t !== 'envelope') {
    throw new Error(`item with id ${item.id} not an envelope`);
  }
  return item;
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

export function createItem(state: State, item: SubItem): ItemId {
  const id = state.idCounter++;
  state.items_[id] = item;
  state.itemLocs_[id] = undefined;
  return id;
}

export function removeItem(state: State, id: ItemId): void {
  delete state.items_[id];
  delete state.itemLocs_[id];
}

// Insertion into rigid containers

function removeFromRigidContainerItem(state: State, item: Item, ix: number): ItemId {
  switch (item.t) {
    case 'envelope': {
      if (ix < 0 || ix >= item.size) {
        throw new Error(`Index ${ix} out of bounds for rigid container`);
      }
      const itemId = item.contents[ix];
      if (itemId === undefined) {
        throw new Error(`Tried to remove empty item`);
      }
      item.contents[ix] = undefined;
      state.itemLocs_[itemId] = undefined;
      setItem(state, item);
      return itemId;
    }
    default:
      throw new Error(`Tried to remove from nonrigid container`);
  }
}

function insertIntoRigidContainerItem(state: State, item: Item, ix: number, insertee: ItemId): void {
  switch (item.t) {
    case 'envelope': {
      if (ix < 0 || ix >= item.size) {
        throw new Error(`Index ${ix} out of bounds for rigid container`);
      }
      const itemId = item.contents[ix];
      if (itemId !== undefined) {
        throw new Error(`Tried to insert over nonempty item`);
      }
      state.itemLocs_[insertee] = { t: 'rigidContainer', id: item.id, ix: ix };
      item.contents[ix] = insertee;
      setItem(state, item);
    } break;
    default:
      throw new Error(`Tried to insert into nonrigid container`);
  }
}

export function getItemIdFromRigidContainerItem(state: State, item: Item, ix: number): ItemId {
  switch (item.t) {
    case 'envelope': {
      if (ix < 0 || ix >= item.size) {
        throw new Error(`Index ${ix} out of bounds for rigid container`);
      }
      const itemId = item.contents[ix];
      if (itemId === undefined) {
        throw new Error(`Tried to get id of empty item`);
      }
      return itemId;
    }
    default:
      throw new Error(`Tried to get id from nonrigid container`);
  }
}

export function getItemIdFromFlexContainerItem(state: State, item: Item, ix: number): ItemId {
  switch (item.t) {
    case 'flexContainer': {
      if (ix < 0 || ix >= item.contents.length) {
        throw new Error(`Index ${ix} out of bounds for flex container`);
      }
      return item.contents[ix];
    }
    default:
      throw new Error(`Tried to get id from nonflex container`);
  }
}

export function hasInboxItems(state: State): boolean {
  return getInbox(state).length > 0;
}

// everything to do with state.inv.inbox_ or specialItems.inbox should be below

export function removeLocation(state: State, loc: Location): ItemId {
  switch (loc.t) {
    case 'flexContainer': {
      const container = requireFlexContainer(findItem(state, loc.id));
      const contents = container.contents;
      const id = contents.splice(loc.ix, 1)[0];
      state.itemLocs_[id] = undefined;
      // adjust tail
      contents.slice(loc.ix).forEach((id, ix) => {
        state.itemLocs_[id] = { t: 'flexContainer', id: container.id, ix: loc.ix + ix };
      });
      return id;
    }
    case 'rigidContainer': {
      return removeFromRigidContainerItem(state, findItem(state, loc.id), loc.ix);
    }
  }
}

export function deleteAtLocation(state: State, loc: Location): void {
  const id = removeLocation(state, loc);
  removeItem(state, id);
}

export function insertIntoLocation(state: State, id: number, loc: Location): void {
  switch (loc.t) {
    case 'flexContainer': {
      const container = requireFlexContainer(findItem(state, loc.id));
      const contents = container.contents;
      contents.splice(loc.ix, 0, id);
      // adjust tail (including just-inserted item)
      contents.slice(loc.ix).forEach((id, ix) => {
        state.itemLocs_[id] = { t: 'flexContainer', id: container.id, ix: loc.ix + ix };
      });
    } break;
    case 'rigidContainer': {
      insertIntoRigidContainerItem(state, findItem(state, loc.id), loc.ix, id);
    } break;
    default:
      unreachable(loc);
  }
}

export function appendToInbox(state: State, itemId: ItemId): Location {
  return appendToFlexContainer(state, state.specialItems.inbox, itemId);
}

export function appendToFlexContainer(state: State, containerId: ItemId, itemId: ItemId): Location {
  const container = requireFlexContainer(findItem(state, containerId));
  container.contents.push(itemId);
  const ix = container.contents.length - 1;
  const loc: Location = { t: 'flexContainer', ix, id: container.id };
  state.itemLocs_[itemId] = loc;
  return loc;
}

// assumes location has an item
export function getItemAtLocation(state: State, location: Location): Item {
  switch (location.t) {
    case 'rigidContainer':
      return findItem(state, getItemIdFromRigidContainerItem(state, findItem(state, location.id), location.ix));
    case 'flexContainer':
      return findItem(state, getItemIdFromFlexContainerItem(state, findItem(state, location.id), location.ix));
  }
}

export function getLocation(state: State, itemId: ItemId): Location | undefined {
  return state.itemLocs_[itemId];
}

export function getLocationDefined(state: State, itemId: ItemId): Location {
  const loc = getLocation(state, itemId);
  if (loc === undefined)
    throw new Error(`expected ${itemId} to have a location`);
  return loc;
}

// Mutable reference to a list of item ids
export function getInbox(state: State): ItemId[] {
  return requireFlexContainer(findItem(state, state.specialItems.inbox)).contents;
}

export function itemCanHoldMoney(item: Item): item is (FormItem | LetterItem) & { id: number } {
  switch (item.t) {
    case 'letter': return true;
    case 'doc': return false;
    case 'form': return true;
    case 'envelope': return false;
    case 'stack': return false;
    case 'otherRigidContainer': return false;
    case 'flexContainer': return false;
  }
}

export function isUnread(state: State, itemId: ItemId): boolean {
  return state.unread[itemId] ?? false;
}

export function setUnread(state: State, itemId: ItemId, unread: boolean): boolean {
  return state.unread[itemId] = unread;
}

export function isInbox(state: State, itemId: ItemId): boolean {
  return state.specialItems.inbox == itemId;
}

export function getInboxId(state: State): ItemId {
  return state.specialItems.inbox;
}

export function getOutboxId(state: State): ItemId {
  return state.specialItems.outbox;
}

export function getRootId(state: State): ItemId {
  return state.specialItems.root;
}

export function inboxLocation(state: State, ix: number): Location {
  const id = getInboxId(state);
  return { t: 'flexContainer', id, ix };
}

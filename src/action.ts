import { quit, win } from './basic-term';
import { Document } from './doc';
import { EditUiAction, doEditUiAction, makeEditFrame } from './edit-letter';
import { Form, FormEditSaveCont, FormEditUiAction, doFormEditUiAction, findFormItem, getLayoutOfForm, makeFormEditFrame, resolveForm } from './form';
import { logger } from './logger';
import { MenuFrame, MenuUiAction, UiStackFrame, doMenuUiAction } from './menu';
import { Item, ItemId, LetterItem, Location, State, WrapSubItem, appendToInbox, createItem, deleteAtLocation, findItem, findLetter, getLocation, insertIntoLocation, itemCanHoldMoney, removeLocation, requireEnvelope, setInboxUnread, setItem } from './state';
import { adjustResource, collectResources, getResource, setResource } from "./resource";
import { randElt, unreachable } from './util';
import { StackDivision, divideStack } from './stack';
import { DEBUG } from './debug';

export type Action =
  | { t: 'sleep' }
  | { t: 'collect' }
  | { t: 'exit' }
  | { t: 'recycle' }
  | { t: 'purchase' }
  | { t: 'editLetter', id: ItemId }
  | { t: 'newLetter' }
  | { t: 'send', id: ItemId }
  | { t: 'back' }
  | { t: 'displayDoc', doc: Document }
  | { t: 'editForm', form: Form, id: ItemId, saveCont: FormEditSaveCont }
  | { t: 'debug' }
  | { t: 'addMoney', id: ItemId }
  | { t: 'removeMoney', id: ItemId }
  | { t: 'pickup', loc: Location }
  | { t: 'pickupPart', amount: StackDivision, loc: Location, softFail?: boolean }
  | { t: 'drop', loc: Location }
  | { t: 'none' }
  | { t: 'maybeBack' }
  | { t: 'setLetterText', id: ItemId | undefined, text: string }
  | { t: 'bigMoney' }
  | { t: 'menuUiAction', action: MenuUiAction }
  | { t: 'editUiAction', action: EditUiAction }
  | { t: 'formEditUiAction', action: FormEditUiAction }
  | { t: 'addItems', items: WrapSubItem[] }
  | { t: 'markUnread', ibix: number, k: Action }
  | { t: 'trash', loc: Location }
  | { t: 'enterUi', frame: UiStackFrame }
  ;

export function goBack(state: State): void {
  state.uiStack.shift();
}

export function addInboxDoc(state: State, doc: Document): Action {
  return { t: 'addItems', items: [{ unread: true, item: { t: 'doc', doc } }] };
}

export function addInboxForm(state: State, form: Form): Action {
  return { t: 'addItems', items: [{ unread: true, item: { t: 'form', form, formData: [], money: 0 } }] };
}

const letterPatterns: [RegExp | string, (state: State, letter: LetterItem) => Action][] = [
  [(/catalog/i), (state, letter) => addInboxDoc(state, { t: 'store-catalog' })],
  ['money', (state, letter) => ({ t: 'bigMoney' })],
  [(/sto-001/i), (state, letter) => addInboxForm(state, { t: 'STO-001' })],
  [(/env-001/i), (state, letter) => addInboxForm(state, { t: 'ENV-001' })],
  ['', (state, letter) => addInboxDoc(state, { t: 'brochure', inResponseTo: letter.body })],
];

function resolveSentItem(state: State, item: Item): Action {
  switch (item.t) {
    case 'letter':
      for (const [pattern, action] of letterPatterns) {
        if (item.body.match(pattern)) {
          return action(state, item);
        }
      }
      return { t: 'none' };
    case 'form': return resolveForm(state, item);
    case 'envelope': return { t: 'none' };

    // shouldn't be able to send any of these
    case 'doc': return { t: 'none' };
    case 'otherRigidContainer': return { t: 'none' };
    case 'stack': return { t: 'none' };
  }
}

function addFuture(state: State, delta_time: number, action: Action): void {
  state.futures.push({ action, time: state.time + delta_time });
}

export function resolveFutures(state: State): void {
  const time = state.time;
  const fsNow = state.futures.filter(x => x.time <= time);
  const fsLater = state.futures.filter(x => x.time > time);
  state.futures = fsLater;
  for (const f of fsNow) {
    doAction(state, f.action);
  }
}

export function enterRigidContainerMenu(id: ItemId): Action {
  return { t: 'enterUi', frame: { t: 'menu', which: { t: 'rigidContainer', id }, ix: 0 } };
}

export function enterInboxMenu(): Action {
  return { t: 'enterUi', frame: { t: 'menu', which: { t: 'inbox' }, ix: 0 } };
}

export function enterSkillsMenu(): Action {
  return { t: 'enterUi', frame: { t: 'skills' } };
}

export function doAction(state: State, action: Action): void {
  if (DEBUG.actions) {
    logger(state, JSON.stringify(['doAction', state, action]));
  }
  switch (action.t) {
    case 'exit': quit(); break;
    case 'sleep':
      state.time++;
      break;
    case 'collect': {
      adjustResource(state, randElt(collectResources), 1);
      state.time++;
    } break;
    case 'recycle':
      adjustResource(state, 'cash', getResource(state, 'bottle'));
      setResource(state, 'bottle', 0);
      break;
    case 'purchase': win(); break;
    case 'back': goBack(state); break;
    case 'newLetter':
      state.uiStack.unshift(makeEditFrame(undefined, ''));
      break;
    case 'editLetter':
      state.uiStack.unshift(makeEditFrame(action.id, findLetter(state, action.id).body));
      break;
    case 'setLetterText': {
      const { id, text } = action;
      if (id == undefined) {
        adjustResource(state, 'paper', -1);
        adjustResource(state, 'pencil', -1);
        const id = createItem(state, { t: 'letter', body: text, money: 0 });
        const ix = appendToInbox(state, { unread: false, id });
        goBack(state);
        state.uiStack.unshift({ t: 'menu', which: { t: 'inbox' }, ix });
      }
      else {
        const item = findLetter(state, id);
        item.body = text;
        setItem(state, item);
        goBack(state);
      }
    } break;
    case 'send':
      const item = findItem(state, action.id);
      addFuture(state, 3, resolveSentItem(state, item));
      const loc = getLocation(state, action.id);
      if (loc === undefined) {
        throw new Error(`sent element has no location`);
      }
      deleteAtLocation(state, loc);
      break;
    case 'bigMoney':
      logger(state, 'got big money');
      adjustResource(state, 'cash', 50);
      break;
    case 'addItems': {
      action.items.forEach(wi => {
        const id = createItem(state, wi.item);
        appendToInbox(state, { unread: wi.unread, id });
      });
    } break;
    case 'displayDoc':
      state.uiStack.unshift({ t: 'display', which: action.doc });
      break;
    case 'debug':
      state.uiStack.unshift({ t: 'debug' });
      break;
    case 'none':
      break;
    case 'menuUiAction': {
      const frame = state.uiStack[0];
      if (frame.t != 'menu') {
        throw new Error('Trying to reduce menuUiAction when not in a menu');
      }
      doMenuUiAction(state, frame, action.action);
    } break;
    case 'editUiAction': {
      const frame = state.uiStack[0];
      if (frame.t != 'edit') {
        throw new Error('Trying to reduce editUiAction when not in a edit');
      }
      doEditUiAction(state, frame, action.action);
    } break;
    case 'formEditUiAction': {
      const frame = state.uiStack[0];
      if (frame.t != 'editForm') {
        throw new Error('Trying to reduce formEditUiAction when not in a form');
      }
      doFormEditUiAction(state, frame, action.action);
    } break;
    case 'maybeBack': {
      if (state.uiStack.length > 1) {
        goBack(state);
      }
    } break;
    case 'addMoney': {
      if (getResource(state, 'cash') > 0) {
        const item = findItem(state, action.id);
        if (!itemCanHoldMoney(item)) {
          throw new Error(`item ${item.id} cannot hold money`);
        }
        adjustResource(state, 'cash', -1);
        item.money++;
        setItem(state, item);
      }
    } break;
    case 'removeMoney': {
      const item = findItem(state, action.id);
      if (!itemCanHoldMoney(item)) {
        throw new Error(`item ${item.id} cannot hold money`);
      }
      if (item.money > 0) {
        adjustResource(state, 'cash', 1);
        item.money--;
        setItem(state, item);
      }
    } break;
    case 'editForm': {
      switch (action.saveCont.t) {
        case 'regularForm':
          state.uiStack.unshift(makeFormEditFrame(action.id, findFormItem(state, action.id)));
          break;
        case 'envelope':
          const item = requireEnvelope(findItem(state, action.id));
          state.uiStack.unshift({
            t: 'editForm', id: action.id,
            layout: getLayoutOfForm({ t: 'Envelope Address' }),
            curFieldIx: 0,
            cursorPos: 0,
            form: { t: 'Envelope Address' },
            formData: [item.address],
            saveCont: { t: 'envelope' }
          });
          break;
      }
    } break;
    case 'pickup': {
      if (state.inv.hand !== undefined)
        throw new Error('tried to pick up with full hand');
      state.inv.hand = removeLocation(state, action.loc);
    } break;
    case 'pickupPart': {
      if (state.inv.hand !== undefined) {
        if (action.softFail)
          return;
        else
          throw new Error('tried to pickupPart with full hand');
      }
      const res = divideStack(state, action.loc, action.amount);
      if (res !== undefined) {
        state.inv.hand = res;
      }
    } break;
    case 'drop': {
      const hand = state.inv.hand;
      if (hand === undefined) {
        throw new Error('tried to drop empty hand');
      }
      state.inv.hand = undefined;
      insertIntoLocation(state, hand, action.loc);
    } break;
    case 'markUnread': {
      setInboxUnread(state, action.ibix, false);
      doAction(state, action.k);
    } break;
    case 'trash':
      deleteAtLocation(state, action.loc);
      break;
    case 'enterUi':
      state.uiStack.unshift(action.frame);
      break;
    default: unreachable(action);
  }
}

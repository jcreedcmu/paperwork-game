import { quit, win } from '.';
import { Document, stringOfDoc } from './doc';
import { EditUiAction, doEditUiAction, makeEditFrame } from './edit-letter';
import { Form, FormEditUiAction, doFormEditUiAction, findFormItem, makeFormEditFrame, resolveForm } from './form';
import { logger } from './logger';
import { MenuUiAction, doMenuUiAction } from './menu';
import { Item, LetterItem, Location, State, SubItem, collectResources, createItem, findItem, findLetter, setItem } from './state';
import { randElt, unreachable } from './util';

// XXX: Is this MenuAction/Action distinction obsolete now?
export type MenuAction =
  | { t: 'sleep' }
  | { t: 'collect' }
  | { t: 'exit' }
  | { t: 'recycle' }
  | { t: 'purchase' }
  | { t: 'enterInboxMenu' }
  | { t: 'editLetter', id: number }
  | { t: 'newLetter' }
  | { t: 'send', id: number }
  | { t: 'back' }
  | { t: 'displayDoc', doc: Document, ibix: number }
  | { t: 'editForm', form: Form, ibix: number, id: number }
  | { t: 'debug' }
  | { t: 'addMoney', id: number }
  | { t: 'removeMoney', id: number }
  | { t: 'pickup', id: number, loc: Location }
  | { t: 'drop', loc: Location }
  | { t: 'addEnvelope' } // FIXME (#9) replace with addItems
  ;

export type Action =
  | MenuAction
  | { t: 'none' }
  | { t: 'maybeBack' }
  | { t: 'setLetterText', id: number | undefined, text: string }
  | { t: 'bigMoney' }
  | { t: 'addInbox', item: SubItem }
  | { t: 'menuUiAction', action: MenuUiAction }
  | { t: 'editUiAction', action: EditUiAction }
  | { t: 'formEditUiAction', action: FormEditUiAction }
  ;


export function goBack(state: State): void {
  state.uiStack.shift();
}

function addInboxDoc(state: State, doc: Document): Action {
  return { t: 'addInbox', item: { t: 'doc', doc } };
}

function addInboxForm(state: State, form: Form): Action {
  return { t: 'addInbox', item: { t: 'form', form, formData: [] } };
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
    case 'doc': return { t: 'none' };
    case 'form': return resolveForm(state, item);
    case 'envelope': return { t: 'none' };
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

export function removeLocation(state: State, loc: Location): Item {
  switch (loc.t) {
    case 'inbox': {
      return findItem(state, state.inv.inbox.splice(loc.ix, 1)[0].id);
    }
  }
}

export function insertIntoLocation(state: State, item: Item, loc: Location): void {
  switch (loc.t) {
    case 'inbox': {
      state.inv.inbox.splice(loc.ix, 0, { unread: false, id: item.id });
    } break;
    default:
      unreachable(loc.t);
  }
}

export function doAction(state: State, action: Action): void {
  switch (action.t) {
    case 'exit': quit(); break;
    case 'sleep':
      state.time++;
      break;
    case 'collect': {
      state.inv.res[randElt(collectResources)]++;
      state.time++;
    } break;
    case 'recycle':
      state.inv.res.cash += state.inv.res.bottle;
      state.inv.res.bottle = 0;
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
        state.inv.res.paper--;
        state.inv.res.pencil--;
        const id = createItem(state, { t: 'letter', body: text, money: 0 });
        state.inv.inbox.push({ unread: false, id });
        goBack(state);
        state.uiStack.unshift({ t: 'menu', which: { t: 'inbox' }, ix: state.inv.inbox.length - 1 });
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
      // GC item list eventually?
      state.inv.inbox = state.inv.inbox.filter(x => x.id != action.id);
      break;
    case 'bigMoney':
      logger(state, 'got big money');
      state.inv.res.cash += 50;
      break;
    case 'addInbox':
      const id = createItem(state, action.item);
      state.inv.inbox.push({ unread: true, id });
      break;
    case 'enterInboxMenu':
      state.uiStack.unshift({ t: 'menu', which: { t: 'inbox' }, ix: 0 });
      break;
    case 'displayDoc':
      // XXX should split out this unread handling in a wrapper action
      state.inv.inbox[action.ibix].unread = false;
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
      if (state.inv.res.cash > 0) {
        const letter = findLetter(state, action.id);
        state.inv.res.cash--;
        letter.money++;
        setItem(state, letter);
      }
    } break;
    case 'removeMoney': {
      const letter = findLetter(state, action.id);
      if (letter.money > 0) {
        state.inv.res.cash++;
        letter.money--;
        setItem(state, letter);
      }
    } break;
    case 'editForm': {
      // XXX should split out this unread handling in a wrapper action
      state.inv.inbox[action.ibix].unread = false;
      state.uiStack.unshift(makeFormEditFrame(action.id, findFormItem(state, action.id)));
    } break;
    case 'pickup': {
      state.inv.hand = removeLocation(state, action.loc);
    } break;
    case 'drop': {
      const handItem = state.inv.hand;
      if (handItem === undefined) {
        throw new Error('tried to drop empty hand');
      }
      state.inv.hand = undefined;
      insertIntoLocation(state, handItem, action.loc);
    } break;
    case 'addEnvelope': {
      const id = createItem(state, { t: 'envelope', contents: [], size: 3 });
      state.inv.inbox.push({ unread: false, id });
      break;
    }
    default: unreachable(action);
  }
}

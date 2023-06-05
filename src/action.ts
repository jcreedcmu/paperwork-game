import { quit, win } from '.';
import { Document, stringOfDoc } from './doc';
import { EditUiAction, doEditUiAction, makeEditFrame } from './edit-letter';
import { Form, FormEditUiAction, doFormEditUiAction, findForm, makeFormEditFrame } from './form';
import { logger } from './logger';
import { MenuUiAction, doMenuUiAction } from './menu';
import { Item, LetterItem, State, collectResources, findLetter } from './state';
import { randElt, unreachable } from './util';

export type MenuAction =
  | { t: 'sleep' }
  | { t: 'collect' }
  | { t: 'exit' }
  | { t: 'recycle' }
  | { t: 'purchase' }
  | { t: 'enterInventoryMenu' }
  | { t: 'enterInboxMenu' }
  | { t: 'editLetter', id: number }
  | { t: 'newLetter' }
  | { t: 'sendLetter', id: number }
  | { t: 'back' }
  | { t: 'displayDoc', doc: Document, ibix: number }
  | { t: 'editForm', form: Form, ibix: number, id: number }
  | { t: 'debug' }
  | { t: 'addMoney', id: number }
  | { t: 'removeMoney', id: number }
  ;

export type Action =
  | MenuAction
  | { t: 'none' }
  | { t: 'maybeBack' }
  | { t: 'setLetterText', id: number | undefined, text: string }
  | { t: 'bigMoney' }
  | { t: 'addInbox', item: Item }
  | { t: 'menuUiAction', action: MenuUiAction }
  | { t: 'editUiAction', action: EditUiAction }
  | { t: 'formEditUiAction', action: FormEditUiAction }
  ;


function goBack(state: State): void {
  state.uiStack.shift();
}

function addInboxDoc(state: State, doc: Document): Action {
  // XXX the fact that state is changing during action creation is
  // bad. should really have a compound action that increments the id
  // counter during action reducer.
  return { t: 'addInbox', item: { t: 'doc', doc, id: state.idCounter++ } };
}

function addInboxForm(state: State, form: Form): Action {
  // XXX the fact that state is changing during action creation is
  // bad. should really have a compound action that increments the id
  // counter during action reducer.
  return { t: 'addInbox', item: { t: 'form', form, id: state.idCounter++, formData: [] } };
}

const letterPatterns: [RegExp | string, (state: State, letter: LetterItem) => Action][] = [
  [(/catalog/i), (state, letter) => addInboxDoc(state, { t: 'store-catalog' })],
  ['money', (state, letter) => ({ t: 'bigMoney' })],
  [(/sto-001/i), (state, letter) => addInboxForm(state, { t: 'STO-001' })],
  ['', (state, letter) => addInboxDoc(state, { t: 'brochure', inResponseTo: letter.body })],
];

function resolveLetter(state: State, letter: LetterItem): Action {
  for (const [pattern, action] of letterPatterns) {
    if (letter.body.match(pattern)) {
      return action(state, letter);
    }
  }
  return { t: 'none' };
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
    case 'enterInventoryMenu': state.uiStack.unshift({ t: 'menu', which: { t: 'inventory' }, ix: 0 }); break;
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
        const newId = state.idCounter++;
        const id = state.idCounter++;
        state.inv.items.push({ t: 'letter', id, body: text, money: 0 });
        goBack(state);
        state.uiStack.unshift({ t: 'menu', which: { t: 'inventory' }, ix: state.inv.items.length - 1 });
      }
      else {
        findLetter(state, id).body = text;
        goBack(state);
      }
    } break;
    case 'sendLetter':
      const letter = findLetter(state, action.id);
      addFuture(state, 3, resolveLetter(state, letter));
      state.inv.items = state.inv.items.filter(x => x.id != action.id);
      break;
    case 'bigMoney':
      logger(state, 'got big money');
      state.inv.res.cash += 50;
      break;
    case 'addInbox':
      state.inv.inbox.push({ unread: true, item: action.item });
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
      }
    } break;
    case 'removeMoney': {
      const letter = findLetter(state, action.id);
      if (letter.money > 0) {
        state.inv.res.cash++;
        letter.money--;
      }
    } break;
    case 'editForm': {
      // XXX should split out this unread handling in a wrapper action
      state.inv.inbox[action.ibix].unread = false;
      state.uiStack.unshift(makeFormEditFrame(action.id, findForm(state, action.id)));
    } break;
    default: unreachable(action);
  }
}

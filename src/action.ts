import { quit, win } from '.';
import { Document, stringOfDoc } from './doc';
import { EditUiAction, doEditUiAction } from './edit-letter';
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
  | { t: 'enterLetterMenu', id: number, body: string }
  | { t: 'newLetter' }
  | { t: 'editLetter', id: number }
  | { t: 'sendLetter', id: number }
  | { t: 'back' }
  | { t: 'displayDoc', doc: Document }
  | { t: 'debug' }
  ;

export type Action =
  | MenuAction
  | { t: 'none' }
  | { t: 'setLetterText', id: number | undefined, text: string }
  | { t: 'bigMoney' }
  | { t: 'addInbox', item: Item }
  | { t: 'menuUiAction', action: MenuUiAction }
  | { t: 'editUiAction', action: EditUiAction }
  ;

export function stringOfMenuAction(action: MenuAction): string {
  switch (action.t) {
    case 'sleep': return 'sleep';
    case 'collect': return 'collect';
    case 'purchase': return 'purchase freedom';
    case 'exit': return 'exit';
    case 'recycle': return 'recycle bottles';
    case 'enterInventoryMenu': return 'inventory...';
    case 'enterInboxMenu': return 'inbox...';
    case 'enterLetterMenu': return `letter ("${action.body.substring(0, 10)}")`;
    case 'newLetter': return 'new letter';
    case 'sendLetter': return 'send';
    case 'editLetter': return 'edit';
    case 'back': return '<-';
    case 'displayDoc': return stringOfDoc(action.doc);
    case 'debug': return 'debug';
  }
}

function goBack(state: State): void {
  state.uiStack.shift();
}

function addInboxAction(state: State, doc: Document): Action {
  // XXX the fact that state is changing during action creation is
  // bad. should really have a compound action that increments the id
  // counter during action reducer.
  return { t: 'addInbox', item: { t: 'doc', doc, id: state.idCounter++ } };
}

function resolveLetter(state: State, letter: LetterItem): Action {
  if (letter.body.match(/catalog/i)) {
    return addInboxAction(state, { t: 'store-catalog' });
  }
  else if (letter.body.match('money')) {
    return { t: 'bigMoney' };
  }
  else {
    return addInboxAction(state, { t: 'brochure', inResponseTo: letter.body });
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
    case 'newLetter': {
      state.uiStack.unshift({ t: 'edit', id: undefined, text: '' });
    }
      break;
    case 'editLetter':
      state.uiStack.unshift({ t: 'edit', id: action.id, text: findLetter(state, action.id).body });
      break;
    case 'setLetterText': {
      const { id, text } = action;
      if (id == undefined) {
        state.inv.res.paper--;
        state.inv.res.pencil--;
        const newId = state.idCounter++;
        const id = state.idCounter++;
        state.inv.items.push({ t: 'letter', id, body: text });
      }
      else {
        findLetter(state, id).body = text;
      }
      goBack(state);
    } break;
    case 'enterLetterMenu':
      state.uiStack.unshift({ t: 'menu', which: { t: 'letter', id: action.id }, ix: 0 });
      break;
    case 'sendLetter':
      const letter = findLetter(state, action.id);
      addFuture(state, 3, resolveLetter(state, letter));
      state.inv.items = state.inv.items.filter(x => x.id != action.id);
      goBack(state);
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
        throw new Error('Trying to reduce menuNext action when not in a menu');
      }
      doMenuUiAction(state, frame, action.action);
    } break;
    case 'editUiAction': {
      const frame = state.uiStack[0];
      if (frame.t != 'edit') {
        throw new Error('Trying to reduce editNext action when not in a edit');
      }
      doEditUiAction(state, frame, action.action);
    } break;

    default: unreachable(action);
  }
}

import { Terminal } from 'terminal-kit';
import { Item, LetterItem, State, collectResources, findLetter, state } from './state';
import { randElt, unreachable } from './util';
import { Document, stringOfDoc } from './doc';

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
  ;
export type Action =
  | MenuAction
  | { t: 'setLetterText', id: number | undefined, text: string }
  | { t: 'bigMoney' }
  | { t: 'addInbox', item: Item }
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
  }
}

export function quit(term: Terminal) {
  term.clear();
  term.reset();
  process.exit(0);
}

function win(term: Terminal) {
  term.clear();
  term.green('you win!\n');
  process.exit(0);
}

function goBack(state: State): void {
  state.uiStack.shift();
}

export function logger(msg: string): void {
  state.log.push(`[${state.time}] ${msg}`);
}

function resolveLetter(letter: LetterItem): Action {
  if (letter.body.match('money')) {
    return { t: 'bigMoney' };
  }
  else {
    return { t: 'addInbox', item: { t: 'doc', doc: { t: 'brochure' }, id: 0 } };
  }
}

function addFuture(state: State, delta_time: number, action: Action): void {
  state.futures.push({ action, time: state.time + delta_time });
}

export function resolveFutures(term: Terminal, state: State): void {
  const time = state.time;
  const fsNow = state.futures.filter(x => x.time <= time);
  const fsLater = state.futures.filter(x => x.time > time);
  state.futures = fsLater;
  for (const f of fsNow) {
    doAction(term, f.action);
  }
}

export function doAction(term: Terminal, action: Action): void {
  switch (action.t) {
    case 'exit': quit(term); break;
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
    case 'purchase': win(term); break;
    case 'enterInventoryMenu': state.uiStack.unshift({ t: 'menu', which: { t: 'inventory' }, ix: 0 }); break;
    case 'back': goBack(state); break;
    case 'newLetter': {
      state.uiStack.unshift({ t: 'edit', id: undefined });
    }
      break;
    case 'editLetter':
      state.uiStack.unshift({ t: 'edit', id: action.id });
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
      addFuture(state, 3, resolveLetter(letter));
      state.inv.items = state.inv.items.filter(x => x.id != action.id);
      goBack(state);
      break;
    case 'bigMoney':
      logger('got big money');
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
    default: unreachable(action);
  }
}

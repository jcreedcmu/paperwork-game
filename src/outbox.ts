import { Action, addFuture, addInboxDoc, addInboxForm } from './action';
import { resolveForm } from './form';
import { logger, message } from './logger';
import { Item, LetterItem, State, deleteAtLocation, findItem, getLocation, getOutboxId, removeLocation, requireFlexContainer } from './state';

export const OUTBOX_PERIOD = 10;

function resolveOutbox(state: State) {
  const outboxId = getOutboxId(state);
  const outbox = requireFlexContainer(findItem(state, outboxId));
  if (outbox.contents.length > 0) {
    outbox.contents.forEach((id, ix) => {
      const loc = getLocation(state, id);
      if (loc == undefined) {
        throw new Error(`unexpected nonlocated item ${id}`);
      }
      addFuture(state, 3, resolveSentItem(state, findItem(state, id)));
      deleteAtLocation(state, loc);
    });
    message(state, `Outbox contents have been collected.`);
  }
}

export function maybeResolveOutbox(state: State) {
  if (state.time % OUTBOX_PERIOD == 0) {
    resolveOutbox(state);
  }
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
    case 'flexContainer': return { t: 'none' };
    case 'stack': return { t: 'none' };
  }
}

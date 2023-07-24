import { Action, addFuture, addInboxDoc, addInboxForm, addItems } from './action';
import { addError, resolveForm } from './form';
import { logger, message } from './logger';
import { EnvelopeItem, Item, LetterItem, State, deleteAtLocation, findItem, getLocation, getOutboxId, removeLocation, requireFlexContainer } from './state';

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

function resolveEnvelope(state: State, item: EnvelopeItem): Action {
  switch (item.address) {
    case 'department of forms': {
      if (item.contents[0] !== undefined) {
        return {
          t: 'addItems', unread: true, items: [{
            item: {
              t: 'form',
              form: { t: 'STO-001' },
              formData: [],
              money: 30,
            }
          }]
        };
      }
      else {
        return addError(state, { t: 'itemMissing' });
      }
    }
    case 'department of envelopes':
      {
        if (item.contents[0] !== undefined) {
          return {
            t: 'addItems', unread: true, items: [{
              item: {
                t: 'form',
                form: { t: 'ENV-001' },
                formData: [],
                money: 30,
              }
            }]
          };
        }
        else {
          return addError(state, { t: 'itemMissing' });
        }
      }
    default:
      return addError(state, { t: 'addressWrong', actual: item.address });
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
    case 'envelope': return resolveEnvelope(state, item);

    // shouldn't be able to send any of these
    case 'doc': return { t: 'none' };
    case 'otherRigidContainer': return { t: 'none' };
    case 'flexContainer': return { t: 'none' };
    case 'stack': return { t: 'none' };
  }
}

import { State, getInboxId, initState } from '../src/state';
import { Action, addItems, doAction, enterInboxMenu } from '../src/action';

describe('edit form action', () => {
  it('should work on envelope', () => {

    const state: State = initState();
    const itemIds = addItems(
      state,
      [{ item: { t: 'envelope', address: '', contents: [], size: 3 } }],
      false
    );
    doAction(state, enterInboxMenu(state));
    doAction(state,
      {
        t: 'editForm',
        'form': { 't': 'Envelope Address' }, id: itemIds[0], 'saveCont': { 't': 'envelope' }
      });
    const inboxId = getInboxId(state);
    expect(state.uiStack[1]).toEqual({ t: 'menu', which: { t: 'flexContainer', id: inboxId }, ix: 0 });
    expect(state.uiStack[0].t).toEqual('editForm');
  });
});

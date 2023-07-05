import { State, initState } from '../src/state';
import { Action, doAction, enterInboxMenu } from '../src/action';

describe('edit form action', () => {
  it('should work on envelope', () => {

    const state: State = initState();
    doAction(state, { t: 'addItems', items: [{ unread: false, item: { t: 'envelope', address: '', contents: [], size: 3 } }] });
    doAction(state, enterInboxMenu());
    doAction(state,
      {
        t: 'editForm',
        'form': { 't': 'Envelope Address' }, 'id': 0, 'saveCont': { 't': 'envelope' }
      });
    expect(state.uiStack[1]).toEqual({ t: 'menu', which: { t: 'inbox' }, ix: 0 });
    expect(state.uiStack[0].t).toEqual('editForm');
  });
});

import { Skill, State, initState } from '../src/state';
import { Action, doAction } from '../src/action';

describe('edit form action', () => {
  it('should work on envelope', () => {

    const state: State = initState();
    state.items_ = {
      '0': { t: 'envelope', address: '', contents: [], size: 3 }
    };
    state.itemLocs_ = { '0': { t: 'inbox', ix: 0 } };
    state.uiStack = [
      { t: 'menu', which: { t: 'inbox' }, ix: 0 },
      { t: 'menu', which: { t: 'main' }, ix: 2 }
    ];
    state.idCounter = 1;
    state.inv.inbox_ = [{ 'unread': false, 'id': 0 }];

    const action: Action = {
      t: 'editForm',
      'form': { 't': 'Envelope Address' }, 'id': 0, 'saveCont': { 't': 'envelope' }
    };

    doAction(state, action);
    const lastFrame = state.uiStack[0];
    expect(lastFrame.t).toEqual('editForm');
  });
});

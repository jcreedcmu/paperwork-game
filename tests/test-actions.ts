import { State } from '../src/state';
import { Action, doAction } from '../src/action';

describe('edit form action', () => {
  it('should work on envelope', () => {

    const state: State = {
      selectedIndex: undefined,
      'items_': {
        '0': { 't': 'envelope', 'address': '', 'contents': [], 'size': 3 }
      },
      'itemLocs_': { '0': { 't': 'inbox', 'ix': 0 } },
      'log': [],
      'futures': [],
      'uiStack': [{ 't': 'menu', 'which': { 't': 'inbox' }, 'ix': 0 },
      { 't': 'menu', 'which': { 't': 'main' }, 'ix': 2 }],
      'idCounter': 1, 'time': 0,
      'inv': { hand: undefined, 'inbox_': [{ 'unread': false, 'id': 0 }], 'res_': { 'cash': 0, 'bottle': 0, 'paper': 0, 'pencil': 0, 'envelope': 0 } }
    };

    const action: Action = {
      t: 'editForm',
      'form': { 't': 'Envelope Address' }, 'id': 0, 'saveCont': { 't': 'envelope' }
    };

    doAction(state, action);
    const lastFrame = state.uiStack[0];
    expect(lastFrame.t).toEqual('editForm');
  });
});

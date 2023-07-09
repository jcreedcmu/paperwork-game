import { appendToInbox, createItem, getLocation, initState, insertIntoLocation, removeItem, removeLocation } from "../src/state";

describe('removeLocation', () => {
  it('should update item state correctly when removed from inbox', () => {
    const state = initState();
    const letter1 = appendToInbox(state, createItem(state, { t: 'letter', body: '', money: 0 }));
    const letter2 = appendToInbox(state, createItem(state, { t: 'letter', body: '', money: 0 }));
    expect(getLocation(state, letter1)).toEqual({ t: 'inbox', ix: 0 });
    expect(getLocation(state, letter2)).toEqual({ t: 'inbox', ix: 1 });
    removeLocation(state, getLocation(state, letter1)!);
    expect(getLocation(state, letter1)).toEqual(undefined);
    expect(getLocation(state, letter2)).toEqual({ t: 'inbox', ix: 0 });
  });

  it('should update item state correctly when removed from envelope', () => {
    const state = initState();
    const envelope = createItem(state, { t: 'envelope', address: '', contents: [], size: 3 });
    appendToInbox(state, envelope);
    const letter1 = createItem(state, { t: 'letter', body: '', money: 0 });
    const letter2 = createItem(state, { t: 'letter', body: '', money: 0 });

    insertIntoLocation(state, letter1, { t: 'rigidContainer', id: envelope, ix: 0 });
    insertIntoLocation(state, letter2, { t: 'rigidContainer', id: envelope, ix: 1 });
    expect(getLocation(state, letter1)).toEqual({ t: 'rigidContainer', id: envelope, ix: 0 });
    expect(getLocation(state, letter2)).toEqual({ t: 'rigidContainer', id: envelope, ix: 1 });
    removeLocation(state, getLocation(state, letter1)!);
    expect(getLocation(state, letter1)).toEqual(undefined);
    expect(getLocation(state, letter2)).toEqual({ t: 'rigidContainer', id: envelope, ix: 1 });
  });
});

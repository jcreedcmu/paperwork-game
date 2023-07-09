import { appendToInbox, createItem, getInboxId, getLocation, getRootId, inboxLocation, initState, insertIntoLocation, removeItem, removeLocation } from "../src/state";

describe('initial state', () => {
  it('should have appropriate locations for things', () => {
    const state = initState();
    const root = getRootId(state);
    const inbox = getInboxId(state);
    expect(getLocation(state, root)).toEqual(undefined);
    expect(getLocation(state, inbox)).toEqual({ t: 'flexContainer', id: root, ix: 0 });
  });
});

describe('removeLocation', () => {
  it('should update item state correctly when removed from inbox', () => {
    const state = initState();
    const letter1 = createItem(state, { t: 'letter', body: '', money: 0 });
    const letter2 = createItem(state, { t: 'letter', body: '', money: 0 })
    appendToInbox(state, letter1);
    appendToInbox(state, letter2);
    expect(getLocation(state, letter1)).toEqual(inboxLocation(state, 0));
    expect(getLocation(state, letter2)).toEqual(inboxLocation(state, 1));
    removeLocation(state, getLocation(state, letter1)!);
    expect(getLocation(state, letter1)).toEqual(undefined);
    expect(getLocation(state, letter2)).toEqual(inboxLocation(state, 0));
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

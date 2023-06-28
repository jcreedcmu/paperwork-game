import { Resource } from './resource';
import { ItemId, State, Location, getInbox, getItemAtLocation, requireStack, createItem, setItem, SubItem, deleteAtLocation, getLocation, getLocationDefined } from './state';

export type StackDivision =
  | 'half'
  | 'one'
  ;

export function singleItemOfResource(state: State, res: Resource): SubItem | undefined {
  switch (res) {
    case 'envelope': return { t: 'envelope', address: '', contents: [], size: 3 };
    default: return undefined;
  }
}

// assumes location holds a stack
export function divideStack(state: State, loc: Location, stackDivision: StackDivision): ItemId | undefined {
  const item = requireStack(getItemAtLocation(state, loc));
  switch (stackDivision) {
    case 'half': {
      let grabQuantity;
      if (item.quantity == 1) {
        grabQuantity = 1;
        deleteAtLocation(state, getLocationDefined(state, item.id));
      }
      else {
        grabQuantity = Math.ceil(item.quantity / 2);
        item.quantity = item.quantity - grabQuantity;
        setItem(state, item);
      }

      const grabbed = createItem(state, { t: 'stack', quantity: grabQuantity, res: item.res });
      state.inv.hand = grabbed;
      return grabbed;
    }
    case 'one': {
      const subItem = singleItemOfResource(state, item.res);
      if (subItem === undefined)
        return undefined;

      if (item.quantity == 1) {
        deleteAtLocation(state, getLocationDefined(state, item.id));
      }
      else {
        item.quantity = item.quantity - 1;
        setItem(state, item);
      }

      const grabbed = createItem(state, subItem);
      state.inv.hand = grabbed;
      return grabbed;
    }
  }
}

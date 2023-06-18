import { State } from './state';

export const resources = ['cash', 'bottle', 'paper', 'pencil', 'envelope'] as const;
export const collectResources: Resource[] = ['bottle', 'paper', 'pencil'];

// A resource is just a thing that you can have some number of --- and
// the number of them that you have is the only information that is
// kept track of. They don't have any notion of identity.
export type Resource = (typeof resources)[number];

export function adjustResource(state: State, resource: Resource, delta: number): void {
  state.inv.res_[resource] += delta;
}

export function getResource(state: State, resource: Resource): number {
  return state.inv.res_[resource];
}

export function setResource(state: State, resource: Resource, value: number): number {
  return state.inv.res_[resource] = value;
}

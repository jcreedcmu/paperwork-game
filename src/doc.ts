import { Terminal } from 'terminal-kit';
import { DisplayFrame } from './menu';
import { Action } from './action';

export type DocCode =
  | 'brochure';

export function stringOfDocCode(code: DocCode): string {
  switch (code) {
    case 'brochure': return 'Brochure';
  }
}

export async function showDisplayDoc(frame: DisplayFrame, term: Terminal): Promise<Action> {
  term.red('document goes here\n');
  const cont = term.singleColumnMenu(['<-']);
  const result = await cont.promise;
  return { t: 'back' };
}

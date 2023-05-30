import { Terminal } from 'terminal-kit';
import { DisplayFrame } from './menu';
import { Action } from './action';

export type Document =
  | { t: 'brochure', inResponseTo: string };

export function stringOfDoc(doc: Document): string {
  switch (doc.t) {
    case 'brochure': return 'Brochure';
  }
}

export function contentOfDoc(doc: Document): string {
  switch (doc.t) {
    case 'brochure': return `Valued Resident: Your communication:
    > ${doc.inResponseTo}
is not recognized. During your stay with us, you may request
- the facility store CATALOG ($1)
- the INDEX of facility forms ($2)
- your monthly quota of free READING material (no charge)`;
  }
}

export async function showDisplayDoc(frame: DisplayFrame, term: Terminal, doc: Document): Promise<Action> {
  term.gray(contentOfDoc(doc) + '\n');
  const cont = term.singleColumnMenu(['<-']);
  const result = await cont.promise;
  return { t: 'back' };
}

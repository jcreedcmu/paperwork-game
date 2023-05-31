import { Terminal } from 'terminal-kit';
import { DisplayFrame } from './menu';
import { Action } from './action';

export type Document =
  | { t: 'brochure', inResponseTo: string }
  | { t: 'store-catalog' };

export function stringOfDoc(doc: Document): string {
  switch (doc.t) {
    case 'brochure': return 'Brochure';
    case 'store-catalog': return 'Catalog';
  }
}

function brochureContent(inResponseTo: string): string {
  return `Valued Resident: Your communication:
    > ${inResponseTo}
is not recognized. During your stay with us, you may request
- the facility store CATALOG ($1)
- the INDEX of facility forms ($2)
- your monthly quota of free READING material (no charge)`;
}

const storeCatalogContent =
  `You may submit a form STO-001 for any of the following items:
  - pencils $1
  - paper $1
  - radio $100`;

export function contentOfDoc(doc: Document): string {
  switch (doc.t) {
    case 'brochure': return brochureContent(doc.inResponseTo);
    case 'store-catalog': return storeCatalogContent;
  }
}

export async function showDisplayDoc(frame: DisplayFrame, term: Terminal, doc: Document): Promise<Action> {
  term.gray(contentOfDoc(doc) + '\n');
  const cont = term.singleColumnMenu(['<-']);
  const result = await cont.promise;
  return { t: 'back' };
}

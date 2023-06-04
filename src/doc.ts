import { TextBuffer } from './buffer';
import { DisplayFrame } from './menu';
import { State } from './state';

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

export function renderDisplay(buf: TextBuffer, state: State, frame: DisplayFrame): void {
  const doc = frame.which;
  buf.newLine().put(contentOfDoc(doc) + '\n\n[any key to go back]');
}

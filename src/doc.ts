export type DocCode =
  | 'brochure';

export function stringOfDocCode(code: DocCode): string {
  switch (code) {
    case 'brochure': return 'brochure';
  }
}

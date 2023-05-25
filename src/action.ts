export type MenuAction =
  | { t: 'sleep' }
  | { t: 'collect' }
  | { t: 'exit' }
  | { t: 'recycle' }
  | { t: 'purchase' }
  | { t: 'enterInventoryMenu' }
  | { t: 'newLetter' }
  | { t: 'editLetter', id: number, body: string }
  | { t: 'back' }
  ;
export type Action =
  | MenuAction
  | { t: 'setLetterText', id: number | undefined, text: string }
  ;

export function stringOfMenuAction(action: MenuAction): string {
  switch (action.t) {
    case 'sleep': return 'sleep';
    case 'collect': return 'collect';
    case 'purchase': return 'purchase freedom';
    case 'exit': return 'exit';
    case 'recycle': return 'recycle bottles';
    case 'enterInventoryMenu': return 'inventory...';
    case 'newLetter': return 'new letter';
    case 'editLetter': return `edit letter ("${action.body.substring(0, 10)}")`;
    case 'back': return '<-';
  }
}

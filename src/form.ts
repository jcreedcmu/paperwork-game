import { Action, doAction } from "./action";
import { TextBuffer } from "./buffer";
import { State } from "./state";
import { mod, unreachable } from "./util";

export type FormEditUiAction =
  | { t: 'left' }
  | { t: 'right' }
  | { t: 'deleteLeft' }
  | { t: 'home' }
  | { t: 'end' }
  | { t: 'submit' }
  | { t: 'kill' }
  | { t: 'insert', key: string }
  | { t: 'nextField' }
  ;

export function formEditUiAction(action: FormEditUiAction): Action {
  return { t: 'formEditUiAction', action }
}

export type FormLayoutEntry = {
  t: 'field', label: string
};

function field(label: string): FormLayoutEntry {
  return { t: 'field', label };
}
export type FormLayout = FormLayoutEntry[];

export type Form =
  | { t: 'STO-001' }
  | { t: 'ENV-001' }

export type FormItem = { t: 'form', id: number, form: Form, formData: string[] };

export function getLayoutOfForm(form: Form): FormLayout {
  switch (form.t) {
    case 'STO-001': return [
      field('pencils (qty)'),
      field('paper (qty)'),
      field('radio (qty)'),
    ];
    case 'ENV-001': return [
      field('pencils (qty)'),
      field('paper (qty)'),
      field('radio (qty)'),
    ];
  }
}

export function stringOfForm(form: Form): string {
  switch (form.t) {
    case 'STO-001': return 'STO-001';
    case 'ENV-001': return 'STO-001';
  }
}

export type FormEditFrame = {
  t: 'editForm',
  id: number | undefined,
  formItem: FormItem,
  curFieldIx: number,
  cursorPos: number,
};

export function makeFormEditFrame(id: number | undefined, formItem: FormItem): FormEditFrame {
  return { t: 'editForm', id, formItem, curFieldIx: 0, cursorPos: 0 }
}

export function findForm(state: State, id: number): FormItem {
  const ix = state.inv.inbox.findIndex(x => x.item.id == id);
  if (ix == -1) {
    throw new Error(`no form in inbox with id ${id}`);
  }
  const item = state.inv.inbox[ix].item;
  if (item.t != 'form') {
    throw new Error(`item with id ${id} not a form`);
  }
  return item;
}

export function buttonSelected(frame: FormEditFrame): number | undefined {
  const layout = getLayoutOfForm(frame.formItem.form);
  return frame.curFieldIx >= layout.length ? frame.curFieldIx - layout.length : undefined;
}

export function renderFormEditPane(buf: TextBuffer, state: State, frame: FormEditFrame): void {
  buf.red().put('EDIT FORM ').put(frame.formItem.form.t).newLine().put('\n');
  const layout = getLayoutOfForm(frame.formItem.form);
  const ROW_OFFSET = 2;
  layout.forEach((fe, ix) => {
    buf.moveTo(0, ROW_OFFSET + ix);
    buf.blue().put(fe.label).put(': ' + (frame.formItem.formData[ix] ?? ''));
  });
  const button = buttonSelected(frame);
  buf.moveTo(0, ROW_OFFSET + layout.length + 1);
  buf.green().inverse(button == 0).put('SUBMIT');
  if (button === undefined) {
    buf.moveTo(layout[frame.curFieldIx].label.length + 2 + frame.cursorPos, ROW_OFFSET + frame.curFieldIx);
  }
}

export function showCursorInForm(frame: FormEditFrame): boolean {
  return buttonSelected(frame) === undefined;
}

export function doFormEditUiAction(state: State, frame: FormEditFrame, action: FormEditUiAction): void {
  const item = frame.formItem;

  const layout = getLayoutOfForm(item.form);

  const text = item.formData[frame.curFieldIx] ?? '';
  function setText(x: string) {
    item.formData[frame.curFieldIx] = x;
  }

  switch (action.t) {
    case 'left': frame.cursorPos = Math.max(0, frame.cursorPos - 1); break;
    case 'right': frame.cursorPos = Math.min(text.length, frame.cursorPos + 1); break;
    case 'deleteLeft': {
      if (frame.cursorPos > 0) {
        setText(text.substr(0, frame.cursorPos - 1) + text.substr(frame.cursorPos));
        frame.cursorPos--;
      }
    } break;
    case 'home': frame.cursorPos = 0; break;
    case 'end': frame.cursorPos = text.length; break;
    case 'kill': setText(text.substr(0, frame.cursorPos)); break;
    case 'submit': {
      // XXX?
      //      doAction(state, { t: 'setLetterText', id: frame.id, text: text });
    } break;
    case 'insert': {
      if (action.key.length == 1) {
        setText(text.substr(0, frame.cursorPos) + action.key + text.substr(frame.cursorPos));
        frame.cursorPos++;
      }
    } break;
    case 'nextField': {
      frame.curFieldIx = mod(frame.curFieldIx + 1, layout.length + 1);
      frame.cursorPos = 0;
    } break;
    default: unreachable(action);
  }
}

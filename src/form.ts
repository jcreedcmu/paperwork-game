import { Action, doAction, goBack } from "./action";
import { TextBuffer } from "./buffer";
import { State, findItem, setItem } from "./state";
import { mod, unreachable, clone } from "./util";

export type FormEditUiAction =
  | { t: 'up' }
  | { t: 'down' }
  | { t: 'left' }
  | { t: 'right' }
  | { t: 'deleteLeft' }
  | { t: 'home' }
  | { t: 'end' }
  | { t: 'save' }
  | { t: 'kill' }
  | { t: 'insert', key: string }
  | { t: 'nextField' }
  | { t: 'prevField' }
  | { t: 'enter' }
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

export type FormItem = { t: 'form', form: Form, formData: string[] };

export function getLayoutOfForm(form: Form): FormLayout {
  switch (form.t) {
    case 'STO-001': return [
      field('pencils (qty)'),
      field('paper (qty)'),
      field('radio (qty)'),
    ];
    case 'ENV-001': return [
      field('envelopes (qty)'),
    ];
  }
}

export function stringOfForm(form: Form): string {
  switch (form.t) {
    case 'STO-001': return 'STO-001';
    case 'ENV-001': return 'ENV-001';
  }
}

export type FormEditFrame = {
  t: 'editForm',
  id: number | undefined,
  layout: FormLayout,
  form: Form,
  formData: string[],
  curFieldIx: number,
  cursorPos: number,
};

export function makeFormEditFrame(id: number | undefined, formItem: FormItem): FormEditFrame {
  return {
    t: 'editForm',
    id,
    layout: getLayoutOfForm(formItem.form),
    formData: clone(formItem.formData),
    form: formItem.form,
    curFieldIx: 0,
    cursorPos: 0
  }
}

export function findFormItem(state: State, id: number): FormItem & { id: number } {
  const item = findItem(state, id);
  if (item.t != 'form') {
    throw new Error(`item with id ${id} not a form`);
  }
  return item;
}

export function getSelectedButton(frame: FormEditFrame): number | undefined {
  const layout = frame.layout;
  return frame.curFieldIx >= layout.length ? frame.curFieldIx - layout.length : undefined;
}

export function renderFormEditPane(buf: TextBuffer, state: State, frame: FormEditFrame): void {
  buf.red().put('EDIT FORM ').put(frame.form.t).newLine().put('\n');
  const layout = frame.layout;
  const ROW_OFFSET = 2;
  layout.forEach((fe, ix) => {
    buf.moveTo(0, ROW_OFFSET + ix);
    buf.blue().put(fe.label).put(': ' + (frame.formData[ix] ?? ''));
  });
  const button = getSelectedButton(frame);
  buf.moveTo(0, ROW_OFFSET + layout.length + 1);
  buf.green().inverse(button == 0).put('SAVE');
  if (button === undefined) {
    buf.moveTo(layout[frame.curFieldIx].label.length + 2 + frame.cursorPos, ROW_OFFSET + frame.curFieldIx);
  }
}

export function showCursorInForm(frame: FormEditFrame): boolean {
  return getSelectedButton(frame) === undefined;
}

export function doFormEditUiAction(state: State, frame: FormEditFrame, action: FormEditUiAction): void {
  const layout = frame.layout;

  const text = frame.formData[frame.curFieldIx] ?? '';
  function setText(x: string) {
    frame.formData[frame.curFieldIx] = x;
  }

  switch (action.t) {
    case 'up': doFormEditUiAction(state, frame, { t: 'prevField' }); break;
    case 'down': doFormEditUiAction(state, frame, { t: 'nextField' }); break;
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
    case 'save': {
      if (frame.id === undefined) {
        throw new Error(`didn't expect id in form submission to be undefined`);
      }
      const item = findFormItem(state, frame.id);
      item.formData = frame.formData;
      setItem(state, item);
      goBack(state);
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
    case 'prevField': {
      frame.curFieldIx = mod(frame.curFieldIx - 1, layout.length + 1);
      frame.cursorPos = 0;
    } break;
    case 'enter': {
      const but = getSelectedButton(frame);
      if (but == 0) {
        doFormEditUiAction(state, frame, { t: 'save' });
      }
      else {
        doFormEditUiAction(state, frame, { t: 'nextField' });
      }
    } break;
    default: unreachable(action);
  }
}

export function resolveForm(state: State, item: FormItem): Action {
  switch (item.form.t) {
    case 'STO-001': return { t: 'none' };
    case 'ENV-001': return {
      t: 'addItems', items: [
        { unread: false, item: { t: 'envelope', contents: [], size: 3 } }
      ]
    };
  }
}

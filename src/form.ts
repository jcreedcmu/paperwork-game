import { TextBuffer } from "./buffer";
import { State } from "./state";

export type Form =
  | { t: 'STO-001' }

export type FormItem = { t: 'form', id: number, form: Form };

export function stringOfForm(form: Form): string {
  switch (form.t) {
    case 'STO-001': return 'STO-001';
  }
}

export type EditFormFrame = { t: 'editForm', id: number | undefined, formItem: FormItem };
export function makeEditFormFrame(id: number | undefined, formItem: FormItem): EditFormFrame {
  return { t: 'editForm', id, formItem }
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

export function renderEditFormPane(buf: TextBuffer, state: State, frame: EditFormFrame): void {
  buf.red().newLine().put('EDIT FORM\n').put(frame.formItem.form.t);
}

export function showCursorInForm(frame: EditFormFrame): boolean {
  return true;
}

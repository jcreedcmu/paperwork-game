import { ScreenBuffer } from 'terminal-kit';
import { Action } from './action';
import { TextBuffer } from './buffer';

export const DEBUG = {
  key: false,
  initialItems: false,
  logToFile: false,
  actions: false,
  menu: true,
};

function delay(ms: number): Promise<void> {
  return new Promise((res, rej) => {
    setTimeout(() => { res(); }, ms);
  });
}

export async function showDebug(buf: TextBuffer): Promise<Action> {
  console.time('render');
  buf.fill(' ');
  buf.draw();
  console.timeEnd('render');
  await delay(1000);
  return { t: 'back' };
}

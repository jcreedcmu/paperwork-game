import { Terminal, ScreenBuffer } from 'terminal-kit';
import { Action } from './action';

function delay(ms: number): Promise<void> {
  return new Promise((res, rej) => {
    setTimeout(() => { res(); }, ms);
  });
}
export async function showDebug(term: Terminal): Promise<Action> {
  term.clear();
  const buf = new ScreenBuffer({ width: 80, height: 25, dst: term });
  buf.fill({ char: 'x', attr: 0 });
  buf.draw();
  await delay(1000);
  return { t: 'back' };
}

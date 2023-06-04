import { ScreenBuffer } from 'terminal-kit';
import { WIDTH } from './render';
import { State } from './state';
import { TextBuffer } from './buffer';

export type LogLine = { time: number, msg: string };

export function logger(state: State, msg: string): void {
  state.log.push({ time: state.time, msg: msg });
}

const LOG_COL = WIDTH - 20;

export function renderLog(buf: TextBuffer, log: LogLine[]): void {
  const lines = log.slice(-10).reverse();
  lines.forEach((line, ix) => {
    buf.moveTo(LOG_COL, ix);
    buf.white().put(`[${line.time}] `).put(line.msg);
  });
}

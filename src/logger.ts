import { ScreenBuffer } from 'terminal-kit';
import { WIDTH } from './render';
import { State } from './state';
import { TextBuffer } from './buffer';
import { DEBUG } from './debug';
import * as fs from 'fs';
export type LogLine = { time: number, msg: string };
let outStream: fs.WriteStream;
if (DEBUG.logToFile) {
  outStream = fs.createWriteStream('/tmp/log', 'utf8');
}

export function logger(state: State, msg: string): void {
  if (DEBUG.logToFile) {
    outStream.write(msg + '\n');
  }
  else {
    state.log.push({ time: state.time, msg: msg });
  }
}

const LOG_COL = WIDTH - 20;

export function renderLog(buf: TextBuffer, log: LogLine[]): void {
  const lines = log.slice(-10).reverse();
  lines.forEach((line, ix) => {
    buf.moveTo(LOG_COL, ix);
    buf.white().put(`[${line.time}] `).put(line.msg);
  });
}

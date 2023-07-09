import { ScreenBuffer } from 'terminal-kit';
import { WIDTH } from './render';
import { State } from './state';
import { TextBuffer } from './buffer';
import { DEBUG } from './debug';
import * as fs from 'fs';

export type LogLevel =
  | 'DEBUG'
  | 'MESSAGE'
  ;

export type LogLine = { time: number, msg: string, level: LogLevel };
let outStream: fs.WriteStream;
if (DEBUG.logToFile) {
  outStream = fs.createWriteStream('/tmp/log', 'utf8');
}

export function logger(state: State, msg: string): void {
  message(state, msg, 'DEBUG');
}

export function message(state: State, msg: string, level: LogLevel = 'MESSAGE'): void {
  if (DEBUG.logToFile && level == 'DEBUG') {
    outStream.write(msg + '\n');
  }
  else {
    state.log.push({ time: state.time, msg: msg, level });
  }
}

const LOG_COL = WIDTH - 30;

export function renderLog(buf: TextBuffer, log: LogLine[]): void {
  const lines = log.slice(-10).reverse();
  lines.forEach((line, ix) => {
    buf.moveTo(LOG_COL, ix);
    if (line.level == 'DEBUG') {
      buf.white().put(`[${line.time}] `).put(line.msg);
    }
    else {
      buf.put(`> `).put(line.msg);
    }
  });
}

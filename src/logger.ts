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

const LOG_WIDTH = 30;
const LOG_COL = WIDTH - LOG_WIDTH;

function lineWrap(msg: string): string[] {
  if (msg.length <= 30) {
    return [msg];
  }
  else {
    const toks = msg.split(/\s+/);
    const rv: string[] = [];
    toks.forEach(tok => {
      if (rv.length == 0 || rv[rv.length - 1].length + 1 + tok.length > LOG_WIDTH) {
        // new line
        rv.push(tok);
      }
      else {
        // append to line
        rv[rv.length - 1] = rv[rv.length - 1] + ' ' + tok;
      }
    });
    return rv;
  }
}

export function renderLog(buf: TextBuffer, log: LogLine[]): void {
  const lines = log.slice(-10).reverse();
  let lineIx = 0;
  lines.forEach((line, ix) => {
    if (line.level == 'DEBUG') {
      for (const wline of lineWrap(`[${line.time}] ${line.msg}`)) {
        buf.moveTo(LOG_COL, lineIx);
        buf.white().put(wline);
        lineIx++;
      }
    }
    else {
      for (const wline of lineWrap(`> ${line.msg}`)) {
        buf.moveTo(LOG_COL, lineIx);
        buf.put(wline);
        lineIx++;
      }
    }
  });
}

import { Terminal, terminal } from 'terminal-kit';
import { doAction, resolveFutures } from './action';
import { stringOfDoc } from './doc';
import { actionOfKey } from './keys';
import { render } from './render';
import { Item, initState } from './state';

export const term: Terminal = terminal;

export function quit() {
  term.clear();
  term.reset();
  process.exit(0);
}

export function win() {
  term.clear();
  term.green('you win!\n');
  process.exit(0);
}

declare module "terminal-kit" {
  class ScreenBuffer {
    put(
      options: Partial<ScreenBuffer.PutOptions> & { newLine?: boolean },
      format: string,
      ...formatArgumets: any[]
    ): void;
    fill(options: { char: string, attr?: ScreenBuffer.Attributes | number }): void;
  }
}

export const STATUS_COLUMN = 30;
const LOG_ROW = 15;

export function stringOfItem(item: Item): string {
  switch (item.t) {
    case 'letter': return item.body;
    case 'doc': return stringOfDoc(item.doc);
  }
}

async function go() {
  const state = initState();
  term.clear();
  render(term, state);

  term.hideCursor(true);
  term.grabInput(true);
  term.on('key', (key: string) => {
    const action = actionOfKey(state, key);
    doAction(state, action);
    resolveFutures(state);
    render(term, state);
  });

  //   const action = await showUi(state);
}

go();

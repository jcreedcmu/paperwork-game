import { Terminal, terminal } from 'terminal-kit';
import { doAction, resolveFutures } from './action';
import { actionOfKey } from './keys';
import { render } from './render';
import { initState } from './state';

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

import { Terminal, terminal } from 'terminal-kit';
import { doAction, resolveFutures } from './action';
import { actionOfKey } from './keys';
import { HEIGHT, WIDTH, render } from './render';
import { initState } from './state';
import { TextBuffer } from './buffer';

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
  term.grabInput(true);
  term.clear();

  const state = initState();
  const buf = new TextBuffer(WIDTH, HEIGHT, term);

  render(buf, state);

  term.on('key', (key: string) => {
    const action = actionOfKey(state, key);
    doAction(state, action);
    resolveFutures(state);
    render(buf, state);
  });
}

go();

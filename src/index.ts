import { doAction, resolveFutures } from './action';
import { term } from './basic-term';
import { TextBuffer } from './buffer';
import { DEBUG } from './debug';
import { actionOfKey } from './keys';
import { HEIGHT, WIDTH, render } from './render';
import { initState } from './state';

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
  if (DEBUG.initialItems) {
    doAction(state, {
      t: 'addItems',
      unread: false,
      items: [{
        item: {
          t: 'envelope',
          address: '',
          contents: [],
          size: 3,
        }
      }]
    });
  }
  const buf = new TextBuffer(WIDTH, HEIGHT, term);

  render(buf, state);

  term.on('key', (key: string) => {
    try {
      const action = actionOfKey(state, key);
      doAction(state, action);
      resolveFutures(state);
      render(buf, state);
    }
    catch (e) {
      term.clear();
      term.reset();
      throw e;
    }
  });
}

go();

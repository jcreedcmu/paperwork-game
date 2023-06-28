import { Terminal, terminal } from 'terminal-kit';

export const term: Terminal = terminal;

export function quit() {
  term.clear();
  term.reset();
  process.exit(0);
}

export function win() {
  term.clear();
  term.reset();
  term.green('you win!\n');
  process.exit(0);
}

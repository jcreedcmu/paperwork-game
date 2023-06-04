import { ScreenBuffer, Terminal } from "terminal-kit";
import { Attributes } from "terminal-kit/ScreenBuffer";

export class TextBuffer {
  private _screenBuffer: ScreenBuffer;
  private _attr: Attributes | undefined;
  x: number = 0;
  y: number = 0;
  private _newLine: boolean = false;

  constructor(public width: number, public height: number, public terminal: Terminal) {
    this._screenBuffer = new ScreenBuffer({ width, height, dst: terminal });
    this._attr = undefined;
  }
  put(msg: string): TextBuffer {
    this._screenBuffer.put({ attr: this._attr, newLine: this._newLine }, msg);
    this._attr = undefined;
    this._newLine = false;
    return this;
  }

  fill(char: string) {
    this._screenBuffer.fill({ char });
  }
  home() {
    this._screenBuffer.moveTo(0, 0);
  }
  moveTo(x: number, y: number) {
    this._screenBuffer.moveTo(x, y);
    this.x = x;
    this.y = y;
  }
  draw() {
    this._screenBuffer.draw({ delta: true });
  }
  setCursorVisibility(visible: boolean) {
    this.terminal.hideCursor(visible);
    this.terminal.moveTo(this.x + 1, this.y + 1);
  }

  setAttr(attr: Attributes) {
    if (this._attr === undefined) {
      this._attr = attr;
    }
    else {
      this._attr = { ...this._attr, ...attr };
    }
  }

  red(): TextBuffer { this.setAttr({ color: 'red' }); return this; }
  white(): TextBuffer { this.setAttr({ color: 'white' }); return this; }
  blue(): TextBuffer { this.setAttr({ color: 'blue' }); return this; }
  green(): TextBuffer { this.setAttr({ color: 'green' }); return this; }
  bold(): TextBuffer { this.setAttr({ bold: true }); return this; }
  inverse(inverted: boolean = true): TextBuffer { this.setAttr({ inverse: inverted }); return this; }
  newLine(): TextBuffer { this._newLine = true; return this; }
}

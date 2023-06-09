import { Point, Color, Rect } from './types';

export function int(x: number): number {
  return Math.floor(x);
}

export function mod(x: number, y: number): number {
  var z = x % y;
  if (z < 0) z += y;
  return z;
}

export function div(x: number, y: number): number {
  return int(x / y);
}

export function imgProm(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const sprite = new Image();
    sprite.src = src;
    sprite.onload = function() { res(sprite); }
  });
}

export function vm(a: Point, f: (a: number) => number): Point {
  return { x: f(a.x), y: f(a.y) };
}

export function vm2(a: Point, b: Point, f: (a: number, b: number) => number): Point {
  return { x: f(a.x, b.x), y: f(a.y, b.y) };
}

export function vm3(a: Point, b: Point, c: Point, f: (a: number, b: number, c: number) => number): Point {
  return { x: f(a.x, b.x, c.x), y: f(a.y, b.y, c.y) };
}

export function vmn(ps: Point[], f: (ns: number[]) => number): Point {
  return { x: f(ps.map(p => p.x)), y: f(ps.map(p => p.y)) };
}

export function vequal(a: Point, b: Point): boolean {
  return a.x == b.x && a.y == b.y;
}

export function vplus(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vminus(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vscale(b: Point, s: number): Point {
  return { x: s * b.x, y: s * b.y };
}

export function vdiv(b: Point, s: number): Point {
  return { x: b.x / s, y: b.y / s };
}

export function vint(v: Point): Point {
  return { x: int(v.x), y: int(v.y) };
}

export function vfpart(v: Point): Point {
  return { x: v.x - int(v.x), y: v.y - int(v.y) };
}

export function interval_intersect(a: [number, number], b: [number, number]): boolean {
  return b[0] < a[1] && a[0] < b[1];
}

// RtlUniform from Native API[13] from
// https://en.wikipedia.org/wiki/Linear_congruential_generator
export function srand(n: number): () => number {
  var x = n;
  var z = function() {
    x = (2147483629 * x + 2147483587) % 2147483647;
    return (x & 0xffff) / (1 << 16);
  }
  return z;
}

export let _r: () => number;

export function r(): number {
  return _r();
}

export function srand_default(): void {
  _r = srand(123456789);
}

srand_default();

export function hash(p: Point): number {
  const z: () => number = srand(1000 * p.x + 3758 * p.y);
  for (let i = 0; i < 10; i++)
    z();
  return z();
}

export function js(x: any): string {
  return JSON.stringify(x);
}

export function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

// meant to be used in a default case
// to enforce exhaustive pattern matching
export function nope<T>(x: never): T {
  throw "nope";
}

export function max(x: number[]): number {
  return Math.max.apply(Math, x);
}

export function min(x: number[]): number {
  return Math.min.apply(Math, x);
}

export function rgba(r: number, g: number, b: number, a: number): string {
  return `rgb(${r}, ${g}, ${b}, ${a})`;
}

export function lerp(a: number, b: number, l: number): number {
  return a * (1 - l) + b * l;
}

export function inrect(p: Point, r: Rect): boolean {
  return p.x >= r.p.x && p.y >= r.p.y && p.x < r.p.x + r.sz.x && p.y < r.p.y + r.sz.y;
}

export function rgbOfColor(color: string): Color {
  if (color == 'clear') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  color = color.replace(/^#/, '');
  return {
    r: parseInt(color.slice(0, 2), 16),
    g: parseInt(color.slice(2, 4), 16),
    b: parseInt(color.slice(4, 6), 16),
    a: 255,
  };
}

export function stringOfColor(c: Color): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
}

export type Buffer = {
  c: HTMLCanvasElement,
  d: CanvasRenderingContext2D,
}

export function buffer(sz: Point): Buffer {
  const c = document.createElement('canvas');
  c.width = sz.x;
  c.height = sz.y;
  const d = c.getContext('2d');
  if (d == null) {
    throw "couldn't create canvas rendering context for buffer";
  }
  return { c, d };
}

export function fbuf(sz: Point, getPixel: (x: number, y: number) => Color): Buffer {
  const c = document.createElement('canvas');
  c.width = sz.x;
  c.height = sz.y;
  const d = c.getContext('2d');
  if (d == null) {
    throw "couldn't create canvas rendering context for buffer";
  }
  const dd = d.getImageData(0, 0, sz.x, sz.y);
  for (let x = 0; x < dd.width; x++) {
    for (let y = 0; y < dd.height; y++) {
      const base = 4 * (y * dd.width + x);
      const cn = getPixel(x, y);
      dd.data[base] = cn.r;
      dd.data[base + 1] = cn.g;
      dd.data[base + 2] = cn.b;
      dd.data[base + 3] = cn.a;
    }
  }
  d.putImageData(dd, 0, 0);
  return { c, d };
}

export function mapval<T, U>(x: { [k: string]: T }, f: (y: T) => U): { [k: string]: U } {
  const rv: { [k: string]: U } = {};
  for (const k of (Object.keys(x))) {
    rv[k] = f(x[k]);
  }
  return rv;
}

export function sum(xs: number[]): number {
  let rv = 0;
  xs.forEach(x => rv += x);
  return rv;
}

export function randElt<T>(x: T[]): T {
  return x[Math.floor(Math.random() * x.length)];
}

export function unreachable(v: never): void { }

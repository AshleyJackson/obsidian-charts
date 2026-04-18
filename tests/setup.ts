import 'jest-canvas-mock';
import ResizeObserver from 'resize-observer-polyfill';

// Polyfill ResizeObserver for jsdom
(global as any).ResizeObserver = ResizeObserver;

// Extend HTMLElement with Obsidian-specific methods for testing
declare global {
  interface HTMLElement {
    createEl(tag: string, opts?: any): HTMLElement;
    createDiv(opts?: any): HTMLDivElement;
    empty(): void;
  }
}

HTMLElement.prototype.createEl = function(tag: string, opts?: any): HTMLElement {
  const el = document.createElement(tag);
  if (opts?.cls) el.className = opts.cls;
  if (opts?.text) el.textContent = opts.text;
  this.appendChild(el);
  return el;
};

HTMLElement.prototype.createDiv = function(opts?: any): HTMLDivElement {
  const el = document.createElement('div');
  if (opts?.cls) el.className = opts.cls;
  if (opts?.text) el.textContent = opts.text;
  this.appendChild(el);
  return el as HTMLDivElement;
};

HTMLElement.prototype.empty = function(): void {
  while (this.firstChild) {
    this.removeChild(this.firstChild);
  }
};

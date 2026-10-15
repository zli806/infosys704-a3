const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const directory = JSON.parse(readFileSync(join(__dirname, '../../data/governance-directory.json'), 'utf8'));

function workspace({ fetchImpl, storage } = {}) {
  const elements = new Map();
  class Element {
    constructor(tag = 'div') { this.tag = tag; this.children = []; this.dataset = {}; this.attributes = {}; this.value = ''; this._text = ''; this.style = {}; this.offsetParent = null; this.events = {}; }
    set textContent(value) { this._text = String(value); this.children = []; }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    append(...children) { for (const child of children) child.parentElement = this; this.children.push(...children); }
    appendChild(child) { this.append(child); return child; }
    replaceChildren(...children) { this._text = ''; this.children = []; this.append(...children); }
    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name] || null; }
    removeAttribute(name) { delete this.attributes[name]; }
    addEventListener(name, callback) { if (typeof callback === 'function') (this.events[name] ||= []).push(callback); }
    closest() { return this.parentElement || new Element('label'); }
    querySelectorAll(selector) { return descendants(this).slice(1).filter(child => child.tag === 'input' && child.type === 'radio' && (!selector.includes(':checked') || child.checked)); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  }
  function descendants(element) { return [element, ...element.children.flatMap(descendants)]; }
  const document = {
    getElementById(id) {
      const existing = [...elements.values()].flatMap(descendants).find(element => element.id === id);
      if (existing) return existing;
      const element = new Element(); element.id = id; elements.set(id, element); return element;
    },
    createElement(tag) { return new Element(tag); },
    querySelectorAll(selector) { return [...new Set([...elements.values()].flatMap(descendants))].filter(element => selector.split(',').map(s => s.trim()).includes(element.tag)); }
  };
  const map = storage || new Map();
  const context = { window: { crypto: require('node:crypto').webcrypto, localStorage: { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) } }, document, Intl, Date, URL, AbortController, setTimeout, clearTimeout,
    fetch: fetchImpl || (async url => { if (url !== 'data/governance-directory.json') throw new Error('Tests never call SAP'); return { ok: true, json: async () => structuredClone(directory) }; }) };
  for (const file of ['js/core/utils.js', 'js/core/review-rules.js', 'js/services/sap-http.js', 'js/services/project-service.js', 'js/services/governance-directory.js', 'js/services/review-store.js', 'js/ui/renderers.js', 'js/ui/governance.js']) {
    runInNewContext(readFileSync(join(__dirname, '../..', file), 'utf8'), context, { filename: file });
  }
  context.window.DPEApp.governanceUI.bind({ saveDraft() {} });
  return { ...context.window.DPEApp, elements, runtime: context.window.DPEApp, map, directory };
}
module.exports = { workspace, directory };

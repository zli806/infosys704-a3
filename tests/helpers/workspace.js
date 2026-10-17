const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const directoryContext = { window: {} };
runInNewContext(readFileSync(join(__dirname, '../../js/services/governance-directory.js'), 'utf8'), directoryContext);
const directory = JSON.parse(JSON.stringify(directoryContext.window.DPEApp.services.governanceDirectory.configuration));

function workspace({ fetchImpl, storage, controller = false, key = '', serviceOverrides = {}, timers } = {}) {
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
    focus() { this.focused = true; }
    contains(element) { return descendants(this).includes(element); }
    scrollIntoView() {}
    closest() { return this.parentElement || new Element('label'); }
    querySelectorAll(selector) {
      if (selector === 'details[open]') return descendants(this).slice(1).filter(child => child.tag === 'details' && child.open);
      return descendants(this).slice(1).filter(child => child.tag === 'input' && child.type === 'radio' && (!selector.includes(':checked') || child.checked));
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  }
  function descendants(element) { return [element, ...element.children.flatMap(descendants)]; }
  const document = {
    events: {},
    addEventListener(name, callback) { (this.events[name] ||= []).push(callback); },
    getElementById(id) {
      const existing = [...elements.values()].flatMap(descendants).find(element => element.id === id);
      if (existing) return existing;
      const element = new Element(); element.id = id; elements.set(id, element); return element;
    },
    createElement(tag) { return new Element(tag); },
    querySelectorAll(selector) { return [...new Set([...elements.values()].flatMap(descendants))].filter(element => selector.split(',').map(s => s.trim()).includes(element.tag)); },
    querySelector() { return this.getElementById('main'); }
  };
  const map = storage || new Map();
  const windowEvents = {};
  const confirmations = [];
  let confirmResult = false;
  const context = { window: { addEventListener(name, callback) { (windowEvents[name] ||= []).push(callback); }, removeEventListener(name, callback) { windowEvents[name] = (windowEvents[name] || []).filter(fn => fn !== callback); }, confirm: message => { confirmations.push(message); return confirmResult; }, APP_CONFIG: { SAP_API_KEY: key }, location: { protocol: 'http:' }, scrollTo() {}, crypto: require('node:crypto').webcrypto, localStorage: { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) } }, document, Intl, Date, URL, AbortController, setTimeout: timers?.setTimeout || setTimeout, clearTimeout: timers?.clearTimeout || clearTimeout, setInterval() {}, console: { error() {}, info() {}, warn() {} },
     fetch: fetchImpl || (async () => { throw new Error('Tests never call SAP'); }) };
  for (const file of ['api-config.js', 'js/data/showcase-portfolio.js', 'js/core/state.js', 'js/core/utils.js', 'js/core/review-rules.js', 'js/services/sap-http.js', 'js/services/project-service.js', 'js/services/gl-service.js', 'js/services/po-service.js', 'js/services/governance-directory.js', 'js/services/showcase-service.js', 'js/services/review-store.js', 'js/ui/renderers.js', 'js/ui/governance.js']) {
    runInNewContext(readFileSync(join(__dirname, '../..', file), 'utf8'), context, { filename: file });
  }
  if (controller) {
    for (const [name, methods] of Object.entries(serviceOverrides)) Object.assign(context.window.DPEApp.services[name], methods);
    runInNewContext(readFileSync(join(__dirname, '../../app.js'), 'utf8'), context, { filename: 'app.js' });
  } else context.window.DPEApp.governanceUI.bind({ saveDraft() {} });
  return { ...context.window.DPEApp, elements, document, runtime: context.window.DPEApp, windowEvents, confirmations, map, directory, fixtures: context.window.DPE_SHOWCASE_PORTFOLIO,
    confirmReset(value) { confirmResult = value; } };
}
function startReview(w, reviewBasis = 'Scheduled stage-gate review') {
  w.document.getElementById('start-review').events.click[0]();
  if (w.elements.get('review-start-dialog')?.open) {
    for (const radio of w.elements.get('review-start-trigger').querySelectorAll('input')) radio.checked = radio.value === reviewBasis;
    w.elements.get('review-start-form').events.submit[0]({ preventDefault() {} });
  }
}
module.exports = { workspace, directory, startReview };

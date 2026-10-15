(() => {
  "use strict";
  const app = window.DPEApp = window.DPEApp || {};
  app.services = app.services || {};
  const SOURCE = "PROTOTYPE GOVERNANCE DIRECTORY";
  let people = [];
  let pending = null;
  function validate(data) {
    if (data?.schemaVersion !== 1 || data.dataType !== "prototype-governance-directory"
      || typeof data.disclaimer !== "string" || !/synthetic/i.test(data.disclaimer)
      || !Array.isArray(data.people) || !data.people.length || data.people.length > 100) throw new Error("Prototype governance directory has an invalid format.");
    const result = data.people.map(person => {
      if (!person || !/^GOV-\d{3}$/.test(person.id) || typeof person.name !== "string" || !person.name.trim()
        || person.name.length > 200 || typeof person.role !== "string" || !person.role.trim() || person.role.length > 200) throw new Error("Prototype governance directory contains an invalid owner.");
      return Object.freeze({ id: person.id, name: person.name.trim(), role: person.role.trim() });
    });
    if (new Set(result.map(person => person.id)).size !== result.length) throw new Error("Prototype governance directory contains duplicate owner IDs.");
    return Object.freeze(result);
  }
  async function load() {
    if (people.length) return people;
    if (pending) return pending;
    pending = (async () => {
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000);
      try {
        // Static prototype configuration only. Never send the SAP credential here.
        const response = await fetch("data/governance-directory.json", { headers: { Accept: "application/json" }, credentials: "omit", signal: controller.signal });
        if (!response.ok) throw new Error("Directory request failed.");
        people = validate(await response.json()); return people;
      } catch {
        throw new Error("Prototype governance directory unavailable. Open through a local static preview and reload to select a decision owner. Existing saved records are preserved.");
      } finally { clearTimeout(timer); pending = null; }
    })();
    return pending;
  }
  function resolve(id) {
    const person = people.find(person => person.id === id);
    if (!person) throw new Error("Select an eligible Decision Owner from the prototype governance directory in Assessment.");
    return { ...person, source: SOURCE };
  }
  function eligible(review) {
    const person = people.find(person => person.id === review?.decisionOwnerId);
    return !!person && review.decisionOwner === person.name && review.decisionOwnerSnapshot?.id === person.id
      && review.decisionOwnerSnapshot.name === person.name && review.decisionOwnerSnapshot.role === person.role;
  }
  app.services.governanceDirectory = { SOURCE, validate, load, resolve, eligible, people: () => people };
})();

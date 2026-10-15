(() => {
  "use strict";
  const app = window.DPEApp = window.DPEApp || {};
  app.services = app.services || {};
  const SOURCE = "PROTOTYPE GOVERNANCE DIRECTORY";
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
  // Immutable, fictional configuration. Not SAP records or real DPE employees.
  // Normal deferred JS works on file:// as well as static hosting; no fetch/key.
  const configuration = Object.freeze({ schemaVersion: 1, dataType: "prototype-governance-directory",
    disclaimer: "Synthetic governance directory used only for the INFOSYS 704 prototype. These fictional people are not SAP records or real DPE employees.",
    people: validate({ schemaVersion: 1, dataType: "prototype-governance-directory", disclaimer: "Synthetic prototype governance configuration.", people: [
      { id: "GOV-001", name: "Alex Lee", role: "Technology Portfolio Lead" },
      { id: "GOV-002", name: "Morgan Chen", role: "Executive Sponsor" },
      { id: "GOV-003", name: "Taylor Singh", role: "Portfolio Governance Lead" }
    ] }) });
  const people = configuration.people;
  async function load() { return people; }
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
  app.services.governanceDirectory = { SOURCE, configuration, validate, load, resolve, eligible, people: () => people };
})();

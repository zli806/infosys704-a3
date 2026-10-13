(() => {
  "use strict";
  const app = window.DPEApp = window.DPEApp || {};

  // Runtime-only state. Accepted records retain their original SAP identifiers.
  const state = app.state = {
    projects: [], selectedProject: null, projectElements: [], elementsLoaded: false,
    glRecords: [], poRecords: [],
    elementController: null, elementRequestID: 0,
    glController: null, glRequestID: 0,
    poController: null, poRequestID: 0
  };

  state.resetFinancialEvidence = () => {
    state.glRequestID += 1;
    state.glController?.abort();
    state.glController = null;
    state.glRecords = [];
  };
  state.resetProcurementEvidence = () => {
    state.poRequestID += 1;
    state.poController?.abort();
    state.poController = null;
    state.poRecords = [];
  };
  state.resetElementSelection = () => {
    state.elementsLoaded = false;
    state.elementRequestID += 1;
    state.elementController?.abort();
    state.elementController = null;
    state.selectedProject = null;
    state.projectElements = [];
  };
})();

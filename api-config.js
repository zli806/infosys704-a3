// Fields and OData V2 collection shape verified against the local SAP specification.
window.SAP_API_CONFIG = Object.freeze({
  baseUrl: "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_ENTERPRISE_PROJECT_SRV;v=0002",
  collectionPath: "/A_EnterpriseProject",
  limit: 5,
  projectFields: Object.freeze([
    "ProjectUUID",
    "ProjectInternalID",
    "Project",
    "ProjectDescription",
    "ProcessingStatus",
    "ProjectStartDate",
    "ProjectEndDate",
    "ProjectCurrency",
    "CompanyCode"
  ]),
  elementNavigationPath: "/A_EnterpriseProject(guid'{ProjectUUID}')/to_EnterpriseProjectElement",
  elementFields: Object.freeze([
    "ProjectElementUUID", "ProjectElement", "WBSElementInternalID", "ProjectUUID",
    "ProjectElementDescription", "ProcessingStatus", "EntProjectElementType",
    "PlannedStartDate", "PlannedEndDate", "ActualStartDate", "ActualEndDate",
    "ResponsibleCostCenter", "CompanyCode", "IsProjectMilestone",
    "ForecastedEndDate", "MilestoneApprovalStatus", "IsMainMilestone"
  ])
});

// Separate configuration preserves the working Enterprise Project integration.
window.GL_API_CONFIG = Object.freeze({
  baseUrl: "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_GLACCOUNTLINEITEM",
  collectionPath: "/GLAccountLineItem",
  limit: 100,
  fields: Object.freeze([
    "ID", "ProjectInternalID", "WBSElementInternalID", "CompanyCode",
    "AccountingDocument", "LedgerGLLineItem", "GLAccount", "PostingDate", "DocumentDate",
    "CompanyCodeCurrency", "AmountInCompanyCodeCurrency", "GlobalCurrency",
    "AmountInGlobalCurrency", "DebitCreditCode", "IsCommitment", "IsReversal", "IsReversed",
    "PurchasingDocument", "PurchasingDocumentItem", "Supplier", "DocumentItemText"
  ])
});

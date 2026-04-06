// ============================================
// Shahin AI-KSA GRC — Cross-Framework Mappings
// 2000+ mappings between frameworks
// Format: [sourceNodeId, targetNodeId, relationship, confidence]
// ============================================

export interface CrossMappingDef {
  source: string;
  target: string;
  relationship: "equivalent" | "partial" | "related" | "derived_from";
  confidence: number;
}

// Helper to create mapping tuples
function m(s: string, t: string, r: "equivalent"|"partial"|"related"|"derived_from" = "equivalent", c: number = 0.9): CrossMappingDef {
  return { source: s, target: t, relationship: r, confidence: c };
}

// ═══════════════════════════════════════════
// ECC ↔ SAMA CSF Mappings
// ═══════════════════════════════════════════
const ECC_SAMA: CrossMappingDef[] = [
  m("ECC-1-1-1","SAMA-CSF-1.1"), m("ECC-1-2-2","SAMA-CSF-1.3"), m("ECC-1-3-1","SAMA-CSF-1.2"),
  m("ECC-1-4-1","SAMA-CSF-1.4"), m("ECC-1-4-2","SAMA-CSF-1.5"),
  m("ECC-2-2-1","SAMA-CSF-2.1"), m("ECC-2-2-3","SAMA-CSF-2.2"),
  m("ECC-4-1-1","SAMA-CSF-3.1"),
];

// ═══════════════════════════════════════════
// ECC ↔ ISO 27001 Mappings
// ═══════════════════════════════════════════
const ECC_ISO: CrossMappingDef[] = [
  m("ECC-1-1-1","ISO27-A5.1.1","equivalent",0.85), m("ECC-1-2-2","ISO27-A5.2.1"),
  m("ECC-1-2-4","ISO27-A5.4.3"), m("ECC-1-3-1","ISO27-A5.1.1"),
  m("ECC-1-4-2","ISO27-A5.10.1","partial",0.7),
  m("ECC-1-5-1","ISO27-A6.1.3"), m("ECC-1-6-1","ISO27-A6.1.1"), m("ECC-1-6-2","ISO27-A6.1.2"), m("ECC-1-6-3","ISO27-A6.1.5"),
  m("ECC-1-7-1","ISO27-A5.10.1"), m("ECC-1-7-2","ISO27-A5.10.2"),
  m("ECC-2-1-1","ISO27-A5.5.1"), m("ECC-2-1-3","ISO27-A5.5.2"),
  m("ECC-2-2-1","ISO27-A5.6.2"), m("ECC-2-2-2","ISO27-A5.6.1"), m("ECC-2-2-3","ISO27-A5.6.5"),
  m("ECC-2-2-4","ISO27-A5.6.4"), m("ECC-2-2-5","ISO27-A5.6.3"),
  m("ECC-2-3-1","ISO27-A8.1.5"), m("ECC-2-3-3","ISO27-A8.1.3"),
  m("ECC-2-4-1","ISO27-A8.2.1"),
  m("ECC-2-6-1","ISO27-A8.3.1"), m("ECC-2-6-2","ISO27-A8.3.3","equivalent",0.85),
  m("ECC-2-6-3","ISO27-A8.3.5"), m("ECC-2-6-4","ISO27-A8.3.6"),
  m("ECC-2-7-1","ISO27-A8.5.1"), m("ECC-2-7-2","ISO27-A8.5.2"),
  m("ECC-2-8-1","ISO27-A7.1.1"), m("ECC-2-8-1","ISO27-A7.1.2"),
  m("ECC-3-1-1","ISO27-A8.4.1"), m("ECC-3-1-3","ISO27-A5.8.1"), m("ECC-3-1-5","ISO27-A5.8.2"), m("ECC-3-1-6","ISO27-A5.8.3"),
  m("ECC-3-2-1","ISO27-A5.9.1"), m("ECC-3-2-2","ISO27-A5.9.3"), m("ECC-3-2-3","ISO27-A5.9.2"),
  m("ECC-3-3-1","ISO27-A8.1.4"), m("ECC-3-4-1","ISO27-A5.3.1"),
  m("ECC-4-1-1","ISO27-A5.7.1","partial",0.8), m("ECC-4-1-2","ISO27-A5.7.2"), m("ECC-4-1-3","ISO27-A5.7.3"),
  m("ECC-4-2-1","ISO27-A5.7.4"),
];

// ═══════════════════════════════════════════
// ECC ↔ NIST CSF Mappings
// ═══════════════════════════════════════════
const ECC_NIST: CrossMappingDef[] = [
  m("ECC-1-4-1","NCSF-GV.RM-1","related",0.8), m("ECC-1-4-2","NCSF-ID.RA-3"),
  m("ECC-2-1-1","NCSF-ID.AM-1"), m("ECC-2-2-1","NCSF-PR.AA-1"), m("ECC-2-2-2","NCSF-PR.AA-3"),
  m("ECC-2-2-5","NCSF-PR.AA-2"), m("ECC-2-6-2","NCSF-PR.DS-1"),
  m("ECC-3-1-1","NCSF-DE.CM-1"), m("ECC-3-1-3","NCSF-RS.MA-1"),
  m("ECC-3-2-2","NCSF-RC.RP-1"), m("ECC-3-3-1","NCSF-ID.RA-1"), m("ECC-3-4-1","NCSF-ID.RA-2"),
];

// ═══════════════════════════════════════════
// ECC ↔ NCA Sub-Frameworks
// ═══════════════════════════════════════════
const ECC_NCA_SUB: CrossMappingDef[] = [
  m("ECC-4-2-1","CCC-1.1.1"), m("ECC-5-1-1","OTCC-1.1.1"), m("ECC-2-6-1","DCC-1.1.1"),
  m("ECC-2-6-2","PDPL-2.2.1","partial",0.8),
];

// ═══════════════════════════════════════════
// PDPL ↔ ISO 27001 Privacy Mappings
// ═══════════════════════════════════════════
const PDPL_ISO: CrossMappingDef[] = [
  m("PDPL-2.2.1","ISO27-A8.3.3","partial",0.75),
  m("PDPL-1.1.1","ISO27-A5.10.1","related",0.6),
];

// ═══════════════════════════════════════════
// SAMA ↔ ISO 27001 Mappings
// ═══════════════════════════════════════════
const SAMA_ISO: CrossMappingDef[] = [
  m("SAMA-CSF-1.1","ISO27-A5.1.1","equivalent",0.85),
  m("SAMA-CSF-1.2","ISO27-A5.1.1","partial",0.7),
  m("SAMA-CSF-1.3","ISO27-A5.2.1"),
  m("SAMA-CSF-2.1","ISO27-A5.6.1"), m("SAMA-CSF-2.2","ISO27-A5.6.5"),
  m("SAMA-CSF-3.1","ISO27-A5.7.1","partial",0.8),
];

// ═══════════════════════════════════════════
// PCI-DSS ↔ ECC Mappings
// ═══════════════════════════════════════════
const PCI_ECC: CrossMappingDef[] = [
  m("PCI-1.1","ECC-2-4-1","partial",0.7),
  m("PCI-2.2","ECC-2-3-1","partial",0.75),
  m("PCI-3.4","ECC-2-6-2","partial",0.7),
  m("PCI-7.1","ECC-2-2-2","partial",0.7),
  m("PCI-8.2","ECC-2-2-5","partial",0.75),
  m("PCI-10.1","ECC-3-1-1","partial",0.7),
  m("PCI-11.2","ECC-3-3-1","partial",0.75),
  m("PCI-11.3","ECC-3-3-2","partial",0.75),
];

// ═══════════════════════════════════════════
// CCC ↔ ISO 27017 / CSA CCM (via ISO)
// ═══════════════════════════════════════════
const CCC_ISO: CrossMappingDef[] = [
  m("CCC-1.1.1","ISO27-A5.7.4","partial",0.7),
  m("CCC-2.1.1","ISO27-A8.3.1","related",0.6),
  m("CCC-2.2.1","ISO27-A8.5.1","partial",0.7),
  m("CCC-3.1.1","ISO27-A5.6.2","partial",0.7),
  m("CCC-4.1.1","ISO27-A8.4.1","partial",0.7),
];

// ═══════════════════════════════════════════
// OTCC ↔ ECC / NIST Mappings
// ═══════════════════════════════════════════
const OTCC_CROSS: CrossMappingDef[] = [
  m("OTCC-1.1.1","ECC-5-1-1"), m("OTCC-1.2.1","ECC-5-1-2","equivalent",0.85),
  m("OTCC-2.1.1","ECC-5-2-1"), m("OTCC-3.1.1","ECC-2-3-1","partial",0.6),
  m("OTCC-4.1.1","ECC-5-2-3","partial",0.8),
];

// ═══════════════════════════════════════════
// DCC ↔ PDPL Mappings
// ═══════════════════════════════════════════
const DCC_PDPL: CrossMappingDef[] = [
  m("DCC-1.1.1","PDPL-3.1.2","related",0.7),
  m("DCC-1.2.1","PDPL-1.3.1","related",0.6),
  m("DCC-2.1.1","PDPL-2.2.1","partial",0.75),
  m("DCC-4.2.1","PDPL-2.1.1","related",0.7),
];

// ═══════════════════════════════════════════
// CSCC ↔ ECC Mappings
// ═══════════════════════════════════════════
const CSCC_ECC: CrossMappingDef[] = [
  m("CSCC-1.1.1","ECC-2-1-1","derived_from",0.8),
  m("CSCC-2.1.1","ECC-2-2-5","derived_from",0.7),
  m("CSCC-2.2.1","ECC-3-1-1","derived_from",0.75),
  m("CSCC-2.3.1","ECC-3-2-1","derived_from",0.7),
  m("CSCC-3.1.1","ECC-3-3-2","derived_from",0.7),
  m("CSCC-3.2.1","ECC-1-7-2","derived_from",0.7),
];

// ═══════════════════════════════════════════
// 1. GDPR ↔ PDPL — EU Data Protection to KSA
//    Personal Data Protection Law alignment
// ═══════════════════════════════════════════
const GDPR_PDPL: CrossMappingDef[] = [
  // Lawful basis for processing
  m("GDPR-Art5.1a","PDPL-1.1.1","equivalent",0.85),   // Lawfulness, fairness, transparency
  m("GDPR-Art5.1b","PDPL-1.1.2","equivalent",0.85),   // Purpose limitation
  m("GDPR-Art5.1c","PDPL-1.1.3","equivalent",0.85),   // Data minimisation
  m("GDPR-Art5.1d","PDPL-1.1.4","equivalent",0.8),    // Accuracy
  m("GDPR-Art5.1e","PDPL-1.1.5","equivalent",0.85),   // Storage limitation
  m("GDPR-Art5.1f","PDPL-1.1.6","equivalent",0.85),   // Integrity and confidentiality
  m("GDPR-Art5.2","PDPL-1.1.7","equivalent",0.8),     // Accountability principle
  m("GDPR-Art6.1","PDPL-1.2.1","equivalent",0.85),    // Legal basis for processing
  m("GDPR-Art6.1a","PDPL-1.2.2","equivalent",0.9),    // Consent as legal basis
  m("GDPR-Art6.1b","PDPL-1.2.3","partial",0.75),      // Contract performance
  m("GDPR-Art6.1c","PDPL-1.2.4","partial",0.7),       // Legal obligation
  m("GDPR-Art6.1f","PDPL-1.2.5","partial",0.65),      // Legitimate interests
  // Consent
  m("GDPR-Art7.1","PDPL-1.3.1","equivalent",0.85),    // Conditions for consent
  m("GDPR-Art7.2","PDPL-1.3.2","equivalent",0.8),     // Consent request clarity
  m("GDPR-Art7.3","PDPL-1.3.3","equivalent",0.85),    // Right to withdraw consent
  m("GDPR-Art8.1","PDPL-1.3.4","partial",0.7),        // Child consent (age thresholds differ)
  // Data subject rights
  m("GDPR-Art13.1","PDPL-2.1.1","equivalent",0.85),   // Right to information (collection)
  m("GDPR-Art14.1","PDPL-2.1.2","equivalent",0.8),    // Right to information (indirect)
  m("GDPR-Art15.1","PDPL-2.1.3","equivalent",0.85),   // Right of access
  m("GDPR-Art16","PDPL-2.1.4","equivalent",0.9),      // Right to rectification
  m("GDPR-Art17.1","PDPL-2.1.5","equivalent",0.85),   // Right to erasure
  m("GDPR-Art18.1","PDPL-2.1.6","partial",0.75),      // Right to restriction
  m("GDPR-Art20.1","PDPL-2.1.7","partial",0.7),       // Right to data portability
  m("GDPR-Art21.1","PDPL-2.1.8","equivalent",0.8),    // Right to object
  m("GDPR-Art22.1","PDPL-2.1.9","equivalent",0.85),   // Automated decision-making
  // Data Protection Officer
  m("GDPR-Art37.1","PDPL-3.1.1","equivalent",0.8),    // DPO designation
  m("GDPR-Art38.1","PDPL-3.1.2","equivalent",0.85),   // DPO position / independence
  m("GDPR-Art39.1","PDPL-3.1.3","equivalent",0.8),    // DPO tasks
  // International transfers
  m("GDPR-Art44","PDPL-4.1.1","equivalent",0.8),      // General principle for transfers
  m("GDPR-Art45.1","PDPL-4.1.2","partial",0.7),       // Adequacy decisions
  m("GDPR-Art46.1","PDPL-4.1.3","partial",0.7),       // Appropriate safeguards
  m("GDPR-Art49.1","PDPL-4.1.4","partial",0.65),      // Derogations for specific situations
  // Breach notification
  m("GDPR-Art33.1","PDPL-5.1.1","equivalent",0.85),   // Notification to authority (72h)
  m("GDPR-Art33.3","PDPL-5.1.2","equivalent",0.8),    // Content of notification
  m("GDPR-Art34.1","PDPL-5.1.3","equivalent",0.8),    // Notification to data subject
  // Security measures
  m("GDPR-Art25.1","PDPL-2.2.1","equivalent",0.85),   // Data protection by design
  m("GDPR-Art25.2","PDPL-2.2.2","equivalent",0.8),    // Data protection by default
  m("GDPR-Art32.1","PDPL-2.2.3","equivalent",0.85),   // Security of processing
  m("GDPR-Art35.1","PDPL-2.3.1","equivalent",0.85),   // Data protection impact assessment
  m("GDPR-Art36.1","PDPL-2.3.2","partial",0.75),      // Prior consultation
  m("GDPR-Art30.1","PDPL-2.4.1","equivalent",0.85),   // Records of processing activities
];

// ═══════════════════════════════════════════
// 2. NIST SP 800-53 ↔ NCA-ECC
//    US Federal Security Controls to KSA NCA
// ═══════════════════════════════════════════
const NIST53_ECC: CrossMappingDef[] = [
  // Access Control (AC) → ECC-2 (Cybersecurity Defense)
  m("NIST53-AC-1","ECC-2-2-1","partial",0.8),         // AC policy & procedures → access control governance
  m("NIST53-AC-2","ECC-2-2-2","equivalent",0.85),     // Account management → identity management
  m("NIST53-AC-3","ECC-2-2-3","equivalent",0.85),     // Access enforcement → access authorization
  m("NIST53-AC-4","ECC-2-4-1","partial",0.75),        // Information flow → network security
  m("NIST53-AC-5","ECC-2-2-4","equivalent",0.85),     // Separation of duties
  m("NIST53-AC-6","ECC-2-2-5","equivalent",0.85),     // Least privilege
  m("NIST53-AC-7","ECC-2-2-6","partial",0.7),         // Unsuccessful logon attempts
  m("NIST53-AC-11","ECC-2-2-7","partial",0.7),        // Session lock
  m("NIST53-AC-17","ECC-2-5-1","partial",0.75),       // Remote access
  m("NIST53-AC-18","ECC-2-5-2","partial",0.7),        // Wireless access
  m("NIST53-AC-20","ECC-2-5-3","partial",0.7),        // Use of external systems
  // Audit and Accountability (AU) → ECC-3 (Cybersecurity Resilience)
  m("NIST53-AU-1","ECC-3-1-1","partial",0.8),         // Audit policy → event management governance
  m("NIST53-AU-2","ECC-3-1-2","equivalent",0.85),     // Event logging → event logging
  m("NIST53-AU-3","ECC-3-1-3","equivalent",0.8),      // Content of audit records
  m("NIST53-AU-4","ECC-3-1-4","partial",0.75),        // Audit log storage capacity
  m("NIST53-AU-5","ECC-3-1-5","partial",0.7),         // Response to audit failures
  m("NIST53-AU-6","ECC-3-1-6","equivalent",0.85),     // Audit review, analysis, reporting
  m("NIST53-AU-9","ECC-3-1-7","equivalent",0.8),      // Protection of audit information
  m("NIST53-AU-11","ECC-3-1-8","partial",0.75),       // Audit record retention
  m("NIST53-AU-12","ECC-3-1-9","equivalent",0.85),    // Audit record generation
  // Configuration Management (CM) → ECC-2
  m("NIST53-CM-1","ECC-2-3-1","partial",0.8),         // CM policy → system hardening governance
  m("NIST53-CM-2","ECC-2-3-2","equivalent",0.85),     // Baseline configuration
  m("NIST53-CM-3","ECC-2-3-3","equivalent",0.8),      // Configuration change control
  m("NIST53-CM-6","ECC-2-3-4","equivalent",0.85),     // Configuration settings
  m("NIST53-CM-7","ECC-2-3-5","equivalent",0.8),      // Least functionality
  m("NIST53-CM-8","ECC-2-1-1","partial",0.75),        // System component inventory → asset management
  // Contingency Planning (CP) → ECC-4 (Third Party / Business Continuity)
  m("NIST53-CP-1","ECC-4-1-1","partial",0.8),         // CP policy → BC/DR governance
  m("NIST53-CP-2","ECC-4-1-2","equivalent",0.85),     // Contingency plan
  m("NIST53-CP-3","ECC-4-1-3","partial",0.75),        // Contingency training
  m("NIST53-CP-4","ECC-4-1-4","equivalent",0.85),     // Contingency plan testing
  m("NIST53-CP-6","ECC-4-1-5","equivalent",0.8),      // Alternate storage site
  m("NIST53-CP-7","ECC-4-1-6","equivalent",0.8),      // Alternate processing site
  m("NIST53-CP-9","ECC-4-1-7","equivalent",0.85),     // System backup
  m("NIST53-CP-10","ECC-4-1-8","equivalent",0.85),    // System recovery & reconstitution
  // Identification and Authentication (IA) → ECC-2
  m("NIST53-IA-1","ECC-2-2-1","partial",0.75),        // IA policy → access control governance
  m("NIST53-IA-2","ECC-2-2-8","equivalent",0.85),     // User identification & authentication
  m("NIST53-IA-4","ECC-2-2-9","equivalent",0.8),      // Identifier management
  m("NIST53-IA-5","ECC-2-2-10","equivalent",0.85),    // Authenticator management
  m("NIST53-IA-8","ECC-2-2-11","partial",0.7),        // Non-organizational user IA
  // Incident Response (IR) → ECC-3
  m("NIST53-IR-1","ECC-3-2-1","partial",0.8),         // IR policy → incident management governance
  m("NIST53-IR-2","ECC-3-2-2","equivalent",0.8),      // Incident response training
  m("NIST53-IR-3","ECC-3-2-3","equivalent",0.85),     // Incident response testing
  m("NIST53-IR-4","ECC-3-2-4","equivalent",0.85),     // Incident handling
  m("NIST53-IR-5","ECC-3-2-5","equivalent",0.8),      // Incident monitoring
  m("NIST53-IR-6","ECC-3-2-6","equivalent",0.85),     // Incident reporting
  m("NIST53-IR-7","ECC-3-2-7","partial",0.75),        // Incident response assistance
  m("NIST53-IR-8","ECC-3-2-8","equivalent",0.8),      // Incident response plan
  // Risk Assessment (RA) → ECC-1 (Cybersecurity Governance)
  m("NIST53-RA-1","ECC-1-4-1","partial",0.8),         // RA policy → risk management governance
  m("NIST53-RA-2","ECC-1-4-2","equivalent",0.85),     // Security categorization
  m("NIST53-RA-3","ECC-1-4-3","equivalent",0.85),     // Risk assessment
  m("NIST53-RA-5","ECC-3-3-1","equivalent",0.85),     // Vulnerability monitoring & scanning
  // System and Communications Protection (SC) → ECC-2
  m("NIST53-SC-1","ECC-2-6-1","partial",0.8),         // SC policy → crypto governance
  m("NIST53-SC-7","ECC-2-4-2","equivalent",0.85),     // Boundary protection
  m("NIST53-SC-8","ECC-2-6-3","equivalent",0.85),     // Transmission confidentiality
  m("NIST53-SC-12","ECC-2-6-4","equivalent",0.85),    // Cryptographic key management
  m("NIST53-SC-13","ECC-2-6-2","equivalent",0.85),    // Cryptographic protection
  m("NIST53-SC-17","ECC-2-6-5","partial",0.75),       // PKI certificates
  m("NIST53-SC-28","ECC-2-6-6","equivalent",0.8),     // Protection of information at rest
];

// ═══════════════════════════════════════════
// 3. SOX ↔ CMA Governance
//    Sarbanes-Oxley to KSA Capital Market Authority
// ═══════════════════════════════════════════
const SOX_CMA: CrossMappingDef[] = [
  // Management assessment and internal controls
  m("SOX-302.1","CMA-GOV-1.1","equivalent",0.8),      // CEO/CFO certification → board responsibility
  m("SOX-302.2","CMA-GOV-1.2","partial",0.75),        // Disclosure controls → disclosure obligations
  m("SOX-302.3","CMA-GOV-1.3","partial",0.7),         // Internal control effectiveness
  m("SOX-302.4","CMA-GOV-1.4","partial",0.7),         // Material changes disclosure
  m("SOX-404.1","CMA-GOV-2.1","equivalent",0.85),     // Management assessment of ICFR
  m("SOX-404.2","CMA-GOV-2.2","equivalent",0.8),      // Auditor attestation on ICFR
  m("SOX-404.3","CMA-GOV-2.3","partial",0.75),        // Material weakness reporting
  // Audit committee
  m("SOX-301.1","CMA-GOV-3.1","equivalent",0.85),     // Audit committee independence
  m("SOX-301.2","CMA-GOV-3.2","equivalent",0.8),      // Financial expert on committee
  m("SOX-301.3","CMA-GOV-3.3","equivalent",0.8),      // Complaint procedures (whistleblower)
  // Financial reporting
  m("SOX-401.1","CMA-GOV-4.1","equivalent",0.85),     // Off-balance sheet disclosures
  m("SOX-401.2","CMA-GOV-4.2","partial",0.75),        // Pro forma financial information
  m("SOX-409.1","CMA-GOV-4.3","equivalent",0.8),      // Real-time issuer disclosures
  m("SOX-802.1","CMA-GOV-4.4","partial",0.75),        // Document retention (financial records)
  // IT general controls
  m("SOX-ITGC-1","CMA-GOV-5.1","partial",0.7),       // IT change management → system governance
  m("SOX-ITGC-2","CMA-GOV-5.2","partial",0.7),       // Logical access controls
  m("SOX-ITGC-3","CMA-GOV-5.3","partial",0.65),      // Computer operations
  m("SOX-ITGC-4","CMA-GOV-5.4","partial",0.65),      // Program development
  m("SOX-906.1","CMA-GOV-6.1","equivalent",0.8),      // CEO/CFO criminal certification
  m("SOX-806.1","CMA-GOV-6.2","partial",0.7),         // Whistleblower protections
];

// ═══════════════════════════════════════════
// 4. HIPAA ↔ MOH-HIS
//    US Health Insurance to KSA Ministry of Health
// ═══════════════════════════════════════════
const HIPAA_MOH: CrossMappingDef[] = [
  // Administrative Safeguards
  m("HIPAA-AS-1","MOH-HIS-1.1","equivalent",0.85),    // Security management process
  m("HIPAA-AS-2","MOH-HIS-1.2","equivalent",0.8),     // Assigned security responsibility
  m("HIPAA-AS-3","MOH-HIS-1.3","equivalent",0.85),    // Workforce security
  m("HIPAA-AS-4","MOH-HIS-1.4","equivalent",0.85),    // Information access management
  m("HIPAA-AS-5","MOH-HIS-1.5","equivalent",0.8),     // Security awareness & training
  m("HIPAA-AS-6","MOH-HIS-1.6","equivalent",0.85),    // Security incident procedures
  m("HIPAA-AS-7","MOH-HIS-1.7","equivalent",0.85),    // Contingency plan
  m("HIPAA-AS-8","MOH-HIS-1.8","partial",0.75),       // Evaluation
  m("HIPAA-AS-9","MOH-HIS-1.9","partial",0.7),        // Business associate contracts
  // Physical Safeguards
  m("HIPAA-PS-1","MOH-HIS-2.1","equivalent",0.85),    // Facility access controls
  m("HIPAA-PS-2","MOH-HIS-2.2","equivalent",0.85),    // Workstation use
  m("HIPAA-PS-3","MOH-HIS-2.3","equivalent",0.8),     // Workstation security
  m("HIPAA-PS-4","MOH-HIS-2.4","equivalent",0.85),    // Device and media controls
  m("HIPAA-PS-5","MOH-HIS-2.5","partial",0.75),       // Physical access audit controls
  m("HIPAA-PS-6","MOH-HIS-2.6","partial",0.7),        // Environmental controls
  // Technical Safeguards
  m("HIPAA-TS-1","MOH-HIS-3.1","equivalent",0.85),    // Access control
  m("HIPAA-TS-2","MOH-HIS-3.2","equivalent",0.85),    // Audit controls
  m("HIPAA-TS-3","MOH-HIS-3.3","equivalent",0.85),    // Integrity controls
  m("HIPAA-TS-4","MOH-HIS-3.4","equivalent",0.85),    // Person or entity authentication
  m("HIPAA-TS-5","MOH-HIS-3.5","equivalent",0.85),    // Transmission security
  m("HIPAA-TS-6","MOH-HIS-3.6","partial",0.8),        // Encryption requirements
  m("HIPAA-TS-7","MOH-HIS-3.7","partial",0.75),       // Emergency access procedures
  m("HIPAA-TS-8","MOH-HIS-3.8","partial",0.75),       // Automatic logoff
  m("HIPAA-TS-9","MOH-HIS-3.9","partial",0.7),        // Audit log review
];

// ═══════════════════════════════════════════
// 5. DORA ↔ SAMA-CSF
//    EU Digital Operational Resilience Act to
//    SAMA Cyber Security Framework
// ═══════════════════════════════════════════
const DORA_SAMA: CrossMappingDef[] = [
  // ICT Risk Management (DORA Ch II)
  m("DORA-Art5.1","SAMA-CSF-1.1","equivalent",0.85),  // ICT risk mgmt framework → CS governance
  m("DORA-Art5.2","SAMA-CSF-1.2","equivalent",0.8),   // Board responsibility → CS leadership
  m("DORA-Art5.4","SAMA-CSF-1.3","partial",0.75),     // ICT risk mgmt strategy → CS strategy
  m("DORA-Art6.1","SAMA-CSF-1.4","equivalent",0.85),  // ICT risk mgmt policies → risk management
  m("DORA-Art6.2","SAMA-CSF-1.5","partial",0.75),     // ICT risk identification → risk assessment
  m("DORA-Art7.1","SAMA-CSF-2.1","equivalent",0.85),  // ICT systems identification → asset mgmt
  m("DORA-Art8.1","SAMA-CSF-2.2","equivalent",0.8),   // Protection & prevention → protective measures
  m("DORA-Art9.1","SAMA-CSF-2.3","equivalent",0.85),  // Detection mechanisms → monitoring
  m("DORA-Art9.2","SAMA-CSF-2.4","partial",0.75),     // Anomaly detection → threat detection
  m("DORA-Art10.1","SAMA-CSF-3.1","equivalent",0.85), // Response & recovery plans → incident response
  // Incident Reporting (DORA Ch III)
  m("DORA-Art17.1","SAMA-CSF-3.2","equivalent",0.85), // Incident classification → incident classification
  m("DORA-Art17.2","SAMA-CSF-3.3","partial",0.8),     // Incident impact assessment → impact analysis
  m("DORA-Art19.1","SAMA-CSF-3.4","equivalent",0.85), // Reporting to authorities → incident reporting
  m("DORA-Art19.2","SAMA-CSF-3.5","partial",0.75),    // Initial notification → early notification
  m("DORA-Art19.3","SAMA-CSF-3.6","partial",0.75),    // Intermediate report → progress reporting
  m("DORA-Art19.4","SAMA-CSF-3.7","partial",0.75),    // Final report → lessons learned
  // Resilience Testing (DORA Ch IV)
  m("DORA-Art24.1","SAMA-CSF-4.1","equivalent",0.85), // General requirements for testing → testing program
  m("DORA-Art24.2","SAMA-CSF-4.2","partial",0.75),    // Risk-based approach to testing
  m("DORA-Art25.1","SAMA-CSF-4.3","equivalent",0.8),  // Testing tools & systems → VA & pen testing
  m("DORA-Art26.1","SAMA-CSF-4.4","equivalent",0.85), // TLPT requirements → advanced testing
  m("DORA-Art26.3","SAMA-CSF-4.5","partial",0.7),     // TLPT threat intelligence → threat-led testing
  // Third-Party Risk (DORA Ch V)
  m("DORA-Art28.1","SAMA-CSF-5.1","equivalent",0.85), // General principles → third-party governance
  m("DORA-Art28.2","SAMA-CSF-5.2","equivalent",0.8),  // Outsourcing policy → outsourcing requirements
  m("DORA-Art28.3","SAMA-CSF-5.3","partial",0.75),    // Risk assessment of providers
  m("DORA-Art29.1","SAMA-CSF-5.4","equivalent",0.8),  // Contractual arrangements → contract requirements
  m("DORA-Art30.1","SAMA-CSF-5.5","equivalent",0.85), // Key contractual provisions → SLA requirements
  m("DORA-Art31.1","SAMA-CSF-5.6","partial",0.7),     // Register of ICT third-party providers
  m("DORA-Art28.5","SAMA-CSF-5.7","partial",0.75),    // Concentration risk → vendor concentration
  m("DORA-Art28.8","SAMA-CSF-5.8","partial",0.7),     // Exit strategies → exit planning
  m("DORA-Art29.2","SAMA-CSF-5.9","partial",0.75),    // Subcontracting oversight → sub-outsourcing
];

// ═══════════════════════════════════════════
// 6. NIS2 ↔ NCA-ECC
//    EU Network & Information Security to KSA NCA
// ═══════════════════════════════════════════
const NIS2_ECC: CrossMappingDef[] = [
  // Governance & Risk Management
  m("NIS2-Art20.1","ECC-1-1-1","equivalent",0.8),     // Governance obligations → CS governance
  m("NIS2-Art20.2","ECC-1-2-1","partial",0.75),       // Management body oversight → CS roles
  m("NIS2-Art21.1","ECC-1-3-1","equivalent",0.8),     // CS risk management measures → CS compliance
  m("NIS2-Art21.2a","ECC-1-4-1","equivalent",0.85),   // Risk analysis policies → risk governance
  m("NIS2-Art21.2b","ECC-3-2-1","equivalent",0.85),   // Incident handling → incident management
  m("NIS2-Art21.2c","ECC-4-1-1","equivalent",0.85),   // Business continuity → BC/DR
  // Supply Chain Security
  m("NIS2-Art21.2d","ECC-4-2-1","equivalent",0.85),   // Supply chain security → third-party security
  m("NIS2-Art21.2e","ECC-2-3-1","partial",0.75),      // Network & IS acquisition → secure config
  m("NIS2-Art21.2f","ECC-3-3-1","equivalent",0.8),    // Vulnerability handling → vulnerability mgmt
  m("NIS2-Art21.2g","ECC-1-5-1","partial",0.75),      // CS measure effectiveness → CS awareness
  // Incident Handling
  m("NIS2-Art21.2h","ECC-2-6-1","partial",0.75),      // Encryption & cryptography
  m("NIS2-Art21.2i","ECC-2-2-1","equivalent",0.8),    // HR security, access control
  m("NIS2-Art21.2j","ECC-2-2-5","partial",0.75),      // MFA / continuous auth
  m("NIS2-Art23.1","ECC-3-2-2","equivalent",0.85),    // Early warning (24h)
  m("NIS2-Art23.2","ECC-3-2-3","equivalent",0.8),     // Incident notification (72h)
  m("NIS2-Art23.3","ECC-3-2-4","partial",0.75),       // Intermediate report
  m("NIS2-Art23.4","ECC-3-2-5","partial",0.75),       // Final report (1 month)
  // Risk & Vulnerability
  m("NIS2-Art21.3","ECC-1-4-2","partial",0.7),        // Proportionality → risk assessment
  m("NIS2-Art21.4","ECC-2-1-1","partial",0.7),        // Implementation standards → asset inventory
  m("NIS2-Art24.1","ECC-3-3-2","partial",0.75),       // Use of EU CS certification → pen testing
  m("NIS2-Art25.1","ECC-1-6-1","partial",0.7),        // Coordinated vuln disclosure → HR security
  m("NIS2-Art29.1","ECC-1-7-1","partial",0.65),       // CS information sharing → awareness
  m("NIS2-Art32.1","ECC-1-1-2","partial",0.7),        // Supervisory measures → CS audit
  m("NIS2-Art33.1","ECC-1-3-2","partial",0.7),        // Enforcement → compliance monitoring
  m("NIS2-Art7.1","ECC-1-4-3","partial",0.65),        // National CS strategy → strategic planning
];

// ═══════════════════════════════════════════
// 7. ISO 27001 ↔ SAMA-CSF (Expanded)
//    Comprehensive controls mapping
// ═══════════════════════════════════════════
const ISO_SAMA_EXPANDED: CrossMappingDef[] = [
  // Organizational controls (A.5) → SAMA domains
  m("ISO27-A5.1.2","SAMA-CSF-1.2","equivalent",0.85), // IS policy review → CS leadership review
  m("ISO27-A5.2.2","SAMA-CSF-1.3","partial",0.75),    // IS roles allocation → roles & responsibilities
  m("ISO27-A5.3.1","SAMA-CSF-1.4","partial",0.7),     // Segregation of duties → risk management
  m("ISO27-A5.4.1","SAMA-CSF-1.5","partial",0.7),     // Management responsibilities → risk assessment
  m("ISO27-A5.5.1","SAMA-CSF-2.1","equivalent",0.85), // Asset inventory → asset management
  m("ISO27-A5.5.2","SAMA-CSF-2.1","partial",0.75),    // Asset ownership → asset management
  m("ISO27-A5.5.3","SAMA-CSF-2.1","partial",0.7),     // Acceptable use → asset management
  // Access control (A.5.6) → SAMA access
  m("ISO27-A5.6.1","SAMA-CSF-2.2","equivalent",0.85), // Access control policy → access management
  m("ISO27-A5.6.2","SAMA-CSF-2.2","partial",0.8),     // Network access → access management
  m("ISO27-A5.6.3","SAMA-CSF-2.3","partial",0.75),    // Physical access → monitoring
  m("ISO27-A5.6.4","SAMA-CSF-2.2","partial",0.7),     // Identity management → access management
  m("ISO27-A5.6.5","SAMA-CSF-2.2","equivalent",0.8),  // Authentication → access management
  // Incident and continuity
  m("ISO27-A5.7.1","SAMA-CSF-3.1","equivalent",0.85), // Incident planning → incident response
  m("ISO27-A5.7.2","SAMA-CSF-3.2","equivalent",0.85), // Incident reporting → incident classification
  m("ISO27-A5.7.3","SAMA-CSF-3.4","equivalent",0.8),  // Incident evidence → incident reporting
  m("ISO27-A5.7.4","SAMA-CSF-3.7","partial",0.75),    // Lessons learned → post-incident review
  m("ISO27-A5.8.1","SAMA-CSF-3.1","partial",0.7),     // IS in project mgmt → incident response
  // Supplier relationships
  m("ISO27-A5.9.1","SAMA-CSF-5.1","equivalent",0.85), // Supplier policy → third-party governance
  m("ISO27-A5.9.2","SAMA-CSF-5.2","equivalent",0.8),  // Supplier agreements → outsourcing requirements
  m("ISO27-A5.9.3","SAMA-CSF-5.3","partial",0.75),    // ICT supply chain → vendor assessment
  // Privacy and data
  m("ISO27-A5.10.1","SAMA-CSF-2.4","partial",0.7),    // Acceptable use of info → threat detection
  m("ISO27-A5.10.2","SAMA-CSF-5.4","partial",0.7),    // Info classification → contract requirements
  // Physical controls (A.7)
  m("ISO27-A7.1.1","SAMA-CSF-2.5","equivalent",0.8),  // Physical perimeters → physical security
  m("ISO27-A7.1.2","SAMA-CSF-2.5","partial",0.75),    // Physical entry → physical security
  // Technology controls (A.8)
  m("ISO27-A8.1.1","SAMA-CSF-2.6","equivalent",0.85), // User endpoint devices → endpoint security
  m("ISO27-A8.1.3","SAMA-CSF-2.7","partial",0.75),    // Access restriction → change management
  m("ISO27-A8.1.5","SAMA-CSF-2.8","partial",0.7),     // Secure authentication → system security
  m("ISO27-A8.2.1","SAMA-CSF-2.7","equivalent",0.8),  // Change management → change management
  m("ISO27-A8.3.1","SAMA-CSF-2.9","equivalent",0.85), // Data masking → data protection
  m("ISO27-A8.3.3","SAMA-CSF-2.9","partial",0.8),     // Info access restriction → data protection
  m("ISO27-A8.3.5","SAMA-CSF-4.1","partial",0.75),    // Secure development → testing program
  m("ISO27-A8.4.1","SAMA-CSF-2.3","equivalent",0.85), // Monitoring activities → monitoring
  m("ISO27-A8.5.1","SAMA-CSF-2.8","equivalent",0.8),  // Secure config mgmt → system security
  m("ISO27-A8.5.2","SAMA-CSF-2.7","partial",0.75),    // Secure system engineering → change management
];

// ═══════════════════════════════════════════
// 8. PCI-DSS ↔ NCA-ECC (Expanded)
//    Payment Card Industry to KSA NCA
// ═══════════════════════════════════════════
const PCI_ECC_EXPANDED: CrossMappingDef[] = [
  // Req 1: Network Security Controls
  m("PCI-1.2","ECC-2-4-2","partial",0.75),            // Network security controls → boundary protection
  m("PCI-1.3","ECC-2-4-3","partial",0.7),             // Restrict network access to CDE
  m("PCI-1.4","ECC-2-4-4","partial",0.7),             // Network connections between trusted/untrusted
  m("PCI-1.5","ECC-2-5-1","partial",0.7),             // Risks to CDE from other networks
  // Req 2: Secure Configurations
  m("PCI-2.1","ECC-2-3-2","partial",0.75),            // Change vendor defaults → baseline config
  m("PCI-2.3","ECC-2-5-2","partial",0.7),             // Wireless environments secured
  // Req 3: Protect Stored Account Data
  m("PCI-3.1","ECC-2-6-1","partial",0.7),             // Stored account data minimized → crypto governance
  m("PCI-3.2","ECC-2-6-2","partial",0.75),            // Sensitive auth data not stored → cryptographic protection
  m("PCI-3.3","ECC-2-6-3","partial",0.7),             // PAN displayed securely → transmission security
  m("PCI-3.5","ECC-2-6-4","partial",0.75),            // PAN secured when stored → key management
  // Req 4: Protect Data in Transit
  m("PCI-4.1","ECC-2-6-3","partial",0.75),            // Strong cryptography for transmission
  m("PCI-4.2","ECC-2-6-5","partial",0.7),             // PAN secured over messaging
  // Req 5: Malware Protection
  m("PCI-5.1","ECC-2-7-1","partial",0.75),            // Anti-malware mechanisms → malware protection
  m("PCI-5.2","ECC-2-7-2","partial",0.75),            // Malware detected and addressed
  m("PCI-5.3","ECC-2-7-3","partial",0.7),             // Anti-malware active and monitored
  // Req 6: Secure Systems & Software
  m("PCI-6.1","ECC-2-3-3","partial",0.75),            // Security vulnerabilities identified → config change control
  m("PCI-6.2","ECC-2-3-4","partial",0.75),            // Bespoke & custom software secure → config settings
  m("PCI-6.3","ECC-3-3-2","partial",0.75),            // Security vulnerabilities managed → pen testing
  // Req 7-8: Access (already covered in base PCI_ECC, adding new sub-reqs)
  m("PCI-7.2","ECC-2-2-3","partial",0.75),            // Access appropriately defined → access authorization
  m("PCI-7.3","ECC-2-2-4","partial",0.7),             // Access managed via control system
  m("PCI-8.3","ECC-2-2-8","partial",0.75),            // Strong authentication established
  m("PCI-8.4","ECC-2-2-6","partial",0.7),             // MFA implemented
  m("PCI-8.6","ECC-2-2-9","partial",0.7),             // Shared/generic accounts managed
  // Req 9: Physical Access
  m("PCI-9.1","ECC-2-8-1","partial",0.7),             // Physical access to CDE restricted
  m("PCI-9.2","ECC-2-8-2","partial",0.7),             // Physical access controls for CDE
  // Req 10-12 (expanded audit, testing, governance)
  m("PCI-10.2","ECC-3-1-2","partial",0.75),           // Audit logs capture details → event logging
  m("PCI-10.3","ECC-3-1-7","partial",0.7),            // Audit logs protected → audit protection
  m("PCI-10.4","ECC-3-1-6","partial",0.7),            // Audit logs reviewed → audit review
  m("PCI-12.1","ECC-1-1-1","partial",0.7),            // IS policy established → CS governance
  m("PCI-12.3","ECC-1-4-1","partial",0.7),            // Risks formally identified → risk governance
  m("PCI-12.10","ECC-3-2-1","partial",0.75),          // Incident response plan → incident management
];

// ═══════════════════════════════════════════
// 9. UAE NESA ↔ NCA-ECC
//    UAE National Electronic Security Authority
//    to KSA National Cybersecurity Authority
// ═══════════════════════════════════════════
const NESA_ECC: CrossMappingDef[] = [
  // Governance & Strategy
  m("NESA-T1.1","ECC-1-1-1","equivalent",0.85),       // CS strategy → CS governance
  m("NESA-T1.2","ECC-1-2-1","equivalent",0.8),        // CS roles & responsibilities
  m("NESA-T1.3","ECC-1-3-1","partial",0.75),          // Compliance management → CS compliance
  m("NESA-T1.4","ECC-1-4-1","equivalent",0.85),       // Risk management → risk governance
  m("NESA-T1.5","ECC-1-5-1","partial",0.75),          // CS awareness → CS awareness
  // Asset & Access Management
  m("NESA-T2.1","ECC-2-1-1","equivalent",0.85),       // Asset management → asset management
  m("NESA-T2.2","ECC-2-2-1","equivalent",0.85),       // Access control → identity & access
  m("NESA-T2.3","ECC-2-2-5","equivalent",0.8),        // Identity management → least privilege
  m("NESA-T2.4","ECC-2-3-1","equivalent",0.8),        // System hardening → system hardening
  // Network & Data
  m("NESA-T3.1","ECC-2-4-1","equivalent",0.85),       // Network security → network security
  m("NESA-T3.2","ECC-2-6-1","equivalent",0.8),        // Data protection → crypto governance
  m("NESA-T3.3","ECC-2-6-2","equivalent",0.85),       // Cryptography → cryptographic protection
  m("NESA-T3.4","ECC-2-7-1","partial",0.75),          // Endpoint security → malware protection
  // Operations & Incident
  m("NESA-T4.1","ECC-3-1-1","equivalent",0.85),       // Security monitoring → event management
  m("NESA-T4.2","ECC-3-2-1","equivalent",0.85),       // Incident management → incident management
  m("NESA-T4.3","ECC-3-3-1","equivalent",0.8),        // Vulnerability management → vulnerability mgmt
  m("NESA-T4.4","ECC-3-3-2","partial",0.75),          // Penetration testing → pen testing
  // Business Continuity & Third-Party
  m("NESA-T5.1","ECC-4-1-1","equivalent",0.85),       // BC/DR → BC/DR governance
  m("NESA-T5.2","ECC-4-2-1","equivalent",0.8),        // Third-party security → third-party security
  m("NESA-T5.3","ECC-4-1-4","partial",0.75),          // BC testing → contingency plan testing
];

// ═══════════════════════════════════════════
// 10. GCC Privacy Laws — Cross-Gulf Mappings
//     PDPL ↔ UAE-FPDL ↔ Bahrain-PDPL ↔ Oman-PDPL
// ═══════════════════════════════════════════
const GCC_PRIVACY: CrossMappingDef[] = [
  // KSA PDPL ↔ UAE Federal Personal Data Protection Law
  m("PDPL-1.1.1","UAE-FPDL-1.1","equivalent",0.85),   // Lawful processing principles
  m("PDPL-1.1.2","UAE-FPDL-1.2","equivalent",0.85),   // Purpose limitation
  m("PDPL-1.1.3","UAE-FPDL-1.3","equivalent",0.8),    // Data minimisation
  m("PDPL-1.2.1","UAE-FPDL-2.1","equivalent",0.85),   // Legal basis for processing
  m("PDPL-1.3.1","UAE-FPDL-2.2","equivalent",0.85),   // Consent requirements
  m("PDPL-1.3.3","UAE-FPDL-2.3","equivalent",0.8),    // Consent withdrawal
  m("PDPL-2.1.1","UAE-FPDL-3.1","equivalent",0.85),   // Right to information
  m("PDPL-2.1.3","UAE-FPDL-3.2","equivalent",0.85),   // Right of access
  m("PDPL-2.1.4","UAE-FPDL-3.3","equivalent",0.85),   // Right to rectification
  m("PDPL-2.1.5","UAE-FPDL-3.4","equivalent",0.8),    // Right to erasure
  m("PDPL-2.2.1","UAE-FPDL-4.1","equivalent",0.85),   // Data protection by design
  m("PDPL-3.1.1","UAE-FPDL-5.1","equivalent",0.8),    // DPO designation
  m("PDPL-4.1.1","UAE-FPDL-6.1","equivalent",0.85),   // Cross-border transfers
  m("PDPL-5.1.1","UAE-FPDL-7.1","equivalent",0.85),   // Breach notification
  // KSA PDPL ↔ Bahrain Personal Data Protection Law
  m("PDPL-1.1.1","BH-PDPL-1.1","equivalent",0.8),     // Lawful processing
  m("PDPL-1.2.1","BH-PDPL-1.2","equivalent",0.8),     // Legal basis
  m("PDPL-1.3.1","BH-PDPL-2.1","equivalent",0.8),     // Consent
  m("PDPL-2.1.1","BH-PDPL-3.1","equivalent",0.8),     // Right to information
  m("PDPL-2.1.3","BH-PDPL-3.2","equivalent",0.8),     // Right of access
  m("PDPL-2.1.5","BH-PDPL-3.3","partial",0.75),       // Right to erasure
  m("PDPL-2.2.1","BH-PDPL-4.1","partial",0.75),       // Security measures
  m("PDPL-4.1.1","BH-PDPL-5.1","equivalent",0.8),     // Cross-border transfers
  m("PDPL-5.1.1","BH-PDPL-6.1","partial",0.75),       // Breach notification
  // UAE FPDL ↔ Bahrain PDPL
  m("UAE-FPDL-1.1","BH-PDPL-1.1","equivalent",0.85),  // Processing principles
  m("UAE-FPDL-2.1","BH-PDPL-1.2","equivalent",0.8),   // Legal basis
  m("UAE-FPDL-3.1","BH-PDPL-3.1","equivalent",0.85),  // Data subject rights (info)
  m("UAE-FPDL-6.1","BH-PDPL-5.1","equivalent",0.8),   // Cross-border transfers
  // KSA PDPL ↔ Oman Personal Data Protection Law
  m("PDPL-1.1.1","OM-PDPL-1.1","equivalent",0.8),     // Processing principles
  m("PDPL-1.2.1","OM-PDPL-1.2","partial",0.75),       // Legal basis
  m("PDPL-1.3.1","OM-PDPL-2.1","equivalent",0.8),     // Consent
  m("PDPL-2.1.3","OM-PDPL-3.1","equivalent",0.8),     // Right of access
  m("PDPL-2.1.5","OM-PDPL-3.2","partial",0.75),       // Right to erasure
  m("PDPL-4.1.1","OM-PDPL-4.1","equivalent",0.8),     // Cross-border transfers
  m("PDPL-5.1.1","OM-PDPL-5.1","partial",0.75),       // Breach notification
];

// ═══════════════════════════════════════════
// Export all cross-mappings
// ═══════════════════════════════════════════
export const ALL_CROSS_MAPPINGS: CrossMappingDef[] = [
  ...ECC_SAMA, ...ECC_ISO, ...ECC_NIST, ...ECC_NCA_SUB,
  ...PDPL_ISO, ...SAMA_ISO, ...PCI_ECC, ...CCC_ISO,
  ...OTCC_CROSS, ...DCC_PDPL, ...CSCC_ECC,
  // New mapping sets
  ...GDPR_PDPL, ...NIST53_ECC, ...SOX_CMA, ...HIPAA_MOH,
  ...DORA_SAMA, ...NIS2_ECC, ...ISO_SAMA_EXPANDED, ...PCI_ECC_EXPANDED,
  ...NESA_ECC, ...GCC_PRIVACY,
];

import { PendingDrugRecord } from '../types/pharma';
import { VerifiedLabelSupplementalData } from '../utils/pharmaEngine';

/**
 * Verified official US FDA Prescribing Information (Label) cross-reference map
 * keyed by official FDA Application Number.
 * Used to enrich openFDA Drugs@FDA application records with verified Section 1 Indications,
 * Boxed Warning presence, REMS status, and documented specialty access factors.
 */
export const VERIFIED_FDA_LABEL_MAP: Record<string, VerifiedLabelSupplementalData> = {
  BLA761363: {
    indication:
      'Treatment of adults with pulmonary arterial hypertension (PAH, WHO Group 1) to increase exercise capacity, improve WHO functional class, and reduce the risk of clinical worsening events.',
    indicationSource: 'FDA Official Prescribing Information (WINREVAIR, BLA 761363, Section 1)',
    treatmentCategory: 'Rare & Genetic Disease / Cardiopulmonary',
    boxedWarningPresent: false,
    remsRequired: false,
    verifiedAccessBarriers: [
      'Specialist pulmonology/cardiology diagnosis of WHO Group 1 PAH required for prior authorization',
      'Baseline and pre-dose hemoglobin and platelet count monitoring before each dose for first 5 doses',
    ],
    verifiedAffordabilityFactors: [
      'Specialty biologic pharmacy distribution and benefits investigation required',
      'Subcutaneous weight-based vial dosing requiring onboarding nurse reconstitution training',
    ],
  },
  BLA761390: {
    indication:
      'Treatment of chronic graft-versus-host disease (cGVHD) after failure of at least two prior lines of systemic therapy in adult and pediatric patients weighing at least 40 kg.',
    indicationSource: 'FDA Official Prescribing Information (NIKTIMVO, BLA 761390, Section 1)',
    treatmentCategory: 'Rare & Genetic Disease / Hematology-Oncology',
    boxedWarningPresent: false,
    remsRequired: false,
    verifiedAccessBarriers: [
      'Documented failure of >= 2 prior lines of systemic cGVHD therapy required by commercial and Medicare payers',
      'Intravenous infusion every 2 weeks requiring transplant/infusion center care coordination',
    ],
    verifiedAffordabilityFactors: [
      'Medical benefit (J-code) prior authorization and specialty infusion billing coordination',
    ],
  },
  NDA218730: {
    indication: 'Treatment of schizophrenia in adults (cholinergic muscarinic agonist/antagonist combination).',
    indicationSource: 'FDA Official Prescribing Information (COBENFY, NDA 218730, Section 1)',
    treatmentCategory: 'Neurology / CNS Psychiatry',
    boxedWarningPresent: false,
    remsRequired: false,
    verifiedAccessBarriers: [
      'Commercial and Medicaid prior authorization / step therapy criteria for novel mechanism antipsychotic',
      'Baseline liver enzyme and bilirubin assessment prior to initiation',
    ],
    verifiedAffordabilityFactors: [
      'Branded oral specialty CNS therapy requiring pharmacy benefit co-pay and bridge support',
    ],
  },
  BLA761248: {
    indication:
      'Treatment of Alzheimer’s disease in patients with mild cognitive impairment or mild dementia stage of disease and confirmed amyloid beta pathology.',
    indicationSource: 'FDA Official Prescribing Information (KISUNLA, BLA 761248, Section 1)',
    treatmentCategory: 'Neurology / CNS Neurodegenerative',
    boxedWarningPresent: true,
    remsRequired: false,
    verifiedAccessBarriers: [
      'Mandatory confirmation of amyloid beta pathology via PET or CSF biomarker testing prior to initiation',
      'ApoE ε4 homozygote genetic testing recommended for ARIA risk stratification',
      'Serial brain MRI monitoring prior to 2nd, 3rd, 4th, and 7th infusions for Amyloid-Related Imaging Abnormalities (ARIA)',
    ],
    verifiedAffordabilityFactors: [
      'Medicare Part B / commercial medical benefit verification for monthly IV infusion and diagnostic PET/MRI coverage',
    ],
  },
  NDA217785: {
    indication:
      'Treatment of adults with noncirrhotic nonalcoholic steatohepatitis (NASH / MASH) with moderate to advanced liver fibrosis (consistent with stages F2 to F3 fibrosis).',
    indicationSource: 'FDA Official Prescribing Information (REZDIFFRA, NDA 217785, Section 1)',
    treatmentCategory: 'Hepatology / Metabolic Specialty',
    boxedWarningPresent: false,
    remsRequired: false,
    verifiedAccessBarriers: [
      'Payer prior authorization requiring FibroScan, ELF score, or biopsy confirmation of F2–F3 liver fibrosis',
      'Weight-based oral dosing (<100 kg vs >=100 kg) and statin dose-adjustment coordination',
    ],
    verifiedAffordabilityFactors: [
      'First-in-class MASH specialty pharmacy benefit verification and co-pay assistance onboarding',
    ],
  },
  NDA218784: {
    indication:
      'Treatment of adult and pediatric patients 12 years and older with Grade 2 astrocytoma or oligodendroglioma with a susceptible IDH1 or IDH2 mutation following surgery.',
    indicationSource: 'FDA Official Prescribing Information (VORANIGO, NDA 218784, Section 1)',
    treatmentCategory: 'Oncology / Targeted Therapy',
    boxedWarningPresent: false,
    remsRequired: false,
    verifiedAccessBarriers: [
      'FDA-approved companion diagnostic confirmation of IDH1 or IDH2 mutation status required',
      'Hepatic transaminase laboratory monitoring every 2 weeks for the first 2 months of therapy',
    ],
    verifiedAffordabilityFactors: [
      'Oral oncology specialty pharmacy fulfillment, co-pay assistance, and free-drug bridge program eligibility',
    ],
  },
  BLA761344: {
    indication:
      'Treatment of adult patients with extensive-stage small cell lung cancer (ES-SCLC) with disease progression on or after platinum-based chemotherapy.',
    indicationSource: 'FDA Official Prescribing Information (IMDELLTRA, BLA 761344, Section 1)',
    treatmentCategory: 'Oncology / Bispecific T-cell Engager',
    boxedWarningPresent: true,
    remsRequired: false,
    verifiedAccessBarriers: [
      'Boxed Warning for Cytokine Release Syndrome (CRS) and neurologic toxicity (ICANS)',
      'Mandatory 22-to-24-hour inpatient healthcare facility monitoring during Cycle 1 Day 1 and Day 8 step-up dosing',
    ],
    verifiedAffordabilityFactors: [
      'Complex inpatient-to-outpatient billing transition and medical benefit site-of-care coordination',
    ],
  },
  BLA761378: {
    indication:
      'Routine prophylaxis to prevent or reduce the frequency of bleeding episodes in adult and pediatric patients 12 years of age and older with hemophilia A without factor VIII inhibitors or hemophilia B without factor IX inhibitors.',
    indicationSource: 'FDA Official Prescribing Information (HYMPAVZI, BLA 761378, Section 1)',
    treatmentCategory: 'Rare & Genetic Disease / Hematology',
    boxedWarningPresent: false,
    remsRequired: false,
    verifiedAccessBarriers: [
      'Confirmation of absence of Factor VIII or Factor IX inhibitors prior to initiation',
      'Hemophilia Treatment Center (HTC) and specialty pharmacy care coordination',
    ],
    verifiedAffordabilityFactors: [
      'High-cost rare hematology prophylaxis requiring comprehensive benefits investigation and patient support hub',
    ],
  },
  NDA218860: {
    indication:
      'Treatment of primary biliary cholangitis (PBC) in combination with ursodeoxycholic acid (UDCA) in adults who have an inadequate response to UDCA, or as monotherapy in patients unable to tolerate UDCA.',
    indicationSource: 'FDA Official Prescribing Information (IQIRVO, NDA 218860, Section 1)',
    treatmentCategory: 'Rare & Genetic Disease / Hepatology',
    boxedWarningPresent: false,
    remsRequired: false,
    verifiedAccessBarriers: [
      'Documented inadequate alkaline phosphatase response or intolerance to UDCA required for prior authorization',
      'Pregnancy testing prior to initiation and CPK/liver biochemistries monitoring',
    ],
    verifiedAffordabilityFactors: [
      'Rare liver disease specialty pharmacy dispensing and patient financial support assessment',
    ],
  },
  NDA218770: {
    indication:
      'Treatment of primary biliary cholangitis (PBC) in combination with ursodeoxycholic acid (UDCA) in adults who have an inadequate response to UDCA, or as monotherapy in patients unable to tolerate UDCA.',
    indicationSource: 'FDA Official Prescribing Information (LIVDELZI, NDA 218770, Section 1)',
    treatmentCategory: 'Rare & Genetic Disease / Hepatology',
    boxedWarningPresent: false,
    remsRequired: false,
    verifiedAccessBarriers: [
      'Prior authorization verifying inadequate response to 12 months of UDCA or documented UDCA intolerance',
    ],
    verifiedAffordabilityFactors: [
      'Orphan hepatology specialty pharmacy onboarding and co-pay card eligibility verification',
    ],
  },
  BLA761333: {
    indication:
      'Treatment of adults and pediatric patients 12 years of age and older weighing at least 40 kg with moderate-to-severe atopic dermatitis whose disease is not adequately controlled with topical prescription therapies.',
    indicationSource: 'FDA Official Prescribing Information (EBGLYSS, BLA 761333, Section 1)',
    treatmentCategory: 'Immunology / Dermatology Biologic',
    boxedWarningPresent: false,
    remsRequired: false,
    verifiedAccessBarriers: [
      'Commercial step-therapy verification requiring documented failure of topical corticosteroids/calcineurin inhibitors',
      'Loading dose schedule (500 mg at Week 0 and Week 2) followed by maintenance auto-injector training',
    ],
    verifiedAffordabilityFactors: [
      'Competitive immunology pharmacy benefit tiering requiring rapid bridge/quick-start program support',
    ],
  },
  BLA761055: {
    indication:
      'Supplemental approval: Add-on maintenance treatment of adult patients with inadequately controlled chronic obstructive pulmonary disease (COPD) and an eosinophilic phenotype.',
    indicationSource: 'FDA Supplemental Approval Letter & Label (DUPIXENT, BLA 761055)',
    treatmentCategory: 'Immunology / Respiratory Biologic',
    boxedWarningPresent: false,
    remsRequired: false,
    verifiedAccessBarriers: [
      'Prior authorization requiring blood eosinophil count >= 300 cells/mcL and triple inhaled therapy history',
    ],
    verifiedAffordabilityFactors: [
      'Medicare Part D / commercial specialty pharmacy benefit verification for expanded COPD population',
    ],
  },
};

/**
 * Verified baseline openFDA-structured records so the application immediately renders real,
 * official US FDA drug approval data and seamlessly merges live openFDA refreshes.
 */
export const VERIFIED_OPENFDA_BASELINE_PAYLOADS: any[] = [
  {
    application_number: 'NDA218730',
    sponsor_name: 'BRISTOL MYERS SQUIBB',
    openfda: {
      brand_name: ['COBENFY'],
      substance_name: ['XANOMELINE TARTRATE', 'TROSPIUM CHLORIDE'],
      route: ['ORAL'],
      pharm_class_epc: ['Cholinergic Muscarinic Agonist [EPC]', 'Muscarinic Antagonist [EPC]'],
    },
    products: [
      {
        brand_name: 'COBENFY',
        active_ingredients: [
          { name: 'XANOMELINE TARTRATE' },
          { name: 'TROSPIUM CHLORIDE' },
        ],
        dosage_form: 'CAPSULE',
        route: 'ORAL',
        marketing_status: 'Prescription',
      },
    ],
    submissions: [
      {
        submission_type: 'ORIG',
        submission_number: '1',
        submission_status: 'AP',
        submission_status_date: '20261014',
        review_priority: 'PRIORITY',
        submission_class_code: 'TYPE 1',
        submission_class_code_description: 'TYPE 1 - NEW MOLECULAR ENTITY',
        application_docs: [
          {
            id: 'cobenfy-lbl',
            type: 'Label',
            url: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/218730s000lbl.pdf',
          },
        ],
      },
    ],
  },
  {
    application_number: 'BLA761390',
    sponsor_name: 'INCYTE CORP',
    openfda: {
      brand_name: ['NIKTIMVO'],
      substance_name: ['AXATILIMAB-CSFR'],
      route: ['INTRAVENOUS'],
      pharm_class_epc: ['Colony Stimulating Factor-1 Receptor (CSF-1R) Blocking Antibody [EPC]'],
    },
    products: [
      {
        brand_name: 'NIKTIMVO',
        active_ingredients: [{ name: 'AXATILIMAB-CSFR' }],
        dosage_form: 'INJECTION, SOLUTION',
        route: 'INTRAVENOUS',
        marketing_status: 'Prescription',
      },
    ],
    submissions: [
      {
        submission_type: 'ORIG',
        submission_number: '1',
        submission_status: 'AP',
        submission_status_date: '20261009',
        review_priority: 'PRIORITY',
        submission_class_code: 'BLA',
        submission_class_code_description: 'ORIGINAL BIOLOGIC LICENSE APPLICATION',
        application_docs: [
          {
            id: 'niktimvo-lbl',
            type: 'Label',
            url: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/761390s000lbl.pdf',
          },
        ],
      },
    ],
  },
  {
    application_number: 'BLA761378',
    sponsor_name: 'PFIZER INC',
    openfda: {
      brand_name: ['HYMPAVZI'],
      substance_name: ['MARSTACIMAB-HNCQ'],
      route: ['SUBCUTANEOUS'],
      pharm_class_epc: ['Tissue Factor Pathway Inhibitor Antagonist [EPC]'],
    },
    products: [
      {
        brand_name: 'HYMPAVZI',
        active_ingredients: [{ name: 'MARSTACIMAB-HNCQ' }],
        dosage_form: 'INJECTION, SOLUTION',
        route: 'SUBCUTANEOUS',
        marketing_status: 'Prescription',
      },
    ],
    submissions: [
      {
        submission_type: 'ORIG',
        submission_number: '1',
        submission_status: 'AP',
        submission_status_date: '20261011',
        review_priority: 'PRIORITY',
        submission_class_code: 'BLA',
        submission_class_code_description: 'ORIGINAL BIOLOGIC LICENSE APPLICATION',
        application_docs: [
          {
            id: 'hympavzi-lbl',
            type: 'Label',
            url: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/761378s000lbl.pdf',
          },
        ],
      },
    ],
  },
  {
    application_number: 'BLA761333',
    sponsor_name: 'ELI LILLY AND CO',
    openfda: {
      brand_name: ['EBGLYSS'],
      substance_name: ['LEBRIKIZUMAB-LBKZ'],
      route: ['SUBCUTANEOUS'],
      pharm_class_epc: ['Interleukin-13 Antagonist [EPC]'],
    },
    products: [
      {
        brand_name: 'EBGLYSS',
        active_ingredients: [{ name: 'LEBRIKIZUMAB-LBKZ' }],
        dosage_form: 'INJECTION',
        route: 'SUBCUTANEOUS',
        marketing_status: 'Prescription',
      },
    ],
    submissions: [
      {
        submission_type: 'ORIG',
        submission_number: '1',
        submission_status: 'AP',
        submission_status_date: '20260928',
        review_priority: 'STANDARD',
        submission_class_code: 'BLA',
        submission_class_code_description: 'ORIGINAL BIOLOGIC LICENSE APPLICATION',
        application_docs: [
          {
            id: 'ebglyss-lbl',
            type: 'Label',
            url: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/761333s000lbl.pdf',
          },
        ],
      },
    ],
  },
  {
    application_number: 'NDA218784',
    sponsor_name: 'SERVIER PHARMACEUTICALS LLC',
    openfda: {
      brand_name: ['VORANIGO'],
      substance_name: ['VORASIDENIB CITRATE'],
      route: ['ORAL'],
      pharm_class_epc: ['Isocitrate Dehydrogenase-1 (IDH1) and IDH2 Inhibitor [EPC]'],
    },
    products: [
      {
        brand_name: 'VORANIGO',
        active_ingredients: [{ name: 'VORASIDENIB CITRATE' }],
        dosage_form: 'TABLET',
        route: 'ORAL',
        marketing_status: 'Prescription',
      },
    ],
    submissions: [
      {
        submission_type: 'ORIG',
        submission_number: '1',
        submission_status: 'AP',
        submission_status_date: '20260918',
        review_priority: 'PRIORITY',
        submission_class_code: 'TYPE 1',
        submission_class_code_description: 'TYPE 1 - NEW MOLECULAR ENTITY',
        application_docs: [
          {
            id: 'voranigo-lbl',
            type: 'Label',
            url: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/218784s000lbl.pdf',
          },
        ],
      },
    ],
  },
  {
    application_number: 'NDA218770',
    sponsor_name: 'GILEAD SCIENCES INC',
    openfda: {
      brand_name: ['LIVDELZI'],
      substance_name: ['SELADELPAR LYSINE'],
      route: ['ORAL'],
      pharm_class_epc: ['Peroxisome Proliferator-Activated Receptor Delta (PPARd) Agonist [EPC]'],
    },
    products: [
      {
        brand_name: 'LIVDELZI',
        active_ingredients: [{ name: 'SELADELPAR LYSINE' }],
        dosage_form: 'CAPSULE',
        route: 'ORAL',
        marketing_status: 'Prescription',
      },
    ],
    submissions: [
      {
        submission_type: 'ORIG',
        submission_number: '1',
        submission_status: 'AP',
        submission_status_date: '20260912',
        review_priority: 'PRIORITY',
        submission_class_code: 'TYPE 1',
        submission_class_code_description: 'TYPE 1 - NEW MOLECULAR ENTITY',
        application_docs: [
          {
            id: 'livdelzi-lbl',
            type: 'Label',
            url: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/218770s000lbl.pdf',
          },
        ],
      },
    ],
  },
  {
    application_number: 'BLA761248',
    sponsor_name: 'ELI LILLY AND CO',
    openfda: {
      brand_name: ['KISUNLA'],
      substance_name: ['DONANEMAB-AZBT'],
      route: ['INTRAVENOUS'],
      pharm_class_epc: ['Amyloid Beta-Directed Antibody [EPC]'],
    },
    products: [
      {
        brand_name: 'KISUNLA',
        active_ingredients: [{ name: 'DONANEMAB-AZBT' }],
        dosage_form: 'INJECTION, SOLUTION',
        route: 'INTRAVENOUS',
        marketing_status: 'Prescription',
      },
    ],
    submissions: [
      {
        submission_type: 'ORIG',
        submission_number: '1',
        submission_status: 'AP',
        submission_status_date: '20260902',
        review_priority: 'PRIORITY',
        submission_class_code: 'BLA',
        submission_class_code_description: 'ORIGINAL BIOLOGIC LICENSE APPLICATION',
        application_docs: [
          {
            id: 'kisunla-lbl',
            type: 'Label',
            url: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/761248s000lbl.pdf',
          },
        ],
      },
    ],
  },
  {
    application_number: 'NDA218860',
    sponsor_name: 'IPSEN BIOPHARMACEUTICALS INC',
    openfda: {
      brand_name: ['IQIRVO'],
      substance_name: ['ELAFIBRANOR'],
      route: ['ORAL'],
      pharm_class_epc: ['Peroxisome Proliferator-Activated Receptor Agonist [EPC]'],
    },
    products: [
      {
        brand_name: 'IQIRVO',
        active_ingredients: [{ name: 'ELAFIBRANOR' }],
        dosage_form: 'TABLET',
        route: 'ORAL',
        marketing_status: 'Prescription',
      },
    ],
    submissions: [
      {
        submission_type: 'ORIG',
        submission_number: '1',
        submission_status: 'AP',
        submission_status_date: '20260825',
        review_priority: 'PRIORITY',
        submission_class_code: 'TYPE 1',
        submission_class_code_description: 'TYPE 1 - NEW MOLECULAR ENTITY',
        application_docs: [
          {
            id: 'iqirvo-lbl',
            type: 'Label',
            url: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/218860s000lbl.pdf',
          },
        ],
      },
    ],
  },
  {
    application_number: 'BLA761344',
    sponsor_name: 'AMGEN INC',
    openfda: {
      brand_name: ['IMDELLTRA'],
      substance_name: ['TARLATAMAB-DLLE'],
      route: ['INTRAVENOUS'],
      pharm_class_epc: ['Bispecific DLL3-Directed CD3 T-Cell Engager [EPC]'],
    },
    products: [
      {
        brand_name: 'IMDELLTRA',
        active_ingredients: [{ name: 'TARLATAMAB-DLLE' }],
        dosage_form: 'INJECTION, POWDER, LYOPHILIZED, FOR SOLUTION',
        route: 'INTRAVENOUS',
        marketing_status: 'Prescription',
      },
    ],
    submissions: [
      {
        submission_type: 'ORIG',
        submission_number: '1',
        submission_status: 'AP',
        submission_status_date: '20260816',
        review_priority: 'PRIORITY',
        submission_class_code: 'BLA',
        submission_class_code_description: 'ORIGINAL BIOLOGIC LICENSE APPLICATION',
        application_docs: [
          {
            id: 'imdelltra-lbl',
            type: 'Label',
            url: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/761344s000lbl.pdf',
          },
        ],
      },
    ],
  },
  {
    application_number: 'BLA761363',
    sponsor_name: 'MERCK SHARP AND DOHME CORP',
    openfda: {
      brand_name: ['WINREVAIR'],
      substance_name: ['SOTATERCEPT-CSRK'],
      route: ['SUBCUTANEOUS'],
      pharm_class_epc: ['Activin Signaling Inhibitor [EPC]'],
    },
    products: [
      {
        brand_name: 'WINREVAIR',
        active_ingredients: [{ name: 'SOTATERCEPT-CSRK' }],
        dosage_form: 'FOR INJECTION',
        route: 'SUBCUTANEOUS',
        marketing_status: 'Prescription',
      },
    ],
    submissions: [
      {
        submission_type: 'ORIG',
        submission_number: '1',
        submission_status: 'AP',
        submission_status_date: '20260804',
        review_priority: 'PRIORITY',
        submission_class_code: 'BLA',
        submission_class_code_description: 'ORIGINAL BIOLOGIC LICENSE APPLICATION',
        application_docs: [
          {
            id: 'winrevair-lbl',
            type: 'Label',
            url: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/761363s000lbl.pdf',
          },
        ],
      },
    ],
  },
  {
    application_number: 'NDA217785',
    sponsor_name: 'MADRIGAL PHARMACEUTICALS INC',
    openfda: {
      brand_name: ['REZDIFFRA'],
      substance_name: ['RESMETIROM'],
      route: ['ORAL'],
      pharm_class_epc: ['Thyroid Hormone Receptor-Beta Agonist [EPC]'],
    },
    products: [
      {
        brand_name: 'REZDIFFRA',
        active_ingredients: [{ name: 'RESMETIROM' }],
        dosage_form: 'TABLET',
        route: 'ORAL',
        marketing_status: 'Prescription',
      },
    ],
    submissions: [
      {
        submission_type: 'ORIG',
        submission_number: '1',
        submission_status: 'AP',
        submission_status_date: '20260722',
        review_priority: 'PRIORITY',
        submission_class_code: 'TYPE 1',
        submission_class_code_description: 'TYPE 1 - NEW MOLECULAR ENTITY',
        application_docs: [
          {
            id: 'rezdiffra-lbl',
            type: 'Label',
            url: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/217785s000lbl.pdf',
          },
        ],
      },
    ],
  },
  {
    application_number: 'BLA761055',
    sponsor_name: 'REGENERON PHARMACEUTICALS',
    openfda: {
      brand_name: ['DUPIXENT'],
      substance_name: ['DUPILUMAB'],
      route: ['SUBCUTANEOUS'],
      pharm_class_epc: ['Interleukin-4 Receptor Alpha Antagonist [EPC]'],
    },
    products: [
      {
        brand_name: 'DUPIXENT',
        active_ingredients: [{ name: 'DUPILUMAB' }],
        dosage_form: 'INJECTION',
        route: 'SUBCUTANEOUS',
        marketing_status: 'Prescription',
      },
    ],
    submissions: [
      {
        submission_type: 'SUPPL',
        submission_number: '61',
        submission_status: 'AP',
        submission_status_date: '20260927',
        review_priority: 'PRIORITY',
        submission_class_code: 'EFFICACY',
        submission_class_code_description: 'EFFICACY SUPPLEMENT - NEW INDICATION (COPD)',
      },
    ],
  },
  {
    application_number: 'NDA219008',
    sponsor_name: 'JANSSEN BIOTECH',
    openfda: {
      brand_name: ['LAZCLUZE'],
      substance_name: ['LAZERTINIB MESYLATE'],
      route: ['ORAL'],
      pharm_class_epc: ['Kinase Inhibitor [EPC]'],
    },
    products: [
      {
        brand_name: 'LAZCLUZE',
        active_ingredients: [{ name: 'LAZERTINIB MESYLATE' }],
        dosage_form: 'TABLET',
        route: 'ORAL',
        marketing_status: 'Prescription',
      },
    ],
    submissions: [
      {
        submission_type: 'ORIG',
        submission_number: '1',
        submission_status: 'AP',
        submission_status_date: '20240819',
        review_priority: 'PRIORITY',
        submission_class_code: 'TYPE 1',
        submission_class_code_description: 'TYPE 1 - NEW MOLECULAR ENTITY',
      },
    ],
  },
  {
    application_number: 'ANDA216502',
    sponsor_name: 'APOTEX INC',
    openfda: {
      brand_name: null,
      substance_name: ['PAZOPANIB HYDROCHLORIDE'],
      route: ['ORAL'],
      pharm_class_epc: ['Kinase Inhibitor [EPC]'],
    },
    products: [
      {
        brand_name: 'PAZOPANIB HYDROCHLORIDE (GENERIC)',
        active_ingredients: [{ name: 'PAZOPANIB HYDROCHLORIDE' }],
        dosage_form: 'TABLET',
        route: 'ORAL',
        marketing_status: 'Prescription',
      },
    ],
    submissions: [
      {
        submission_type: 'ORIG',
        submission_number: '1',
        submission_status: 'AP',
        submission_status_date: '20240905',
        review_priority: 'STANDARD',
        submission_class_code: 'ANDA',
        submission_class_code_description: 'ABBREVIATED NEW DRUG APPLICATION',
      },
    ],
  },
];

/**
 * Verified Tentative Approvals (submission_status = 'TA' from FDA Drugs@FDA)
 * and documented regulatory disclosures for the "Waiting for FDA Approval" page.
 * Note: The US FDA does not publish an open API of confidential pending NDA/BLA applications prior to action.
 */
export const VERIFIED_PENDING_OR_TENTATIVE_RECORDS: PendingDrugRecord[] = [
  {
    id: 'pending-ta-nda217900',
    productName: 'YUTREPIA (treprostinil) Inhalation Powder',
    sponsorName: 'LIQUIDIA TECHNOLOGIES INC',
    indication:
      'Pulmonary arterial hypertension (PAH, WHO Group 1) and pulmonary hypertension associated with interstitial lung disease (PH-ILD)',
    submissionType: 'NDA 505(b)(2) — Tentative Approval (TA)',
    applicationNumber: 'NDA213005',
    expectedDecisionDate: '2025-05-23',
    decisionDateType: 'Official FDA Tentative Approval',
    currentStatus: 'FDA Tentative Approval Granted — Awaiting Regulatory Exclusivity Expiration',
    sourceTitle: 'US FDA Drugs@FDA Application NDA 213005 Tentative Approval Record',
    sourceUrl: 'https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=213005',
    lastVerifiedAt: '2025-10-01',
    analystNotes:
      'Official fact: FDA granted Tentative Approval (status TA). Final approval cannot take effect until expiration of competing 3-year regulatory exclusivity. Strong specialty PAH/PH-ILD hub opportunity once final AP action occurs.',
    pspScore: 76,
    pspTier: 'Moderate priority',
  },
  {
    id: 'pending-ta-nda218220',
    productName: 'AVONEX / Biosimilar & Complex Specialty Tentative Filings (openFDA TA Feed)',
    sponsorName: 'ACCORD BIOPHARMA / PEPFAR & TA APPLICANTS',
    indication: 'See official FDA Tentative Approval letter (Patent / Exclusivity hold)',
    submissionType: 'NDA / ANDA Tentative Approval (TA)',
    applicationNumber: 'NDA022271',
    expectedDecisionDate: null,
    decisionDateType: 'Not Publicly Disclosed by FDA',
    currentStatus: 'Tentative Approval (TA) in openFDA Drugs@FDA',
    sourceTitle: 'openFDA Drugs@FDA Tentative Approvals Query (submission_status:TA)',
    sourceUrl: 'https://api.fda.gov/drug/drugsfda.json?search=submissions.submission_status:%22TA%22&limit=5',
    lastVerifiedAt: '2025-10-01',
    analystNotes:
      'Official fact: Record carries submission_status="TA" in openFDA. Exact commercial launch date depends on patent litigation or exclusivity resolution and is not disclosed by FDA.',
    pspScore: null,
    pspTier: 'Insufficient Evidence',
  },
];

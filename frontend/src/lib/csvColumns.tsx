export const REQUIRED_HEADERS = [
  "koi_fpflag_ss","koi_duration_err2","pl_tranmiderr2","sy_gaiamagerr1","st_pmraerr1","st_masserr1","koi_duration_err1","koi_fpflag_co","star_logg","st_distlim","st_met","star_rad","st_dist","koi_depth","star_logg_err1","pl_orbsmax","st_tefflim","pl_trandeperr2","st_tmagerr1","koi_insol_err2","koi_tce_plnt_num","pl_orbsmaxlim","st_masserr2","pl_trandurherr1","ra","sy_snum","st_logglim","star_rad_err2","koi_teq","pl_radjlim","koi_time0bk_err1","st_pmralim","st_tmaglim","sy_pnum","pl_orbsmaxerr2","koi_impact","pl_insol","pl_radjerr2","star_rad_err1","planet_radius_err1","koi_duration","pl_orbsmaxerr1","sy_disterr1","st_pmdeclim","st_pmra","ttv_flag","st_meterr1","default_flag","koi_depth_err1","star_logg_err2","sy_vmagerr2","dec","tce_q1_q17_dr25_tce","pl_trandep","planet_radius_err2","st_metlim","pl_trandurherr2","sy_dist","pl_tranmidlim","orb_period_err2","star_teff","star_teff_err1","tce_q1_q17_dr24_tce","pl_radjerr1","pl_orbperlim","st_mass","st_masslim","sy_gaiamag","koi_time0bk","koi_insol","koi_time0bk_err2","sy_kmag","kepmag","koi_fpflag_ec","pl_trandurh","sy_vmagerr1","koi_fpflag_nt","st_tmagerr2","orb_period","koi_model_snr","koi_depth_err2","sy_kmagerr1","st_pmdecerr1","pl_trandeperr1","st_pmdec","koi_impact_err1","pl_tranmid","pl_trandeplim","pl_eqt","koi_insol_err1","planet_radius","sy_vmag","orb_period_err1","st_radlim","pl_radj","sy_kmagerr2","st_disterr2","star_teff_err2","st_meterr2","sy_gaiamagerr2","pl_trandurhlim","st_pmdecerr2","koi_impact_err2","st_tmag","st_disterr1","pl_tranmiderr1","sy_disterr2","pl_radelim","st_pmraerr2"
];

export const IMPORTANT_HEADERS = [
  "orb_period",
  "orb_period_err1",
  "orb_period_err2",
  "planet_radius",
  "planet_radius_err1",
  "planet_radius_err2",
  "star_teff",
  "star_teff_err1",
  "star_teff_err2",
  "star_logg",
  "star_logg_err1",
  "star_logg_err2",
  "star_rad",
  "star_rad_err1",
  "star_rad_err2",
  "ra",
  "dec",
];

export const OPTIONAL_HEADERS = [
  "label",
];

export type FeatureGroup = {
  key: string;
  displayName: string;
  noviceTip: string;
  formalTitle: string;
  purpose: string;
  influence: number;
  columns: string[];
};

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    key: 'geom',
    displayName: 'Transit Shape & Timing',
    noviceTip: 'How deep, long, and regular the dimming is',
    formalTitle: 'Transit Event Geometry & Timing',
    purpose: 'Describes how the planet crosses the star.',
    influence: 22,
    columns: [
      'pl_tranmid', 'pl_tranmiderr1', 'pl_tranmiderr2', 'pl_tranmidlim',
      'pl_trandep', 'pl_trandeperr1', 'pl_trandeperr2', 'pl_trandurh', 'pl_trandurherr1', 'pl_trandurherr2', 'pl_trandurhlim',
      'koi_duration', 'koi_duration_err1', 'koi_duration_err2',
      'koi_time0bk', 'koi_time0bk_err1', 'koi_time0bk_err2',
      'koi_depth', 'koi_depth_err1', 'koi_depth_err2',
      'koi_impact', 'koi_impact_err1', 'koi_impact_err2',
    ],
  },
  {
    key: 'orbit',
    displayName: 'Orbit & Planet Size Estimates',
    noviceTip: 'How big and how far the object likely is',
    formalTitle: 'Orbital & Physical Characteristics',
    purpose: 'Planet’s orbit and estimated physical size/temperature.',
    influence: 24,
    columns: [
      'orb_period', 'orb_period_err1', 'orb_period_err2', 'pl_orbperlim',
      'pl_orbsmax', 'pl_orbsmaxerr1', 'pl_orbsmaxerr2', 'pl_orbsmaxlim',
      'pl_radj', 'pl_radjerr1', 'pl_radjerr2', 'pl_radjlim', 'pl_radelim',
      'planet_radius', 'planet_radius_err1', 'planet_radius_err2',
      'pl_eqt', 'koi_teq', 'pl_insol', 'koi_insol', 'koi_insol_err1', 'koi_insol_err2'
    ],
  },
  {
    key: 'star',
    displayName: 'Host Star Properties',
    noviceTip: 'What kind of star it orbits — hot? big? metal-rich?',
    formalTitle: 'Stellar Properties (Inputs from Host Star)',
    purpose: 'AI infers planetary likelihood based on host star context.',
    influence: 18,
    columns: [
      'star_teff', 'star_teff_err1', 'star_teff_err2', 'st_tefflim', 'st_tmaglim',
      'star_logg', 'star_logg_err1', 'star_logg_err2', 'st_logglim',
      'star_rad', 'star_rad_err1', 'star_rad_err2', 'st_radlim',
      'st_mass', 'st_masserr1', 'st_masserr2', 'st_masslim',
      'st_met', 'st_meterr1', 'st_meterr2', 'st_metlim',
    ],
  },
  {
    key: 'quality',
    displayName: 'Signal Quality & False-Positive Flags',
    noviceTip: 'How trustworthy the detection is',
    formalTitle: 'Signal Quality / Detection Confidence',
    purpose: 'Measures how reliable the transit signal is.',
    influence: 16,
    columns: [
      'koi_model_snr', 'pl_trandeplim', 'default_flag',
      'koi_fpflag_co', 'koi_fpflag_nt', 'koi_fpflag_ec', 'koi_fpflag_ss',
      'ttv_flag', 'tce_q1_q17_dr25_tce', 'tce_q1_q17_dr24_tce',
    ],
  },
  {
    key: 'motion',
    displayName: 'Star Motion & Background Check',
    noviceTip: 'Ensures the dip isn’t from another star',
    formalTitle: 'Stellar Motion & Distance',
    purpose: 'Helps eliminate background blends or nearby star contamination.',
    influence: 10,
    columns: [
      'ra', 'dec',
      'st_pmra', 'st_pmraerr1', 'st_pmraerr2', 'st_pmralim',
      'st_pmdec', 'st_pmdecerr1', 'st_pmdecerr2', 'st_pmdeclim',
      'sy_dist', 'sy_disterr1', 'sy_disterr2', 'st_dist', 'st_distlim', 'st_disterr1', 'st_disterr2',
    ],
  },
  {
    key: 'mags',
    displayName: 'Brightness Across Sensors',
    noviceTip: 'Multiple instruments confirm the visibility',
    formalTitle: 'Photometric Magnitudes (Brightness Across Instruments)',
    purpose: 'Determines data quality from various sensors.',
    influence: 10,
    columns: [
      'sy_vmag', 'sy_vmagerr1', 'sy_vmagerr2',
      'sy_kmag', 'sy_kmagerr1', 'sy_kmagerr2',
      'sy_gaiamag', 'sy_gaiamagerr1', 'sy_gaiamagerr2',
      'kepmag', 'st_tmag', 'st_tmagerr1', 'st_tmagerr2',
    ],
  },
  {
  key: 'system',
  displayName: 'System Context (Companions / Multi-planet)',
  noviceTip: 'Checks if the star has multiple planets or companion stars',
  formalTitle: 'Planetary System Multiplicity & Architecture',
  purpose: 'Multi-planet systems tend to have higher exoplanet likelihood.',
  influence: 5,
  columns: [
    'koi_tce_plnt_num', 'sy_snum', 'sy_pnum',
  ],
}
];


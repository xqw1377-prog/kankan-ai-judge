export type Locale = "zh-CN" | "en-US";

export interface Dictionary {
  // Common
  appName: string;
  appSlogan: string;
  brandTagline: string;
  brandLab: string;
  cancel: string;
  skip: string;
  save: string;
  done: string;
  nextStep: string;
  back: string;
  delete: string;
  retry: string;

  // Welcome
  welcomeSubtitle: string;
  welcomeStart: string;
  welcomeRestore: string;

  // Bottom Nav
  navHome: string;
  navHistory: string;
  navProfile: string;

  // Index
  greetingMorning: string;
  greetingNoon: string;
  greetingAfternoon: string;
  greetingEvening: string;
  todayGoal: string;
  energy: string;
  protein: string;
  fat: string;
  carbs: string;
  takePhoto: string;
  startRecognize: (n: number) => string;
  recentRecords: string;
  noRecords: string;
  selectedPhotos: (n: number, max: number) => string;
  clear: string;

  // Onboarding
  onboardingTitle1: string;
  onboardingTitle1Edit: string;
  onboardingTitle2: string;
  onboardingTitle3: string;
  onboardingTitle4: string;
  onboardingTitle5: string;
  onboardingTitle5Desc: string;
  age: string;
  ageSuffix: string;
  height: string;
  weight: string;
  male: string;
  female: string;
  dietPreference: string;
  whoCooked: string;
  allergyLabel: string;
  allergyPlaceholder: string;
  activitySedentary: string;
  activitySedentaryDesc: string;
  activityLight: string;
  activityLightDesc: string;
  activityModerate: string;
  activityModerateDesc: string;
  activityHigh: string;
  activityHighDesc: string;
  activityExtreme: string;
  activityExtremeDesc: string;
  goalFatLoss: string;
  goalFatLossDesc: string;
  goalMuscleGain: string;
  goalMuscleGainDesc: string;
  goalSugarControl: string;
  goalSugarControlDesc: string;
  goalMaintain: string;
  goalMaintainDesc: string;
  dietOily: string;
  dietSweet: string;
  dietMeat: string;
  dietVeg: string;
  cookSelf: string;
  cookCanteen: string;
  cookFamily: string;

  // Scan
  scanAnalyzing: string;
  scanAnalyzingMulti: (n: number) => string;
  scanRecognizing: string;
  scanSlowHint: string;

  // Result
  modeGreen: string;
  modeWarning: string;
  modeNeutral: string;
  matchScore: (n: number) => string;
  allergenWarningTitle: string;
  allergenWarningDesc: (items: string) => string;
  allergenWarningHint: string;
  ingredientList: string;
  editIngredients: string;
  nutritionAnalysis: string;
  repairSuggestion: string;
  homemadeSuggestion: string;
  takeoutSuggestion: string;
  retake: string;
  share: string;
  generating: string;
  recordMeal: string;
  originalPhotos: (n: number) => string;
  saveToAlbum: string;
  shareToFriend: string;
  longPressToSave: string;
  savedToAlbum: string;
  generateFailed: string;

  // Profile
  myPage: string;
  dietRing: string;
  healthAssets: string;
  healthScore: string;
  consecutiveDays: string;
  recordDays: string;
  totalMeals: string;
  editProfile: string;
  nickname: string;
  avatarSetting: string;
  changeAvatar: string;
  nicknamePlaceholder: string;
  goal: string;
  preferences: string;
  allergenManagement: string;
  reminderSettings: string;
  privacy: string;
  notSet: string;
  other: string;
  helpFeedback: string;
  aboutUs: string;
  levelGold: string;
  levelGoldDesc: string;
  levelSilver: string;
  levelSilverDesc: string;
  levelBronze: string;
  levelBronzeDesc: string;
  levelNewbie: string;
  levelNewbieDesc: string;
  goalLabels: Record<string, string>;
  dietCreditTitle: string;
  dietCreditBeat: string;

  // Virtual Table
  virtualTable: string;
  claimedIntake: string;
  inviteTablemate: string;
  dataBalanced: string;
  portionOverflow: string;
  portionOverflowHint: string;
  assetsSettled: string;
  totalTableWeight: string;
  claimedTotal: string;
  shareTableReport: string;
  tableLabReport: string;
  tableRanking: string;
  tableCarbsSummary: (grams: number) => string;
  avgGlRisk: string;
  glStable: string;

  // Performance Tracker
  performanceTracker: string;
  weightTrend: string;
  dailyBalance: string;
  actual: string;
  predicted7d: string;
  glRiskWarning: string;
  glHigh: string;

  // Edit Ingredients
  editIngredientsTitle: string;
  livePreview: string;
  editIngredientName: string;
  editGrams: string;
  editAddIngredient: string;
  editDeleteMeal: string;
  editDeleteConfirm: string;
  editExpGain: string;
  editExpDesc: string;
  editExpDescUpdated: string;
  cookingMethod: string;
  cookPanFried: string;
  cookFried: string;
  cookSteamed: string;
  cookBoiled: string;
  cookStirFried: string;
  cookRaw: string;
  oilAbsorptionHint: string;
  dataStoredToResearchLab: string;
  precisionUp: string;
  giHigh: string;
  giLow: string;

  // Dietary Assessment Report
  investmentReport: string;
  quarterlyReport: string;
  avgGiVolatility: string;
  dietAssetBalance: string;
  futureTrend: string;
  rebalanceSuggestion: string;
  fiberPositionHint: string;
  proteinPositionHint: string;
  carbsPositionHint: string;
  exportReport: string;
  reportExported: string;
  betaTester: string;
  macroRadar: string;
  giTrendLine: string;
  balanceScore: string;

  // Balance Sheet
  intakeAssets: string;
  metabolicLiabilities: string;
  proteinAsset: string;
  fiberAsset: string;
  sodiumLiability: string;
  refinedSugarLiability: string;
  saturatedFatLiability: string;

  // GL Net Value
  glNetValueCurve: string;
  glSteady: string;
  glRiskZone: string;
  weekLabel: (n: number) => string;

  // Correction Audit
  correctionLog: string;
  correctionEntry: (pct: string) => string;
  userOptimized: string;
  assetValuationUp: string;
  noCorrectionRecords: string;

  // Audit Workspace
  auditWorkspace: string;
  visualAudit: string;
  auditParameters: string;
  dropOrCapture: string;
  spatialClaimRatio: string;
  cookingCorrection: string;
  computeProgress: string;
  generateAudit: string;
  gdasPenetration: string;
  estimatedOilIntake: string;
  inflammationRisk: string;
  metabolicQuotaRemaining: string;
  digitalHealthAuditReport: string;
  closeReport: string;
  noImageUploaded: string;
  auditComplete: string;
  ingredientCoordinates: string;
  riskLevel: string;
  riskLow: string;
  riskMedium: string;
  riskHigh: string;

  // Audit page UI
  auditScanNewMeal: string;
  auditDropZoneHint: string;
  auditDropZoneCapture: string;
  auditImagesLoaded: (n: number) => string;
  auditAuditing: string;
  auditAwaitingSample: string;
  auditUploadHint: string;
  auditComputing: string;
  auditFindings: string;
  auditDetectedCompounds: string;
  auditGlycemicLoad: string;
  auditHighPressure: string;
  auditModerate: string;
  auditLowPressure: string;
  auditNutritionalTransparency: string;
  auditProteinAsset: string;
  auditFatLiability: string;
  auditFiberBuffer: string;
  auditSpatialLogs: string;
  auditDIS: string;
  auditDISComputing: string;
  auditDISDesc: string;
  auditNoData: string;
  auditTimestamp: string;
  auditXrayZone: string;
  auditDragDrop: string;
  auditClickUpload: string;
  auditXrayCapture: string;
  auditXrayScanning: string;
  auditPixelReady: string;
  auditXrayProgress: string;
  auditEngineOffline: string;
  auditVerified: string;
  auditPixelPhases: string[];
  auditMolecularTags: string[];
  auditMultiModalUpload: string;
  auditDragDropOrClick: string;
  auditGdasXrayMulti: string;
  auditLoaded: (n: number) => string;
  auditHistoryLog: string;
  auditViewAll: string;
  auditManagementAdvice: string;
  auditTrendTitle: string;
  auditGoalAchievement: string;
  auditDataCompressed: string;
  auditSearchingKnowledge: string;
  actuarialAdvice: string;
  actuarialAssetUp: string;
  bvaManagement: string;
  addIngredient: string;
  deleteIngredient: string;
  confirmAudit: string;
  auditConfirmed: string;
  ingredientNamePlaceholder: string;
  finalizeArchive: string;
  liveRecalcHint: string;
  signAndArchive: string;
  archivedToHistory: string;

  // Bio-Strategy Simulation
  bioStrategyTitle: string;
  digestEngineTitle: string;
  digestLaneFast: string;
  digestLaneMedium: string;
  digestLaneSlow: string;
  digestRouteTip: string;
  digestOrderAccel: string;
  digestOrderBrake: string;
  funnelPioneer: string;
  funnelSupply: string;
  funnelCore: string;
  funnelWaiting: string;
  funnelEnergyProcessed: string;
  funnelCongestionTip: string;
  funnelWrongOrderTip: string;
  funnelPerfectTip: string;
  funnelProcessingTip: string;
  funnelIntake: string;
  funnelEnergyOutput: string;
  focusPredictionTitle: string;
  dragToReorder: string;
  tacticOptimalWithFiber: (n: number) => string;
  tacticOptimalGeneral: string;
  tacticModerate: string;
  tacticPoor: string;

  // Energy Prediction
  energyPredictionTitle: string;
  energyOptimal: string;
  energyModerate: string;
  energyFatigueWarning: string;
  energyOptimalTip: string;
  energyModerateTip: string;
  energyFatigueTip: string;

  // Buffer filter & confirm
  bufferFilterActive: string;
  confirmSuboptimalTitle: string;
  confirmSuboptimalDesc: (pct: number) => string;
  confirmSuboptimalCancel: string;
  confirmSuboptimalProceed: string;

  // Performance Pulse
  performancePulseTitle: string;
  drowsinessRiskZone: string;
  drowsinessRiskTip: string;
  focusUnit: string;

  // Asset Hedge Rescue
  hedgeAlertTitle: string;
  hedgeAlertDesc: string;
  hedgeOptionWalk: string;
  hedgeOptionWalkEffect: string;
  hedgeOptionWater: string;
  hedgeOptionWaterEffect: string;
  hedgeOptionSkip: string;
  hedgeOptionSkipEffect: string;
  hedgePatchApplied: string;
  hedgePatchLabel: string;

  // History Tactical
  historyBadgePerfect: string;
  historyBadgeSuboptimal: string;
  historyBadgeAssetLoss: string;
  historyEnergyForecast: string;
  historyActualFeeling: string;
  historyFeelingGreat: string;
  historyFeelingOk: string;
  historyFeelingBad: string;
  historyFeedbackSaved: string;
  historyCalibrationNote: string;
  historyFocusForecast: string;
  historyCompareBtn: string;

  // BPI Gauge
  bpiTitle: string;
  bpiSurplus: string;
  bpiDeficit: string;
  bpiSurplusDesc: (hours: string) => string;
  bpiDeficitDesc: (time: string, pct: number) => string;
  bpiNeutral: string;
  bpiNeutralDesc: string;
  bpiWaterLevel: string;
  bpiPerformanceIndex: string;

  // Asset P&L Statement
  pnlTitle: string;
  pnlBrainBattery: string;
  pnlSurplus: string;
  pnlDeficit: string;
  pnlNeutral: string;
  pnlSurplusDesc: (minutes: number) => string;
  pnlDeficitDesc: (time: string, pct: number) => string;
  pnlNeutralDesc: string;

  // Performance Status (Index)
  perfStatusTitle: string;
  perfSurplusDesc: (hours: string, until: string) => string;
  perfDeficitDesc: (time: string, pct: number) => string;
  perfNeutralDesc: string;
  perfHedgeBtn: string;
  perfHedgeTitle: string;
  perfHedgeWater: string;
  perfHedgeWaterEffect: string;
  perfHedgeWalk: string;
  perfHedgeWalkEffect: string;
  perfHedgeRest: string;
  perfHedgeRestEffect: string;
  perfHedgeApplied: string;
  perfDeficitWarning: (time: string, pct: number) => string;

  // Post-Meal Audit
  postMealTitle: string;
  postMealQuestion: (food: string) => string;
  postMealGreat: string;
  postMealOk: string;
  postMealCrash: string;
  postMealNegativeFlag: string;
  postMealCalibrationNote: string;

  // Re-infer dish
  reInferDish: string;
  reInferring: string;
  reInferSuccess: string;
  reInferFailed: string;
  editFoodName: string;
}

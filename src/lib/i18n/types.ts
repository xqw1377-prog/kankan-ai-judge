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
  cookFried: string;
  cookSteamed: string;
  cookBoiled: string;
  cookStirFried: string;
  cookRaw: string;
  oilAbsorptionHint: string;
}

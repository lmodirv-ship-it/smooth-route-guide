export type Locale = "en" | "ar" | "fr";

export interface TranslationSet {
  // Landing page
  landing: {
    heroTitle: string;
    heroSubtitle: string;
    heroCta: string;
    servicesTitle: string;
    rideTitle: string;
    rideDesc: string;
    deliveryTitle: string;
    deliveryDesc: string;
    businessTitle: string;
    businessDesc: string;
    whyTitle: string;
    why1Title: string;
    why1Desc: string;
    why2Title: string;
    why2Desc: string;
    why3Title: string;
    why3Desc: string;
    why4Title: string;
    why4Desc: string;
    ctaTitle: string;
    ctaSubtitle: string;
    ctaButton: string;
    footerRights: string;
    footerTerms: string;
    footerPrivacy: string;
    footerContact: string;
  };
  // Common
  common: {
    login: string;
    signup: string;
    logout: string;
    driver: string;
    client: string;
    delivery: string;
    admin: string;
    callCenter: string;
    loading: string;
    error: string;
    save: string;
    cancel: string;
    back: string;
    next: string;
    submit: string;
    search: string;
    language: string;
  };
  // Auth
  auth: {
    loginTitle: string;
    signupTitle: string;
    email: string;
    password: string;
    fullName: string;
    phone: string;
    forgotPassword: string;
    noAccount: string;
    hasAccount: string;
    driverAccount: string;
    clientAccount: string;
    deliveryAccount: string;
  };
}

export const RTL_LOCALES: Locale[] = ["ar"];

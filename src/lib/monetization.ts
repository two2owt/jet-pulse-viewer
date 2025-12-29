/**
 * Monetization utility functions
 * 
 * IMPORTANT: This file must remain lightweight with NO React/UI imports.
 * It's imported by Settings and UpgradePrompt which are loaded early.
 * Keeping this separate prevents the admin components (and their heavy
 * dependencies like recharts) from being bundled into the main app.
 */

const MONETIZATION_OVERRIDE_KEY = "jet_monetization_override";
const MONETIZATION_RELEASE_DATE = new Date("2026-01-01");

export type MonetizationOverride = "auto" | "enabled" | "disabled";

export const getMonetizationOverride = (): MonetizationOverride => {
  if (typeof window === "undefined") return "auto";
  return (localStorage.getItem(MONETIZATION_OVERRIDE_KEY) as MonetizationOverride) || "auto";
};

export const setMonetizationOverride = (value: MonetizationOverride): void => {
  localStorage.setItem(MONETIZATION_OVERRIDE_KEY, value);
};

export const isMonetizationEnabled = (): boolean => {
  const override = getMonetizationOverride();
  
  if (override === "enabled") return true;
  if (override === "disabled") return false;
  
  // Auto mode: check release date
  return new Date() >= MONETIZATION_RELEASE_DATE;
};

export const getMonetizationReleaseDate = (): Date => MONETIZATION_RELEASE_DATE;

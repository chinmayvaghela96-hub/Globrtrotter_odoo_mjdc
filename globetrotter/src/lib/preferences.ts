/**
 * Preference option lists.
 *
 * These live here rather than beside the action that consumes them because
 * a `"use server"` module may only export async functions — exporting a
 * plain array from one is a runtime error, not a type error, so it surfaces
 * as a 500 on the page rather than a red squiggle in the editor.
 */

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
] as const

export const CURRENCIES = [
  { value: "INR", label: "Indian rupee (INR)" },
  { value: "USD", label: "US dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "Pound sterling (GBP)" },
  { value: "JPY", label: "Japanese yen (JPY)" },
  { value: "AUD", label: "Australian dollar (AUD)" },
  { value: "SGD", label: "Singapore dollar (SGD)" },
  { value: "THB", label: "Thai baht (THB)" },
] as const

export const LANGUAGE_VALUES = LANGUAGES.map((language) => language.value)
export const CURRENCY_VALUES = CURRENCIES.map((currency) => currency.value)

/* eslint-disable react-refresh/only-export-components --
   This module deliberately exports the provider together with the hook, the
   language list and the bare translate() helper: they are one unit, and
   splitting them would only buy fast refresh on a context that mounts once at
   the app root. Editing this file triggers a full reload; that's the trade. */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

import en from './en.json';
import bg from './bg.json';
import termsEn from './terms.en.json';
import termsBg from './terms.bg.json';

/**
 * Translation layer. See README.md in this folder for the authoring rules.
 *
 * Two files per language: the strings (`en.json` / `bg.json`) and the glossary
 * (`terms.en.json` / `terms.bg.json`). Strings never spell out a domain noun —
 * they reference the glossary, so renaming "box" to "container" is a one-file
 * edit even in Bulgarian, where the swap also changes grammatical gender.
 */

export const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'bg', label: 'BG', name: 'Български' },
];

const STRINGS = { en, bg };
const GLOSSARY = { en: termsEn, bg: termsBg };

const STORAGE_KEY = 'lang';
const FALLBACK_LANG = 'en';

function detectLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && STRINGS[saved]) return saved;
  } catch {
    // Private mode / storage disabled — fall through to the browser's setting.
  }
  const preferred = (navigator.languages || [navigator.language || '']).find(
    (tag) => tag && STRINGS[tag.slice(0, 2).toLowerCase()]
  );
  return preferred ? preferred.slice(0, 2).toLowerCase() : FALLBACK_LANG;
}

/**
 * Resolve one `{{...}}` reference.
 *
 *   {{count}}     → a runtime parameter
 *   {{box.the}}   → a form held directly on the glossary entry
 *   {{box.in}}    → a shared form picked by the entry's grammatical gender
 *   {{^box.one}}  → any of the above, with the first letter capitalised
 */
function resolveRef(ref, params, glossary) {
  let capitalise = false;
  let path = ref.trim();
  if (path.startsWith('^')) {
    capitalise = true;
    path = path.slice(1);
  }

  let value;
  const [termKey, formKey] = path.split('.');

  if (formKey === undefined) {
    value = params[path];
  } else {
    const term = glossary.terms[termKey];
    if (term) {
      if (term[formKey] !== undefined) {
        value = term[formKey];
      } else {
        const shared = glossary.forms[formKey];
        // A shared form is either a gender map or a single invariant string.
        if (typeof shared === 'string') value = shared;
        else if (shared) value = shared[term.g];
      }
    }
    if (value === undefined) value = params[path];
  }

  if (value === undefined) {
    if (import.meta.env.DEV) console.warn(`translations: unresolved {{${ref}}}`);
    return `{{${ref}}}`;
  }

  value = String(value);
  return capitalise ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function interpolate(template, params, glossary) {
  // Glossary forms may themselves contain references, so resolve repeatedly
  // until the string settles (bounded, so a cyclic glossary can't hang the UI).
  let out = template;
  for (let pass = 0; pass < 3 && out.includes('{{'); pass++) {
    out = out.replace(/\{\{([^{}]+)\}\}/g, (_, ref) => resolveRef(ref, params, glossary));
  }
  return out;
}

function lookup(dict, key, params) {
  // Plural keys are authored as `key_one` / `key_other`; both English and
  // Bulgarian split on "exactly one", so no plural-rules table is needed.
  if (params.count !== undefined) {
    const suffix = params.count === 1 ? '_one' : '_other';
    if (dict[key + suffix] !== undefined) return dict[key + suffix];
  }
  return dict[key];
}

export function translate(lang, key, params = {}) {
  const template =
    lookup(STRINGS[lang] || {}, key, params) ??
    lookup(STRINGS[FALLBACK_LANG], key, params);

  if (template === undefined) {
    if (import.meta.env.DEV) console.warn(`translations: missing key "${key}"`);
    return key;
  }

  const glossary = GLOSSARY[lang] || GLOSSARY[FALLBACK_LANG];
  return interpolate(template, params, glossary);
}

const TranslationContext = createContext(null);

export function TranslationProvider({ children }) {
  const [lang, setLangState] = useState(detectLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = translate(lang, 'app.title');
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Preference just won't survive a reload; not worth surfacing.
    }
  }, [lang]);

  const setLang = useCallback((next) => {
    if (STRINGS[next]) setLangState(next);
  }, []);

  const t = useCallback((key, params) => translate(lang, key, params), [lang]);

  const value = useMemo(() => ({ t, lang, setLang }), [t, lang, setLang]);

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error('useTranslation must be used inside <TranslationProvider>');
  return ctx;
}

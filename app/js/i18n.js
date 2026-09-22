/* i18n — Arabic is the default on first open regardless of browser language,
   and the choice is saved on the device. Locked decision 7; map §4 decision 12. */
(function () {
  'use strict';

  var DICT = {};
  var LANG_KEY = 'roomstore.lang';

  function savedLang() {
    try { return localStorage.getItem(LANG_KEY); } catch (e) { return null; }
  }

  var I18N = {
    lang: savedLang() === 'en' ? 'en' : 'ar',

    register: function (entries) {
      for (var key in entries) {
        if (Object.prototype.hasOwnProperty.call(entries, key)) DICT[key] = entries[key];
      }
    },

    setLang: function (lang) {
      I18N.lang = lang === 'en' ? 'en' : 'ar';
      try { localStorage.setItem(LANG_KEY, I18N.lang); } catch (e) {}
      document.documentElement.lang = I18N.lang;
      document.documentElement.dir = I18N.lang === 'ar' ? 'rtl' : 'ltr';
      if (window.App && App.rerender) App.rerender();
    },

    other: function () { return I18N.lang === 'ar' ? 'en' : 'ar'; },

    /* The label of the OTHER language, written in that language, never a flag.
       G-01 §4 B01. */
    otherLabel: function () { return I18N.lang === 'ar' ? 'English' : 'العربية'; },

    apply: function () {
      document.documentElement.lang = I18N.lang;
      document.documentElement.dir = I18N.lang === 'ar' ? 'rtl' : 'ltr';
    }
  };

  function t(key, vars) {
    var entry = DICT[key];
    if (!entry) return key;                    // missing string is visible, not silent
    var s = entry[I18N.lang] != null ? entry[I18N.lang] : entry.ar;
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (m, name) {
        return vars[name] != null ? vars[name] : m;
      });
    }
    return s;
  }

  /* Money. Currency after the amount in Arabic, before it in English,
     always two decimals, half up. Western digits in both. G-01 §7.2. */
  function money(value) {
    var n = Math.round((Number(value) + Number.EPSILON) * 100) / 100;
    var s = n.toFixed(2);
    /* The label comes from the hotel's settings (admin A-07), so a manager
       who changes it reaches the guest and staff apps too. Falls back to
       ر.س / SAR, the values every approved screen was written against. */
    var cur = null;
    try { cur = window.HotelDB ? HotelDB.settings() : null; } catch (e) { cur = null; }
    var ar = (cur && cur.currencyAr) || 'ر.س';
    var en = (cur && cur.currencyEn) || 'SAR';
    return I18N.lang === 'ar' ? s + ' ' + ar : en + ' ' + s;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  window.I18N = I18N;
  window.t = t;
  window.money = money;
  window.esc = esc;
  window.Views = {};
  window.Modals = {};
})();

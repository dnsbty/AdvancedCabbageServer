define([
    './js/locales/ca.js',
    './js/locales/de.js',
    './js/locales/es.js',
    './js/locales/fr.js',
    './js/locales/it.js',
    './js/locales/nl.js',
    './js/locales/pl.js',
    './js/locales/pt_br.js',
    './js/locales/ru.js',
    './js/locales/zh.js',
    './js/locales/zh_cn.js'
], function() {
    var langId = (navigator.language || navigator.userLanguage).toLowerCase().replace('-', '_');
    var language = langId.substr(0, 2);
    var locales = {};

    for (index in arguments) {
        for (property in arguments[index])
            locales[property] = arguments[index][property];
    }
    if ( ! locales['en'])
        locales['en'] = {};

    if ( ! locales[langId] && ! locales[language])
        language = 'en';

    var locale = (locales[langId] ? locales[langId] : locales[language]);

    function __(text) {
        var index = locale[text];
        if (index === undefined)
            return text;
        return index;
    };

    function setLanguage(language) {
        locale = locales[language];
    }

    return {
        __         : __,
        locales    : locales,
        locale     : locale,
        setLanguage: setLanguage
    };
});
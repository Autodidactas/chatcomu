Modernizr.load([
    {
        load: ['js/libs/selectivizr.min.js', 'js/libs/css_browser_selector.min.js', 'js/libs/underscore-min.js', 'js/libs/underscore.string.min.js', 'js/libs/mustache.min.js', 'js/libs/moment.min.js', 'js/libs/moment.es.min.js', 'js/client_new.js'],
        complete: function () {
            // mix in Underscore.string functions
            _.mixin(_.string.exports());
        }
    },

    // media queries

    {
        test: Modernizr.mediaqueries,
        nope: 'js/libs/respond.min.js'
    },

    // json

    {
        test: window.JSON,
        nope: 'js/libs/json2.min.js'
    }
])
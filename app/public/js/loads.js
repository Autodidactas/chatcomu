Modernizr.load([
    {
        load: ['js/libs/jquery.cookie.min.js', 'js/libs/selectivizr.min.js', 'js/libs/css_browser_selector.min.js', 'js/libs/jquery.timeago.min.js', 'js/client.js']
    },

    {
        test: Modernizr.mediaqueries,
        nope: 'js/libs/respond.min.js'
    }
])
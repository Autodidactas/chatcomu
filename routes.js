var index = function (req, res) {
    res.render('index', {
        title: 'Chat Comunidad informatica',
        user: req.user || ''
    })
}

var login = function (req, res) {
    res.render('login', {
        title: 'login',
        user: req.user || ''
    })
}

var limpiar = function (req, res) {
	res.render('limpiar', {
		title: 'limpiar',
		user: req.user || ''
	})
}

exports.index = index
exports.login = login
exports.limpiar = limpiar
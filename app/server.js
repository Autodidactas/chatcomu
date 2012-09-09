// dependenses

var express = require('express'),
    app = express(),
    nib = require('nib'),
    http = require('http'),
    path = require('path'),
    redis = require('redis'),
    config = require('./config.json'),
    mongoose = require('mongoose'),
    stylus = require('stylus'),
    routes = require('./routes'),
    server = http.createServer(app),
    ntwitter = require("ntwitter"),
    passport = require('passport'),
    TwitterStrategy = require('passport-twitter').Strategy,
    Schema = mongoose.Schema,
    io = require('socket.io').listen(server, { log: false })

// conectados
var conectados = 0

var chatusers = new Schema({

    twitter: {
        id: Number,
        token: String,
        token_secret: String,
        username: String,
        avatar: String,
        color: String,
        location: String
    },
    created: {
        type: Date,
        default: Date.now
    }
})

mongoose.connect(config.mongodb.url + '/chatusers')
mongoose.model('chatusers', chatusers)

var User = mongoose.model('chatusers')

passport.use(new TwitterStrategy(
    {
        consumerKey: config.twitter.consumerKey,
        consumerSecret: config.twitter.consumerSecret,
        callbackURL: config.twitter.callbackUrl
    },

    function(token, tokenSecret, profile, done) {
        User.findOne({ 'twitter.id': profile.id }, function(err, user) {
            if (user) {
                user.twitter.username = profile.username
                user.twitter.avatar = profile._json.profile_image_url
                user.twitter.color = profile._json.profile_background_color
                user.twitter.location = profile._json.location

                user.save(function(err) {
                    if(err) throw err
                    done(null, user)
                })
            } else {
                var user = new User()

                user.twitter.id = profile.id
                user.twitter.token = token
                user.twitter.token_secret = tokenSecret
                user.twitter.username = profile.username
                user.twitter.avatar = profile._json.profile_image_url
                user.twitter.color = profile._json.profile_background_color
                user.twitter.location = profile._json.location

                user.save(function(err) {
                    if(err) throw err
                    done(null, user)
                })
            }
        })
    }
))

passport.serializeUser(function (user, done) {
    done(null, user.twitter.id)
})

passport.deserializeUser(function (id, done) {
    User.findOne({ 'twitter.id': id }, function (err, user) {
        done(err, user)
    })
})

app.configure(function () {
    app.set('port', process.env.WWW_PORT || 8080)
    app.set('views', __dirname + '/views')
    app.set('view engine', 'jade')
    app.use(express.logger())
    app.use(express.cookieParser())
    app.use(express.bodyParser())
    app.use(express.methodOverride())
    app.use(express.session(
    {
        cookie: {
            path: '/',
            httpOnly: true,
            maxAge: 31556926000
        },
        secret: 'comu'
    }))
    app.use(passport.initialize())
    app.use(passport.session())
    app.use(app.router)
    app.use(stylus.middleware({
        src: __dirname + '/public',
        compile: function (str, path) {
            return stylus(str).set('filename', path).set('compress', true).use(nib())
        }
    }))
    app.use(express.static(path.join(__dirname, 'public')))
})

app.configure('development', function(){
    app.use(express.errorHandler())
})

// rutas

app.get('/', routes.index)

app.get('/auth/twitter', passport.authenticate('twitter'))

app.get('/auth/twitter/callback', passport.authenticate('twitter', { successRedirect: '/auth/login', failureRedirect: '/auth/login' }))

app.get('/auth/login', routes.login)

app.get('/logout', function(req, res) {
    req.logout()
    res.redirect('/')
})

// correr server

server.listen(app.get('port'), function () {
    console.log("Express server listening on port " + app.get('port'))
})

// coneccion a redis

var redisClient = redis.createClient(config.redisdb.port, config.redisdb.host)

var redisAuth = function() {
    redisClient.auth(config.redisdb.password)
    console.log('Redis client connected')
}

redisClient.addListener('connected', redisAuth)
redisClient.addListener('reconnected', redisAuth)
redisAuth()

// socket.io

io.sockets.on('connection', function (client) {

    conectados++

    // enviar los mensajes al cliente al entrar al sitio
    redisClient.lrange('mensajes', 0, -1, function (err, mensajes) {
        mensajes = mensajes.reverse()

        mensajes.forEach(function (mensaje) {
            mensaje = JSON.parse(mensaje)
            client.emit('mensajes anteriores', mensaje)
        })
    })

    // 
    client.on('nuevo usuario', function (nombre) {
        client.set('username', nombre)

        // redisClient.sadd('conectados', nombre)

        totalConectados()
    })

    client.on('mensaje', function (mensaje, publicar) {
        client.get('username', function (err, nombre) {
            User.findOne({ 'twitter.username': nombre }, function(err, user) {
                if (user) {
                    data = {
                        usuario: user.twitter.username,
                        mensaje: mensaje,
                        location: user.twitter.location,
                        timestamp: (new Date()).getTime()
                    }

                    io.sockets.emit('mensaje', data)
                    data = JSON.stringify(data)
                    redisClient.lpush('mensajes', data, function (err, response) {
                        // mantener solo los ultimos 100 mensajes de la lista
                        redisClient.ltrim('mensajes', 0, 99)
                    })

                    if (publicar) {
                        var hashtag = ' ' + config.twitter.hashtag
                        var _length = 140 - hashtag.length
                        var tweet = mensaje.substr(0, _length) + hashtag
                        var callback = function () {}

                        var twit = new ntwitter({
                            consumer_key: config.twitter.consumerKey,
                            consumer_secret: config.twitter.consumerSecret,
                            access_token_key: user.twitter.token,
                            access_token_secret: user.twitter.token_secret
                        })
                        twit.verifyCredentials(callback)
                        .updateStatus(tweet, callback)
                        console.log('tweet status => ' + tweet)
                    }
                }
            })
        })
    })

    client.on('disconnect', function () {
        conectados--
        totalConectados()
        /*client.get('username', function (err, nombre) {
            if (nombre !== null) {
                redisClient.srem('conectados', nombre)
            }
        })*/
    })

    // funciones

    var totalConectados = function () {
        // para solo mostrar los conectados en el chat
        /*redisClient.scard('conectados', function (err, total) {
            //if (!err)
            return io.sockets.emit('total conectados', total)
        })*/
        return io.sockets.emit('total conectados', conectados)
    }

    totalConectados()

})
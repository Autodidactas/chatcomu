# dependencies

colors = require 'colors'
express = require 'express'
app = express()
nib = require 'nib'
http = require 'http'
path = require 'path'
redis = require 'redis'
stylus = require 'stylus'
server = http.createServer app
ntwitter = require 'ntwitter'
fb = require 'fb'
io = require('socket.io').listen server, log: false

# underscore
_ = underscore = require 'underscore'
_.str = underscore.str = require 'underscore.string'
_.mixin _.str.exports()

# chat library
routes = require './routes'
config = require './configl.json'

# mongoose
mongoose = require 'mongoose'
mongoose.connect config.mongodb.url
model = require './models'

# passport
passport = require 'passport'
passport_twitter = require('passport-twitter').Strategy
passport_facebook = require('passport-facebook').Strategy

# conectados
conectados = 0

passport.serializeUser (user, next) ->
    model.user.serialize user, next

passport.deserializeUser (id, next) ->
    model.user.deserialize id, next

passport.use new passport_twitter config.twitter, (token, tokenSecret, profile, next) ->
    model.user.twitter token, tokenSecret, profile, next

passport.use new passport_facebook config.facebook, (token, tokenSecret, profile, next) ->
    model.user.facebook token, tokenSecret, profile, next

app.configure ->
    app.set 'port', process.env.WWW_PORT || 8080
    app.set 'views', __dirname + '/views'
    app.set 'view engine', 'jade'
    app.use express.logger()
    app.use express.cookieParser()
    app.use express.bodyParser()
    app.use express.methodOverride()
    app.use express.session
        cookie:
            path: '/',
            httpOnly: true,
            maxAge: 31556926000
        secret: 'comu'
    app.use passport.initialize()
    app.use passport.session()
    app.use app.router
    app.use stylus.middleware
        src: __dirname + '/public',
        compile: (str, path) ->
            return stylus(str).set('filename', path).set('compress', true).use nib()
    app.use express.static path.join(__dirname, 'public')

app.configure 'development', ->
    app.use express.errorHandler()

# rutas

app.get '/', routes.index

app.get '/auth/twitter', passport.authenticate('twitter')
app.get '/auth/twitter/callback', passport.authenticate('twitter', successRedirect: '/auth/login', failureRedirect: '/auth/login')

app.get '/auth/facebook', passport.authenticate('facebook', { scope: config.facebook.permissions })
app.get '/auth/facebook/callback', passport.authenticate('facebook', successRedirect: '/auth/login', failureRedirect: '/auth/login')

app.get '/auth/login', routes.login

app.get '/logout', (req, res) ->
    req.logout()
    res.redirect '/'

# correr server

server.listen app.get('port'), ->
    console.log "Express server listening on port " + app.get('port')

# coneccion a redis

redisClient = redis.createClient config.redisdb.port, config.redisdb.host

redisAuth = ->
    redisClient.auth config.redisdb.password
    console.log 'Redis client connected'

redisClient.addListener 'connected', redisAuth
redisClient.addListener 'reconnected', redisAuth
redisAuth()

# socket.io

io.sockets.on 'connection', (client) ->

    conectados++

    # enviar los mensajes al cliente al entrar al sitio
    redisClient.lrange 'mensajes', 0, -1, (err, mensajes) ->
        try
            _.each mensajes, (mensaje) ->
                mensaje = JSON.parse mensaje
                client.emit 'mensajes anteriores', mensaje
        catch error
            console.log '------------------------- start error -------------------------'.red
            console.log error
            console.log '-------------------------- end error --------------------------'.red

    client.on 'mensaje', (data) ->
        model.user.findOne 'username': data.user.name, (err, user) ->

            if user and not _.isBlank data.texto
                data.texto = _.escapeHTML data.texto
                data.location = user.location

                if data.publicar

                    if data.user.provider is 'twitter'
                        hashtag = ' ' + config.twitter.hashtag
                        _length = 140 - hashtag.length
                        tweet = data.texto.substr(0, _length) + hashtag
                        callback = ->

                        twit = new ntwitter
                            consumer_key: config.twitter.consumerKey
                            consumer_secret: config.twitter.consumerSecret
                            access_token_key: user.twitter.token
                            access_token_secret: user.twitter.token_secret

                        twit.verifyCredentials(callback).updateStatus(tweet, callback)

                    else if data.user.provider is 'facebook'
                        mensaje = data.texto + ' ' + config.twitter.hashtag

                        fb.setAccessToken user.facebook.token_secret
                        fb.api 'me/feed', 'post', message: mensaje, (res) ->

                            if !res || res.error
                                console.log !res ? 'error occurred' : res.error
                                return

                io.sockets.emit 'mensaje', data
                data = JSON.stringify data
                redisClient.rpush 'mensajes', data, (err, response) ->
                    # mantener solo los ultimos 100 mensajes de la lista
                    redisClient.ltrim 'mensajes', 0, 49

    client.on 'disconnect', ->
        conectados--
        totalConectados()

    # funciones

    do totalConectados = ->
        return io.sockets.emit 'total conectados', conectados
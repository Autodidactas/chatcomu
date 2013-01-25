mongoose = require 'mongoose'
Schema = mongoose.Schema

staff = [
    'lenincasco'
    'sacrac1'
    'Belkymf'
    'samuelb1311'
    'YutaruHD'
    'felixricarb'
    'Geimsz'
    'hosmelQ'
]

user = new Schema
    username: String
    location: String
    provider: String
    staff: Boolean

    twitter:
        id: Number
        token: String
        token_secret: String

    facebook:
        id: Number
        token_secret: String

    created_at:
        type: Date
        default: Date.now

    banned: Boolean

user.statics.serialize = (user, next) ->
    next null, user._id

user.statics.deserialize = (id, next) ->
    @findOne _id: id, (err, user) ->
        return next null, false if err || user == null
        next null, user

user.statics.twitter = (token, tokenSecret, profile, next) ->
    model = @
    model.findOne 'twitter.id': profile.id, (err, doc) ->
        return next err if err
        # return next null, doc if doc && doc.twitter && doc.twitter.token && doc.twitter.token_secret

        if doc
            
            next null, false if doc.banned
            
            doc.username = profile.username
            doc.location = profile._json.location
            doc.staff = if profile.username in staff then true else false

            doc.save (err) ->
                return throw err if err
                next null, doc
        else
            u = new (mongoose.model 'user')

            u.twitter.id = profile.id
            u.twitter.token = token
            u.twitter.token_secret = tokenSecret
            u.username = u.username = profile.username
            u.location = profile._json.location
            u.provider = profile.provider
            u.staff = if profile.username in staff then true else false

            u.save (err) ->
                return throw err if err
                next null, u

user.statics.facebook = (token, tokenSecret, profile, next) ->
    model = @
    location = if typeof profile._json.location isnt 'undefined' then profile._json.location.name else ''
    model.findOne 'facebook.id': profile.id, (err, doc) ->
        return next err if err
        # return next null, doc unless err || doc == null

        if doc
            
            next null, false if doc.banned

            doc.facebook.username = profile.username
            doc.location = location

            doc.save (err) ->
                return throw err if err
                next null, doc
        else
            u = new (mongoose.model 'user')

            u.facebook.id = profile.id
            u.facebook.token_secret = token
            u.username = u.username = profile.username
            u.location = location
            u.provider = profile.provider

            u.save (err) ->
                return throw err if err
                next null, u

module.exports = mongoose.model 'user', user
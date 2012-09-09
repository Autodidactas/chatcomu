var socket = io.connect('/')

jQuery.timeago.settings.strings = {
    prefixAgo: 'hace',
    prefixFromNow: 'dentro de',
    suffixAgo: '',
    suffixFromNow: '',
    seconds: 'menos de un minuto',
    minute: 'un minuto',
    minutes: '%d minutos',
    hour: 'una hora',
    hours: '%d horas',
    day: 'un dÃ­a',
    days: '%d dÃ­as',
    month: 'un mes',
    months: '%d meses',
    year: 'un aÃ±o',
    years: '%d aÃ±o'
}

// funcion a llamar cuando esta termina de auntenticar

window.userlogin = function (user) {
    if (typeof user == 'undefined' || user === null || typeof user.name == 'undefined' || user.name === null) return
    window.location.reload()
}

// login

$('#login a').live('click', function (e) { 
    e.preventDefault()
    window.open('/auth/' + $(this).attr('id'))
})

// activar - desactivar tonos

if (!localStorage.sound && !$.cookie('sound')) localStorage.sound = 'true' || $.cookie('sound', true)

if (localStorage.sound === 'false' || $.cookie('sound') === 'false') $('#btn-sonido').text('Activar tonos')

$('#btn-sonido').on('click', function () {
    if (localStorage.sound === 'true' || ($.cookie('sound') === 'true')) {
        $(this).text('Activar tonos')
        localStorage.sound = 'false' || $.cookie('sound', false)
    } else {
        $(this).text('Desactivar tonos')
        localStorage.sound = 'true' || $.cookie('sound', true)
    }
})

// enviar mensaje

$('#chat_form').on('submit', function (e) {
    e.preventDefault()
    mensaje.enviar()
})

// salir del chat

$('#salir').on('click', function () {
    $.ajax({
        type: 'GET',
        url: '/logout',

        error: function (err) {
            window.location = '/logout'
        },

        success: function () {
            $('#chat_form').before('<div id="login"><a href="/auth/twitter" title="Conectar con twitter" id="twitter"> Conectar con <strong>twitter</strong></a></div>').remove()
            $('.tip, #nav').remove()
        }
    })
})

// eventos io

socket.on('connect', function () {
    $('#chat_form input:text').attr('disabled', false).focus()
    if (typeof user != 'undefined') socket.emit('nuevo usuario', user.name)
})

socket.on('mensaje', function (data) {
    mensaje.insertar(data)
})

socket.on('mensajes anteriores', function (data) {
    mensaje.insertar(data)
})

socket.on('total conectados', function (total) {
    $('#conectados strong').text(total)
})

socket.on('disconnect', function (total) {
    window.location.reload()
})

// acciones

$('body').on('click', '.action-options', function (e) {
    e.stopPropagation()
    var tweet = $(this).parent().find('.texto p').text()
    var username = $(this).parent().find('.username').text()
    actions.init(tweet, username)

    $(this).append('<div class="dropdown-menu" style="display:block;"><ul><li class="retweet">Retweet</li><li class="tweetuser">Tweet a ' + username + '</li><!--<li class="reportuser">Reportar ' + username + ' de spam</li>--></ul></div>').addClass('visible')
})

$('html').on('click', function () {
    actions.remove()
})

$('body').on('click', '.dropdown-menu li', function (e) {
    actions.remove()
    e.stopPropagation()
})

$('body').on('click', '.retweet', function (e) {
    actions.retweet()
})

$('body').on('click', '.tweetuser', function (e) {
    actions.tweetuser()
})

// $('body').on('click', '.reportuser', function (e) {
//     actions.init(tweet, username)
// })

// funciones

var mensaje = {

    vacio: function (text) {
        var blank = /^\s*$/
        return (text.match(blank) !== null)
    },

    limpiar: function(mensaje) {
        return mensaje.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    },

    enviar: function () {
        var mensaje = $('#chat_form input:text')
        var publicar = $('#chat_form input:checkbox').is(':checked')

        if (!this.vacio(mensaje.val())) socket.emit('mensaje', this.limpiar(mensaje.val()), publicar)
        mensaje.val('').focus()
    },

    insertar: function (data) {
        var style = ''
        var clases = ''
        var mensaje = data.mensaje
        var fecha = new Date(data.timestamp)
        var audio = document.getElementById('audio')

        if (typeof user != 'undefined') {
            if (user.name === data.usuario) {
                clases += ' yo'
                style = 'style="border-left-color:' + user.color + '"'
            }
        }

        if (data.usuario.match(/lenincasco|Belkymf|YutaruHD|felixricarb|Geimsz|hosmelQ/i)) clases += ' staff'

        // urls
        mensaje = mensaje.replace(/(https?:\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&:\/~\+#]*[\w\-\@?^=%&\/~\+#])?)/g, '<a href="$1" title="$1" target="_blank">$1</a>')

        // mensiones
        mensaje = mensaje.replace(/\B@([\w-_]+)/ig, '<a href="http://twitter.com/$1" title="@$1 en twitter" target="_blank">@$1</a>')

        // hashtag
        mensaje = mensaje.replace(/\B#([\w-_]+)/ig, '<a href="https://twitter.com/search/%23$1" title="#$1" target="_blank">#$1</a>')

        // emoticones
        mensaje = mensaje.replace(/[^a-z](:\)|:\(|:p|:D|:o|;\)|8\)|B\||>:\(|:\/|:'\(|3:\)|o:\)|:\*|<3|\^_\^|-_-|o.O|>.<|:v|:3|\(Y\))/gi, '<span title="$1" class="emoticon"></span>')

        $('#mensajes').prepend('<li class="mensaje' + clases + '"' + style + '><div class="avatar"><a href="http://twitter.com/' + data.usuario + '" title="@' + data.usuario + '" target="_blank"><img src="https://api.twitter.com/1/users/profile_image?screen_name=' + data.usuario + '&size=normal" alt="@' + data.usuario + '" height="32" width="32"></a></div><div class="texto"><a href="http://twitter.com/' + data.usuario + '" title="@' + data.usuario + '" target="_blank" class="username">@' + data.usuario + '</a><time datetime="' + fecha.toISOString() + '">' + fecha.toString('HH:mm') + '</time><span class="location">' + data.location + '</span><p>' + mensaje + '</p></div><div class="action-options">•••</div></li>')

        $('time').timeago()

        if (localStorage.sound === 'true' || $.cookie('sound') === 'true') audio.play()
    }
}

var actions = {
    tweet: '',
    username: '',

    init: function (tweet, username) {
        this.tweet = tweet
        this.username = username
    },

    retweet: function () {
        var tweet = 'RT ' + this.username + ': ' + this.tweet + ' '
        $('#chat_form input:text').val(tweet).focus()
    },

    tweetuser: function () {
        $('#chat_form input:text').val(this.username + ' ').focus()
    },

    reportuser: function () {
        $('#chat_form input:text').val(this.username)
    },

    remove: function () {
        if ($('.action-options').hasClass('visible')) {
            $('.action-options').removeClass('visible')
            $('.dropdown-menu').remove()
        }
    }
}
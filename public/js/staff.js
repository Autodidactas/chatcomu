var staff = function (date, username) {
    $('.dropdown-menu[data-timestamp="' + date + '"] ul').append('<li class="bannear">Bannear</li>');

    $('.bannear').on('click', function () {
        socket.emit('bannear', username, user.name);
    });
}
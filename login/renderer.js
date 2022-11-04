$(document).ready(function () {
    mostraNotifiche()
    $(".toast").toast("show");
})

$("#login").click(async function () {
    login = await window.electronAPI.login($('#utente').val(), $('#password').val())
    if (login) {
        window.open('../home/index.html', "_self")
    } else {
        notifichePush({ succ: false, msg: 'Nome utente e password errati' })
    }
})
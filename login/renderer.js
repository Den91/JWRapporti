$("#login").click(async function () {
    login = await window.electronAPI.login($('#utente').val(), $('#password').val())
    if (login) {
        window.open('../home/index.html', "_self")
    } else {
        toast(new Date().getTime(), "rosso", 'Nome utente e password errati', 10000)
    }
})
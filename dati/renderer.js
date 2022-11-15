$(document).ready(async function () {
    navbar("dati")
})

$(window).resize(function () {
    marginBody()
})

$("#upload").click(async function () {
    result = await window.electronAPI.importaFile()
    notifichePush(result)
    mostraNotifiche()
})

$("#import").click(async function () {
    result = await window.electronAPI.importFile()
    notifichePush(result)
    mostraNotifiche()
})

$("#backup").click(async function () {
    result = await window.electronAPI.backupFile()
    notifichePush(result)
    mostraNotifiche()
})
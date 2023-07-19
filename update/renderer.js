let flag = 0

window.electronAPI.update((event, update) => {
    console.log(update)
    switch (update.state) {
        case 'available':
            $('#messaggio').html('Aggiornamento disponibile <br> Download in corso')
            break
        case 'error':
            $('#messaggio').html(update.error)
            break
        case 'progress':
            $('#download').removeClass('d-none')
            $('#transferred').html(formatBytes(update.progress.transferred))
            $('#total').html(formatBytes(update.progress.total))

            $('#barraCompleta').removeClass('d-none')
            $('#barraCompleta').removeClass('d-none')
            percentuale = Number(update.progress.percent) / 2 + flag
            $('#barraProgresso').css('width', percentuale + '%')
            $('#barraProgresso').html(parseFloat(percentuale).toFixed(0) + '%')
            if (Number(update.progress.percent) == 100 && flag == 0) {
                flag = 50
            }
            if (percentuale == 100) {
                $('#barraProgresso').removeClass('progress-bar-striped', 'progress-bar-animated')
                $('#barraProgresso').addClass('bg-success')
            }
            break
        case 'downloaded':
            $('#messaggio').html(`Aggiornamento scaricato<br>Verrà installato alla chiusura dell'applicazione`)
            break
        case 'mac-update':
            $('#messaggio').html('Aggiornamento disponibile <br> Desideri scaricarlo da internet?')
            $('#divPulsanti').removeClass('d-none')
            $('#button-download').attr('onclick', `openBrowserUpdate('${update.link}')`)
            break
    }
})

function closeModalWindow() {
    window.electronAPI.closeModalWindow()
}

function openBrowserUpdate(url) {
    window.electronAPI.openBrowserUpdate(url)
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

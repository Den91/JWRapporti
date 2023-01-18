window.electronAPI.messaggioUpdate((_event, value) => {
    $('#messaggio').html(value)
})

let flag = 0
window.electronAPI.progressoUpdate((_event, value) => {
    $('#download').removeClass('d-none')
    $('#transferred').html(formatBytes(value.transferred))
    $('#total').html(formatBytes(value.total))

    $('#barraCompleta').removeClass('d-none')
    $('#barraCompleta').removeClass('d-none')
    percentuale = Number(value.percent) / 2 + flag
    $('#barraProgresso').css('width', percentuale + '%')
    $('#barraProgresso').html(parseFloat(percentuale).toFixed(0) + '%')
    if (Number(value.percent) == 100 && flag == 0) {
        flag = 50
    }
    if (percentuale == 100) {
        $('#barraProgresso').removeClass('progress-bar-striped', 'progress-bar-animated')
        $('#barraProgresso').addClass('bg-success')
    }
})

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

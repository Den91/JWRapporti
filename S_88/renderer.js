var keysI = ['i1', 'i2', 'i3', 'i4', 'i5']
var keysF = ['f1', 'f2', 'f3', 'f4', 'f5',]
var anno
var anni = [
    getAnnoTeocratico(),
    getAnnoTeocratico() - 1,
    getAnnoTeocratico() - 2
];

function getAnnoTeocratico() {
    let data = new Date()
    let primoSet = new Date(data.getFullYear() + "-09-01")
    if (data < primoSet) {
        return data.getFullYear()
    }
    if (data >= primoSet) {
        return data.getFullYear() + 1
    }
}

$(window).resize(function () {
    marginBody()
})

$(document).ready(async function () {
    navbar("S-88")

    anni.forEach(function (anno, indice) {
        $('[name="selectAnno"]').append(`<option value="${anno}">${anno}</option>`)
    })
    $('[name="selectAnno"]').val(getAnno())
    visualS88()
    mostraNotifiche()
})

$('[name="selectAnno"]').change(function () {
    visualS88()
    sessionStorage.setItem('anno', $(this).val())
})

async function visualS88() {
    anno = $('[name="selectAnno"]').val()
    $('#DivS_88').addClass('d-none')
    $('#buttonS_88').addClass('d-none')
    if (anno != '') {
        $('#DivS_88').removeClass('d-none')
        $('#buttonS_88').removeClass('d-none')
        mesi = mesiAnnoTeocratico(anno)
        sommaI = contaI = 0
        sommaF = contaF = 0
        for (x = 0; x < 12; x++) {
            $(`table:eq(0) tbody tr:eq(${x}) td:eq(${0})`).html(new Date(mesi[x]).toLocaleString('it-IT', {
                year: 'numeric',
                month: 'long'
            }))
            $(`table:eq(1) tbody tr:eq(${x}) td:eq(${0})`).html(new Date(mesi[x]).toLocaleString('it-IT', {
                year: 'numeric',
                month: 'long'
            }))
            presenti = await window.electronAPI.getRows('presenti', { 'Mese': mesi[x] })
            if (presenti.length != 0) {
                totI = cI = 0
                totF = cF = 0
                for (key of keysI) {
                    if (presenti[0][key] != null && presenti[0][key] != '') {
                        totI += Number(presenti[0][key])
                        cI++
                    }
                }
                if (cI > 0) {
                    contaI++
                    sommaI += Number(totI / cI)
                }
                $(`table:eq(0) tbody tr:eq(${x}) td:eq(${1})`).html(cI)
                $(`table:eq(0) tbody tr:eq(${x}) td:eq(${2})`).html(totI)
                $(`table:eq(0) tbody tr:eq(${x}) td:eq(${3})`).html(Number(totI / cI).toFixed(0))
                for (key of keysF) {
                    if (presenti[0][key] != null && presenti[0][key] != '') {
                        totF += Number(presenti[0][key])
                        cF++
                    }
                }
                if (cF > 0) {
                    contaF++
                    sommaF += Number(totF / cF)
                }
                $(`table:eq(1) tbody tr:eq(${x}) td:eq(${1})`).html(cF)
                $(`table:eq(1) tbody tr:eq(${x}) td:eq(${2})`).html(totF)
                $(`table:eq(1) tbody tr:eq(${x}) td:eq(${3})`).html(Number(totF / cF).toFixed(0))
            } else {
                $(`table:eq(0) tbody tr:eq(${x}) td:eq(${1})`).html('')
                $(`table:eq(0) tbody tr:eq(${x}) td:eq(${2})`).html('')
                $(`table:eq(0) tbody tr:eq(${x}) td:eq(${3})`).html('')
                $(`table:eq(1) tbody tr:eq(${x}) td:eq(${1})`).html('')
                $(`table:eq(1) tbody tr:eq(${x}) td:eq(${2})`).html('')
                $(`table:eq(1) tbody tr:eq(${x}) td:eq(${3})`).html('')
            }
        }
        $(`table:eq(0) tfoot tr:eq(0) td:eq(1)`).html(Number(sommaI / contaI).toFixed(0))
        $(`table:eq(1) tfoot tr:eq(0) td:eq(1)`).html(Number(sommaF / contaF).toFixed(0))
    }
}

$('#buttonS_88').click(async function () {
    result = await window.electronAPI.fpdfS88($('#selectAnno').val())
    notifichePush(result)
    mostraNotifiche()
})
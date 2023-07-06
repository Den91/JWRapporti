var keys = ['Pubb', 'Video', 'Ore', 'VU', 'Studi']
var anno
var proc
var proclamatori
var gruppi
var rapporti
var anni = [
    getAnnoTeocratico(),
    getAnnoTeocratico() - 1,
    getAnnoTeocratico() - 2
]

$(window).resize(function () {
    marginBody()
})

$(document).ready(async function () {
    navbar("S-21")

    anni.forEach(function (anno, indice) {
        $('[name="selectAnno"]').append(`<option value="${anno}">${anno}</option>`)
    })
    $('[name="selectAnno"]').val(getAnno())

    anagrafica = await window.electronAPI.readFile('anagrafica')
    proclamatori = anagrafica.filter(item => item.Elimina == '0')
    proclamatori.sort(function (a, b) {
        if (a.Nome < b.Nome)
            return -1
        if (a.Nome > b.Nome)
            return 1
        return 0
    })
    proclamatori.forEach(function (proclamatore, indice) {
        if (proclamatore.Attivo == 1)
            $('optgroup[label="Attivi"]').append(`
                <option value="${proclamatore.id}">${proclamatore.Nome}</option>`)
        if (proclamatore.Attivo == 0)
            $('optgroup[label="Inattivi"]').append(`
                <option value="${proclamatore.id}">${proclamatore.Nome}</option>`)
    })
    $('optgroup[label="Totali"]').append(`
                        <option value="p">Proclamatori</option>`)
    $('optgroup[label="Totali"]').append(`
                        <option value="pa">Pionieri ausiliari</option>`)
    $('optgroup[label="Totali"]').append(`
                        <option value="pr">Pionieri regolari e speciali</option>`)
    $('[name="selectProc"]').val(sessionStorage.getItem('proc'))

    rapporti = await window.electronAPI.readFile('rapporti')

    visualS21()
})

async function visualS21() {
    anno = $('[name="selectAnno"]').val()
    id_proc = $('[name="selectProc"]').val()
    sessionStorage.setItem('anno', anno)
    sessionStorage.setItem('proc', id_proc)
    tot = { n: 0, Pubb: 0, Video: 0, Ore: 0, VU: 0, Studi: 0 }
    $('#div_cartolina').addClass('d-none')
    $('#buttonSingola').addClass('d-none')
    $('#buttonTutte').addClass('d-none')
    if (anno != '' && id_proc != '') {
        $('#div_cartolina').removeClass('d-none')
        $('#buttonSingola').removeClass('d-none')
        $('#buttonTutte').removeClass('d-none')
        if (id_proc == 'p' || id_proc == 'pa' || id_proc == 'pr') {
            $('table thead tr th:eq(1)').html('N')
            if (id_proc == 'p')
                $('#Nome').html('Proclamatori')
            if (id_proc == 'pa')
                $('#Nome').html('Pionieri ausiliari')
            if (id_proc == "pr")
                $('#Nome').html('Pionieri regolari e speciali')
            $('#Nome2').html('')
            $('#D_Nasc').html('')
            $('#D_Batt').html('')
            $('#F').html('<i class="bi bi-circle"></i>')
            $('#M').html('<i class="bi bi-circle"></i>')
            $('#P').html('<i class="bi bi-circle"></i>')
            $('#U').html('<i class="bi bi-circle"></i>')
            $('#SM').html('<i class="bi bi-circle"></i>')
            $('#AN').html('<i class="bi bi-circle"></i>')
            $('#PR').html('<i class="bi bi-circle"></i>')
        } else {
            $('table thead tr th:eq(1)').html('Inc')
            proc = proclamatori.find(item => item.id === Number(id_proc))
            $('#Nome').html(proc.Nome)
            $('#Nome2').html(proc.Nome2)
            if (proc.D_Nasc)
                $('#D_Nasc').html(new Date(proc.D_Nasc).toLocaleString('it-IT', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }))
            else
                $('#D_Nasc').html('')
            if (proc.D_Batt)
                $('#D_Batt').html(new Date(proc.D_Batt).toLocaleString('it-IT', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }))
            else
                $('#D_Batt').html('')
            if (proc.S == 'M') {
                $('#M').html('<i class="bi bi-check-circle"></i>')
                $('#F').html('<i class="bi bi-circle"></i>')
            }
            if (proc.S == 'F') {
                $('#M').html('<i class="bi bi-circle"></i>')
                $('#F').html('<i class="bi bi-check-circle"></i>')
            }
            if (proc.U_AP == 'U') {
                $('#P').html('<i class="bi bi-circle"></i>')
                $('#U').html('<i class="bi bi-check-circle"></i>')
            }
            if (proc.U_AP == 'P') {
                $('#U').html('<i class="bi bi-circle"></i>')
                $('#P').html('<i class="bi bi-check-circle"></i>')
            }
            if (proc.SM_AN == 'AN') {
                $('#SM').html('<i class="bi bi-circle"></i>')
                $('#AN').html('<i class="bi bi-check-circle"></i>')
            }
            if (proc.SM_AN == 'SM') {
                $('#AN').html('<i class="bi bi-circle"></i>')
                $('#SM').html('<i class="bi bi-check-circle"></i>')
            }
            if (proc.PR_PS == 'PR') {
                $('#PR').html('<i class="bi bi-check-circle"></i>')
            } else {
                $('#PR').html('<i class="bi bi-circle"></i>')
            }
        }
        mesi = mesiAnnoTeocratico(anno)
        somma = { 'Pubb': 0, 'Video': 0, 'Ore': 0, 'VU': 0, 'Studi': 0 }
        conta = 0
        for (indice = 0; indice < 12; indice++) {
            $(`table tbody tr:eq(${indice}) td:not(:eq(0))`).html('')
            $(`table tbody tr:eq(${indice}) td:eq(${0})`).html(new Date(mesi[indice]).toLocaleString('it-IT', {
                year: 'numeric',
                month: 'long'
            }))
            if (!isNaN(id_proc)) {
                rapporto = rapporti.filter(item => ((item.Mese == mesi[indice]) && (item.CE_Anag == Number(id_proc))))
                rapporto = rapporto[0]
            } else {
                rapporti_mese = rapporti.filter(item => ((item.Mese == mesi[indice]) && (item.Inc == id_proc)))
                rapporto = {}
                rapporto.N = rapporti_mese.length
                if (rapporti_mese.length != 0) {
                    keys.forEach(function (key, indiceKeys) {
                        rapporto[key] = rapporti_mese.map(item => item[key]).reduce((p, n) => p + n)
                    })
                }
            }
            if (rapporto) {
                $(`table tbody tr:eq(${indice}) td:eq(${1})`).html(rapporto.Inc || rapporto.N)
                if ((rapporto.hasOwnProperty('N') && rapporto.N != 0) || rapporto.hasOwnProperty('Inc')) {
                    conta++
                    keys.forEach(function (key, indiceKeys) {
                        somma[key] += Number(rapporto[key])
                        $(`table tbody tr:eq(${indice}) td:eq(${indiceKeys + 2})`).html(rapporto[key] || '')
                    })
                    $(`table tbody tr:eq(${indice}) td:eq(${7})`).html(rapporto.Note)
                }
            }
        }
        keys.forEach(function (key, indiceKeys) {
            $(`table tbody tr:eq(${12}) th:eq(${indiceKeys + 2})`).html(somma[key])
            $(`table tbody tr:eq(${13}) th:eq(${indiceKeys + 2})`).html(Number(somma[key] / conta).toFixed(2) || '')
        })
    }
}

async function fpdfSingola() {
    if (!isNaN($('#selectProc').val()))
        proc = proclamatori.find(item => item.id === Number(id_proc))
    else {
        proc = { id: $('#selectProc').val() }
        if (proc.id == "p") {
            proc.Nome = 'Proclamatori'
        } else if (proc.id == "pa") {
            proc.Nome = "Pionieri Ausiliari"
        } else if (proc.id == "pr") {
            proc.Nome = "Pionieri Regolari e Speciali"
        }
    }
    result = await window.electronAPI.fpdfS21Singola($('#selectAnno').val(), proc)
    if (result.succ)
        toast(new Date().getTime(), "verde", result.msg)
    else
        toast(new Date().getTime(), "rosso", result.msg)
}

async function fpdfTutte() {
    result = await window.electronAPI.fpdfS21Tutte($('#selectAnno').val())
    if (result.succ)
        toast(new Date().getTime(), "verde", result.msg)
    else
        toast(new Date().getTime(), "rosso", result.msg)
}
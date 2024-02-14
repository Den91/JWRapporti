var keys = ['Pubb', 'Video', 'Ore', 'VU', 'Studi']
var anno
var proc
var proclamatori
var gruppi
var rapporti
var anni

$(window).resize(function () {
    marginBody()
})

$(document).ready(async function () {
    navbar("S-21")

    rapporti = await window.electronAPI.readFile('rapporti')
    mesi = [...new Set(rapporti.map(item => item.Mese))]
    mesi.sort()
    mesi.forEach(function (o, i) {
        m = Number(o.slice(5, 7))
        a = Number(o.slice(0, 4))
        if (m >= 9) {
            a++
        }
        mesi[i] = a
    })
    anni = [...new Set(mesi)]
    anni.forEach(function (a, indice) {
        $('[name="selectAnno"]').append(`<option value="${a}">${a}</option>`)
    })
    if (sessionStorage.getItem('anno')) {
        $('[name="selectAnno"]').val(sessionStorage.getItem('anno'))
    } else {
        $('[name="selectAnno"]').val($('[name="selectAnno"] option:last').val())
    }

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
    gruppi = await window.electronAPI.readFile('gruppi')
    gruppiStranieri = gruppi.filter(item => item.straniero)
    if (gruppiStranieri.length > 0) {
        $('optgroup[label="Parziali"]').removeClass('d-none')
        gruppiStranieri.forEach(function (gruppo, indice) {
            if (gruppo.hasOwnProperty('straniero')) {
                if (gruppo.straniero) {
                    $('optgroup[label="Parziali"]').append(`
                        <option value="p-${gruppo.id}">Proclamatori gr. ${gruppo.Sorv_Gr}</option>`)
                    $('optgroup[label="Parziali"]').append(`
                        <option value="pa-${gruppo.id}">P. ausiliari gr. ${gruppo.Sorv_Gr}</option>`)
                    $('optgroup[label="Parziali"]').append(`
                        <option value="pr-${gruppo.id}">P. regolari gr. ${gruppo.Sorv_Gr}</option>`)
                }
            }
        })
        $('optgroup[label="Parziali"]').append(`
                        <option value="p-ita">Proclamatori italiani</option>`)
        $('optgroup[label="Parziali"]').append(`
                        <option value="pa-ita">P. ausiliari italiani</option>`)
        $('optgroup[label="Parziali"]').append(`
                        <option value="pr-ita">P. regolari gr. italiani</option>`)
    }
    $('optgroup[label="Totali"]').append(`
                        <option value="p">Proclamatori congregazione</option>`)
    $('optgroup[label="Totali"]').append(`
                        <option value="pa">P. ausiliari congregazione</option>`)
    $('optgroup[label="Totali"]').append(`
                        <option value="pr">P. regolari e speciali congregazione</option>`)
    $('optgroup[label="Totali"]').append(`
                        <option value="tt">Totali congregazione</option>`)
    $('[name="selectProc"]').val(sessionStorage.getItem('proc'))
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
        if (isNaN(id_proc)) {
            $('table thead tr th:eq(1)').html('N')
            if (id_proc == 'p')
                $('#Nome').html('Proclamatori congregazione')
            if (id_proc == 'pa')
                $('#Nome').html('Pionieri ausiliari congregazione')
            if (id_proc == "pr")
                $('#Nome').html('Pionieri regolari e speciali congregazione')
            if (id_proc == "tt")
                $('#Nome').html('Totali congregazione')
            if (id_proc.length > 2) {
                gruppoStraniero = id_proc.split('-')
                if (gruppoStraniero[1] == 'ita') {
                    if (gruppoStraniero[0] == 'p') {
                        $('#Nome').html('Proclamatori italiano')
                    }
                    if (gruppoStraniero[0] == 'pa') {
                        $('#Nome').html('Pionieri ausiliari italiano')
                    }
                    if (gruppoStraniero[0] == 'pr') {
                        $('#Nome').html('Pionieri regolari italiano')
                    }
                } else {
                    if (gruppoStraniero[0] == 'p') {
                        $('#Nome').html('Proclamatori gruppo ' +
                            gruppi.find(item => item.id == Number(gruppoStraniero[1])).Sorv_Gr)
                    }
                    if (gruppoStraniero[0] == 'pa') {
                        $('#Nome').html('Pionieri ausiliari gruppo ' +
                            gruppi.find(item => item.id == Number(gruppoStraniero[1])).Sorv_Gr)
                    }
                    if (gruppoStraniero[0] == 'pr') {
                        $('#Nome').html('Pionieri regolari gruppo ' +
                            gruppi.find(item => item.id == Number(gruppoStraniero[1])).Sorv_Gr)
                    }
                }
            }
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
            proc = proclamatori.find(item => item.id == Number(id_proc))
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
            if (isNaN(id_proc)) {
                if (id_proc.length > 2) {
                    gruppoStraniero = id_proc.split('-')
                    if (gruppoStraniero[1] == 'ita') {
                        gruppiStranieri = gruppi.filter(item => item.straniero).map(item => item.id)
                        rapporti_mese = rapporti.filter(item => (
                            (item.Mese == mesi[indice]) &&
                            (item.Inc == gruppoStraniero[0]) &&
                            (!gruppiStranieri.includes(item.Gr))
                        ))
                    } else {
                        rapporti_mese = rapporti.filter(item => (
                            (item.Mese == mesi[indice]) &&
                            (item.Inc == gruppoStraniero[0]) &&
                            (item.Gr == gruppoStraniero[1])
                        ))
                    }
                } else {
                    if (id_proc == "tt") {
                        rapporti_mese = rapporti.filter(item => (item.Mese == mesi[indice]))
                    } else {
                        rapporti_mese = rapporti.filter(item => (
                            (item.Mese == mesi[indice]) &&
                            (item.Inc == id_proc)))
                    }
                }
                rapporto = {}
                rapporto.N = rapporti_mese.length
                if (rapporti_mese.length != 0) {
                    keys.forEach(function (key, indiceKeys) {
                        rapporto[key] = rapporti_mese.map(item => item[key]).reduce((p, n) => p + n)
                    })
                    if (id_proc == "tt") {
                        let p = rapporti_mese.filter(item => item.Inc == 'p')
                        let pa = rapporti_mese.filter(item => item.Inc == 'pa')
                        let pr = rapporti_mese.filter(item => item.Inc == 'pr')
                        let ir = rapporti_mese.filter(item => item.Inc == 'ir')
                        rapporto.Note = `P:${p.length} PA:${pa.length} PR:${pr.length} IR:${ir.length}`
                    }
                }
            } else {
                rapporto = rapporti.filter(item => ((item.Mese == mesi[indice]) && (item.CE_Anag == Number(id_proc))))
                rapporto = rapporto[0]
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
            } else {
                for (x = 1; x < 8; x++) {
                    $(`table tbody tr:eq(${indice}) td:eq(${x})`).html('')
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
    if (isNaN($('#selectProc').val())) {
        proc = { id: $('#selectProc').val() }
        if (proc.id == "p") {
            proc.Nome = 'Proclamatori congregazione'
        }
        if (proc.id == "pa") {
            proc.Nome = "Pionieri ausiliari congregazione"
        }
        if (proc.id == "pr") {
            proc.Nome = "Pionieri regolari e speciali congregazione"
        }
        if (proc.id == "tt") {
            proc.Nome = "Totali congregazione"
        }
        if (proc.id.length > 2) {
            gruppoStraniero = id_proc.split('-')
            if (gruppoStraniero[1] == 'ita') {
                if (gruppoStraniero[0] == 'p') {
                    proc.Nome = 'Proclamatori italiani'
                }
                if (gruppoStraniero[0] == 'pa') {
                    proc.Nome = 'Pionieri ausiliari italiani'
                }
                if (gruppoStraniero[0] == 'pr') {
                    proc.Nome = 'Pionieri regolari italiani'
                }
            } else {
                if (gruppoStraniero[0] == 'p') {
                    proc.Nome = 'Proclamatori gruppo ' +
                        gruppi.find(item => item.id == Number(gruppoStraniero[1])).Sorv_Gr
                }
                if (gruppoStraniero[0] == 'pa') {
                    proc.Nome = 'Pionieri ausiliari gruppo ' +
                        gruppi.find(item => item.id == Number(gruppoStraniero[1])).Sorv_Gr
                }
                if (gruppoStraniero[0] == 'pr') {
                    proc.Nome = 'Pionieri regolari gruppo ' +
                        gruppi.find(item => item.id == Number(gruppoStraniero[1])).Sorv_Gr
                }
            }
        }
    } else {
        proc = proclamatori.find(item => item.id == Number(id_proc))
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
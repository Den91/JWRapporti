var db
var anno
var anni
var keys = ['Ore', 'Studi']

$(document).ready(async function () {
    navbar("S-21")
    db = await window.electronAPI.readFile('db')
    anni = arrayAnniRapporti(db)
    anni.forEach(function (a, indice) {
        $('[name="selectAnno"]').append(`<option value="${a}">${a}</option>`)
    })
    $('[name="selectAnno"]').val(getAnno())

    db.anagrafica.forEach(function (proclamatore, indice) {
        if (proclamatore.Eliminato)
            $('optgroup[label="Eliminati"]').append(`
                <option value="${proclamatore.id}">${proclamatore.Nome}</option>`)
        else {
            if (proclamatore.Attivo)
                $('optgroup[label="Attivi"]').append(`
                    <option value="${proclamatore.id}">${proclamatore.Nome}</option>`)
            if (!proclamatore.Attivo)
                $('optgroup[label="Inattivi"]').append(`
                    <option value="${proclamatore.id}">${proclamatore.Nome}</option>`)
        }
    })
    gruppiStranieri = db.gruppi.filter(item => item.straniero)
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

function visualS21() {
    anno = $('[name="selectAnno"]').val()
    id_proc = $('[name="selectProc"]').val()
    sessionStorage.setItem('anno', anno)
    sessionStorage.setItem('proc', id_proc)
    tot = { n: 0, Ore: 0, Studi: 0 }
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
                            db.gruppi.find(item => item.id == Number(gruppoStraniero[1])).Sorv_Gr)
                    }
                    if (gruppoStraniero[0] == 'pa') {
                        $('#Nome').html('Pionieri ausiliari gruppo ' +
                            db.gruppi.find(item => item.id == Number(gruppoStraniero[1])).Sorv_Gr)
                    }
                    if (gruppoStraniero[0] == 'pr') {
                        $('#Nome').html('Pionieri regolari gruppo ' +
                            db.gruppi.find(item => item.id == Number(gruppoStraniero[1])).Sorv_Gr)
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
            proc = db.anagrafica.find(item => item.id == Number(id_proc))
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
        somma = 0
        for (indice = 0; indice < 12; indice++) {
            $(`table tbody tr:eq(${indice}) td:not(:eq(0))`).html('')
            if (isNaN(id_proc)) {
                if (id_proc == 'p' || id_proc == 'pa') {
                    rap = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mesi[indice] && r.Inc == id_proc) != -1)
                    note = ''
                }
                if (id_proc == 'pr') {
                    rap = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mesi[indice] && (r.Inc == id_proc || r.Inc == 'ps')) != -1)
                    note = ''
                }
                if (id_proc == 'tt') {
                    rap = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mesi[indice]) != -1)
                    let p = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mesi[indice] && r.Inc == 'p') != -1).length
                    let pa = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mesi[indice] && r.Inc == 'pa') != -1).length
                    let pr = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mesi[indice] && r.Inc == 'pr') != -1).length
                    let ps = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mesi[indice] && r.Inc == 'ps') != -1).length
                    let ir = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mesi[indice] && r.Inc == 'ir') != -1).length
                    note = `P:${p} PA:${pa} PR:${pr} PS:${ps} IR:${ir}`
                }
                if (id_proc.length > 2) {
                    gruppoStraniero = id_proc.split('-')
                    if (gruppoStraniero[1] == 'ita') {
                        gruppiStranieri = db.gruppi.filter(item => item.straniero).map(item => item.id)
                        rap = db.anagrafica.filter(
                            p => p.rapporti.findIndex(
                                r => r.Mese == mesi[indice] && r.Inc == gruppoStraniero[0] && !gruppiStranieri.includes(r.Gr)) != -1
                        )
                    } else {
                        rap = db.anagrafica.filter(
                            p => p.rapporti.findIndex(
                                r => r.Mese == mesi[indice] && r.Inc == gruppoStraniero[0] && r.Gr == gruppoStraniero[1]) != -1
                        )
                    }
                    note = ''
                }
                if (rap.length > 0) {
                    rapporto = {
                        N: rap.length,
                        Studi: rap.map(p => {
                            iRap = p.rapporti.findIndex(r => r.Mese == mesi[indice])
                            return p.rapporti[iRap].Studi ? p.rapporti[iRap].Studi : 0
                        }).reduce((p, n) => p + n),
                        Ore: rap.map(p => {
                            iRap = p.rapporti.findIndex(r => r.Mese == mesi[indice])
                            return p.rapporti[iRap].Ore ? p.rapporti[iRap].Ore : 0
                        }).reduce((p, n) => p + n),
                        Note: note
                    }
                } else {
                    rapporto = {
                        N: 0,
                        Studi: 0,
                        Ore: 0
                    }
                }
            } else {
                iRap = proc.rapporti.findIndex(item => item.Mese == mesi[indice])
                rapporto = proc.rapporti[iRap]
            }
            $(`table tbody tr:eq(${indice}) td:eq(${0})`).html(new Date(mesi[indice]).toLocaleString('it-IT', {
                year: 'numeric',
                month: 'long'
            }))
            if (rapporto) {
                //console.log(rapporto)
                if (rapporto.hasOwnProperty('Inc')) {
                    $(`table tbody tr:eq(${indice}) td:eq(${1})`).html(rapporto.Inc)
                    $(`table tbody tr:eq(${indice}) td:eq(2)`).html(rapporto.Studi)
                    if (rapporto.Inc == "pa" || rapporto.Inc == "pr" || rapporto.Inc == "ps") {
                        somma += Number(rapporto.Ore)
                        $(`table tbody tr:eq(${indice}) td:eq(3)`).html(rapporto.Ore)
                    }
                    if (rapporto.Abbuono && rapporto.Abbuono != 0) {
                        $(`table tbody tr:eq(${indice}) td:eq(4)`)
                            .html(rapporto.Note + ' - Abbuono ore: ' + rapporto.Abbuono)
                    } else {
                        $(`table tbody tr:eq(${indice}) td:eq(4)`).html(rapporto.Note)
                    }
                }
                if ((rapporto.hasOwnProperty('N'))) {
                    $(`table tbody tr:eq(${indice}) td:eq(${1})`).html(rapporto.N)
                    $(`table tbody tr:eq(${indice}) td:eq(2)`).html(rapporto.Studi)
                    somma += Number(rapporto.Ore)
                    $(`table tbody tr:eq(${indice}) td:eq(3)`).html(rapporto.Ore)
                    $(`table tbody tr:eq(${indice}) td:eq(4)`).html(rapporto.Note)
                }
            }
        }
        $(`table tbody tr:eq(12) th:eq(3)`).html(somma)
    }
}

async function fpdfSingola() {
    result = await window.electronAPI.fpdfS21Singola($('#selectAnno').val(), $('#selectProc').val())
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
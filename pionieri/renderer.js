var anno
var anni = [
    getAnnoTeocratico(),
    getAnnoTeocratico() - 1,
    getAnnoTeocratico() - 2
]
var pionieri

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
    navbar("pionieri")

    anni.forEach(function (anno, indice) {
        $('[name="selectAnno"]').append(`<option value="${anno}">${anno}</option>`)
    })
    $('[name="selectAnno"]').val(getAnno())
    visualPionieri()
    mostraNotifiche()
})

$('[name="selectAnno"]').change(function () {
    visualPionieri()
    sessionStorage.setItem('anno', $(this).val())
})

async function visualPionieri() {
    anno = $('[name="selectAnno"]').val()
    $('#CardPionieri').addClass('d-none')
    $('#TablePionieri tbody').html(``)
    if (anno != '') {
        $('#CardPionieri').removeClass('d-none')
        $('#TablePionieri thead tr').html('<th>Nome</th>')
        mesi = mesiAnnoTeocratico(anno)
        mesi.forEach(function (mese, indice) {
            $('#TablePionieri thead tr').append(`<th class="text-center">${new Date(mese).toLocaleString('it-IT', {
                month: 'short'
            })}</th>`)
        })
        $('#TablePionieri thead tr').append(`<th class="text-center">Totale</th>`)
        $('#TablePionieri thead tr').append(`<th class="text-center">Media</th>`)
        pionieri = await window.electronAPI.getRows('anagrafica', { 'PR_PS': 'PR' })
        for (pioniere of pionieri) {
            $('#TablePionieri tbody').append(`
                <tr id=${pioniere.id}>
                    <td>
                        ${pioniere.Nome}
                    </td>
                </tr>`)
            $("#TablePionieri tbody tr:last").append(new Array(15).join('<td class="text-center"></td>'));
        }
        for (pioniere of pionieri) {
            conta = somma = 0
            for (x = 0; x < 12; x++) {
                rapporto = await window.electronAPI.getRows('rapporti', { 'Mese': mesi[x], 'CE_Anag': pioniere.id })
                if (rapporto.length != 0) {
                    conta++
                    somma += rapporto[0].Ore
                    $(`#${pioniere.id} td:eq(${x + 1})`)
                        .html(rapporto[0].Ore);
                }
            }
            media = somma / conta
            $(`#${pioniere.id} td:eq(${13})`).html(somma)
            $(`#${pioniere.id} td:eq(${14})`).html(Number(media).toFixed(0))
            if (media >= 70) {
                $(`#${pioniere.id} td:eq(${13})`).addClass(`table-success`)
                $(`#${pioniere.id} td:eq(${14})`).addClass(`table-success`)
            } else {
                $(`#${pioniere.id} td:eq(${13})`).addClass(`table-danger`)
                $(`#${pioniere.id} td:eq(${14})`).addClass(`table-danger`)
            }
        }
    }
}

function mesiAnnoTeocratico(anno) {
    let mesi = []
    let mese = new Date((parseInt(anno) - 1) + "-09")
    for (x = 0; x < 12; x++) {
        mesi.push(`${mese.toLocaleString('it-IT', {
            year: 'numeric'
        })}-${mese.toLocaleString('it-IT', {
            month: '2-digit'
        })}`)
        mese.setMonth(mese.getMonth() + 1);
    }
    return mesi
}
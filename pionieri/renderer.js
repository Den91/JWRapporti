var anno
var anni = [
    getAnnoTeocratico(),
    getAnnoTeocratico() - 1,
    getAnnoTeocratico() - 2
]
var pionieri

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
})

async function visualPionieri() {
    anno = $('[name="selectAnno"]').val()
    sessionStorage.setItem('anno', anno)
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
        proclamatori = await window.electronAPI.readFile('anagrafica')
        rapporti = await window.electronAPI.readFile('rapporti')
        pionieri = proclamatori.filter(item => ((item.PR_PS == 'PR') && (item.Elimina == '0')))
        for (pioniere of pionieri) {
            $('#TablePionieri tbody').append(`
                <tr id=${pioniere.id}>
                    <td>
                        ${pioniere.Nome}
                    </td>
                </tr>`)
            $("#TablePionieri tbody tr:last").append(new Array(15).join('<td class="text-center"></td>'));
            conta = somma = 0
            for (x = 0; x < 12; x++) {
                rapporto = rapporti.filter(item => ((item.Mese == mesi[x]) && (item.CE_Anag == pioniere.id)))
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
            if (media >= 50) {
                $(`#${pioniere.id} td:eq(${13})`).addClass(`table-success`)
                $(`#${pioniere.id} td:eq(${14})`).addClass(`table-success`)
            } else {
                $(`#${pioniere.id} td:eq(${13})`).addClass(`table-danger`)
                $(`#${pioniere.id} td:eq(${14})`).addClass(`table-danger`)
            }
        }
    }
}
var presenti
var keysI = ['i1', 'i2', 'i3', 'i4', 'i5']
var keysF = ['f1', 'f2', 'f3', 'f4', 'f5',]

$(window).resize(function () {
    marginBody()
})

$(document).ready(async function () {
    navbar("presenti")
    $('[name="mese"]').val(getMese())
    visualPresenti($('[name="mese"]').val())
    mostraNotifiche()
})

$('[name="mese"]').change(function () {
    visualPresenti($(this).val())
    sessionStorage.setItem('mese', $(this).val())
})

async function visualPresenti(mese) {
    if (mese != "") {
        presenti = await window.electronAPI.getRows('presenti', { 'Mese': mese })
        htmlPresenti(presenti)
    }
}

function htmlPresenti(presenti) {
    $("#TablePresenti tbody").html('')
    if (presenti.length != 0) {
        $("#TablePresenti tbody").append(`
            <tr>
                <td>Adunanza infrasettimanale</td>
                <td class="text-center"></td>
                <td class="text-center"></td>
                <td class="text-center"></td>
                <td class="text-center"></td>
                <td class="text-center"></td>
                <td class="text-center"></td>
                <td class="text-center"></td>
            </tr>`)
        $("#TablePresenti tbody").append(`
            <tr>
                <td>Adunanza fine settimana</td>
                <td class="text-center"></td>
                <td class="text-center"></td>
                <td class="text-center"></td>
                <td class="text-center"></td>
                <td class="text-center"></td>
                <td class="text-center"></td>
                <td class="text-center"></td>
            </tr>`)
        totI = cI = 0
        totF = cF = 0
        console.log(presenti[0])
        keysI.forEach(function (key, indice) {
            if (presenti[0][key] != '') {
                $(`#TablePresenti tbody tr:eq(0) td:eq(${indice + 1})`).html(presenti[0][key])
                totI += Number(presenti[0][key])
                cI++
            }
        })
        keysF.forEach(function (key, indice) {
            if (presenti[0][key] != '') {
                $(`#TablePresenti tbody tr:eq(1) td:eq(${indice + 1})`).html(presenti[0][key])
                totF += Number(presenti[0][key])
                cF++
            }
        })
        mI = totI / cI
        mF = totF / cF
        $(`#TablePresenti tbody tr:eq(0) td:eq(6)`).html(totI)
        $(`#TablePresenti tbody tr:eq(0) td:eq(7)`).html(mI.toFixed(0))
        $(`#TablePresenti tbody tr:eq(1) td:eq(6)`).html(totF)
        $(`#TablePresenti tbody tr:eq(1) td:eq(7)`).html(mF.toFixed(0))
    }
}

function modalPresenti() {
    $("#FormPresenti").trigger("reset")
    date = new Date($('[name="mese"]').val())
    $("#ModalPresentiTitle").html(`Presenti - ${date.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}`)
    if (presenti.length != 0) {
        $(`#i1`).val(presenti[0].i1)
        $(`#i2`).val(presenti[0].i2)
        $(`#i3`).val(presenti[0].i3)
        $(`#i4`).val(presenti[0].i4)
        $(`#i5`).val(presenti[0].i5)
        $(`#f1`).val(presenti[0].f1)
        $(`#f2`).val(presenti[0].f2)
        $(`#f3`).val(presenti[0].f3)
        $(`#f4`).val(presenti[0].f4)
        $(`#f5`).val(presenti[0].f5)
        $('#EliminaPresenti').removeClass('d-none')
    }
    $("#ModalPresenti").modal("show");
}

$('#SalvaPresenti').click(async function () {
    if ($('input.presenti').filter(function () { return $(this).val() == "" }).length != 10) {
        if (presenti.length != 0) {
            console.log('Modifica')
            result = await window.electronAPI.updateRow(
                'presenti',
                {
                    'Mese': $('[name="mese"]').val(),
                    'i1': $(`#i1`).val(),
                    'i2': $(`#i2`).val(),
                    'i3': $(`#i3`).val(),
                    'i4': $(`#i4`).val(),
                    'i5': $(`#i5`).val(),
                    'f1': $(`#f1`).val(),
                    'f2': $(`#f2`).val(),
                    'f3': $(`#f3`).val(),
                    'f4': $(`#f4`).val(),
                    'f5': $(`#f5`).val(),
                },
                { 'id': presenti[0].id }
            )
        } else {
            console.log('Inserisci')
            result = await window.electronAPI.insertTableContent(
                'presenti',
                {
                    'Mese': $('[name="mese"]').val(),
                    'i1': $(`#i1`).val(),
                    'i2': $(`#i2`).val(),
                    'i3': $(`#i3`).val(),
                    'i4': $(`#i4`).val(),
                    'i5': $(`#i5`).val(),
                    'f1': $(`#f1`).val(),
                    'f2': $(`#f2`).val(),
                    'f3': $(`#f3`).val(),
                    'f4': $(`#f4`).val(),
                    'f5': $(`#f5`).val(),
                }
            )
        }
    } else {
        if (presenti.length != 0) {
            console.log('Cancella record')
            result = await window.electronAPI.deleteRow(
                'presenti',
                { 'id': presenti[0].id }
            )
        }
    }
    if (result.succ)
        result.msg = 'Presenti salvati'
    notifichePush(result)
})

$('#EliminaPresenti').click(async function () {
    result = await window.electronAPI.deleteRow(
        'presenti',
        { 'id': Number(presenti[0].id) }
    )
    if (result.succ)
        result.msg = 'Presenti salvati'
    notifichePush(result)
    location.reload()
})
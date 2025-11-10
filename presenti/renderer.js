var db
var mese
var keysI = ['i1', 'i2', 'i3', 'i4', 'i5']
var keysF = ['f1', 'f2', 'f3', 'f4', 'f5',]

$(document).ready(async function () {
    navbar("presenti")
    $('[name="mese"]').val(getMese())
    loadPage()
})

async function loadPage() {
    db = await window.electronAPI.readFile('db')
    mese = $('[name="mese"]').val()
    sessionStorage.setItem('mese', mese)
    if (mese != "") {
        index = db.presenti.findIndex(item => item.Mese == mese)
        $("#TablePresenti tbody").html('')
        if (index != -1) {
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
            keysI.forEach(function (key, indice) {
                if (db.presenti[index][key] != null && db.presenti[index][key] != "") {
                    $(`#TablePresenti tbody tr:eq(0) td:eq(${indice + 1})`).html(db.presenti[index][key])
                    if (!isNaN(Number(db.presenti[index][key]))) {
                        totI += Number(db.presenti[index][key])
                        cI++
                    }
                }
            })
            keysF.forEach(function (key, indice) {
                if (db.presenti[index][key] != null && db.presenti[index][key] != "") {
                    $(`#TablePresenti tbody tr:eq(1) td:eq(${indice + 1})`).html(db.presenti[index][key])
                    if (!isNaN(Number(db.presenti[index][key]))) {
                        totF += Number(db.presenti[index][key])
                        cF++
                    }
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
}

function modalPresenti() {
    $("#FormPresenti").trigger("reset")
    $("#ModalPresentiTitle").html(`Presenti - ${new Date(mese).toLocaleString('it-IT', { month: 'long', year: 'numeric' })}`)
    index = db.presenti.findIndex(item => item.Mese == mese)
    if (index != -1) {
        $(`#i1`).val(db.presenti[index].i1)
        $(`#i2`).val(db.presenti[index].i2)
        $(`#i3`).val(db.presenti[index].i3)
        $(`#i4`).val(db.presenti[index].i4)
        $(`#i5`).val(db.presenti[index].i5)
        $(`#f1`).val(db.presenti[index].f1)
        $(`#f2`).val(db.presenti[index].f2)
        $(`#f3`).val(db.presenti[index].f3)
        $(`#f4`).val(db.presenti[index].f4)
        $(`#f5`).val(db.presenti[index].f5)
        $('#EliminaPresenti').removeClass('d-none')
    }
    $("#ModalPresenti").modal("show")
}

async function salvaPresenti() {
    if ($('input.presenti').filter(function () { return $(this).val() == "" }).length != 10) {
        $("#ModalPresenti").modal("hide")
        index = db.presenti.findIndex(item => item.Mese == mese)
        if (index != -1) {
            console.log('Modifica')
            db.presenti[index].i1 = $(`#i1`).val() == '' ? null : $(`#i1`).val()
            db.presenti[index].i2 = $(`#i2`).val() == '' ? null : $(`#i2`).val()
            db.presenti[index].i3 = $(`#i3`).val() == '' ? null : $(`#i3`).val()
            db.presenti[index].i4 = $(`#i4`).val() == '' ? null : $(`#i4`).val()
            db.presenti[index].i5 = $(`#i5`).val() == '' ? null : $(`#i5`).val()
            db.presenti[index].f1 = $(`#f1`).val() == '' ? null : $(`#f1`).val()
            db.presenti[index].f2 = $(`#f2`).val() == '' ? null : $(`#f2`).val()
            db.presenti[index].f3 = $(`#f3`).val() == '' ? null : $(`#f3`).val()
            db.presenti[index].f4 = $(`#f4`).val() == '' ? null : $(`#f4`).val()
            db.presenti[index].f5 = $(`#f5`).val() == '' ? null : $(`#f5`).val()
        } else {
            console.log('Inserisci')
            var id = new Date().getTime()
            db.presenti.push({
                'Mese': mese,
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
                'id': id
            })
        }
        try {
            result = await window.electronAPI.writeFile('db', db)
        } catch (e) {
            loadPage()
            toast(new Date().getTime(), "rosso", e, 10000)
            return
        }
        toast(new Date().getTime(), "verde", `Presenti salvati`)
        loadPage()
    }
}

async function eliminaPresenti() {
    $("#ModalPresenti").modal("hide")
    index = db.presenti.findIndex(item => item.Mese == mese)
    db.presenti.splice(index, 1)
    try {
        result = await window.electronAPI.writeFile('db', db)
    } catch (e) {
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    toast(new Date().getTime(), "verde", `Presenti eliminati`)
    loadPage()
}
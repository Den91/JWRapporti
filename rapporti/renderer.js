var gruppi
var proclamatori
var rapporti

$(window).resize(function () {
    marginBody()
})

$("th").click(function () {
    ordinaTabella(this);
})

$(document).ready(async function () {
    navbar("rapporti")
    $('[name="mese"]').val(getMese())
    loadPage()
})

async function loadPage() {
    mese = $('[name="mese"]').val()
    sessionStorage.setItem('mese', mese)
    gruppi = await window.electronAPI.readFile('gruppi')
    proclamatori = await window.electronAPI.readFile('anagrafica')
    proclamatori.sort(function (a, b) {
        if (a.Nome < b.Nome)
            return -1
        if (a.Nome > b.Nome)
            return 1
        return 0
    })
    $("#FormRapporti").html(``)
    $("#TBodyRapporti").html('')
    $('#buttonPDF').addClass('d-none')
    if (mese != "") {
        rapporti = await window.electronAPI.readFile('rapporti')
        rapporti_mese = rapporti.filter(rapporto => rapporto.Mese == mese)
        if (rapporti_mese.length != 0) {
            $('#buttonPDF').removeClass('d-none')
            rapporti_mese.forEach(function (rapporto, indice) {
                proc = proclamatori.find(item => item.id === rapporto.CE_Anag)
                $("#TBodyRapporti").append(`
                    <tr>
                        <td class="nomeProc">${proc.Nome}</td>
                        <td class="text-center">${rapporto.Inc}</td>
                        <td class="text-center">${rapporto.Pubb || ""}</td>
                        <td class="text-center">${rapporto.Video || ""}</td>
                        <td class="text-center">${rapporto.Ore || ""}</td>
                        <td class="text-center">${rapporto.VU || ""}</td>
                        <td class="text-center">${rapporto.Studi || ""}</td>
                        <td>${rapporto.Note}</td>
                    </tr>`)
            })
            $("table:eq(0) th:eq(0)")[0].asc = null
            ordinaTabella($("table:eq(0) th:eq(0)")[0])
        }
    }
}

function modalRapporti(mese) {
    $("#FormRapporti").html(``)
    $("#ModalRapportiTitle").html(`Rapporti - ${new Date(mese).toLocaleString('it-IT', { month: 'long', year: 'numeric' })}`)
    gruppi.forEach(function (gruppo, indice) {
        $("#FormRapporti").append(`
            <div id="DivGruppo${gruppo.id}" class="d-none DivGruppi">
                <h5>Gruppo ${gruppo.Num} - ${gruppo.Sorv_Gr}</h5>
            </div>`);
    })
    $("#FormRapporti").append(`
        <div id="DivNoGruppo" class="d-none DivGruppi">
            <h5>Senza gruppo</h5>
        </div>
        <div id="DivInattivi" class="d-none DivGruppi">
            <h5>Inattivi</h5>
        </div>
        <div id="DivEliminati" class="d-none DivGruppi">
            <h5>Eliminati</h5>
        </div>
        `)
    rapporti_mese = rapporti.filter(rapporto => rapporto.Mese == mese)
    proclamatori.forEach(function (proclamatore, indice) {
        var rapporto = null
        if (rapporti_mese) {
            rapporto = rapporti_mese.find(item => item.CE_Anag === proclamatore.id)
        }
        if (proclamatore.Elimina == 1) {
            if (rapporto) {
                $("#DivEliminati").removeClass('d-none').append(htmlRapporto(proclamatore, rapporto))
            }
        } else {
            if (proclamatore.Attivo == 0) {
                $("#DivInattivi").removeClass('d-none').append(htmlRapporto(proclamatore, rapporto))
            } else {
                if (proclamatore.Gr != '')
                    $("#DivGruppo" + proclamatore.Gr).removeClass('d-none').append(htmlRapporto(proclamatore, rapporto))
                else {
                    $("#DivNoGruppo").removeClass('d-none').append(htmlRapporto(proclamatore, rapporto))
                }
            }
        }
    })
    $("#FormRapporti div.DivGruppi:not(.d-none):not(:last)").append('<hr class="mt-1">')
    $("#ModalRapporti").modal("show");
}

function htmlRapporto(proclamatore, rapporto) {
    return `<div class="row g-2 mb-3">
        <input type="hidden" name="CP_Anag" value="${proclamatore.id}">
        <input type="hidden" name="CP_Rap" value="${rapporto ? rapporto.id : ""}">
        <div class="col-3 align-self-center">
            ${proclamatore.Nome}
        </div>
        <div class="col-1">
            <div class="form-floating">
                <select 
                    class="form-select"
                    id="Inc-${proclamatore.id}" 
                    name="Inc[]" 
                    value=""
                    onchange="convalida(this)"
                >
                    <option value=""></option>
                    <option value="p" ${rapporto ? rapporto.Inc == "p" ? "selected" : "" : ""}>p</option>
                    <option value="pa" ${rapporto ? rapporto.Inc == "pa" ? "selected" : "" : ""}>pa</option>
                    <option value="pr" ${rapporto ? rapporto.Inc == "pr" ? "selected" : "" : ""}>pr</option>
                    <option value="ps" ${rapporto ? rapporto.Inc == "ps" ? "selected" : "" : ""}>ps</option>
                    <option value="ir" ${rapporto ? rapporto.Inc == "ir" ? "selected" : "" : ""}>ir</option>
                </select>
                <label for="Inc${proclamatore.id}">Inc.</label>                             
            </div>
        </div>
        <div class="col-1">
            <div class="form-floating">
                <input
                    type="number"
                    class="form-control"
                    name="Pubb[]"
                    id="Pubb-${proclamatore.id}" 
                    value="${rapporto ? rapporto.Pubb : ""}" 
                    min="0" maxlength="5"
                    onchange="convalida(this)"
                >
                <label for="Pubb">Pubb.</label>
            </div>
        </div>
        <div class="col-1">
            <div class="form-floating">
                <input
                    type="number"
                    class="form-control"
                    name="Video[]"
                    id="Video-${proclamatore.id}" 
                    value="${rapporto ? rapporto.Video : ""}" 
                    min="0" 
                    maxlength="5"
                    onchange="convalida(this)"
                >
                <label for="Video">Video</label>
            </div>
        </div>
        <div class="col-1">
            <div class="form-floating">
                <input 
                    type="number"
                    class="form-control"
                    name="Ore[]"
                    id="Ore-${proclamatore.id}" 
                    value="${rapporto ? rapporto.Ore : ""}" 
                    min="0" 
                    maxlength="5"
                    step="0.25" 
                    onchange="convalida(this)"
                >
                <label for="Ore">Ore</label>
            </div>
        </div>
        <div class="col-1">
            <div class="form-floating">
                <input
                    type="number"
                    class="form-control"
                    name="VU[]"
                    id="VU-${proclamatore.id}" 
                    value="${rapporto ? rapporto.VU : ""}" 
                    min="0" 
                    maxlength="5"
                    onchange="convalida(this)"
                >
                <label for="VU">Visite</label>
            </div>
        </div>
        <div class="col-1">
            <div class="form-floating">
                <input
                    type="number"
                    class="form-control"
                    name="Studi[]"
                    id="Studi-${proclamatore.id}" 
                    value="${rapporto ? rapporto.Studi : ""}" 
                    min="0" 
                    maxlength="5"
                    onchange="convalida(this)"
                >
                <label for="Studi">Studi</label>
            </div>
        </div>
        <div class="col-3">
            <div class="form-floating">
                <input
                    type="text"
                    class="form-control"
                    name="Note[]"
                    id="Note-${proclamatore.id}"
                    value="${rapporto ? rapporto.Note : ""}"
                    onchange="convalida(this)"
                >
                <label for="Note">Note</label>
            </div>
        </div>
    </div>`
}

async function salvaRapporti() {
    if ($('#FormRapporti .is-invalid').length > 0) {
        //se ci sono errori, non salvare
        $("#ModalRapporti").animate({
            scrollTop: $('#FormRapporti .is-invalid').offset().top
        }, 2000);
        return
    }
    $("#ModalRapporti").modal("hide")
    $("[name='CP_Anag']").each(async function (indice, CP_Anag) {
        CP_Anag = $(CP_Anag).val()
        if ($("#Inc-" + CP_Anag).val() == "") {
            if ($(`[name='CP_Rap']:eq(${indice})`).val() != "") {
                console.log('Cancella record')
                let n = rapporti.findIndex((item) => item.id === Number($(`[name='CP_Rap']:eq(${indice})`).val()))
                rapporti.splice(n, 1)
            }
        } else {
            if ($(`[name='CP_Rap']:eq(${indice})`).val() == "") {
                console.log('Inserisci')
                var id = new Date().getTime()
                // controlla se l'id è già presente
                for (let i = 0; i < rapporti.length; i++) {
                    if (rapporti[i].id == id) {
                        await sleep(2)
                        id = new Date().getTime()
                    }
                }
                rapporti.push({
                    'CE_Anag': Number(CP_Anag),
                    'Mese': $('[name="mese"]').val(),
                    'Inc': $('#Inc-' + CP_Anag).val(),
                    'Pubb': Number($('#Pubb-' + CP_Anag).val()),
                    "Video": Number($('#Video-' + CP_Anag).val()),
                    "Ore": Number($('#Ore-' + CP_Anag).val()),
                    "VU": Number($('#VU-' + CP_Anag).val()),
                    "Studi": Number($('#Studi-' + CP_Anag).val()),
                    "Note": $('#Note-' + CP_Anag).val(),
                    'id': id
                })
            } else {
                console.log('Modifica')
                let n = rapporti.findIndex((item) => item.id === Number($(`[name='CP_Rap']:eq(${indice})`).val()))
                rapporti[n].CE_Anag = Number(CP_Anag)
                rapporti[n].Mese = $('[name="mese"]').val()
                rapporti[n].Inc = $('#Inc-' + CP_Anag).val()
                rapporti[n].Pubb = Number($('#Pubb-' + CP_Anag).val())
                rapporti[n].Video = Number($('#Video-' + CP_Anag).val())
                rapporti[n].Ore = Number($('#Ore-' + CP_Anag).val())
                rapporti[n].VU = Number($('#VU-' + CP_Anag).val())
                rapporti[n].Studi = Number($('#Studi-' + CP_Anag).val())
                rapporti[n].Note = $('#Note-' + CP_Anag).val()
            }
        }
    })
    try {
        result = await window.electronAPI.writeFile('rapporti', rapporti)
    } catch (e) {
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    toast(new Date().getTime(), "verde", `Dati salvati`)
    loadPage()
}

async function fpdfRapporti() {
    result = await window.electronAPI.fpdfRapporti($('#mese').val())
    if (result.succ)
        toast(new Date().getTime(), "verde", result.msg)
    else
        toast(new Date().getTime(), "rosso", result.msg)
}

async function convalida(dato) {
    input = dato.id.split('-')[0]
    CP_Anag = dato.id.split('-')[1]
    if (input == "Ore") {
        if ($("#Inc-" + CP_Anag).val() == '') {
            if ($("#Ore-" + CP_Anag).val() == 0 && $("#Ore-" + CP_Anag).val() != '') {
                $("#Inc-" + CP_Anag).val("ir")
                if ($("#Note-" + CP_Anag).val() == '') {
                    irr = await irregolare(CP_Anag)
                    $("#Note-" + CP_Anag).val(`Irregolare ${irr}° mese`)
                }
            }
            if ($("#Ore-" + CP_Anag).val() > 0) {
                proc = proclamatori.find(item => item.id === Number(CP_Anag));
                if (proc.PR_PS == "") {
                    $("#Inc-" + CP_Anag).val("p")
                }
                if (proc.PR_PS == "PR") {
                    $("#Inc-" + CP_Anag).val("pr")
                }
                if (proc.PR_PS == "PS") {
                    $("#Inc-" + CP_Anag).val("ps")
                }
            }
        }
        if ($("#Ore-" + CP_Anag).val() == '') {
            $("#Inc-" + CP_Anag).val('')
        }
    }
    if (input == "Studi" || input == "VU") {
        if (Number($("#Studi-" + CP_Anag).val()) > Number($("#VU-" + CP_Anag).val())) {
            $("#Studi-" + CP_Anag).addClass("is-invalid")
        } else {
            $("#Studi-" + CP_Anag).removeClass("is-invalid")
        }
    }
    if (input == "Inc") {
        if ($("#Inc-" + CP_Anag).val() == "ir") {
            $("#Ore-" + CP_Anag).val('0')
            if ($("#Note-" + CP_Anag).val() == '') {
                irr = await irregolare(CP_Anag)
                $("#Note-" + CP_Anag).val(`Irregolare ${irr}° mese`)
            }
        }
        if ($("#Inc-" + CP_Anag).val() == "") {
            $("#Pubb-" + CP_Anag).val('')
            $("#Video-" + CP_Anag).val('')
            $("#Ore-" + CP_Anag).val('')
            $("#VU-" + CP_Anag).val('')
            $("#Studi-" + CP_Anag).val('')
            $("#Note-" + CP_Anag).val('')
        }
    }
}

async function irregolare(id) {
    let x = 1
    let rapporto
    let irr = true
    let mese = new Date($('[name="mese"]').val())

    while (irr) {
        mese.setMonth(mese.getMonth() - 1)
        rapporto = rapporti.find(item => (
            (item.CE_Anag == id) &&
            (item.Mese == `${mese.toLocaleString('it-IT', { year: 'numeric' })}-${mese.toLocaleString('it-IT', { month: '2-digit' })}`)
        ))
        console.log(`${mese.toLocaleString('it-IT', { year: 'numeric' })}-${mese.toLocaleString('it-IT', { month: '2-digit' })}`)
        console.log(rapporto)
        if (rapporto == undefined) {
            irr = false
        } else {
            if (rapporto.Inc == "ir") {
                x++
            } else {
                irr = false
            }
        }
    }
    return x
}
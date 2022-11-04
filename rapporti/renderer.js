var gruppi
var proclamatori
var rapporti

$(window).resize(function () {
    marginBody()
})

$(document).ready(async function () {
    navbar("rapporti")
    $('[name="mese"]').val(getMese())
    gruppi = await window.electronAPI.getAll('gruppi')
    proclamatori = await window.electronAPI.getAll('anagrafica')
    proclamatori.sort(function (a, b) {
        if (a.Nome < b.Nome)
            return -1
        if (a.Nome > b.Nome)
            return 1
        return 0
    })
    visualRapporti($('[name="mese"]').val())
    mostraNotifiche()
})

$("th").click(function () {
    ordinaTabella(this);
})

$('[name="mese"]').change(function () {
    visualRapporti($(this).val())
    sessionStorage.setItem('mese', $(this).val())
})

async function visualRapporti(mese) {
    $("#FormRapporti").html(``)
    $("#TBodyRapporti").html('')
    $('#buttonPDF').addClass('d-none')
    if (mese != "") {
        rapporti = await window.electronAPI.getRows('rapporti', { 'Mese': mese })
        if (rapporti.length != 0) {
            $('#buttonPDF').removeClass('d-none')
            rapporti.forEach(function (rapporto, indice) {
                proc = proclamatori.find(item => item.id === rapporto.CE_Anag)
                $("#TBodyRapporti").append(`
                    <tr onclick="modalProclamatore()">
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

function modalRapporti() {
    $("#FormRapporti").html(``)
    let date = new Date($('[name="mese"]').val());
    $("#ModalRapportiTitle").html(`Rapporti - ${date.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}`)
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
        `);
    proclamatori.forEach(function (proclamatore, indice) {
        rapporto = null
        if (rapporti) {
            rapporto = rapporti.find(item => item.CE_Anag === proclamatore.id)
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
    //onchange="convalida(this)"
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
                    id="Note-${proclamatore.id}" v
                    alue="${rapporto ? rapporto.Note || "" : ""}"
                    onchange="convalida(this)"
                >
                <label for="Note">Note</label>
            </div>
        </div>
    </div>`
}

//$('#FormRapporti').submit(async function (e) {
$('#SalvaRapporti').click(async function () {
    $("[name='CP_Anag']").each(async function (indice, CP_Anag) {
        CP_Anag = $(CP_Anag).val()
        if ($("#Inc-" + CP_Anag).val() == "") {
            if ($(`[name='CP_Rap']:eq(${indice})`).val() != "") {
                console.log('Cancella record')
                result = await window.electronAPI.deleteRow(
                    'rapporti',
                    { 'id': parseInt($(`[name='CP_Rap']:eq(${indice})`).val()) }
                )
            }
        } else {
            if ($(`[name='CP_Rap']:eq(${indice})`).val() == "") {
                console.log('Inserisci')
                result = await window.electronAPI.insertTableContent(
                    'rapporti',
                    {
                        'CE_Anag': parseInt(CP_Anag),
                        'Mese': $('[name="mese"]').val(),
                        'Inc': $('#Inc-' + CP_Anag).val(),
                        'Pubb': parseInt($('#Pubb-' + CP_Anag).val()),
                        "Video": parseInt($('#Video-' + CP_Anag).val()),
                        "Ore": parseInt($('#Ore-' + CP_Anag).val()),
                        "VU": parseInt($('#VU-' + CP_Anag).val()),
                        "Studi": parseInt($('#Studi-' + CP_Anag).val()),
                        "Note": $('#Note-' + CP_Anag).val(),
                    }
                )
            } else {
                console.log('Modifica')
                result = await window.electronAPI.updateRow(
                    'rapporti',
                    {
                        'CE_Anag': parseInt(CP_Anag),
                        'Mese': $('[name="mese"]').val(),
                        'Inc': $('#Inc-' + CP_Anag).val(),
                        'Pubb': parseInt($('#Pubb-' + CP_Anag).val()),
                        "Video": parseInt($('#Video-' + CP_Anag).val()),
                        "Ore": parseInt($('#Ore-' + CP_Anag).val()),
                        "VU": parseInt($('#VU-' + CP_Anag).val()),
                        "Studi": parseInt($('#Studi-' + CP_Anag).val()),
                        "Note": $('#Note-' + CP_Anag).val(),
                    },
                    { 'id': parseInt($(`[name='CP_Rap']:eq(${indice})`).val()) }
                )
            }
        }
    })
    if (result.succ)
        result.msg = 'Rapporti salvati'
    notifichePush(result)
})

$('#buttonPDF').click(async function fpdfSingola() {
    result = await window.electronAPI.fpdfRapporti($('#mese').val())
    console.log(result)
    notifichePush(result)
    mostraNotifiche()
})

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
    }
}

async function irregolare(id) {
    let x = 1
    let rapporto
    let irr = true
    let mese = new Date($('[name="mese"]').val())

    while (irr) {
        mese.setMonth(mese.getMonth() - 1);
        rapporto = await window.electronAPI.getRows('rapporti',
            {
                'Mese': `${mese.toLocaleString('it-IT', {
                    year: 'numeric'
                })}-${mese.toLocaleString('it-IT', {
                    month: '2-digit'
                })}`,
                'CP_Anag': id
            })
        if (rapporto.Inc == "ir") {
            x++
        } else {
            irr = false
        }
    }
    return x
}
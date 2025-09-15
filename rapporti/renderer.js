var gruppi
var proclamatori
var rapporti

$(window).resize(function () {
    marginBody()
})

$("th").click(function () {
    ordinaTabella(this);
})

$(document).on("mouseover", 'tr',
    function () {
        $(this).find('.hover-btn').removeClass('d-none')
    }
).on("mouseout", 'tr',
    function () {
        $(this).find('.hover-btn').addClass('d-none')
    }
)

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
        if (mese < "2023-10") {
            $("#THeadRapporti").html(`
                    <tr>
                        <th>Gr <span></span></th>
                        <th>Nome <span></span></th>
                        <th class="text-center">Inc. <span></span></th>
                        <th class="text-center">Pubb. <span></span></th>
                        <th class="text-center">Video <span></span></th>
                        <th class="text-center">Ore <span></span></th>
                        <th class="text-center">Visite <span></span></th>
                        <th class="text-center">Studi <span></span></th>
                        <th>Note <span></span></th>
                    </tr>
                `)
        } else {
            $("#THeadRapporti").html(`
                    <tr>
                        <th>Gr <span></span></th>
                        <th>Nome <span></span></th>
                        <th class="text-center">Inc. <span></span></th>
                        <th class="text-center">Ore <span></span></th>
                        <th class="text-center">Studi <span></span></th>
                        <th>Note <span></span></th>
                    </tr>
                `)
        }
        rapporti = await window.electronAPI.readFile('rapporti')
        rapporti.sort(function (a, b) {
            if (a.Mese < b.Mese)
                return 1
            if (a.Mese > b.Mese)
                return -1
            return 0
        })
        rapporti_mese = rapporti.filter(rapporto => rapporto.Mese == mese)
        if (rapporti_mese.length != 0) {
            $('#buttonPDF').removeClass('d-none')
            if (mese < "2023-10") {
                for (rapporto of rapporti_mese) {
                    proc = proclamatori.find(item => item.id == rapporto.CE_Anag)
                    if (rapporto.Gr == null) {
                        gruppo = ''
                    } else {
                        gruppo = gruppi.find(item => item.id == rapporto.Gr)
                        if (gruppo != undefined) {
                            gruppo = gruppo.Num
                        } else {
                            gruppo = ''
                        }
                    }
                    $("#TBodyRapporti").append($('<tr></tr>'))
                    $("#TBodyRapporti tr:last").append($(`<td>${gruppo}</td>`))
                    $("#TBodyRapporti tr:last").append($(`<td class="nomeProc">${proc.Nome}</td>`))
                    $("#TBodyRapporti tr:last").append($(`<td class="text-center">${rapporto.Inc}</td>`))
                    $("#TBodyRapporti tr:last").append($(`<td class="text-center">${rapporto.Pubb || ""}</td>`))
                    $("#TBodyRapporti tr:last").append($(`<td class="text-center">${rapporto.Video || ""}</td>`))
                    $("#TBodyRapporti tr:last").append($(`<td class="text-center">${rapporto.Ore || ""}</td>`))
                    $("#TBodyRapporti tr:last").append($(`<td class="text-center">${rapporto.VU || ""}</td>`))
                    $("#TBodyRapporti tr:last").append($(`<td class="text-center">${rapporto.Studi || ""}</td>`))
                    $("#TBodyRapporti tr:last").append($(`
                        <td>
                            <div class="d-flex">
                                <div class="flex-grow-1">
                                    <span class="">${rapporto.Note}</span>
                                </div>
                                <div class="hover-btn d-none">
                                    <button
                                        class="btn btn-danger btn-sm px-1 py-0"
                                        id="pulsanteEliminaRapporto"
                                        onclick="modalAvvisoRapporto('${rapporto.id}','${proc.Nome}')"
                                    >
                                        <i class="bi bi-trash3"></i>
                                    </button>
                                </div>
                            </div>
                        </td>`))
                }
            } else {
                for (rapporto of rapporti_mese) {
                    proc = proclamatori.find(item => item.id == rapporto.CE_Anag)
                    if (rapporto.Gr == null) {
                        gruppo = ''
                    } else {
                        gruppo = gruppi.find(item => item.id == rapporto.Gr)['Num']
                    }
                    $("#TBodyRapporti").append($('<tr></tr>'))
                    $("#TBodyRapporti tr:last").append($(`<td>${gruppo}</td>`))
                    $("#TBodyRapporti tr:last").append($(`<td class="nomeProc">${proc.Nome}</td>`))
                    $("#TBodyRapporti tr:last").append($(`<td class="text-center">${rapporto.Inc}</td>`))
                    $("#TBodyRapporti tr:last").append($(`<td class="text-center">${rapporto.Ore || ""}</td>`))
                    $("#TBodyRapporti tr:last").append($(`<td class="text-center">${rapporto.Studi || ""}</td>`))
                    $("#TBodyRapporti tr:last").append($(`
                        <td>
                            <div class="d-flex">
                                <div class="flex-grow-1">
                                    <span class="">
                                        ${rapporto.Note}${rapporto.Abbuono > 0 ? ' - Abbuono ore: ' + rapporto.Abbuono : ''}
                                    </span>
                                </div>
                                <div class="hover-btn d-none">
                                    <button
                                        class="btn btn-danger btn-sm px-1 py-0"
                                        id="pulsanteEliminaRapporto"
                                        onclick="modalAvvisoRapporto('${rapporto.id}','${proc.Nome}')"
                                    >
                                        <i class="bi bi-trash3"></i>
                                    </button>
                                </div>
                            </div>
                        </td>`))
                }
            }

            $("table:eq(0) th:eq(1)")[0].asc = null
            ordinaTabella($("table:eq(0) th:eq(1)")[0])
        }
    }
}

function modalRapporti() {
    mese = $('[name="mese"]').val()
    $("#FormRapporti").html(``)
    $("#ModalRapportiTitle").html(`Rapporti - ${new Date(mese).toLocaleString('it-IT', { month: 'long', year: 'numeric' })}`)
    for (gruppo of gruppi) {
        $("#FormRapporti").append(`
            <div id="DivGruppo${gruppo.id}" class="d-none DivGruppi">
                <h5>Gruppo ${gruppo.Num} - ${gruppo.Sorv_Gr}</h5>
            </div>`);
    }
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
    for (proclamatore of proclamatori) {
        var rapporto = null
        if (rapporti_mese) {
            rapporto = rapporti_mese.find(item => item.CE_Anag == proclamatore.id)
        }
        //console.log(proclamatore.Nome, rapporto)
        if (proclamatore.Elimina == 1) {
            if (rapporto) {
                $("#DivEliminati").removeClass('d-none').append(htmlRapporto(proclamatore))
            }
        } else {
            if (proclamatore.Attivo == 0) {
                $("#DivInattivi").removeClass('d-none').append(htmlRapporto(proclamatore))
            } else {
                if (proclamatore.Gr != '')
                    $("#DivGruppo" + proclamatore.Gr)
                        .removeClass('d-none')
                        .append(htmlRapporto(proclamatore))
                else {
                    $("#DivNoGruppo").removeClass('d-none').append(htmlRapporto(proclamatore))
                }
            }
        }
        $(`#Gr-${proclamatore.id}`).val(proclamatore.Gr)
        if (proclamatore.PR_PS == 'PR' || proclamatore.PR_PS == 'PS') {
            $(`#Ore-${proclamatore.id}`).removeAttr('disabled')
            $(`#Studi-${proclamatore.id}`).removeAttr('disabled')
            $(`#Note-${proclamatore.id}`).removeAttr('disabled')
            $(`#Abbuono-${proclamatore.id}`).removeAttr('disabled')
        }
        if (rapporto) {
            if (rapporto.Inc == 'pr' || rapporto.Inc == 'ps') {
                $(`#Ore-${proclamatore.id}`).removeAttr('disabled')
                $(`#Studi-${proclamatore.id}`).removeAttr('disabled')
                $(`#Note-${proclamatore.id}`).removeAttr('disabled')
                $(`#Abbuono-${proclamatore.id}`).removeAttr('disabled')
            }
            if (rapporto.Inc == 'pa') {
                $(`#Ore-${proclamatore.id}`).removeAttr('disabled')
                $(`#Studi-${proclamatore.id}`).removeAttr('disabled')
                $(`#Note-${proclamatore.id}`).removeAttr('disabled')
            }
            if (rapporto.Inc == 'p') {
                $(`#Studi-${proclamatore.id}`).removeAttr('disabled')
                $(`#Note-${proclamatore.id}`).removeAttr('disabled')
            }
            if (rapporto.Inc == 'ir') {
                $(`#Note-${proclamatore.id}`).removeAttr('disabled')
            }

            $(`#CP_Rap-${proclamatore.id}`).val(rapporto.id)
            $(`#Gr-${proclamatore.id}`).val(rapporto.Gr ? rapporto.Gr : "")
            $(`#Inc-${proclamatore.id}`).val(rapporto.Inc)
            $(`#Ore-${proclamatore.id}`).val(rapporto.Ore ? rapporto.Ore : "")
            $(`#Studi-${proclamatore.id}`).val(rapporto.Studi ? rapporto.Studi : "")
            $(`#Note-${proclamatore.id}`).val(rapporto.Note ? rapporto.Note : "")
            $(`#Abbuono-${proclamatore.id}`).val(rapporto.Abbuono ? rapporto.Abbuono : "")
        }
    }
    $("#FormRapporti div.DivGruppi:not(.d-none):not(:last)").append('<hr class="mt-1">')
    $("#ModalRapporti").modal("show");
}

function htmlRapporto(proclamatore) {
    mese = $('[name="mese"]').val()
    option_gruppi = ''
    for (gruppo of gruppi) {
        option_gruppi += `
            <option value="${gruppo.id}">${gruppo.Num}</option>`
    }
    return `
    <div class="row g-2 mb-3">
        <input
            type="hidden"
            name="CP_Anag"
            value="${proclamatore.id}"
        >
        <input
            type="hidden"
            id="CP_Rap-${proclamatore.id}"
            name="CP_Rap"
        >
        <div class="col-1">
            <div class="form-floating">
                <select
                    class="form-select"
                    id="Gr-${proclamatore.id}"
                    name="Gr" 
                    value=""
                    onchange="convalida(this)"
                >
                    <option value=""></option>
                    ${option_gruppi}
                </select>
                <label for="Gr">Gr</label>                             
            </div>
        </div>
        <div class="col-2 align-self-center nome">
            ${proclamatore.Nome}
        </div>
        <div class="col-1">
            <div class="form-floating">
                <select 
                    class="form-select"
                    id="Inc-${proclamatore.id}" 
                    name="Inc" 
                    value=""
                    onchange="convalida(this)"
                >
                    <option value=""></option>
                    <option value="p">p</option>
                    <option value="pa">pa</option>
                    <option value="pr">pr</option>
                    <option value="ps">ps</option>
                    <option value="ir">ir</option>
                </select>
                <label for="Inc">Inc.</label>                             
            </div>
        </div>
        <div class="col-2" id="DivInputOre">
            <div class="form-floating">
                <input 
                    type="number"
                    class="form-control"
                    name="Ore"
                    id="Ore-${proclamatore.id}" 
                    min="0" 
                    maxlength="5"
                    step="0.25" 
                    onchange="convalida(this)"
                    disabled
                >
                <label for="Ore">Ore</label>
            </div>
        </div>
        <div class="col-1">
            <div class="form-floating">
                <input
                    type="number"
                    class="form-control"
                    name="Abbuono"
                    id="Abbuono-${proclamatore.id}" 
                    min="0" 
                    maxlength="5"
                    onchange="convalida(this)"
                    disabled
                >
                <label for="Abbuono">Ore abb.</label>
            </div>
        </div>
        <div class="col-1">
            <div class="form-floating">
                <input
                    type="number"
                    class="form-control"
                    name="Studi"
                    id="Studi-${proclamatore.id}" 
                    min="0" 
                    maxlength="5"
                    onchange="convalida(this)"
                    disabled
                >
                <label for="Studi">Studi</label>
            </div>
        </div>
        <div class="col-3">
            <div class="form-floating">
                <input
                    type="text"
                    class="form-control"
                    name="Note"
                    id="Note-${proclamatore.id}"
                    onchange="convalida(this)"
                    disabled
                >
                <label for="Note">Note</label>
            </div>
        </div>
    </div>`
}

async function salvaRapporti() {
    console.log('Salva rapporti')
    //forse è da togliere?
    $("[name='CP_Anag']").each(async function (indice, CP_Anag) {
        CP_Anag = $(CP_Anag).val()
        if ($('#Ore-' + CP_Anag).val() == ''
            && ($('#Inc-' + CP_Anag).val() == 'pa'
                || $('#Inc-' + CP_Anag).val() == 'ps')) {
            $("#Ore-" + CP_Anag).addClass("is-invalid")
        }
    })


    if ($('#FormRapporti .is-invalid').length > 0) {
        //se ci sono errori, non salvare
        $("#ModalRapporti").animate({
            scrollTop: $('.is-invalid').offset().top
        }, 2000);
        return
    }
    $("[modificato='true']").each(function (indice, riga) {
        console.log($(riga).find(".nome").text())
        var CP_Anag = Number($(riga).find("[name='CP_Anag']").val())
        var CP_Rap = Number($(riga).find("[name='CP_Rap']").val())
        var Gr = Number($(riga).find("[name='Gr']").val())
        var Inc = $(riga).find("[name='Inc']").val()
        var Ore = Number($(riga).find("[name='Ore']").val())
        var Studi = Number($(riga).find("[name='Studi']").val())
        var Note = $(riga).find("[name='Note']").val()
        var Abbuono = Number($(riga).find("[name='Abbuono']").val())
        console.log(CP_Rap)
        if (Inc == "") {
            if (CP_Rap != "") {
                console.log('Cancella record')
                let n = rapporti.findIndex((item) => item.id == CP_Rap)
                rapporti.splice(n, 1)
            }
        } else {
            if (CP_Rap == "") {
                console.log('Inserisci')
                var id = new Date().getTime() + Math.random()
                // controlla se l'id è già presente
                /*
                for (let i = 0; i < rapporti.length; i++) {
                    if (rapporti[i].id == id) {
                        setTimeout(() => {
                            console.log('aspetto')
                        }, 2);
                        id = new Date().getTime()
                    }
                }
                */
                rapporti.unshift({
                    'CE_Anag': CP_Anag,
                    'Gr': Gr,
                    'Mese': $('[name="mese"]').val(),
                    'Inc': Inc,
                    "Ore": Ore,
                    "Studi": Studi,
                    "Note": Note,
                    'Abbuono': Abbuono,
                    'id': id
                })
                //console.log(rapporti[0])
            } else {
                console.log('Modifica')
                let n = rapporti.findIndex((item) => item.id == CP_Rap)
                console.log(n, rapporti[n].CE_Anag)
                rapporti[n].Gr = Gr
                rapporti[n].Mese = $('[name="mese"]').val()
                rapporti[n].Inc = Inc
                rapporti[n].Ore = Ore
                rapporti[n].Studi = Studi
                rapporti[n].Note = Note
                rapporti[n].Abbuono = Abbuono
                rapporti[n].prova = 'modifica'

            }
        }
    })
    try {
        console.log(rapporti)
        result = await window.electronAPI.writeFile('rapporti', rapporti)
    } catch (e) {
        console.log(e)
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    toast(new Date().getTime(), "verde", `Dati salvati`)
    //$('#SalvaRapporti').prop("disabled", false)
    $("#ModalRapporti").modal("hide")
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
    mese = $('[name="mese"]').val()
    $("#Ore-" + CP_Anag).removeClass("is-invalid")
    if (input == "Inc") {
        if ($("#Inc-" + CP_Anag).val() == "ir") {
            $("#Ore-" + CP_Anag).attr("disabled", true)
            $("#Studi-" + CP_Anag).attr("disabled", true)
            $("#Note-" + CP_Anag).removeAttr('disabled')
            irr = await irregolare(CP_Anag)
            $("#Note-" + CP_Anag).val(`Irregolare ${irr}° mese`)
            $("#Abbuono-" + CP_Anag).attr("disabled", true)
        }
        if ($("#Inc-" + CP_Anag).val() == "p") {
            $("#Ore-" + CP_Anag).attr("disabled", true)
            $("#Studi-" + CP_Anag).removeAttr('disabled')
            $("#Note-" + CP_Anag).removeAttr('disabled')
            $("#Abbuono-" + CP_Anag).attr("disabled", true)
        }
        if ($("#Inc-" + CP_Anag).val() == "pa") {
            $("#Ore-" + CP_Anag).removeAttr('disabled')
            $("#Studi-" + CP_Anag).removeAttr('disabled')
            $("#Note-" + CP_Anag).removeAttr('disabled')
            $("#Abbuono-" + CP_Anag).attr("disabled", true)
        }
        if ($("#Inc-" + CP_Anag).val() == "pr" || $("#Inc-" + CP_Anag).val() == "ps") {
            $("#Ore-" + CP_Anag).removeAttr('disabled')
            $("#Studi-" + CP_Anag).removeAttr('disabled')
            $("#Note-" + CP_Anag).removeAttr('disabled')
            $("#Abbuono-" + CP_Anag).removeAttr('disabled')
        }
        if ($("#Inc-" + CP_Anag).val() == "") {
            $("#Ore-" + CP_Anag).attr("disabled", true)
            $("#Studi-" + CP_Anag).attr("disabled", true)
            $("#Note-" + CP_Anag).attr("disabled", true)
            $("#Abbuono-" + CP_Anag).attr("disabled", true)
            $("#Pubb-" + CP_Anag).val('')
            $("#Video-" + CP_Anag).val('')
            $("#Ore-" + CP_Anag).val('')
            $("#VU-" + CP_Anag).val('')
            $("#Studi-" + CP_Anag).val('')
            $("#Note-" + CP_Anag).val('')
            $("#Abbuono-" + CP_Anag).val('')
        }
    }
    //autofill proclamatori PR e PS
    if (input == "Ore") {
        if ($("#Inc-" + CP_Anag).val() == '') {
            proc = proclamatori.find(item => item.id == Number(CP_Anag));
            if (proc.PR_PS == "PR") {
                $("#Inc-" + CP_Anag).val("pr")
            }
            if (proc.PR_PS == "PS") {
                $("#Inc-" + CP_Anag).val("ps")
            }
        }
    }
    //convalida
    if (input == "Ore") {
        if (Number($("#Ore-" + CP_Anag).val()) > 0
            && ($("#Inc-" + CP_Anag).val() == 'pa'
                || $("#Inc-" + CP_Anag).val() == 'pr'
                || $("#Inc-" + CP_Anag).val() == 'ps')) {
            $("#Ore-" + CP_Anag).removeClass("is-invalid")
        }
        if (Number($("#Ore-" + CP_Anag).val()) <= 0
            && ($("#Inc-" + CP_Anag).val() == 'pa'
                || $("#Inc-" + CP_Anag).val() == 'pr'
                || $("#Inc-" + CP_Anag).val() == 'ps')) {
            $("#Ore-" + CP_Anag).addClass("is-invalid")
        }
    }
    $(dato).parents('.row').attr('modificato', true)
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

function modalAvvisoRapporto(id_rap, nome) {
    modalAvviso(`Sei sicuro di voler eliminare il rapporto di ${nome}?`, `elimRapporto(${id_rap})`)
}

async function elimRapporto(id_rap) {
    $("#ModalAvviso").modal("hide")
    try {
        let n = rapporti.findIndex((item) => item.id == Number(id_rap))
        rapporti.splice(n, 1)
        result = await window.electronAPI.writeFile('rapporti', rapporti)
    } catch (e) {
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    toast(new Date().getTime(), "verde", `Rapporto eliminato`)
    loadPage()
}
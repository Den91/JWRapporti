var db
var mese

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
    db = await window.electronAPI.readFile('db')
    $("#FormRapporti").html(``)
    $("#TBodyRapporti").html('')
    $('#buttonPDF').addClass('d-none')
    if (mese != "") {
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
        db.anagrafica.forEach(p => {
            i = p.rapporti.findIndex(r => r.Mese == mese)
            if (i != -1) {
                if (p.rapporti[i].Gr == null) {
                    gruppo = ''
                } else {
                    gruppo = db.gruppi.find(item => item.id == p.rapporti[i].Gr)
                }
                $("#TBodyRapporti").append($(`
                    <tr>
                        <td>${gruppo ? gruppo.Num : ''}</td>
                        <td class="nomeProc">${p.Nome}</td>
                        <td class="text-center">${p.rapporti[i].Inc}</td>
                        <td class="text-center">${p.rapporti[i].Ore || ""}</td>
                        <td class="text-center">${p.rapporti[i].Studi || ""}</td>
                        <td>
                            <div class="d-flex">
                                <div class="flex-grow-1">
                                    <span class="">
                                        ${p.rapporti[i].Note}${p.rapporti[i].Abbuono > 0 ? ' - Abbuono ore: ' + p.rapporti[i].Abbuono : ''}
                                    </span>
                                </div>
                                <div class="hover-btn d-none">
                                    <button
                                        class="btn btn-danger btn-sm px-1 py-0"
                                        id="pulsanteEliminaRapporto"
                                        onclick="modalAvvisoRapporto('${p.id}','${p.Nome}')"
                                    >
                                        <i class="bi bi-trash3"></i>
                                    </button>
                                </div>
                            </div>
                        </td>
                    </tr>
                `))
            }
        })
        if ($("#TBodyRapporti tr").length > 0) {
            $('#buttonPDF').removeClass('d-none')
            $("table:eq(0) th:eq(1)")[0].asc = null
            ordinaTabella($("table:eq(0) th:eq(1)")[0])
        }
    }
}

function modalRapporti() {
    $("#FormRapporti").html(``)
    $("#ModalRapportiTitle").html(`Rapporti - ${new Date(mese).toLocaleString('it-IT', { month: 'long', year: 'numeric' })}`)
    for (gruppo of db.gruppi) {
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
    db.anagrafica.forEach(proc => {
        rapporto = proc.rapporti.find(item => item.Mese == mese)
        if (proc.Eliminato && rapporto) {
            $("#DivEliminati").removeClass('d-none').append(htmlRapporto(proc))
        } else {
            if (proc.Attivo) {
                $("#DivInattivi").removeClass('d-none').append(htmlRapporto(proc))
            } else {
                if (proc.Gr != '')
                    $("#DivGruppo" + proc.Gr)
                        .removeClass('d-none')
                        .append(htmlRapporto(proc))
                else {
                    $("#DivNoGruppo").removeClass('d-none').append(htmlRapporto(proc))
                }
            }
        }
        if (proc.PR_PS == 'PR' || proc.PR_PS == 'PS') {
            $(`#Ore-${proc.id}`).removeAttr('disabled')
            $(`#Studi-${proc.id}`).removeAttr('disabled')
            $(`#Note-${proc.id}`).removeAttr('disabled')
            $(`#Abbuono-${proc.id}`).removeAttr('disabled')
        }
        if (rapporto) {
            if (rapporto.Inc == 'pr' || rapporto.Inc == 'ps') {
                $(`#Ore-${proc.id}`).removeAttr('disabled')
                $(`#Studi-${proc.id}`).removeAttr('disabled')
                $(`#Note-${proc.id}`).removeAttr('disabled')
                $(`#Abbuono-${proc.id}`).removeAttr('disabled')
            }
            if (rapporto.Inc == 'pa') {
                $(`#Ore-${proc.id}`).removeAttr('disabled')
                $(`#Studi-${proc.id}`).removeAttr('disabled')
                $(`#Note-${proc.id}`).removeAttr('disabled')
            }
            if (rapporto.Inc == 'p') {
                $(`#Studi-${proc.id}`).removeAttr('disabled')
                $(`#Note-${proc.id}`).removeAttr('disabled')
            }
            if (rapporto.Inc == 'ir') {
                $(`#Note-${proc.id}`).removeAttr('disabled')
            }
            $(`#CP_Rap-${proc.id}`).val(rapporto.id)
            $(`#Gr-${proc.id}`).val(rapporto.Gr ? rapporto.Gr : proc.Gr)
            $(`#Inc-${proc.id}`).val(rapporto.Inc)
            $(`#Ore-${proc.id}`).val(rapporto.Ore ? rapporto.Ore : "")
            $(`#Studi-${proc.id}`).val(rapporto.Studi ? rapporto.Studi : "")
            $(`#Note-${proc.id}`).val(rapporto.Note ? rapporto.Note : "")
            $(`#Abbuono-${proc.id}`).val(rapporto.Abbuono ? rapporto.Abbuono : "")
        }
    })
    $("#FormRapporti div.DivGruppi:not(.d-none):not(:last)").append('<hr class="mt-1">')
    $("#ModalRapporti").modal("show");
}

function htmlRapporto(proclamatore) {
    option_gruppi = ''
    for (gruppo of db.gruppi) {
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
        <div class="col-auto">
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
        <div class="col align-self-center nome">
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
                    oninput="convalida(this)"
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
                    name="Studi"
                    id="Studi-${proclamatore.id}" 
                    min="0" 
                    maxlength="5"
                    oninput="convalida(this)"
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
                    oninput="convalida(this)"
                    disabled
                >
                <label for="Note">Note</label>
            </div>
        </div>
        <div class="col-2">
            <div class="form-floating">
                <input
                    type="number"
                    class="form-control"
                    name="Abbuono"
                    id="Abbuono-${proclamatore.id}" 
                    min="0" 
                    maxlength="5"
                    oninput="convalida(this)"
                    disabled
                >
                <label for="Abbuono">Ore abb.</label>
            </div>
        </div>
    </div>`
}

async function salvaRapporti() {
    console.log('Salva rapporti')
    //forse è da togliere?
    $("[modificato='true']").each(function (indice, riga) {
        var Ore = Number($(riga).find("[name='Ore']").val())
        var Inc = $(riga).find("[name='Inc']").val()
        if ((Inc == 'pa' || Inc == 'pr' || Inc == 'ps') && (Ore == '' || Ore <= 0)) {
            $(riga).find("[name='Ore']").addClass("is-invalid")
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
        var CP_Anag = Number($(riga).find("[name='CP_Anag']").val())
        //var CP_Rap = Number($(riga).find("[name='CP_Rap']").val())
        var Gr = Number($(riga).find("[name='Gr']").val())
        var Inc = $(riga).find("[name='Inc']").val()
        var Ore = Number($(riga).find("[name='Ore']").val())
        var Studi = Number($(riga).find("[name='Studi']").val())
        var Note = $(riga).find("[name='Note']").val()
        var Abbuono = Number($(riga).find("[name='Abbuono']").val())
        var iProc = db.anagrafica.findIndex(a => a.id == CP_Anag)
        var iRap = db.anagrafica[iProc].rapporti.findIndex(r => r.Mese == mese)
        if (iRap == -1 && Inc != '') {
            console.log('Inserisci rapporto')
            db.anagrafica[iProc].rapporti.push({
                'Gr': Gr,
                'Mese': mese,
                'Inc': Inc,
                "Ore": Ore,
                "Studi": Studi,
                "Note": Note,
                'Abbuono': Abbuono,
            })
        }
        if (iRap != -1 && Inc != '') {
            console.log('Modifica')
            db.anagrafica[iProc].rapporti[iRap].Gr = Gr
            db.anagrafica[iProc].rapporti[iRap].Inc = Inc
            db.anagrafica[iProc].rapporti[iRap].Ore = Ore
            db.anagrafica[iProc].rapporti[iRap].Studi = Studi
            db.anagrafica[iProc].rapporti[iRap].Note = Note
            db.anagrafica[iProc].rapporti[iRap].Abbuono = Abbuono
        }
        if (iRap != -1 && Inc == '') {
            console.log('Elimina rapporto')
            db.anagrafica[iProc].rapporti.splice(iRap, 1)
        }
    })
    //salva totali
    tot = {
        mese: mese,
        p: { N: 0, Studi: 0 },
        pa: { N: 0, Ore: 0, Studi: 0 },
        pr: { N: 0, Ore: 0, Studi: 0 },
        ps: { N: 0 },
        ir: { N: 0 }
    }
    for (let i = 0; i < db.anagrafica.length; i++) {
        iRap = db.anagrafica[i].rapporti.findIndex(r => r.Mese == mese)
        if (iRap != -1) {
            if (db.anagrafica[i].rapporti[iRap].Inc == 'p') {
                tot.p.N++
                tot.p.Studi += db.anagrafica[i].rapporti[iRap].Studi ? db.anagrafica[i].rapporti[iRap].Studi : 0
            }
            if (db.anagrafica[i].rapporti[iRap].Inc == 'pa') {
                tot.pa.N++
                tot.pa.Ore += db.anagrafica[i].rapporti[iRap].Ore ? db.anagrafica[i].rapporti[iRap].Ore : 0
                tot.pa.Studi += db.anagrafica[i].rapporti[iRap].Studi ? db.anagrafica[i].rapporti[iRap].Studi : 0
            }
            if (db.anagrafica[i].rapporti[iRap].Inc == 'pr') {
                tot.pr.N++
                tot.pr.Ore += db.anagrafica[i].rapporti[iRap].Ore ? db.anagrafica[i].rapporti[iRap].Ore : 0
                tot.pr.Studi += db.anagrafica[i].rapporti[iRap].Studi ? db.anagrafica[i].rapporti[iRap].Studi : 0
            }
            if (db.anagrafica[i].rapporti[iRap].Inc == 'ps') {
                tot.ps.N++
            }
            if (db.anagrafica[i].rapporti[iRap].Inc == 'ir') {
                tot.ir.N++
            }
        }
    }
    iTot = db.totali.findIndex(t => t.mese == mese)
    if (iTot == -1) {
        db.totali.push(tot)
    } else {
        db.totali[iTot] = tot
    }
    try {
        result = await window.electronAPI.writeFile('db', db)
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

async function convalida(dato) {
    let input = dato.name
    let CP_Anag = $(dato).parents('.row').find("[name='CP_Anag']").val()
    let proc = db.anagrafica.find(item => item.id == Number(CP_Anag))
    $(dato).parents('.row').attr('modificato', true)
    $(dato).parents('.row').find("[name='Ore']").removeClass("is-invalid")
    if (input == "Inc") {
        if ($(dato).val() == "ir") {
            $(dato).parents('.row').find("[name='Ore']").val('').attr("disabled", true)
            $(dato).parents('.row').find("[name='Studi']").val('').attr("disabled", true)
            $(dato).parents('.row').find("[name='Note']").removeAttr('disabled')
            let irr = irregolare(proc)
            $(dato).parents('.row').find("[name='Note']").val(`Irregolare ${irr}° mese`)
            $(dato).parents('.row').find("[name='Abbuono']").val('').attr("disabled", true)
        }
        if ($(dato).val() == "p") {
            $(dato).parents('.row').find("[name='Ore']").val('').attr("disabled", true)
            $(dato).parents('.row').find("[name='Studi']").removeAttr('disabled')
            $(dato).parents('.row').find("[name='Note']").removeAttr('disabled')
            $(dato).parents('.row').find("[name='Abbuono']").val('').attr("disabled", true)
        }
        if ($(dato).val() == "pa") {
            $(dato).parents('.row').find("[name='Ore']").removeAttr('disabled')
            $(dato).parents('.row').find("[name='Studi']").removeAttr('disabled')
            $(dato).parents('.row').find("[name='Note']").removeAttr('disabled')
            $(dato).parents('.row').find("[name='Abbuono']").val('').attr("disabled", true)
        }
        if ($(dato).val() == "pr" || $("#Inc-" + CP_Anag).val() == "ps") {
            $(dato).parents('.row').find("[name='Ore']").removeAttr('disabled')
            $(dato).parents('.row').find("[name='Studi']").removeAttr('disabled')
            $(dato).parents('.row').find("[name='Note']").removeAttr('disabled')
            $(dato).parents('.row').find("[name='Abbuono']").removeAttr('disabled')
        }
        if ($(dato).val() == "") {
            $(dato).parents('.row').find("[name='Ore']").val('').attr("disabled", true).val('')
            $(dato).parents('.row').find("[name='Studi']").val('').attr("disabled", true).val('')
            $(dato).parents('.row').find("[name='Note']").val('').attr("disabled", true).val('')
            $(dato).parents('.row').find("[name='Abbuono']").val('').attr("disabled", true).val('')
        }
    }
    if (input == "Ore") {
        //autofill proclamatori PR e PS
        if ($(dato).parents('.row').find("[name='Inc']").val() == '') {
            if (proc.PR_PS == "PR") {
                $(dato).parents('.row').find("[name='Inc']").val("pr")
            }
            if (proc.PR_PS == "PS") {
                $(dato).parents('.row').find("[name='Inc']").val("ps")
            }
        }
        //convalida
        if (Number($(dato).val()) > 0) {
            $(dato).removeClass("is-invalid")
        }
        if (Number($(dato).val()) <= 0) {
            $(dato).addClass("is-invalid")
        }
    }
}

function irregolare(proc) {
    let m = new Date($('[name="mese"]').val())
    let x = 1
    let irr = true
    let rapporto
    while (irr) {
        m.setMonth(m.getMonth() - 1)
        rapporto = proc.rapporti.find(item =>
            (item.Mese == `${m.toLocaleString('it-IT', { year: 'numeric' })}-${m.toLocaleString('it-IT', { month: '2-digit' })}`)
        )
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

function modalAvvisoRapporto(id, nome) {
    modalAvviso(`Sei sicuro di voler eliminare il rapporto di ${nome}?`, `elimRapporto(${id})`)
}

async function elimRapporto(id) {
    $("#ModalAvviso").modal("hide")
    try {
        let iAnag = db.anagrafica.findIndex(a => a.id == Number(id))
        let iRap = db.anagrafica[iAnag].rapporti.findIndex(r => r.Mese == $('[name="mese"]').val())
        db.anagrafica[iAnag].rapporti.splice(iRap, 1)
        result = await window.electronAPI.writeFile('db', db)
    } catch (e) {
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    toast(new Date().getTime(), "verde", `Rapporto eliminato`)
    loadPage()
}

async function fpdfRapporti() {
    result = await window.electronAPI.fpdfRapporti(mese)
    if (result.succ)
        toast(new Date().getTime(), "verde", result.msg)
    else
        toast(new Date().getTime(), "rosso", result.msg)
}
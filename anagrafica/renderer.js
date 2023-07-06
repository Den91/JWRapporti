var co
var gruppi
var proclamatori
var procEliminati

$(document).ready(async function () {
    navbar("anagrafica")
    ordinaTabella($("#tableAnagrafica th:eq(0)")[0])
    loadPage()
})

$(window).resize(function () {
    marginBody();
})

async function loadPage() {
    visualCO()
    visualGruppi()
    visualProclamatori()
}

$("th").click(function () {
    ordinaTabella(this)
})

$(":checkbox").change(function () {
    if (this.checked) inverti(this)
})

$("input").focus(function () {
    if ($(this).hasClass("is-invalid")) $(this).removeClass("is-invalid")
})

async function visualCO() {
    co = await window.electronAPI.readFile('sorvegliante')
    if (co.length === 0) {
        $("#buttonCO").html('<i class="bi bi-person-plus-fill"></i>')
        $("#DivCO").html('')
    } else {
        $("#buttonCO").html('<i class="bi bi-pencil-square"></i>');
        $("#DivCO").html(`
            <div class="table-responsive">
                <table class="table mb-0">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Cellulare</th>
                            <th>E-mail</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="">${co[0].Nome_CO}</td>
                            <td class="">${co[0].Cel_CO}</td>
                            <td class="">${co[0].Email_CO}</td>
                        </tr>
                    </tbody>
                </table>
            </div>`)
    }
}

function modalCO() {
    if (co.length === 0) {
        $("#FormCO").trigger("reset");
    } else {
        $('[name="Nome_CO"]').val(co[0].Nome_CO)
        $('[name="Cel_CO"]').val(co[0].Cel_CO)
        $('[name="Email_CO"]').val(co[0].Email_CO)
    }
    $("#ModalCO").modal("show")
}

async function salvaCO() {
    $("#ModalCO").modal("hide")
    try {
        result = await window.electronAPI.writeFile('sorvegliante', [{
            'Nome_CO': $("#Nome_CO").val(),
            'Cel_CO': $("#Cel_CO").val(),
            'Email_CO': $("#Email_CO").val(),
        }])
    } catch (e) {
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    toast(new Date().getTime(), "verde", `Dati salvati`)
    loadPage()
}

async function visualGruppi() {
    gruppi = await window.electronAPI.readFile('gruppi')
    gruppi.sort(function (a, b) {
        return a.Num - b.Num
    })
    //console.log(gruppi)
    $("#DivGruppi").removeClass(`row-cols-md-1 row-cols-md-2 row-cols-md-3 row-cols-md-4`)
    $("#DivGruppi").html('')
    $("#Gr").html()
    if (gruppi.length <= 4)
        $("#DivGruppi").addClass(`row-cols-md-${gruppi.length}`)
    if (gruppi.length > 4)
        $("#DivGruppi").addClass(`row-cols-md-3`)
    gruppi.forEach(function (gruppo) {
        $("#DivGruppi").append(`
                <div class="col d-grid mb-1">
                    <button class="btn btn-outline-secondary" onclick="modalGruppo('${gruppo["id"]}')">
                        <i class="bi bi-people-fill"></i> ${gruppo["Num"]} - ${gruppo["Sorv_Gr"]}
                    </button>
                </div>`);
        //modal gruppi select option
        $("#Gr").append(
            $("<option>", {
                value: gruppo["id"],
                text: `${gruppo["Num"]} - ${gruppo["Sorv_Gr"]}`,
            })
        )
    })
    $("#Gr").append($("<option>"))
}

function modalGruppo(CP_Gruppo) {
    $("#FormGruppo").trigger("reset")
    $("#Num").val(gruppi.length + 1)
    $('#CP_Gruppo').val('');
    $('#EliminaGruppo').addClass("d-none");
    if (CP_Gruppo != '') {
        $('#EliminaGruppo').removeClass("d-none");
        gruppo = gruppi.find((item) => item['id'] === Number(CP_Gruppo))
        $('#CP_Gruppo').val(CP_Gruppo);
        $("#Num").val(parseInt(gruppo.Num));
        $("#Sorv_Gr").val(gruppo.Sorv_Gr);
    }
    $("#ModalGruppo").modal("show")
}

async function salvaGruppo(CP_Gruppo) {
    $("#ModalGruppo").modal("hide")
    if (CP_Gruppo == '') {
        gruppi.push({
            'Num': $("#Num").val(),
            'Sorv_Gr': $("#Sorv_Gr").val(),
            'id': new Date().getTime()
        })
    } else {
        let n = gruppi.findIndex((item) => item.id === Number(CP_Gruppo))
        gruppi[n].Num = $("#Num").val()
        gruppi[n].Sorv_Gr = $("#Sorv_Gr").val()
    }
    try {
        result = await window.electronAPI.writeFile('gruppi', gruppi)
    } catch (e) {
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    toast(new Date().getTime(), "verde", `Dati salvati`)
    loadPage()
}

async function eliminaGruppo(CP_Gruppo) {
    $("#ModalGruppo").modal("hide")
    let n = gruppi.findIndex((item) => item.id == Number(CP_Gruppo))
    let eliminato = gruppi[n]
    gruppi.splice(n, 1)
    try {
        result = await window.electronAPI.writeFile('gruppi', gruppi)
    } catch (e) {
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    if (proclamatori.length > 0) {
        proclamatori.forEach(function (proc, indice) {
            if (proc.Gr == Number(CP_Gruppo)) {
                proclamatori[indice].Gr = ''
                console.log(proclamatori[indice])
            }
        })
        try {
            result = await window.electronAPI.writeFile('anagrafica', proclamatori)
        } catch (e) {
            loadPage()
            toast(new Date().getTime(), "rosso", e, 10000)
            return
        }
    }
    toast(new Date().getTime(), "verde", `Gruppo ${eliminato.Num} eliminato`)
    loadPage()
}

function getAge(dateString) {
    if (dateString == null || dateString == "") return "";
    var birthday = new Date(dateString);
    var ageDifMs = Date.now() - birthday.getTime();
    var ageDate = new Date(ageDifMs); // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

async function visualProclamatori() {
    $("#TBodyProc").html('')
    $("#tableEliminati tbody").html('')
    proclamatori = await window.electronAPI.readFile('anagrafica')
    proclamatori.sort(function (a, b) {
        if (a.Nome.toUpperCase() < b.Nome.toUpperCase())
            return -1
        if (a.Nome.toUpperCase() > b.Nome.toUpperCase())
            return 1
        return 0
    })
    //console.log(proclamatori)
    proclamatori.forEach(function (proc, indice) {
        if (proc.Elimina == 0) {
            if (proc.Gr != '') {
                var gruppo = gruppi.find((item) => item.id === Number(proc["Gr"]))
                var gruppoTxt = `${gruppo.Num} - ${gruppo.Sorv_Gr}`
            } else {
                gruppoTxt = ""
            }
            $("#TBodyProc").append(`
                <tr onclick="modalProclamatore('${proc["id"]}', 0)">
                    <td>${proc["Nome"]}</td>
                    <td>${getAge(proc["D_Nasc"])}</td>
                    <td>${proc["Cel"] || proc["Tel"]}</td>
                    <td>${proc["Email"]}</td>
                    <td>${proc["Emerg"]}</td>
                    <td>${gruppoTxt}</td>
                    <td>${proc["Attivo"] == '0' ? "Inattivo" : "Attivo"}</td>
                </tr>`)
        } else {
            $("#tableEliminati tbody").append(`
                <tr onclick="modalProclamatore(${proc["id"]}, 1)">
                    <td>${proc["Nome"]}</td>
                    <td>${getAge(proc["D_Nasc"])}</td>
                    <td>${proc["Cel"] || proc["Tel"]}</td>
                    <td>${proc["Email"]}</td>
                    <td>${proc["Emerg"]}</td>
                </tr>`)
        }
    })
}

function modalProclamatore(CP_Anag, eliminato) {
    $("#Gr").html('')
    gruppi.forEach(function (gruppo) {
        //modal gruppi select option
        $("#Gr").append(
            $("<option>", {
                value: gruppo["id"],
                text: `${gruppo["Num"]} - ${gruppo["Sorv_Gr"]}`,
            })
        )
    })
    $("#FormProclamatore").trigger("reset")
    //$("#FormProclamatore").find("input").removeClass("is-invalid")
    $('#CP_Anag').val("")
    $('[name="EliminaProclamatore"]').addClass("d-none");
    $('[name="RipristinaProclamatore"]').addClass("d-none");
    if (CP_Anag != "") {
        proc = proclamatori.find((item) => item.id == parseInt(CP_Anag));
        if (eliminato == 0) { //non eliminato
            $('#EliminaProclamatore').removeClass("d-none");
        }
        if (eliminato == 1) { //eliminato
            $('#RipristinaProclamatore').removeClass("d-none");
        }
        $('#CP_Anag').val(CP_Anag);
        $("#Nome").val(unescapeHtml(proc.Nome));
        $("#Nome2").val(unescapeHtml(proc.Nome2));
        $("#Ind").val(unescapeHtml(proc.Ind));
        $("#D_Nasc").val(proc.D_Nasc);
        $("#D_Batt").val(proc.D_Batt);
        $("#Tel").val(unescapeHtml(proc.Tel));
        $("#Cel").val(unescapeHtml(proc.Cel));
        $("#Email").val(unescapeHtml(proc.Email));
        $("#Emerg").val(unescapeHtml(proc.Emerg));
        if (proc.S == $(`input[name=S][value=${proc.S}]`).val()) {
            $(`input[name=S][value=${proc.S}]`).prop("checked", true);
        }
        if (proc.U_AP && proc.U_AP == $("#" + proc.U_AP).val()) {
            $("#" + proc.U_AP).prop("checked", true);
        }
        if (proc.SM_AN && proc.SM_AN == $("#" + proc.SM_AN).val()) {
            $("#" + proc.SM_AN).prop("checked", true);
        }
        if (proc.PR_PS && proc.PR_PS == $("#" + proc.PR_PS).val()) {
            $("#" + proc.PR_PS).prop("checked", true);
        }
        if (proc.Attivo == $(`input[name=Attivo][value=${proc.Attivo}]`).val()) {
            $(`input[name=Attivo][value=${proc.Attivo}]`).prop("checked", true);
        }
        if (proc.Gr != '') {
            $(`#Gr option[value='${proc.Gr}'`).prop('selected', true)
            //$("#Gr").val($(`#Gr option[value='${proc.Gr}'`).text())
        } else {
            $("#Gr").val('')
        }
    }
    $("#ModalProclamatore").modal("show")
}

function inverti(input) {
    if ($(input).is(":checked")) {
        classes = "." + $(input).attr("class").replace(/\s+/, ".");
        $(classes).not(input).prop("checked", false);
    }
}

async function salvaProclamatore(CP_Anag) {
    $("#ModalProclamatore").modal("hide")
    if (CP_Anag == '') {
        proclamatori.push({
            'Nome': $("#Nome").val(),
            'Nome2': $("#Nome2").val(),
            'Ind': $("#Ind").val(),
            'D_Nasc': $("#D_Nasc").val(),
            'D_Batt': $("#D_Batt").val(),
            'Tel': $("#Tel").val(),
            'Cel': $("#Cel").val(),
            'Email': $("#Email").val(),
            'Emerg': $("#Emerg").val(),
            'S': $('input[name=S]:checked').val(),
            'U_AP': ($('#U:checked').val() ?? '') + ($('#P:checked').val() ?? ''),
            'SM_AN': ($('#SM:checked').val() ?? '') + ($('#AN:checked').val() ?? ''),
            'PR_PS': ($('#PR:checked').val() ?? '') + ($('#PS:checked').val() ?? ''),
            'Attivo': $('input[name=Attivo]:checked').val(),
            'Gr': Number($('#Gr').find(":selected").val()),
            'Elimina': "0",
            'id': new Date().getTime()
        })
    } else {
        let n = proclamatori.findIndex((item) => item.id === Number(CP_Anag))
        proclamatori[n].Nome = $("#Nome").val()
        proclamatori[n].Nome2 = $("#Nome2").val()
        proclamatori[n].Ind = $("#Ind").val()
        proclamatori[n].D_Nasc = $("#D_Nasc").val()
        proclamatori[n].D_Batt = $("#D_Batt").val()
        proclamatori[n].Tel = $("#Tel").val()
        proclamatori[n].Cel = $("#Cel").val()
        proclamatori[n].Email = $("#Email").val()
        proclamatori[n].Emerg = $("#Emerg").val()
        proclamatori[n].S = $('input[name=S]:checked').val()
        proclamatori[n].U_AP = ($('#U:checked').val() ?? '') + ($('#P:checked').val() ?? '')
        proclamatori[n].SM_AN = ($('#SM:checked').val() ?? '') + ($('#AN:checked').val() ?? '')
        proclamatori[n].PR_PS = ($('#PR:checked').val() ?? '') + ($('#PS:checked').val() ?? '')
        proclamatori[n].Attivo = $('input[name=Attivo]:checked').val()
        proclamatori[n].Gr = Number($('#Gr').find(":selected").val())
    }
    try {
        result = await window.electronAPI.writeFile('anagrafica', proclamatori)
    } catch (e) {
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    toast(new Date().getTime(), "verde", `Dati salvati`)
    loadPage()
}

async function eliminaProclamatore(CP_Anag) {
    $("#ModalProclamatore").modal("hide")
    let n = proclamatori.findIndex((item) => item.id === Number(CP_Anag))
    proclamatori[n].Elimina = '1'
    try {
        result = await window.electronAPI.writeFile('anagrafica', proclamatori)
    } catch (e) {
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    toast(new Date().getTime(), "verde", `${proclamatori[n].Nome} è stato eliminato`)
    loadPage()
}

async function ripristinaProclamatore(CP_Anag) {
    $("#ModalProclamatore").modal("hide")
    let n = proclamatori.findIndex((item) => item.id === Number(CP_Anag))
    proclamatori[n].Elimina = '0'
    try {
        result = await window.electronAPI.writeFile('anagrafica', proclamatori)
    } catch (e) {
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    toast(new Date().getTime(), "verde", `${proclamatori[n].Nome} è stato ripristinato`)
    loadPage()
}

async function fpdf() {
    result = await window.electronAPI.fpdfAnagrafica()
    if (result.succ)
        toast(new Date().getTime(), "verde", result.msg)
    else
        toast(new Date().getTime(), "rosso", result.msg)
}
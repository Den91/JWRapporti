var co
var gruppi
var proclamatori
var procEliminati

$(document).ready(async function () {
    navbar("anagrafica")
    visualCO()
    visualGruppi()
    visualProclamatori()
    visualEliminati()
    ordinaTabella($("#tableAnagrafica th:eq(0)")[0])
    mostraNotifiche()
})

$(window).resize(function () {
    marginBody();
})

$("th").click(function () {
    ordinaTabella(this)
})

$(":checkbox").change(function () {
    if (this.checked) inverti(this)
})

$("input").focus(function () {
    if ($(this).hasClass("is-invalid")) $(this).removeClass("is-invalid");
})

async function visualCO() {
    co = await window.electronAPI.getAll('sorvegliante')
    if (co.length === 0) {
        $("#buttonCO").html('<i class="bi bi-person-plus-fill"></i>')
        $("#DivCO").html('')
        $('[name="Nome_CO"]').val('')
        $('[name="Cel_CO"]').val('')
        $('[name="Email_CO"]').val('')
    } else {
        co = co[0]
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
                            <td class="">${co.Nome_CO}</td>
                            <td class="">${co.Cel_CO}</td>
                            <td class="">${co.Email_CO}</td>
                        </tr>
                    </tbody>
                </table>
            </div>`);
        $('[name="Nome_CO"]').val(co.Nome_CO)
        $('[name="Cel_CO"]').val(co.Cel_CO)
        $('[name="Email_CO"]').val(co.Email_CO)
    }
}

function modalCO() {
    $("#ModalCO").modal("show");
}

$('#FormCO').submit(async function (e) {
    //$('#SalvaCO').click(async function () {
    $("#ModalCO").modal("hide");
    if (co.length === 0) {
        result = await window.electronAPI.insertTableContent(
            'sorvegliante',
            {
                'Nome_CO': $("#Nome_CO").val(),
                'Cel_CO': $("#Cel_CO").val(),
                'Email_CO': $("#Email_CO").val(),
                'CP_CO': '0'
            }
        )
    } else {
        result = await window.electronAPI.updateRow(
            'sorvegliante',
            {
                'Nome_CO': $("#Nome_CO").val(),
                'Cel_CO': $("#Cel_CO").val(),
                'Email_CO': $("#Email_CO").val(),
            },
            { 'CP_CO': '0' }
        )
    }
    if (result.succ)
        result.msg = 'Dati salvati'
    notifichePush(result)
});

async function visualGruppi() {
    gruppi = await window.electronAPI.getAll('gruppi')
    gruppi.sort(function (a, b) {
        return a.Num - b.Num
    })
    $("#DivGruppi").removeClass(`row-cols-md-1 row-cols-md-2 row-cols-md-3 row-cols-md-4`)
    $("#DivGruppi").html('')
    $("#Gr").html()
    if (gruppi.length <= 4)
        $("#DivGruppi").addClass(`row-cols-md-${gruppi.length}`)
    if (gruppi.length > 4)
        $("#DivGruppi").addClass(`row-cols-md-3`)
    gruppi.forEach(function (gruppo, indice) {
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
    $("#FormGruppo").trigger("reset");
    $("#Num").val(gruppi.length + 1);
    $('#CP_Gruppo').val('');
    $('#EliminaGruppo').addClass("d-none");
    if (CP_Gruppo != '') {
        $('#EliminaGruppo').removeClass("d-none");
        gruppo = gruppi.find((item) => item['id'] === parseInt(CP_Gruppo));
        $('#CP_Gruppo').val(CP_Gruppo);
        $("#Num").val(parseInt(gruppo.Num));
        $("#Sorv_Gr").val(gruppo.Sorv_Gr);
    }
    $("#ModalGruppo").modal("show");
}

$('#FormGruppo').submit(async function salvaGruppo(e) {
    //$('#SalvaGruppo').click(async function () {
    $("#ModalGruppo").modal("hide")
    if ($('#CP_Gruppo').val() == '') {
        result = await window.electronAPI.insertTableContent(
            'gruppi',
            {
                'Num': $("#Num").val(),
                'Sorv_Gr': $("#Sorv_Gr").val(),
            }
        )
        if (result.succ)
            result.msg = 'Gruppo inserito'
    } else {
        result = await window.electronAPI.updateRow(
            'gruppi',
            {
                'Num': $("#Num").val(),
                'Sorv_Gr': $("#Sorv_Gr").val(),
            },
            { 'id': parseInt($('#CP_Gruppo').val()) }
        )
        if (result.succ)
            result.msg = 'Gruppo modificato'
    }
    notifichePush(result)
})

$('#EliminaGruppo').click(async function eliminaGruppo() {
    $("#ModalGruppo").modal("hide")
    gruppoElimina = parseInt($('#CP_Gruppo').val())
    result = await window.electronAPI.deleteRow(
        'gruppi',
        { 'id': gruppoElimina }
    )
    if (!result.succ) {
        notifichePush(result)
        location.reload();
        return
    }
    proclamatori = await window.electronAPI.getRows('anagrafica', { 'Gr': gruppoElimina })
    if (proclamatori.length > 0) {
        result2 = await window.electronAPI.updateRow(
            'anagrafica',
            { 'Gr': '' },
            { 'Gr': gruppoElimina }
        )
        if (!result2.succ) {
            result2.msg = result2.msg + ' ' + proc.Nome
            notifichePush(result2)
            location.reload();
            return
        }
    }
    result.msg = 'Gruppo eliminato'
    notifichePush(result)
    location.reload();
});

function getAge(dateString) {
    if (dateString == null || dateString == "") return "";
    var birthday = new Date(dateString);
    var ageDifMs = Date.now() - birthday.getTime();
    var ageDate = new Date(ageDifMs); // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

async function visualProclamatori() {
    proclamatori = await window.electronAPI.getRows('anagrafica', { 'Elimina': '0' })
    proclamatori.sort(function (a, b) {
        if (a.Nome < b.Nome)
            return -1
        if (a.Nome > b.Nome)
            return 1
        return 0
    })
    proclamatori.forEach(function (proc, indice) {
        if (proc["Gr"]) {
            gruppo = gruppi.find((item) => item.id === parseInt(proc["Gr"]));
            gruppoTxt = `${gruppo.Num} - ${gruppo.Sorv_Gr}`;
        } else {
            gruppoTxt = "";
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
            </tr>`);
    })
}

async function visualEliminati() {
    procEliminati = await window.electronAPI.getRows('anagrafica', { 'Elimina': '1' })
    procEliminati.forEach(function (proc, indice) {
        $("#tableEliminati tbody").append(`
            <tr onclick="modalProclamatore(${proc["id"]}, 1)">
                <td>${proc["Nome"]}</td>
                <td>${getAge(proc["D_Nasc"])}</td>
                <td>${proc["Cel"] || proc["Tel"]}</td>
                <td>${proc["Email"]}</td>
                <td>${proc["Emerg"]}</td>
            </tr>`);
    });
}

function modalProclamatore(CP_Anag, eliminato) {
    $("#FormProclamatore").trigger("reset");
    //$("#FormProclamatore").find("input").removeClass("is-invalid");
    $('#CP_Anag').val("");
    $('[name="EliminaProclamatore"]').addClass("d-none");
    $('[name="RipristinaProclamatore"]').addClass("d-none");
    if (CP_Anag != "") {
        if (eliminato == 0) {
            //non eliminato
            proc = proclamatori.find((item) => item.id == parseInt(CP_Anag));
            $('#EliminaProclamatore').removeClass("d-none");
        }
        if (eliminato == 1) {
            //eliminato
            proc = procEliminati.find((item) => item.id == parseInt(CP_Anag));
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

$('#FormProclamatore').submit(async function (e) {
    $("#ModalProclamatore").modal("hide")
    if ($('#CP_Anag').val() == '') {
        result = await window.electronAPI.insertTableContent(
            'anagrafica',
            {
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
                'Gr': $('#Gr').find(":selected").val(),
                'Elimina': "0",
            }
        )
        if (result.succ)
            result.msg = 'Proclamatore inserito'
    } else {
        result = await window.electronAPI.updateRow(
            'anagrafica',
            {
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
                'Gr': $('#Gr').find(":selected").val(),
            },
            { 'id': parseInt($('#CP_Anag').val()) }
        )
        if (result.succ)
            result.msg = 'Proclamatore modificato'
    }
    notifichePush(result)
})

$('#EliminaProclamatore').click(async function () {
    $("#ModalProclamatore").modal("hide")
    result = await window.electronAPI.updateRow(
        'anagrafica',
        {
            'Elimina': "1",
        },
        { 'id': parseInt($('#CP_Anag').val()) }
    )
    if (result.succ)
        result.msg = 'Proclamatore disattivato'
    notifichePush(result)
    location.reload()
});

$('#RipristinaProclamatore').click(async function () {
    $("#ModalProclamatore").modal("hide")
    result = await window.electronAPI.updateRow(
        'anagrafica',
        {
            'Elimina': "0",
        },
        { 'id': parseInt($('#CP_Anag').val()) }
    )
    if (result.succ)
        result.msg = 'Proclamatore ripristinato'
    notifichePush(result)
    location.reload();
});

async function fpdf() {
    result = await window.electronAPI.fpdfAnagrafica()
    notifichePush(result)
    mostraNotifiche()
}
var db

$(document).ready(async function () {
    navbar("anagrafica")
    loadPage()
    ordinaTabella($("#tableAnagrafica th:eq(0)")[0])
})

async function loadPage() {
    db = await window.electronAPI.readFile('db')
    visualCO()
    visualGruppi()
    visualProclamatori()
}

$("th").click(function () {
    ordinaTabella(this)
})

$(":checkbox").change(function () {
    if ($(this).is(":checked")) {
        $(`input[name='${$(this).attr("name")}']`).not(this).prop("checked", false);
    }
})

$("input").focus(function () {
    if ($(this).hasClass("is-invalid")) {
        $(`input[name='${$(this).attr("name")}']`).removeClass("is-invalid")
    }
})

async function visualCO() {
    if (db.sorvegliante.length === 0) {
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
                            <td class="">${db.sorvegliante[0].Nome_CO}</td>
                            <td class="">${db.sorvegliante[0].Cel_CO}</td>
                            <td class="">${db.sorvegliante[0].Email_CO}</td>
                        </tr>
                    </tbody>
                </table>
            </div>`)
    }
}

function modalCO() {
    if (db.sorvegliante.length === 0) {
        $("#FormCO").trigger("reset");
    } else {
        $('[name="Nome_CO"]').val(db.sorvegliante[0].Nome_CO)
        $('[name="Cel_CO"]').val(db.sorvegliante[0].Cel_CO)
        $('[name="Email_CO"]').val(db.sorvegliante[0].Email_CO)
    }
    $("#ModalCO").modal("show")
}

async function salvaCO() {
    $('#FormCO').find(":input").each(function () {
        if (!this.checkValidity()) {
            $(this).addClass("is-invalid");
        }
    });
    if ($('#FormCO').find(".is-invalid").length > 0) {
        return
    }
    $("#ModalCO").modal("hide")
    db.sorvegliante[0] = {
        'Nome_CO': $("#Nome_CO").val(),
        'Cel_CO': $("#Cel_CO").val(),
        'Email_CO': $("#Email_CO").val(),
    }
    try {
        result = await window.electronAPI.writeFile('db', db)
    } catch (e) {
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    toast(new Date().getTime(), "verde", `Dati salvati`)
    loadPage()
}

async function visualGruppi() {
    db.gruppi.sort(function (a, b) {
        return a.Num - b.Num
    })
    //console.log(gruppi)
    $("#DivGruppi").removeClass(`row-cols-md-1 row-cols-md-2 row-cols-md-3 row-cols-md-4`)
    $("#DivGruppi").html('')
    $("#Gr").html()
    if (db.gruppi.length <= 4)
        $("#DivGruppi").addClass(`row-cols-md-${db.gruppi.length}`)
    if (db.gruppi.length > 4)
        $("#DivGruppi").addClass(`row-cols-md-3`)
    db.gruppi.forEach(function (gruppo) {
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
    $("#Num").val(db.gruppi.length + 1)
    $('#CP_Gruppo').val('');
    $('#EliminaGruppo').addClass("d-none");
    if (CP_Gruppo != '') {
        $('#EliminaGruppo').removeClass("d-none");
        gruppo = db.gruppi.find((item) => item['id'] === Number(CP_Gruppo))
        $('#CP_Gruppo').val(CP_Gruppo);
        $("#Num").val(parseInt(gruppo.Num));
        $("#Sorv_Gr").val(gruppo.Sorv_Gr);
        $("#straniero").prop('checked', gruppo.straniero)
    }
    $("#ModalGruppo").modal("show")
}

async function salvaGruppo(CP_Gruppo) {
    $('#FormGruppo').find(":input").each(function () {
        if (!this.checkValidity()) {
            $(this).addClass("is-invalid");
        }
    });
    if ($('#FormGruppo').find(".is-invalid").length > 0) {
        return
    }
    $("#ModalGruppo").modal("hide")
    if (CP_Gruppo == '') {
        db.gruppi.push({
            'Num': $("#Num").val(),
            'Sorv_Gr': $("#Sorv_Gr").val(),
            'straniero': $("#straniero").prop('checked'),
            'id': new Date().getTime()
        })
    } else {
        let n = db.gruppi.findIndex((item) => item.id === Number(CP_Gruppo))
        db.gruppi[n].Num = $("#Num").val()
        db.gruppi[n].Sorv_Gr = $("#Sorv_Gr").val()
        db.gruppi[n].straniero = $("#straniero").prop('checked')
    }
    try {
        result = await window.electronAPI.writeFile('db', db)
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
    let n = db.gruppi.findIndex((item) => item.id == Number(CP_Gruppo))
    let eliminato = db.gruppi[n]
    db.gruppi.splice(n, 1)
    try {
        result = await window.electronAPI.writeFile('db', db)
    } catch (e) {
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    if (db.anagrafica.length > 0) {
        db.anagrafica.forEach(function (proc, indice) {
            if (proc.Gr == Number(CP_Gruppo)) {
                db.anagrafica[indice].Gr = ''
            }
        })
        try {
            result = await window.electronAPI.writeFile('db', db)
        } catch (e) {
            loadPage()
            toast(new Date().getTime(), "rosso", e, 10000)
            return
        }
    }
    /*
    if (db.rapporti.length > 0) {
        rdb.apporti.forEach(function (rap, indice) {
            if (rap.Gr == Number(CP_Gruppo)) {
                db.rapporti[indice].Gr = ''
            }
        })
        try {
            result = await window.electronAPI.writeFile('db', db)
        } catch (e) {
            loadPage()
            toast(new Date().getTime(), "rosso", e, 10000)
            return
        }
    }
    */
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
    db.anagrafica.sort(function (a, b) {
        if (a.Nome.toUpperCase() < b.Nome.toUpperCase())
            return -1
        if (a.Nome.toUpperCase() > b.Nome.toUpperCase())
            return 1
        return 0
    })
    p = pr = ps = inat = 0
    db.anagrafica.forEach(function (proc, indice) {
        if (!proc.Eliminato) {
            if (proc.Gr) {
                var gruppo = db.gruppi.find((item) => item.id === Number(proc["Gr"]))
                var gruppoTxt = `${gruppo.Num} - ${gruppo.Sorv_Gr}`
            } else {
                gruppoTxt = ""
            }
            if (proc.PR_PS == 'PR') {
                pr++
            } else if (proc.PR_PS == 'PS') {
                ps++
            } else if (!proc.Attivo) {
                inat++
            } else {
                p++
            }
            $("#TBodyProc").append(`
                <tr onclick="modalProclamatore('${proc["id"]}')">
                    <td>${proc["Nome"]}</td>
                    <td>${getAge(proc["D_Nasc"])}</td>
                    <td>${proc["Cel"] || proc["Tel"]}</td>
                    <td>${proc["Email"]}</td>
                    <td>${proc["Emerg"]}</td>
                    <td>${gruppoTxt}</td>
                    <td>${proc["Attivo"] ? "Attivo" : "Inattivo"}</td>
                </tr>`)
        } else {
            $('#rowEliminati').removeClass('d-none')
            $("#tableEliminati tbody").append(`
                <tr onclick="modalProclamatore(${proc["id"]})">
                    <td>${proc["Nome"]}</td>
                    <td>${getAge(proc["D_Nasc"])}</td>
                    <td>${proc["Cel"] || proc["Tel"]}</td>
                    <td>${proc["Email"]}</td>
                    <td>${proc["Emerg"]}</td>
                </tr>`)
        }
    })
    if (p > 0)
        $("#p").html(`&nbsp&nbsp&nbspProclamatori: ${p}`)
    if (pr > 0)
        $("#pr").html(`&nbsp- PR: ${pr}`)
    if (ps > 0)
        $("#ps").html(`&nbsp- PS: ${ps}`)
    if (inat > 0)
        $("#inat").html(`&nbsp- Inattivi: ${inat}`)
}

function modalProclamatore(CP_Anag) {
    $("#Gr").html('')
    db.gruppi.forEach(function (gruppo) {
        //modal gruppi select option
        $("#Gr").append(
            $("<option>", {
                value: gruppo["id"],
                text: `${gruppo["Num"]} - ${gruppo["Sorv_Gr"]}`,
            })
        )
    })
    $("#FormProclamatore").trigger("reset")
    $("#FormProclamatore").find("input").removeClass("is-invalid")
    $('#CP_Anag').val("")
    $('#EliminaProclamatore').addClass("d-none");
    $('#RipristinaProclamatore').addClass("d-none");
    if (CP_Anag != "") {
        proc = db.anagrafica.find((item) => item.id == Number(CP_Anag))
        if (proc.Eliminato) {
            $('#RipristinaProclamatore').removeClass("d-none")
        } else {
            $('#EliminaProclamatore').removeClass("d-none")
        }
        $('#CP_Anag').val(CP_Anag)
        $("#Nome").val(unescapeHtml(proc.Nome))
        $("#Nome2").val(unescapeHtml(proc.Nome2))
        $("#Ind").val(unescapeHtml(proc.Ind))
        $("#D_Nasc").val(proc.D_Nasc)
        $("#D_Batt").val(proc.D_Batt)
        $("#Tel").val(unescapeHtml(proc.Tel))
        $("#Cel").val(unescapeHtml(proc.Cel))
        $("#Email").val(unescapeHtml(proc.Email))
        $("#Emerg").val(unescapeHtml(proc.Emerg))
        $(`input[name=S][value=${proc.S}]`).prop("checked", true)
        if (proc.U_AP && proc.U_AP == $("#" + proc.U_AP).val()) {
            $("#" + proc.U_AP).prop("checked", true);
        }
        if (proc.SM_AN && proc.SM_AN == $("#" + proc.SM_AN).val()) {
            $("#" + proc.SM_AN).prop("checked", true);
        }
        if (proc.PR_PS && proc.PR_PS == $("#" + proc.PR_PS).val()) {
            $("#" + proc.PR_PS).prop("checked", true);
        }
        $(`input[name=Attivo][value=${proc.Attivo}]`).prop("checked", true);
        if (proc.Gr != '') {
            $(`#Gr option[value='${proc.Gr}'`).prop('selected', true)
            //$("#Gr").val($(`#Gr option[value='${proc.Gr}'`).text())
        } else {
            $("#Gr").val('')
        }
    }
    $("#ModalProclamatore").modal("show")
}

async function salvaProclamatore(CP_Anag) {
    $('#FormProclamatore').find(":input").each(function () {
        if (!this.checkValidity()) {
            $(this).addClass("is-invalid");
        }
    });
    if ($('#FormProclamatore').find(".is-invalid").length > 0) {
        return
    }
    $("#ModalProclamatore").modal("hide")
    if (CP_Anag == '') {
        db.anagrafica.push({
            'id': new Date().getTime(),
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
            'U_AP': ($(`input[name=U_AP]:checked`).val() ?? ''),
            'SM_AN': ($(`input[name=SM_AN]:checked`).val() ?? ''),
            'PR_PS': ($(`input[name=PR_PS]:checked`).val() ?? ''),
            'Attivo': ($('input[name=Attivo]:checked').val() === 'true'),
            'Gr': Number($('#Gr').find(":selected").val()),
            'Eliminato': false,
            'rapporti': [],
        })
    } else {
        let n = db.anagrafica.findIndex((item) => item.id === Number(CP_Anag))
        db.anagrafica[n].Nome = $("#Nome").val()
        db.anagrafica[n].Nome2 = $("#Nome2").val()
        db.anagrafica[n].Ind = $("#Ind").val()
        db.anagrafica[n].D_Nasc = $("#D_Nasc").val()
        db.anagrafica[n].D_Batt = $("#D_Batt").val()
        db.anagrafica[n].Tel = $("#Tel").val()
        db.anagrafica[n].Cel = $("#Cel").val()
        db.anagrafica[n].Email = $("#Email").val()
        db.anagrafica[n].Emerg = $("#Emerg").val()
        db.anagrafica[n].S = $('input[name=S]:checked').val()
        db.anagrafica[n].U_AP = ($(`input[name=U_AP]:checked`).val() ?? '')
        db.anagrafica[n].SM_AN = ($(`input[name=SM_AN]:checked`).val() ?? '')
        db.anagrafica[n].PR_PS = ($(`input[name=PR_PS]:checked`).val() ?? '')
        db.anagrafica[n].Attivo = ($('input[name=Attivo]:checked').val() === 'true')
        db.anagrafica[n].Gr = Number($('#Gr').find(":selected").val())
    }
    try {
        result = await window.electronAPI.writeFile('db', db)
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
    let n = db.anagrafica.findIndex((item) => item.id === Number(CP_Anag))
    db.anagrafica[n].Eliminato = true
    try {
        result = await window.electronAPI.writeFile('db', db)
    } catch (e) {
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    toast(new Date().getTime(), "verde", `${db.anagrafica[n].Nome} è stato eliminato`)
    loadPage()
}

async function ripristinaProclamatore(CP_Anag) {
    $("#ModalProclamatore").modal("hide")
    let n = db.anagrafica.findIndex((item) => item.id === Number(CP_Anag))
    db.anagrafica[n].Eliminato = false
    try {
        result = await window.electronAPI.writeFile('db', db)
    } catch (e) {
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    toast(new Date().getTime(), "verde", `${db.anagrafica[n].Nome} è stato ripristinato`)
    loadPage()
}

async function fpdf() {
    result = await window.electronAPI.fpdfAnagrafica()
    if (result.succ)
        toast(new Date().getTime(), "verde", result.msg)
    else
        toast(new Date().getTime(), "rosso", result.msg)
}
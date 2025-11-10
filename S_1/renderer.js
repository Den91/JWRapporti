var keys = ['Studi', 'Ore']
var p
var pa
var pr
var ps
var tot
var ir
var db
var mese

$(document).ready(async function () {
    navbar("S-1")
    $('[name="mese"]').val(getMese())
    visualS1()
})

async function visualS1() {
    db = await window.electronAPI.readFile('db')
    mese = $('[name="mese"]').val()
    sessionStorage.setItem('mese', mese)
    $("#CardTotali").addClass("d-none")
    if (mese != "") {
        $("#CardTotali").removeClass("d-none")
        tot = {
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
        $('#pN').html(tot.p.N)
        $('#pStudi').html(tot.p.Studi)
        $('#paN').html(tot.pa.N)
        $('#paStudi').html(tot.pa.Studi)
        $('#paOre').html(tot.pa.Ore)
        $('#prN').html(tot.pr.N)
        $('#prStudi').html(tot.pr.Studi)
        $('#prOre').html(tot.pr.Ore)
        $('#totN').html(tot.p.N + tot.pa.N + tot.pr.N)
        $('#totStudi').html(tot.p.Studi + tot.pa.Studi + tot.pr.Studi)
        $('#totOre').html(tot.pa.Ore + tot.pr.Ore)
        $("#proc_attivi").html(tot.p.N + tot.pa.N + tot.pr.N + tot.ps.N + tot.ir.N)
        media_presenti = 0
        i = db.presenti.findIndex(presenti => presenti.Mese == mese)
        if (i != -1) {
            t = 0
            c = 0
            for (x = 1; x < 6; x++) {
                if (db.presenti[i]['f' + x] > 0) {
                    t += Number(db.presenti[i]['f' + x])
                    c++
                }
            }
            media_presenti = (t / c).toFixed(0)
        }
        $("#media_adun").html(media_presenti)
    }
}
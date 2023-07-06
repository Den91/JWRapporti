var keys = ['Pubb', 'Video', 'Ore', 'VU', 'Studi']
var p
var pa
var pr
var ps
var tot
var ir


$(window).resize(function () {
    marginBody()
})

$(document).ready(async function () {
    navbar("S-1")
    $('[name="mese"]').val(getMese())
    visualS1()
})

async function visualS1() {
    mese = $('[name="mese"]').val()
    sessionStorage.setItem('mese', mese)
    p = { n: 0, Pubb: 0, Video: 0, Ore: 0, VU: 0, Studi: 0 }
    pa = { n: 0, Pubb: 0, Video: 0, Ore: 0, VU: 0, Studi: 0 }
    pr = { n: 0, Pubb: 0, Video: 0, Ore: 0, VU: 0, Studi: 0 }
    ps = { n: 0, Pubb: 0, Video: 0, Ore: 0, VU: 0, Studi: 0 }
    tot = { n: 0, Pubb: 0, Video: 0, Ore: 0, VU: 0, Studi: 0 }
    ir = 0
    $("#CardTotali").addClass("d-none")
    if (mese != "") {
        rapporti = await window.electronAPI.readFile('rapporti')
        rapporti_mese = rapporti.filter(rapporto => rapporto.Mese == mese)
        rapporti_mese.forEach(function (rap, indice) {
            if (rap.Inc == 'p') {
                p.n++
                keys.forEach(function (key, indice) {
                    p[key] += rap[key]
                })
            }
            if (rap.Inc == 'pa') {
                pa.n++
                keys.forEach(function (key, indice) {
                    pa[key] += rap[key]
                })
            }
            if (rap.Inc == 'pr') {
                pr.n++
                keys.forEach(function (key, indice) {
                    pr[key] += rap[key]
                })
            }
            if (rap.Inc == 'ps') {
                ps.n++
                keys.forEach(function (key, indice) {
                    ps[key] += rap[key]
                })
            }
            if (rap.Inc == 'ir') {
                ir++
            } else {
                tot.n++
                keys.forEach(function (key, indice) {
                    tot[key] += rap[key]
                })
            }
        })
        //console.log(p)
        //console.log(pa)
        //console.log(pr)
        //console.log(ps)
        //console.log(ir)
        $("#TableTotali tbody").html("")
        $("#TableTotali tfoot").html("")
        $("#proc_attivi").html(``)
        $("#media_adun").html('')
        $("#CardTotali").removeClass("d-none")
        $("#TableTotali tbody").append(`
            <tr>
                <td>Proclamatori</td>
                <td class="text-center">${p.n}</td>
                <td class="text-center">${p.Pubb}</td>
                <td class="text-center">${p.Video}</td>
                <td class="text-center">${p.Ore}</td>
                <td class="text-center">${p.VU}</td>
                <td class="text-center">${p.Studi}</td>
            </tr>`)
        $("#TableTotali tbody").append(`
            <tr>
                <td>Pionieri ausiliari</td>
                <td class="text-center">${pa.n}</td>
                <td class="text-center">${pa.Pubb}</td>
                <td class="text-center">${pa.Video}</td>
                <td class="text-center">${pa.Ore}</td>
                <td class="text-center">${pa.VU}</td>
                <td class="text-center">${pa.Studi}</td>
            </tr>`)
        $("#TableTotali tbody").append(`
            <tr>
                <td>Pionieri regolari</td>
                <td class="text-center">${pr.n}</td>
                <td class="text-center">${pr.Pubb}</td>
                <td class="text-center">${pr.Video}</td>
                <td class="text-center">${pr.Ore}</td>
                <td class="text-center">${pr.VU}</td>
                <td class="text-center">${pr.Studi}</td>
            </tr>`)
        $("#TableTotali tfoot").append(`
            <tr>
                <td>Totale rapporti</td>
                <td class="text-center">${tot.n}</td>
                <td class="text-center">${tot.Pubb}</td>
                <td class="text-center">${tot.Video}</td>
                <td class="text-center">${tot.Ore}</td>
                <td class="text-center">${tot.VU}</td>
                <td class="text-center">${tot.Studi}</td>
            </tr>`)
        $("#proc_attivi").html(tot.n + ir)

        presenti = await window.electronAPI.readFile('presenti')
        presenti_mese = presenti.filter(presenti => presenti.Mese == mese)
        media_presenti = 0
        if (presenti_mese.length != 0) {
            t = 0
            c = 0
            for (x = 1; x < 6; x++) {
                if (presenti_mese[0]['f' + x] > 0) {
                    t += Number(presenti_mese[0]['f' + x])
                    c++
                }
            }
            media_presenti = (t / c).toFixed(0)
        }
        $("#media_adun").html(media_presenti)
    }
}
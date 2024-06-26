const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const FPDF = require('node-fpdf')
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const Chart = require('chart.js')
//const PDFWindowModule = require('electron-pdf-window')
let updateWindow, mainWindow

const tabelle = ['anagrafica', 'gruppi', 'rapporti', 'presenti', 'sorvegliante']
var pack = null
try {
    pack = require('./package.json')
} catch (e) {
    console.log("File non trovato")
}
const platform = os.platform();
var appName = ''
if (pack !== null) {
    appName = (pack.productName ? pack.productName : pack.name);
}
let userData = '';
if (platform === 'win32') {
    userData = path.join(process.env.APPDATA, appName);
} else if (platform === 'darwin') {
    userData = path.join(process.env.HOME, 'Library', 'Application Support', appName);
} else {
    userData = path.join('var', 'local', appName);
}

app.whenReady().then(() => {
    creaTabelle()
    ottimizzaTabelle()
    ipcMain.handle('login', login)
    ipcMain.handle('readFile', readFile)
    ipcMain.handle('writeFile', writeFile)
    ipcMain.handle('loadBackup', loadBackup)
    ipcMain.handle('saveBackup', saveBackup)
    ipcMain.handle('fpdfAnagrafica', fpdfAnagrafica)
    ipcMain.handle('fpdfS21Singola', fpdfS21Singola)
    ipcMain.handle('fpdfS21Tutte', fpdfS21Tutte)
    ipcMain.handle('fpdfS88', fpdfS88)
    ipcMain.handle('fpdfRapporti', fpdfRapporti)
    ipcMain.on('closeModalWindow', closeModalWindow)
    ipcMain.handle('openBrowserUpdate', openBrowserUpdate)

    mainWindow = new BrowserWindow({
        icon: '/images/icon.png',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    })
    mainWindow.setTitle("JW Rapporti " + pack.version)
    mainWindow.maximize()
    if (app.isPackaged) {
        mainWindow.loadFile('./login/index.html')
        if (platform === 'win32') {
            autoUpdater.checkForUpdates()
        } else if (platform === 'darwin') {
            updateMacos()
        }
    } else {
        mainWindow.loadFile('./home/index.html')
    }
    controllaRapportiDoppi()
})

autoUpdater.on('checking-for-update', () => {
    //log.info("Checking for update.")
})
autoUpdater.on('update-available', (info) => {
    updateWindow = new BrowserWindow({
        parent: mainWindow,
        width: 600,
        height: 300,
        modal: true,
        show: true,
        closable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    })
    updateWindow.loadFile('./update/index.html')
    updateWindow.webContents.send('update',
        {
            state: 'available',
        }
    )
    updateWindow.once('ready-to-show', () => {
        updateWindow.show()
    })
    //log.info('Update available.');
})
autoUpdater.on('update-not-available', (info) => {
    //log.info('Update not available.');
})
autoUpdater.on('error', (err) => {
    //log.info('Error in auto-updater. ' + err);
    updateWindow.webContents.send('update',
        {
            state: 'error',
            error: err,
        }
    )
    updateWindow.closable = true;
})
autoUpdater.on('download-progress', (progress) => {
    /*
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    */
    updateWindow.webContents.send('update',
        {
            state: 'progress',
            progress: progress,
        }
    )
})
autoUpdater.on('update-downloaded', (info) => {
    //log.info('Update downloaded');
    updateWindow.webContents.send('update',
        {
            state: 'downloaded',
        }
    )
    updateWindow.closable = true;
})

function updateMacos() {
    fetch("https://api.github.com/repos/Den91/JWRapporti/tags")
        .then(res => res.json())
        .then(latest => {
            updateVersion = latest[0].name.slice(1)
            packVersion = pack.version
            console.log(updateVersion)
            console.log(packVersion)
            compare = updateVersion.localeCompare(packVersion, undefined, { numeric: true, sensitivity: 'base' })
            if (compare == 1) {
                updateWindow = new BrowserWindow({
                    parent: mainWindow,
                    width: 600,
                    height: 300,
                    modal: true,
                    show: true,
                    closable: true,
                    webPreferences: {
                        preload: path.join(__dirname, 'preload.js'),
                    },
                })
                updateWindow.loadFile('./update/index.html')
                updateWindow.once('ready-to-show', () => {
                    updateWindow.webContents.send('update',
                        {
                            state: 'mac-update',
                            link: `https://github.com/Den91/JWRapporti/releases/latest/download/jwrapporti-${updateVersion}.pkg`,
                        }
                    )
                    updateWindow.show()
                })
            }
        })
        .catch(err => { throw err })
}

async function controllaRapportiDoppi() {
    proclamatori = await readFile(null, 'anagrafica')
    rapporti = await readFile(null, 'rapporti')
    rapporti_doppi = []
    mesi = [...new Set(rapporti.map(item => item.Mese))]
    mesi.sort()
    for (let mese of mesi) {
        for (let proc of proclamatori) {
            rapporto = rapporti.filter(i => (i.Mese == mese) && (i.CE_Anag == proc.id))
            if (rapporto.length > 1) {
                rapporto[0].Nome = proc.Nome
                rapporti_doppi.push(rapporto[0])
            }
        }
    }
    if (rapporti_doppi.length > 0) {
        msg = ''
        for (let rap of rapporti_doppi) {
            let data = new Date(rap.Mese)
            msg += `${data.toLocaleString('it-IT', {
                month: 'long',
                year: 'numeric',
            })} - ${rap.Nome}`
        }
        const response = dialog.showMessageBox(mainWindow,
            {
                message: `Attenzione! I seguenti rapporti sono doppi. 
                    È necessario cancellarli manualmente.
                    
                    ${msg}`,
                type: 'warning',
            })
    }
}

function closeModalWindow() {
    updateWindow.close()
}

function openBrowserUpdate(event, url) {
    shell.openExternal(url)
}

function login(event, username, password) {
    if (username.toUpperCase() == "SEGRETARIO" && password == "Rapporti1914")
        return true
    else
        return false
}

function creaTabelle() {
    tabelle.forEach(function (tabella) {
        fname = path.join(userData, tabella + '.json');
        let exists = fs.existsSync(fname);
        if (!exists) {
            let obj = new Object()
            obj[tabella] = []
            try {
                fs.writeFileSync(fname, JSON.stringify(obj, null, 2), (err) => {
                    throw err
                })
            } catch (e) {
                console.log("Errore creazione file tabella" + e)
                return
            }
        }
    })
}

async function ottimizzaTabelle() {
    rapporti = await readFile(null, 'rapporti')
    anagrafica = await readFile(null, 'anagrafica')
    rapporti.forEach(rapporto => {
        if (rapporto.hasOwnProperty('CP_Rap')) {
            delete rapporto.CP_Rap
        }
        if (!rapporto.hasOwnProperty('Gr')) {
            proc = anagrafica.filter(item => item.id == rapporto.CE_Anag)
            rapporto.Gr = proc[0].Gr
        } else {
            if (rapporto.Gr == "") {
                rapporto.Gr = null
            }
        }
    })
    try {
        result = await writeFile(null, 'rapporti', rapporti)
    } catch (e) {
        return
    }
}

async function readFile(event, tableName) {
    let fname = path.join(userData, tableName + '.json')
    let exists = fs.existsSync(fname)

    if (exists) {
        try {
            let table = JSON.parse(fs.readFileSync(fname))
            return table[tableName]
        } catch (e) {
            return []
        }
    } else {
        throw 'Table file does not exist!'
    }
}

async function writeFile(event, tableName, tableObject) {
    let fname = path.join(userData, tableName + '.json')
    let exists = fs.existsSync(fname)

    if (exists) {
        try {
            let obj = new Object();
            obj[tableName] = tableObject
            fs.writeFileSync(fname, JSON.stringify(obj, null, 2), (err) => {
                throw err
            })
            return "File write"
        } catch (e) {
            throw e
        }
    } else {
        throw 'Table file does not exist!'
    }
}

async function fpdfAnagrafica() {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (canceled) {
        return
    } else {
        const pdf = new FPDF('P', 'mm', 'A4');
        pdf.SetTextColor(0, 0, 0);
        pdf.SetAutoPageBreak(1, 3);

        pdf.SetMargins(3, 3);
        pdf.SetY(3);

        border = 1;
        row = 4.2;

        co = await readFile(null, 'sorvegliante')
        co = co[0]

        gruppi = await readFile(null, 'gruppi')
        gruppi.sort(function (a, b) {
            return a.Num - b.Num
        })

        for (gruppo of gruppi) {
            pdf.AddPage();
            pdf.SetFont('Arial', '', 12);
            pdf.Cell(204, row + 1, `Gruppo N.${gruppo["Num"]} ${gruppo["Sorv_Gr"]}`, border, 1, 'C');
            pdf.SetFont('Arial', '', 10);
            if (co != null) {
                pdf.Cell(68, row, "Sorvegliante: " + unescapeHtml(co.Nome_CO), border, 0, 'C');
                pdf.Cell(68, row, "Cellulare: " + co.Cel_CO, border, 0, 'C');
                pdf.Cell(68, row, "Email: " + co.Email_CO, border, 0, 'C');
                pdf.Ln(row + 1);
            }
            c = 1;
            proclamatori = await readFile(null, 'anagrafica')
            proclamatori = proclamatori.filter(item => ((item.Gr == gruppo.id) && (item.Elimina == '0')))

            proclamatori.sort(function (a, b) {
                if (a.Nome < b.Nome)
                    return -1
                if (a.Nome > b.Nome)
                    return 1
                return 0
            })
            for (proc of proclamatori) {
                if (c % 2 != 0) {
                    pdf.SetFillColor(200, 200, 200);
                } else {
                    pdf.SetFillColor(255, 255, 255);
                }
                pdf.SetDrawColor(0, 0, 0);
                pdf.SetTextColor(0, 0, 0);
                c1 = 6;
                c2 = 55;
                c3 = 45;
                c4 = 30;
                c5 = 204 - c1 - c2 - c3 - c4;
                pdf.Cell(c1, row * 3, c, border, 0, 'C', true);
                nome = proc["Nome"];
                if (proc["Nome2"] != "") {
                    nome += ' (' + proc["Nome2"] + ')';
                }
                pdf.Cell(c2, row * 3, unescapeHtml(nome), border, 0, 'L', true);
                var optionData = { day: 'numeric', month: 'numeric', year: 'numeric' }
                if (proc["D_Nasc"] != "") {
                    var D_Nasc = new Date(proc["D_Nasc"]);
                    pdf.Cell(c3, row, "Data nascita: " + D_Nasc.toLocaleString('it-IT', optionData), border, 0, 'L', true);
                } else {
                    pdf.Cell(c3, row, "Data nascita:", border, 0, 'L', true);
                }
                x = pdf.GetX();
                y = pdf.GetY();
                pdf.Ln(row);
                pdf.Cell(c1 + c2, row, "", 0, 0, 'L', false);
                if (proc["D_Batt"] != "") {
                    var D_Batt = new Date(proc["D_Batt"]);
                    pdf.Cell(c3, row, "Data battesimo: " + D_Batt.toLocaleString('it-IT', optionData), border, 0, 'L', true);
                } else {
                    pdf.Cell(c3, row, "Data battesimo:", border, 0, 'L', true);
                }
                pdf.SetXY(x, y);

                pdf.Cell(c4, row, "Cel: " + proc["Cel"], border, 0, 'L', true);
                x = pdf.GetX();
                y = pdf.GetY();
                pdf.Ln(row);
                pdf.Cell(c1 + c2 + c3, row, '', 0, 0, 'L', false);
                pdf.Cell(c4, row, "Tel: " + proc["Tel"], border, 0, 'L', true);
                pdf.SetXY(x, y);

                pdf.Cell(c5, row, "Email: " + proc["Email"], border, 0, 'L', true);
                x = pdf.GetX();
                y = pdf.GetY();
                pdf.Ln(row);
                pdf.Cell(c1 + c2 + c3 + c4, row, "", 0, 0, 'L', false);
                pdf.Cell(c5, row, unescapeHtml(proc["Emerg"]), border, 0, 'L', true);
                pdf.Ln(row);
                pdf.Cell(c1 + c2, row, '', 0, 0, 'L', false);
                pdf.Cell(204 - c1 - c2, row, "Ind: " + proc["Ind"], border, 0, 'L', true);
                pdf.Ln(row);
                c++;
            }
        }
        try {
            pdf.Output('F', path.join(filePaths[0], 'anagrafica.pdf'))
            //shell.showItemInFolder(path.join(filePaths[0], 'anagrafica.pdf'));
            /*
            const PDFWindow = new PDFWindowModule({
                width: 1024,
                height: 768
            })
            PDFWindow.loadURL(path.join(filePaths[0], 'anagrafica.pdf'))
            */
            return { succ: true, msg: "File creato" }
        } catch (e) {
            return { succ: false, msg: 'Errore: ' + e }
        }
    }
}

async function fpdfRapporti(event, mese) {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (canceled) {
        return
    } else {
        proclamatori = await readFile(null, 'anagrafica')
        rapporti = await readFile(null, 'rapporti')
        rapporti = rapporti.filter(item => item.Mese == mese)

        rapporti.forEach(function (rapporto, indice) {
            let proc = proclamatori.find(item => item.id === rapporto.CE_Anag)
            rapporto.Nome = proc.Nome
        })
        rapporti.sort(function (a, b) {
            if (a.Nome < b.Nome)
                return -1
            if (a.Nome > b.Nome)
                return 1
            return 0
        })

        var keys = ['Pubb', 'Video', 'Ore', 'VU', 'Studi']
        const pdf = new FPDF('P', 'mm', 'A4');
        pdf.SetTextColor(0, 0, 0);
        pdf.SetAutoPageBreak(1, 3);
        pdf.SetMargins(3, 3);
        pdf.SetY(3);
        pdf.AddPage();

        border = 1;
        row = 4.6;

        mese_date = new Date(mese)
        pdf.SetFont('Arial', 'B', 12);
        pdf.Cell(204, row + 2,
            "Rapporti " + mese_date.toLocaleString('it-IT', { month: 'long', year: 'numeric' }), border, 0, 'C');
        pdf.Ln(row + 2);
        pdf.SetFont('Arial', 'B', 10);
        c0 = 7
        c1 = 48;
        c2 = 16;
        c3 = 16;
        c4 = 16;
        c5 = 16;
        c6 = 16;
        c7 = 16;
        c8 = 53;
        pdf.Cell(c0, row, '#', border, 0, 'C');
        pdf.Cell(c1, row, 'Nome proclamatore', border, 0, 'L');
        pdf.Cell(c2, row, 'Inc', border, 0, 'C');
        pdf.Cell(c3, row, 'Pubb', border, 0, 'C');
        pdf.Cell(c4, row, 'Video', border, 0, 'C');
        pdf.Cell(c5, row, 'Ore', border, 0, 'C');
        pdf.Cell(c6, row, 'VU', border, 0, 'C');
        pdf.Cell(c7, row, 'Studi', border, 0, 'C');
        pdf.Cell(c8, row, 'Note', border, 0, 'L');
        pdf.Ln(row);

        pdf.SetFont('Arial', '', 10);
        x = 1;
        totP = { N: 0, Pubb: 0, Video: 0, Ore: 0, VU: 0, Studi: 0 }
        totPA = { N: 0, Pubb: 0, Video: 0, Ore: 0, VU: 0, Studi: 0 }
        totPR = { N: 0, Pubb: 0, Video: 0, Ore: 0, VU: 0, Studi: 0 }
        ir = 0

        for (rapporto of rapporti) {
            if (x % 2 != 0) {
                pdf.SetFillColor(200, 200, 200);
            } else {
                pdf.SetFillColor(255, 255, 255);
            }
            proc = proclamatori.find(item => item.id === rapporto.CE_Anag)
            pdf.Cell(c0, row, x, border, 0, 'C', true);
            pdf.Cell(c1, row, unescapeHtml(proc['Nome']), border, 0, 'L', true);
            pdf.Cell(c2, row, rapporto['Inc'], border, 0, 'C', true);
            pdf.Cell(c3, row, rapporto['Pubb'] ? rapporto['Pubb'] : '', border, 0, 'C', true);
            pdf.Cell(c4, row, rapporto['Video'] ? rapporto['Video'] : '', border, 0, 'C', true);
            pdf.Cell(c5, row, rapporto['Ore'] ? rapporto['Ore'] : '', border, 0, 'C', true);
            pdf.Cell(c6, row, rapporto['VU'] ? rapporto['VU'] : '', border, 0, 'C', true);
            pdf.Cell(c7, row, rapporto['Studi'] ? rapporto['Studi'] : '', border, 0, 'C', true);
            pdf.Cell(c8, row, rapporto['Note'] ? unescapeHtml(rapporto['Note']) : '', border, 0, 'L', true);
            pdf.Ln(row);
            x++;
            if (rapporto['Inc'] == 'p') {
                totP['N']++
                for (key of keys) {
                    totP[key] += Number(rapporto[key])
                }
            }
            if (rapporto['Inc'] == 'pa') {
                totPA['N']++
                for (key of keys) {
                    totPA[key] += Number(rapporto[key])
                }
            }
            if (rapporto['Inc'] == 'pr') {
                totPR['N']++
                for (key of keys) {
                    totPR[key] += Number(rapporto[key])
                }
            }
            if (rapporto['Inc'] == 'ir') {
                ir++
            }
        }

        pdf.Ln(10);
        pdf.SetFillColor(255, 255, 255);
        row = 6;

        pdf.Cell(20, row, "", 0, 0, 'L', true);
        pdf.Cell(c1, row, "Incarico", border, 0, 'L', true);
        pdf.Cell(c2, row, "N.", border, 0, 'C', true);
        pdf.Cell(c3, row, "Pubb.", border, 0, 'C', true);
        pdf.Cell(c4, row, "Video", border, 0, 'C', true);
        pdf.Cell(c5, row, "Ore", border, 0, 'C', true);
        pdf.Cell(c6, row, "Visite", border, 0, 'C', true);
        pdf.Cell(c7, row, "Studi", border, 0, 'C', true);
        pdf.Ln(row);

        pdf.Cell(20, row, "", 0, 0, 'L', true);
        pdf.Cell(c1, row, 'Proclamatori', border, 0, 'L', true);
        pdf.Cell(c2, row, totP['N'], border, 0, 'C', true);
        for (key of keys) {
            pdf.Cell(c2, row, totP[key], border, 0, 'C', true);
        }
        pdf.Ln(row);

        pdf.Cell(20, row, "", 0, 0, 'L', true);
        pdf.Cell(c1, row, 'Pionieri ausiliari', border, 0, 'L', true);
        pdf.Cell(c2, row, totPA['N'], border, 0, 'C', true);
        for (key of keys) {
            pdf.Cell(c2, row, totPA[key], border, 0, 'C', true);
        }
        pdf.Ln(row);

        pdf.Cell(20, row, "", 0, 0, 'L', true);
        pdf.Cell(c1, row, 'pionieri regolari', border, 0, 'L', true);
        pdf.Cell(c2, row, totPR['N'], border, 0, 'C', true);
        for (key of keys) {
            pdf.Cell(c2, row, totPR[key], border, 0, 'C', true);
        }
        pdf.Ln(row);

        pdf.Cell(20, row, "", 0, 0, 'L', true);
        pdf.Cell(c1, row, "Totale rapporti", border, 0, 'L', true);
        pdf.Cell(c2, row, totP['N'] + totPA['N'] + totPR['N'], border, 0, 'C', true);
        for (key of keys) {
            pdf.Cell(c2, row, totP[key] + totPA[key] + totPR[key], border, 0, 'C', true);
        }
        pdf.Ln(row);

        pdf.Cell(20, row, "", 0, 0, 'L', true);
        pdf.Cell(c1, row, 'Irregolari', border, 0, 'L', true);
        pdf.Cell(c2, row, ir, border, 0, 'C', true);
        pdf.Ln(row);
        try {
            pdf.Output('F', path.join(filePaths[0],
                `rapporti ${mese_date.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}.pdf`))
            shell.showItemInFolder(path.join(filePaths[0],
                `rapporti ${mese_date.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}.pdf`));
            return { succ: true, msg: "File creato" }
        } catch (e) {
            return { succ: false, msg: 'Errore: ' + e }
        }
    }
}

async function cartolinaFPDF(pdf, proc, cartolina, link_pdf, link_first_page = null) {
    if (link_pdf != null) {
        pdf.SetLink(link_pdf);
    }

    pdf.SetFont('Arial', 'B', 10);
    pdf.Cell(187, 10, "REGISTRAZIONE DEL PROCLAMATORE DI CONGREGAZIONE", 0, 0, 'C');
    if (link_first_page != null) {
        pdf.SetFont('ZapfDingbats', '', 11);
        pdf.Cell(10, 10, "s", 0, 0, 'C', false, 1);
    }
    pdf.Ln(10);

    //Intestazione
    if (isNaN(proc.id)) {
        pdf.SetFont('Arial', '', 11);
        pdf.Cell(130, 8, "Cognome e Nome:  " + proc["Nome"], 0, 0, 'L');
        pdf.Ln(24)
    } else {
        pdf.SetFont('Arial', '', 11);
        let nome = "Cognome e Nome:  " + proc["Nome"];
        if (proc["Nome2"] != "") {
            nome += ' (' + proc["Nome2"] + ')';
        }
        pdf.Cell(130, 8, unescapeHtml(nome), 0, 0, 'L');
        let check
        if (proc["S"] == "M") {
            check = "4";
        } else {
            check = "";
        }
        pdf.SetFont('ZapfDingbats', '', 11);
        let x = pdf.GetX();
        let y = pdf.GetY();
        pdf.SetXY(x, y + 2);
        pdf.Cell(4, 4, check, 1, 0);

        x = pdf.GetX();
        pdf.SetXY(x, y);
        pdf.SetFont('Arial', '', 11);
        pdf.Cell(25, 8, " Maschio", 0, 0, 'L');

        if (proc["S"] == "F") {
            check = "4";
        } else {
            check = "";
        }
        pdf.SetFont('ZapfDingbats', '', 11);
        x = pdf.GetX();
        y = pdf.GetY();
        pdf.SetXY(x, y + 2);
        pdf.Cell(4, 4, check, 1, 0);

        x = pdf.GetX();
        pdf.SetXY(x, y);
        pdf.SetFont('Arial', '', 11);
        pdf.Cell(25, 8, " Femmina", 0, 0, 'L');
        pdf.Ln(8);

        if (proc["D_Nasc"] != "") {
            var D_Nasc = new Date(proc["D_Nasc"]);
            pdf.Cell(130, 8, "Data nascita: " +
                D_Nasc.toLocaleString("it-IT", { day: "numeric", month: 'long', year: 'numeric' }), 0, 0, 'L');
        } else {
            pdf.Cell(130, 8, "Data nascita:", 0, 0, 'L');
        }

        if (proc["U_AP"] == "U") {
            check = "4";
        } else {
            check = "";
        }
        pdf.SetFont('ZapfDingbats', '', 11);
        x = pdf.GetX();
        y = pdf.GetY();
        pdf.SetXY(x, y + 2);
        pdf.Cell(4, 4, check, 1, 0);

        x = pdf.GetX();
        pdf.SetXY(x, y);
        pdf.SetFont('Arial', '', 11);
        pdf.Cell(25, 8, " Unto", 0, 0, 'L');

        if (proc["U_AP"] == "P") {
            check = "4";
        } else {
            check = "";
        }
        pdf.SetFont('ZapfDingbats', '', 11);
        x = pdf.GetX();
        y = pdf.GetY();
        pdf.SetXY(x, y + 2);
        pdf.Cell(4, 4, check, 1, 0);

        x = pdf.GetX();
        pdf.SetXY(x, y);
        pdf.SetFont('Arial', '', 11);
        pdf.Cell(25, 8, " Altre pecore", 0, 0, 'L');
        pdf.Ln(8);

        if (proc["D_Batt"] != "") {
            var D_Batt = new Date(proc["D_Batt"]);
            pdf.Cell(85, 8, "Data di immersione: " +
                D_Batt.toLocaleString("it-IT", { day: "numeric", month: 'long', year: 'numeric' }), 0, 0, 'L');
        } else {
            pdf.Cell(85, 8, "Data di immersione:", 0, 0, 'L');
        }

        if (proc["SM_AN"] == "AN") {
            check = "4";
        } else {
            check = "";
        }
        pdf.SetFont('ZapfDingbats', '', 11);
        x = pdf.GetX();
        y = pdf.GetY();
        pdf.SetXY(x, y + 2);
        pdf.Cell(4, 4, check, 1, 0);

        x = pdf.GetX();
        pdf.SetXY(x, y);
        pdf.SetFont('Arial', '', 11);
        pdf.Cell(25, 8, " Anziano", 0, 0, 'L');

        if (proc["SM_AN"] == "SM") {
            check = "4";
        } else {
            check = "";
        }
        pdf.SetFont('ZapfDingbats', '', 11);
        x = pdf.GetX();
        y = pdf.GetY();
        pdf.SetXY(x, y + 2);
        pdf.Cell(4, 4, check, 1, 0);

        x = pdf.GetX();
        pdf.SetXY(x, y);
        pdf.SetFont('Arial', '', 11);
        pdf.Cell(35, 8, " Servitore di m.", 0, 0, 'L');

        if (proc["PR_PS"] == "PR") {
            check = "4";
        } else {
            check = "";
        }
        pdf.SetFont('ZapfDingbats', '', 11);
        x = pdf.GetX();
        y = pdf.GetY();
        pdf.SetXY(x, y + 2);
        pdf.Cell(4, 4, check, 1, 0);

        x = pdf.GetX();
        pdf.SetXY(x, y);
        pdf.SetFont('Arial', '', 11);
        pdf.Cell(25, 8, " Pioniere regolare", 0, 0, 'L');
        pdf.Ln(8);
    }

    var c1 = 45
    var c24 = 25
    var c5 = 70
    //tabella
    pdf.Cell(c1, 7, "Mese", 1, 0, 'C');
    if (isNaN(proc.id)) {
        pdf.Cell(c24, 7, "N", 1, 0, 'C');
    } else {
        pdf.Cell(c24, 7, "Inc", 1, 0, 'C');
    }
    pdf.Cell(c24, 7, "Studi", 1, 0, 'C');
    pdf.Cell(c24, 7, "Ore", 1, 0, 'C');
    pdf.Cell(c5, 7, "Note", 1, 0, 'C');
    pdf.Ln(7);

    var somma = 0
    for (let rapporto of cartolina) {
        pdf.Cell(c1, 7,
            new Date(rapporto.Mese).toLocaleString("it-IT", { year: 'numeric', month: 'long' }), 1, 0, 'L');
        if (rapporto.hasOwnProperty('Inc')) {
            pdf.Cell(c24, 7, rapporto.Inc, 1, 0, 'C')
            pdf.Cell(c24, 7, rapporto.Studi || '', 1, 0, 'C');
            if (rapporto.Inc == "pa" || rapporto.Inc == "pr" || rapporto.Inc == "ps") {
                somma += Number(rapporto.Ore)
                pdf.Cell(c24, 7, rapporto.Ore, 1, 0, 'C');
            } else {
                pdf.Cell(c24, 7, '', 1, 0, 'C');
            }
            pdf.Cell(c5, 7, unescapeHtml(rapporto.Note || ''), 1, 0, 'L');
        } else if (rapporto.hasOwnProperty('N') && rapporto.N != 0) {
            pdf.Cell(c24, 7, rapporto.N, 1, 0, 'C');
            pdf.Cell(c24, 7, rapporto.Studi || '', 1, 0, 'C');
            if (proc.id != 'p') {
                somma += Number(rapporto.Ore)
                pdf.Cell(c24, 7, rapporto.Ore, 1, 0, 'C');
            } else {
                pdf.Cell(c24, 7, '', 1, 0, 'C');
            }
            pdf.Cell(c5, 7, unescapeHtml(rapporto.Note || ''), 1, 0, 'L');
        } else {
            pdf.Cell(c24, 7, '', 1, 0, 'C');
            pdf.Cell(c24, 7, '', 1, 0, 'C');
            pdf.Cell(c24, 7, '', 1, 0, 'C');
            pdf.Cell(c5, 7, '', 1, 0, 'L');
        }
        pdf.Ln(7);
    }

    pdf.Cell(c1 + c24, 7, "", 0, 0, 'L');
    pdf.Cell(c24, 7, "Totale", 1, 0, 'C');
    if (somma != 0) {
        pdf.Cell(c24, 7, somma, 1, 0, 'C');
    } else {
        pdf.Cell(c24, 7, '', 1, 0, 'C');
    }
    pdf.Cell(c5, 7, "", 1, 0, 'L');
    pdf.Ln(7)
}

async function fpdfS21Singola(event, anno, proc) {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (canceled) {
        return
    } else {
        const pdf = new FPDF('L', 'mm', 'A5');
        pdf.SetFont('Arial', '', 10);
        pdf.SetTextColor(0, 0, 0);
        pdf.SetAutoPageBreak(1, 3);
        pdf.SetY(3);
        pdf.AddPage();

        rapporti = await readFile(null, 'rapporti')
        gruppi = await readFile(null, 'gruppi')
        anagrafica = await readFile(null, 'anagrafica')
        var mesi = mesiAnnoTeocratico(anno)

        cartolina = []
        for (let mese of mesi) {
            rapporto = { 'Mese': mese }
            if (isNaN(proc.id)) {
                if (proc.id.length > 2) {
                    gruppoStraniero = proc.id.split('-')
                    if (gruppoStraniero[1] == 'ita') {
                        gruppiStranieri = gruppi.filter(item => item.straniero).map(item => item.id)
                        rapporti_mese = rapporti.filter(item => (
                            (item.Mese == mese) &&
                            (item.Inc == gruppoStraniero[0]) &&
                            (!gruppiStranieri.includes(item.Gr))
                        ))
                    } else {
                        rapporti_mese = rapporti.filter(item => (
                            (item.Mese == mese) &&
                            (item.Inc == gruppoStraniero[0]) &&
                            (item.Gr == gruppoStraniero[1])
                        ))
                    }
                } else {
                    if (proc.id == "tt") {
                        rapporti_mese = rapporti.filter(item => (item.Mese == mese))
                    } else {
                        rapporti_mese = rapporti.filter(item => (
                            (item.Mese == mese) &&
                            (item.Inc == proc.id)))
                    }
                }
                rapporto.N = rapporti_mese.length
                if (rapporti_mese.length != 0) {
                    rapporto.Studi = rapporti_mese.map(item => item.Studi).reduce((p, n) => p + n)
                    if (proc.id != "p") {
                        rapporto.Ore = rapporti_mese.map(item => item.Ore).reduce((p, n) => p + n)
                    }
                    if (proc.id == "tt") {
                        let p = rapporti_mese.filter(item => item.Inc == 'p')
                        let pa = rapporti_mese.filter(item => item.Inc == 'pa')
                        let pr = rapporti_mese.filter(item => item.Inc == 'pr')
                        let ir = rapporti_mese.filter(item => item.Inc == 'ir')
                        rapporto.Note = `P:${p.length} PA:${pa.length} PR:${pr.length} IR:${ir.length}`
                    }
                }
            } else {
                rap = rapporti.filter(item => ((item.Mese == mese) && (item.CE_Anag == proc.id)))[0]
                if (rap != undefined)
                    rapporto = rap
            }
            cartolina.push(rapporto)
        }

        await cartolinaFPDF(pdf, proc, cartolina, null)

        try {
            pdf.Output('F', path.join(filePaths[0], `S-21 ${proc.Nome} ${anno}.pdf`))
            shell.showItemInFolder(path.join(filePaths[0], `S-21 ${proc.Nome} ${anno}.pdf`));
            return { succ: true, msg: "File creato" }
        } catch (e) {
            return { succ: false, msg: 'Errore: ' + e }
        }
    }
}

async function fpdfS21Tutte(event, anno) {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (canceled) {
        return
    } else {
        var mesi = mesiAnnoTeocratico(anno)
        var keys = ['Studi', 'Ore']
        let mm_colonna = 48;
        let mm_x = 0;
        let link_pdf = {}
        let link_pdf_tot = {}
        gruppi = await readFile(null, 'gruppi')
        gruppi.sort(function (a, b) {
            return a.Num - b.Num
        })

        anagrafica = await readFile(null, 'anagrafica')

        pionieri = anagrafica.filter(item => ((item.PR_PS == 'PR') && (item.Attivo == '1') && (item.Elimina == '0')))
        pionieri.sort(function (a, b) {
            if (a.Nome < b.Nome)
                return -1
            if (a.Nome > b.Nome)
                return 1
            return 0
        })

        let proclamatori = []
        let n = 0
        for (gruppo of gruppi) {
            proclamatori[n] = anagrafica.filter(item => (
                (item.PR_PS == '') &&
                (item.Attivo == '1') &&
                (item.Elimina == '0') &&
                (item.Gr == gruppo.id)))
            proclamatori[n].sort(function (a, b) {
                if (a.Nome < b.Nome)
                    return -1
                if (a.Nome > b.Nome)
                    return 1
                return 0
            })
            n++
        }

        inattivi = anagrafica.filter(item => ((item.Attivo == '0') && (item.Elimina == '0')))
        inattivi.sort(function (a, b) {
            if (a.Nome < b.Nome)
                return -1
            if (a.Nome > b.Nome)
                return 1
            return 0
        })

        const pdf = new FPDF('L', 'mm', 'A5');
        pdf.SetTextColor(0, 0, 0);
        pdf.SetAutoPageBreak(1, 3);
        pdf.AddPage();
        pdf.SetFont('Arial', 'B', 20);
        pdf.SetY(3);
        //utilizzato come workaround bug primo link
        link0 = pdf.AddLink()
        pdf.SetLink(link0)

        link_first_page = pdf.AddLink()
        pdf.SetLink(link_first_page)
        pdf.Cell(mm_colonna * 4, 10, "Cartoline anno " + anno, 0, 0, 'C', false)
        pdf.Ln(10);
        pdf.SetFont('Arial', '', 16);
        pdf.Cell(mm_colonna * 4, 8, "Pionieri", 1, 1, 'C');
        pdf.SetFont('Arial', '', 10);
        for (pioniere of pionieri) {
            if (mm_x >= mm_colonna * 4) {
                pdf.Ln(8);
                mm_x = 0;
            }
            link_pdf[pioniere["id"]] = pdf.AddLink();
            pdf.Cell(mm_colonna, 8, unescapeHtml(pioniere["Nome"]), 0, 0, 'L', false, link_pdf[pioniere['id']]);
            mm_x += mm_colonna;
        }
        pdf.Ln(8);

        for (proc_filter of proclamatori) {
            pdf.SetFont('Arial', '', 16);
            gruppo = gruppi.find(item => item.id === proc_filter[0].Gr)
            pdf.Cell(mm_colonna * 4, 8, `Proclamatori - Gruppo ${gruppo['Num']} ${gruppo["Sorv_Gr"]}`, 1, 1, 'C');
            pdf.SetFont('Arial', '', 10);
            mm_x = 0;
            for (proc of proc_filter) {
                if (mm_x >= mm_colonna * 4) {
                    pdf.Ln(8);
                    mm_x = 0;
                }
                link_pdf[proc["id"]] = pdf.AddLink();
                pdf.Cell(mm_colonna, 8, unescapeHtml(proc["Nome"]), 0, 0, 'L', false, link_pdf[proc["id"]]);
                mm_x += mm_colonna;
            }
            pdf.Ln(8);
        }

        pdf.SetFont('Arial', '', 16);
        pdf.Cell(mm_colonna * 4, 8, "Inattivi", 1, 1, 'C');
        pdf.SetFont('Arial', '', 10);
        mm_x = 0;
        for (inattivo of inattivi) {
            if (mm_x >= mm_colonna * 4) {
                pdf.Ln(8);
                mm_x = 0;
            }
            link_pdf[inattivo["id"]] = pdf.AddLink();
            pdf.Cell(mm_colonna, 8, unescapeHtml(inattivo["Nome"]), 0, 0, 'L', false, link_pdf[inattivo["id"]]);
            mm_x += mm_colonna;
        }
        pdf.Ln(8);

        gruppiStranieri = gruppi.filter(item => item.straniero)
        if (gruppiStranieri.length > 0) {
            pdf.SetFont('Arial', '', 16);
            pdf.Cell(mm_colonna * 4, 8, "Parziali", 1, 1, 'C');
            pdf.SetFont('Arial', '', 10);
            for (gruppo of gruppiStranieri) {
                link_pdf_tot['p-' + gruppo.id] = pdf.AddLink();
                pdf.Cell(mm_colonna, 8, 'Proclamatori gr. ' + gruppo.Sorv_Gr, 0, 0, 'L', false,
                    link_pdf_tot['p-' + gruppo.id])

                link_pdf_tot['pa-' + gruppo.id] = pdf.AddLink();
                pdf.Cell(mm_colonna, 8, 'P. ausiliari gr. ' + gruppo.Sorv_Gr, 0, 0, 'L', false,
                    link_pdf_tot['pa-' + gruppo.id])

                link_pdf_tot['pr-' + gruppo.id] = pdf.AddLink();
                pdf.Cell(mm_colonna, 8, 'P. regolari gr. ' + gruppo.Sorv_Gr, 0, 0, 'L', false,
                    link_pdf_tot['pr-' + gruppo.id])
                pdf.Ln(8)
            }
            link_pdf_tot['p-ita'] = pdf.AddLink();
            pdf.Cell(mm_colonna, 8, 'Proclamatori italiani', 0, 0, 'L', false,
                link_pdf_tot['p-ita'])

            link_pdf_tot['pa-ita'] = pdf.AddLink();
            pdf.Cell(mm_colonna, 8, 'P. ausiliari italiani', 0, 0, 'L', false,
                link_pdf_tot['pa-ita'])

            link_pdf_tot['pr-ita'] = pdf.AddLink();
            pdf.Cell(mm_colonna, 8, 'P. regolari italiani', 0, 0, 'L', false,
                link_pdf_tot['pr-ita'])
            pdf.Ln(8)
        }

        pdf.SetFont('Arial', '', 16);
        pdf.Cell(mm_colonna * 4, 8, "Totali", 1, 1, 'C');
        pdf.SetFont('Arial', '', 10);

        link_pdf_tot['p'] = pdf.AddLink()
        pdf.Cell(mm_colonna, 8, 'Proclamatori', 0, 0, 'L', false, link_pdf_tot['p']);
        link_pdf_tot['pa'] = pdf.AddLink()
        pdf.Cell(mm_colonna, 8, 'Pionieri Ausiliari', 0, 0, 'L', false, link_pdf_tot['pa']);
        link_pdf_tot['pr'] = pdf.AddLink()
        pdf.Cell(mm_colonna, 8, 'Pionieri Regolari e Speciali', 0, 0, 'L', false, link_pdf_tot['pr']);
        link_pdf_tot['tt'] = pdf.AddLink()
        pdf.Cell(mm_colonna, 8, 'Totali congregazione', 0, 0, 'L', false, link_pdf_tot['tt']);
        pdf.Ln(8)

        for (riga of pionieri) {
            pdf.AddPage()
            pdf.SetY(3)
            cartolina = []
            for (let mese of mesi) {
                rapporto = { 'Mese': mese }
                rap = rapporti.filter(item => ((item.Mese == mese) && (item.CE_Anag == riga.id)))[0]
                if (rap != undefined)
                    rapporto = rap
                cartolina.push(rapporto)
            }

            await cartolinaFPDF(pdf, riga, cartolina, link_pdf[riga["id"]], link_first_page);
        }
        for (proc_filter of proclamatori) {
            for (riga of proc_filter) {
                pdf.AddPage()
                pdf.SetY(3)
                cartolina = []
                for (let mese of mesi) {
                    rapporto = { 'Mese': mese }
                    rap = rapporti.filter(item => ((item.Mese == mese) && (item.CE_Anag == riga.id)))[0]
                    if (rap != undefined)
                        rapporto = rap
                    cartolina.push(rapporto)
                }
                await cartolinaFPDF(pdf, riga, cartolina, link_pdf[riga["id"]], link_first_page);
            }
        }
        for (riga of inattivi) {
            pdf.AddPage()
            pdf.SetY(3)
            cartolina = []
            for (let mese of mesi) {
                rapporto = { 'Mese': mese }
                rap = rapporti.filter(item => ((item.Mese == mese) && (item.CE_Anag == riga.id)))[0]
                if (rap != undefined)
                    rapporto = rap
                cartolina.push(rapporto)
            }
            await cartolinaFPDF(pdf, riga, cartolina, link_pdf[riga["id"]], link_first_page);
        }
        if (gruppiStranieri.length > 0) {
            for (gruppo of gruppiStranieri) {
                pdf.AddPage()
                pdf.SetY(3)
                cartolina = []
                for (let mese of mesi) {
                    rapporti_mese = rapporti.filter(item => (
                        (item.Mese == mese) &&
                        (item.Inc == 'p') &&
                        (item.Gr == gruppo.id)
                    ))
                    rapporto = { 'Mese': mese }
                    rapporto.N = rapporti_mese.length
                    if (rapporti_mese.length != 0) {
                        rapporto.Studi = rapporti_mese.map(item => item.Studi).reduce((p, n) => p + n)
                    }
                    cartolina.push(rapporto)
                }
                await cartolinaFPDF(pdf, { id: 'p', Nome: 'Proclamatori gr. ' + gruppo.Sorv_Gr }, cartolina,
                    link_pdf_tot['p-' + gruppo.id], link_first_page)

                pdf.AddPage()
                pdf.SetY(3)
                cartolina = []
                for (let mese of mesi) {
                    procGruppo = anagrafica.filter(item => item.Gr == gruppo.id).map(item => item.id)
                    rapporti_mese = rapporti.filter(item => (
                        (item.Mese == mese) &&
                        (item.Inc == 'pa') &&
                        (item.Gr == gruppo.id)
                    ))
                    rapporto = { 'Mese': mese }
                    rapporto.N = rapporti_mese.length
                    if (rapporti_mese.length != 0) {
                        keys.forEach(function (key, indiceKeys) {
                            rapporto[key] = rapporti_mese.map(item => item[key]).reduce((p, n) => p + n)
                        })
                    }
                    cartolina.push(rapporto)
                }
                await cartolinaFPDF(pdf, { id: 'pa', Nome: 'Pionieri ausiliari gr. ' + gruppo.Sorv_Gr }, cartolina,
                    link_pdf_tot['pa-' + gruppo.id], link_first_page)

                pdf.AddPage()
                pdf.SetY(3)
                cartolina = []
                for (let mese of mesi) {
                    rapporti_mese = rapporti.filter(item => (
                        (item.Mese == mese) &&
                        (item.Inc == 'pr') &&
                        (item.Gr == gruppo.id)
                    ))
                    rapporto = { 'Mese': mese }
                    rapporto.N = rapporti_mese.length
                    if (rapporti_mese.length != 0) {
                        keys.forEach(function (key, indiceKeys) {
                            rapporto[key] = rapporti_mese.map(item => item[key]).reduce((p, n) => p + n)
                        })
                    }
                    cartolina.push(rapporto)
                }
                await cartolinaFPDF(pdf, { id: 'pr', Nome: 'Pionieri regolari gr. ' + gruppo.Sorv_Gr }, cartolina,
                    link_pdf_tot['pr-' + gruppo.id], link_first_page)
            }

            pdf.AddPage()
            pdf.SetY(3)
            cartolina = []
            idGruppiStranieri = gruppi.filter(item => item.straniero).map(item => item.id)
            for (let mese of mesi) {
                rapporti_mese = rapporti.filter(item => (
                    (item.Mese == mese) &&
                    (item.Inc == 'p') &&
                    (!idGruppiStranieri.includes(item.Gr))
                ))
                rapporto = { 'Mese': mese }
                rapporto.N = rapporti_mese.length
                if (rapporti_mese.length != 0) {
                    rapporto.Studi = rapporti_mese.map(item => item.Studi).reduce((p, n) => p + n)
                }
                cartolina.push(rapporto)
            }
            await cartolinaFPDF(pdf, { id: 'p', Nome: 'Proclamatori italiano' }, cartolina,
                link_pdf_tot['p-ita'], link_first_page)

            pdf.AddPage()
            pdf.SetY(3)
            cartolina = []
            for (let mese of mesi) {
                rapporti_mese = rapporti.filter(item => (
                    (item.Mese == mese) &&
                    (item.Inc == 'pa') &&
                    (!idGruppiStranieri.includes(item.Gr))
                ))
                rapporto = { 'Mese': mese }
                rapporto.N = rapporti_mese.length
                if (rapporti_mese.length != 0) {
                    keys.forEach(function (key, indiceKeys) {
                        rapporto[key] = rapporti_mese.map(item => item[key]).reduce((p, n) => p + n)
                    })
                }
                cartolina.push(rapporto)
            }
            await cartolinaFPDF(pdf, { id: 'pa', Nome: 'Pionieri ausiliari italiano' }, cartolina,
                link_pdf_tot['pa-ita'], link_first_page)

            pdf.AddPage()
            pdf.SetY(3)
            cartolina = []
            for (let mese of mesi) {
                rapporti_mese = rapporti.filter(item => (
                    (item.Mese == mese) &&
                    (item.Inc == 'pr') &&
                    (!idGruppiStranieri.includes(item.Gr))
                ))
                rapporto = { 'Mese': mese }
                rapporto.N = rapporti_mese.length
                if (rapporti_mese.length != 0) {
                    keys.forEach(function (key, indiceKeys) {
                        rapporto[key] = rapporti_mese.map(item => item[key]).reduce((p, n) => p + n)
                    })
                }
                cartolina.push(rapporto)
            }
            await cartolinaFPDF(pdf, { id: 'pr', Nome: 'Pionieri regolari italiano' }, cartolina,
                link_pdf_tot['pr-ita'], link_first_page)
        }

        pdf.AddPage()
        pdf.SetY(3)
        cartolina = []
        for (let mese of mesi) {
            rapporti_mese = rapporti.filter(item => ((item.Mese == mese) && (item.Inc == 'p')))
            rapporto = { 'Mese': mese }
            rapporto.N = rapporti_mese.length
            if (rapporti_mese.length != 0) {
                rapporto.Studi = rapporti_mese.map(item => item.Studi).reduce((p, n) => p + n)
            }
            cartolina.push(rapporto)
        }
        await cartolinaFPDF(pdf, { id: 'p', Nome: "Proclamatori congregazione" }, cartolina,
            link_pdf_tot['p'], link_first_page);

        pdf.AddPage()
        pdf.SetY(3)
        cartolina = []
        for (let mese of mesi) {
            rapporto = { 'Mese': mese }
            rapporti_mese = rapporti.filter(item => ((item.Mese == mese) && (item.Inc == 'pa')))
            rapporto.N = rapporti_mese.length
            if (rapporti_mese.length != 0) {
                keys.forEach(function (key, indiceKeys) {
                    rapporto[key] = rapporti_mese.map(item => item[key]).reduce((p, n) => p + n)
                })
            }
            cartolina.push(rapporto)
        }
        await cartolinaFPDF(pdf, { id: 'pa', Nome: "Pionieri ausiliari congregazione" }, cartolina,
            link_pdf_tot['pa'], link_first_page);

        pdf.AddPage()
        pdf.SetY(3)
        cartolina = []
        for (let mese of mesi) {
            rapporto = { 'Mese': mese }
            rapporti_mese = rapporti.filter(item => ((item.Mese == mese) && (item.Inc == 'pr')))
            rapporto.N = rapporti_mese.length
            if (rapporti_mese.length != 0) {
                keys.forEach(function (key, indiceKeys) {
                    rapporto[key] = rapporti_mese.map(item => item[key]).reduce((p, n) => p + n)
                })
            }
            cartolina.push(rapporto)
        }
        await cartolinaFPDF(pdf, { id: 'pr', Nome: "Pionieri regolari congregazione" }, cartolina,
            link_pdf_tot['pr'], link_first_page)

        pdf.AddPage()
        pdf.SetY(3)
        cartolina = []
        for (let mese of mesi) {
            rapporto = { 'Mese': mese }
            rapporti_mese = rapporti.filter(item => (item.Mese == mese))
            rapporto.N = rapporti_mese.length
            if (rapporti_mese.length != 0) {
                rapporto.Studi = rapporti_mese.map(item => item.Studi).reduce((p, n) => p + n)
                rapporto.Ore = rapporti_mese.map(item => item.Inc != "p" ? item.Ore : 0).reduce((p, n) => p + n)
                let p = rapporti_mese.filter(item => item.Inc == 'p')
                let pa = rapporti_mese.filter(item => item.Inc == 'pa')
                let pr = rapporti_mese.filter(item => item.Inc == 'pr')
                let ir = rapporti_mese.filter(item => item.Inc == 'ir')
                rapporto.Note = `P:${p.length}  PA:${pa.length}  PR:${pr.length}  IR:${ir.length}`
            }
            cartolina.push(rapporto)
        }
        await cartolinaFPDF(pdf, { id: 'tt', Nome: "Totali congregazione" }, cartolina,
            link_pdf_tot['tt'], link_first_page)

        try {
            pdf.Output('F', path.join(filePaths[0], `S-21 complete ${anno}.pdf`))
            shell.showItemInFolder(path.join(filePaths[0], `S-21 complete ${anno}.pdf`));
            return { succ: true, msg: "File creato" }
        } catch (e) {
            return { succ: false, msg: 'Errore: ' + e }
        }
    }
}

async function fpdfS88(event, anno) {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (canceled) {
        return
    } else {
        var keysI = ['i1', 'i2', 'i3', 'i4', 'i5']
        var keysF = ['f1', 'f2', 'f3', 'f4', 'f5',]
        const pdf = new FPDF('L', 'mm', 'A5');
        pdf.SetFont('Arial', '', 10);
        pdf.SetTextColor(0, 0, 0);
        pdf.SetAutoPageBreak(1, 3);
        pdf.SetY(3);
        pdf.AddPage();

        pdf.SetY(3);
        pdf.Cell(190, 10, "REGISTRAZIONE DEI PRESENTI ALLE ADUNANZE DI CONGREGAZIONE", 0, 0, 'C');
        pdf.Ln(10);


        pdf.Cell(98, 8, "Adunanza infrasettimanale", 0, 0, 'L');
        pdf.Cell(98, 8, "Adunanza del fine settimana", 0, 0, 'L');
        pdf.Ln(8);

        pdf.Cell(32, 8, "Mese", 1, 0, 'L');
        pdf.Cell(18, 8, "N. adun", 1, 0, 'C');
        pdf.Cell(20, 8, "Totale pres", 1, 0, 'C');
        pdf.Cell(20, 8, "Media pres", 1, 0, 'C');
        pdf.Cell(8, 8, "", 0, 0, 'C');
        pdf.Cell(32, 8, "Mese", 1, 0, 'L');
        pdf.Cell(18, 8, "N. adun", 1, 0, 'C');
        pdf.Cell(20, 8, "Totale pres", 1, 0, 'C');
        pdf.Cell(20, 8, "Media pres", 1, 0, 'C');
        pdf.Ln(8);

        pdf.SetFont('Arial', '', 10);

        mesi = mesiAnnoTeocratico(anno)
        sommaI = contaI = 0
        sommaF = contaF = 0
        presenti_tutti = await readFile(null, 'presenti')
        for (x = 0; x < 12; x++) {
            presenti = presenti_tutti.filter(item => item.Mese == mesi[x])
            totI = cI = 0
            totF = cF = 0
            if (presenti.length > 0) {
                for (key of keysI) {
                    if (presenti[0][key] != null && presenti[0][key] != '') {
                        totI += Number(presenti[0][key])
                        cI++
                    }
                }
                if (cI > 0) {
                    contaI++
                    sommaI += Number(totI / cI)
                }
                for (key of keysF) {
                    if (presenti[0][key] != null && presenti[0][key] != '') {
                        totF += Number(presenti[0][key])
                        cF++
                    }
                }
                if (cF > 0) {
                    contaF++
                    sommaF += Number(totF / cF)
                }
                mI = Number(totI / cI).toFixed(0)
                mF = Number(totF / cF).toFixed(0)
            } else {
                cI = ''
                totI = ''
                cF = ''
                totF = ''
                mI = ''
                mF = ''
            }
            pdf.Cell(32, 8, new Date(mesi[x]).toLocaleString('it-IT', {
                year: 'numeric',
                month: 'long'
            }), 1, 0, 'L');
            pdf.Cell(18, 8, cI, 1, 0, 'C');
            pdf.Cell(20, 8, totI, 1, 0, 'C');
            pdf.Cell(20, 8, mI, 1, 0, 'C');
            pdf.Cell(8, 8, "", 0, 0, 'C');

            pdf.Cell(32, 8, new Date(mesi[x]).toLocaleString('it-IT', {
                year: 'numeric',
                month: 'long'
            }), 1, 0, 'L');
            pdf.Cell(18, 8, cF, 1, 0, 'C');
            pdf.Cell(20, 8, totF, 1, 0, 'C');
            pdf.Cell(20, 8, mF, 1, 0, 'C');
            pdf.Ln(8);
        }

        pdf.Cell(70, 8, "Media dei presenti ogni mese", 1, 0, 'R');
        pdf.Cell(20, 8, Number(sommaI / contaI).toFixed(0), 1, 0, 'C');
        pdf.Cell(8, 8, "", 0, 0, 'C');
        pdf.Cell(70, 8, "Media dei presenti ogni mese", 1, 0, 'R');
        pdf.Cell(20, 8, Number(sommaF / contaF).toFixed(0), 1, 0, 'C');

        try {
            pdf.Output('F', path.join(filePaths[0], `S-88 ${anno}.pdf`))
            shell.showItemInFolder(path.join(filePaths[0], `S-88 ${anno}.pdf`));
            return { succ: true, msg: "File creato" }
        } catch (e) {
            return { succ: false, msg: 'Errore: ' + e }
        }
    }
}

//import da xampp
/*
async function importaFile() {
    const { canceled, filePaths } = await dialog.showOpenDialog()
    if (canceled) {
        return
    } else {
        for (tabella of tabelle) {
            fs.copyFile(path.join(userData, tabella + '.json'), path.join(userData, tabella + '.tmp'), (err) => {
                if (err) throw err;
            })
        }
        try {
            for (tabella of tabelle) {
                db.clearTable(tabella, (succ, msg) => {
                    if (!succ) {
                        throw [msg, 1]
                    }
                })
            }
            let tables = JSON.parse(fs.readFileSync(filePaths[0]))
            //gruppi
            for (item of tables.gruppi) {
                let result = await insertTableContent(null, 'gruppi', item)
                if (!result.succ) {
                    throw [result.msg, 2]
                }
            }
            //anagrafica
            for (item of tables.anagrafica) {
                if (item.Gr) {
                    gruppo = await getRows(null, 'gruppi', { 'Num': item.Gr })
                    item.Gr = gruppo[0].id
                }
                result = await insertTableContent(null, 'anagrafica', item)
                if (!result.succ) {
                    throw [result.msg, 3]
                }
            }
            //rapporti
            for (item of tables.rapporti) {
                anag = await getRows(null, 'anagrafica', { 'CP_Anag': item.CE_Anag })
                if (anag.length == 1) {
                    item['CE_Anag'] = anag[0].id
                    item['Pubb'] = Number(item['Pubb']) == 0 ? null : Number(item['Pubb'])
                    item['Video'] = Number(item['Video']) == 0 ? null : Number(item['Video'])
                    item['Ore'] = Number(item['Ore'])
                    item['VU'] = Number(item['VU']) == 0 ? null : Number(item['VU'])
                    item['Studi'] = Number(item['Studi']) == 0 ? null : Number(item['Studi'])
                    result = await insertTableContent(null, 'rapporti', item)
                    if (!result.succ) {
                        throw [result.msg, 4]
                    }
                }
            }
            //sorvegliante
            sorv = tables.sorvegliante[0]
            sorv.CP_CO = 0
            result = await insertTableContent(null, 'sorvegliante', sorv)
            if (!result.succ) {
                throw [result.msg, 5]
            }
            //presenti
            for (item of tables.presenti) {
                esiste = await getRows(null, 'presenti', { 'Mese': item.Mese, })
                if (esiste.length == 0) {
                    array = {
                        'Mese': item.Mese,
                        'i1': null,
                        'i2': null,
                        'i3': null,
                        'i4': null,
                        'i5': null,
                        'f1': null,
                        'f2': null,
                        'f3': null,
                        'f4': null,
                        'f5': null,
                    }
                    result = await insertTableContent(null, 'presenti', array)
                    if (!result.succ) {
                        throw [result.msg, 6]
                    }
                }
                result = await updateRow(
                    null,
                    'presenti',
                    { [`${item.Adun}${item.Settimana}`]: Number(item.Presenti) },
                    { 'Mese': item.Mese, })
                if (!result.succ)
                    throw [result.msg, 7]
            }
        }
        catch (e) {
            /*
            for (tabella of tabelle) {
                fs.unlink(path.join(userData, tabella + '.json'), function (err) {
                    if (err) return console.log(err);
                    console.log('file deleted successfully');
                })
                fs.rename(path.join(userData, tabella + '.tmp'), path.join(userData, tabella + '.json'), function (err) {
                    if (err) console.log('ERROR: ' + err);
                });
            }
            
            return {
                succ: false, msg: `Impossibile importare dati. <br> 
                    Operazione annullata. <br> Errore${e[1]}: ${e[0]}`
            }
        }
 
        //controllo sulle chiavi primarie
        let doppioni = false
        for (tabella of tabelle) {
            let tab = await readFile(null, tabella)
            var valueArr = tab.map(function (item) { return item.id });
            var isDuplicate = valueArr.some(function (item, idx) {
                if (valueArr.indexOf(item) != idx)
                    return item
                else
                    return valueArr.indexOf(item) != idx
            })
            if (isDuplicate) {
                t = tabella
                doppioni = true
            }
        }
        if (!doppioni) {
            console.log('Fatto')
            for (tabella of tabelle) {
                fs.unlink(path.join(userData, tabella + '.tmp'), function (err) {
                    if (err) return console.log(err);
                })
            }
            return { succ: true, msg: 'Dati importati con successo' }
        } else {
            console.log('errori')
            return { succ: false, msg: `Dati importati con chiavi doppie. Tabella: ${t}, id: ${isDuplicate}` }
        }
    }
}
*/

async function loadBackup() {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        filters: [
            { name: 'Backup', extensions: ['json'] },
        ]
    })
    if (canceled) {
        return
    } else {
        for (tabella of tabelle) {
            fs.copyFile(path.join(userData, tabella + '.json'), path.join(userData, tabella + '.tmp'), (err) => {
                if (err) throw err;
            })
        }
        let dati = JSON.parse(fs.readFileSync(filePaths[0]))
        try {
            for (tabella of tabelle) {
                //console.log(dati[tabella])
                fs.writeFileSync(path.join(userData, tabella + '.json'),
                    JSON.stringify({ [tabella]: dati[tabella] }, null, 2), (err) => {
                        throw err;
                    })
            }
            for (tabella of tabelle) {
                fs.unlink(path.join(userData, tabella + '.tmp'), function (err) {
                    if (err) return console.log(err);
                })
            }
            ottimizzaTabelle()
            return { succ: true, msg: 'Dati importati con successo' }
        } catch (err) {
            for (tabella of tabelle) {
                fs.unlink(path.join(userData, tabella + '.json'), function (err) {
                    if (err) return console.log(err);
                    console.log('file deleted successfully');
                })
                fs.rename(path.join(userData, tabella + '.tmp'), path.join(userData, tabella + '.json'), function (err) {
                    if (err) console.log('ERROR: ' + err);
                });
            }
            return { succ: false, msg: err }
        }
    }
}

async function saveBackup() {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (canceled) {
        return
    } else {
        let backup = {}
        for (tabella of tabelle) {
            backup[tabella] = JSON.parse(fs.readFileSync(path.join(userData, tabella + '.json')))[tabella]
        }
        try {
            d = new Date()
            nomeFile = 'backup_' +
                d.getFullYear() + '-' +
                ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
                ('0' + d.getDate()).slice(-2) + '-' +
                d.getHours() + '-' +
                d.getMinutes() + '.json'
            fs.writeFileSync(path.join(filePaths[0], nomeFile),
                JSON.stringify(backup, null, 2), (err) => {
                    log.info(err)
                    throw err;
                })
            return { succ: true, msg: 'Backup effettuato' }
        } catch (err) {
            console.log(err)
            return { succ: false, msg: err }
        }
    }
}

function unescapeHtml(safe) {
    return safe
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
}

function mesiAnnoTeocratico(anno) {
    let mesi = []
    let mese = new Date((Number(anno) - 1) + "-09")
    for (let x = 0; x < 12; x++) {
        mesi.push(`${mese.toLocaleString('it-IT', {
            year: 'numeric'
        })}-${mese.toLocaleString('it-IT', {
            month: '2-digit'
        })}`)
        mese.setMonth(mese.getMonth() + 1);
    }
    return mesi
}
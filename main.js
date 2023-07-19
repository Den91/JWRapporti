const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
//const db = require("electron-db")
const FPDF = require('node-fpdf')
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
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
    ipcMain.handle('login', login)
    ipcMain.handle('readFile', readFile)
    ipcMain.handle('writeFile', writeFile)
    ipcMain.handle('loadBackup', loadBackup)
    ipcMain.handle('saveBackup', saveBackup)
    /*
    ipcMain.handle('getAll', getAll)
    ipcMain.handle('getRows', getRows)
    ipcMain.handle('insertTableContent', insertTableContent)
    ipcMain.handle('updateRow', updateRow)
    ipcMain.handle('deleteRow', deleteRow)
    ipcMain.handle('count', count)
    ipcMain.handle('sum', sum)
    */
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
    mainWindow.maximize();
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
            packVersion = '1.0.0'
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
                if (proc["D_Nasc"] != "") {
                    var D_Nasc = new Date(proc["D_Nasc"]);
                    pdf.Cell(c3, row, "Data nascita: " + D_Nasc.toLocaleDateString(), border, 0, 'L', true);
                } else {
                    pdf.Cell(c3, row, "Data nascita:", border, 0, 'L', true);
                }
                x = pdf.GetX();
                y = pdf.GetY();
                pdf.Ln(row);
                pdf.Cell(c1 + c2, row, "", 0, 0, 'L', false);
                if (proc["D_Batt"] != "") {
                    var D_Batt = new Date(proc["D_Batt"]);
                    pdf.Cell(c3, row, "Data battesimo: " + D_Batt.toLocaleDateString(), border, 0, 'L', true);
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

async function cartolinaFPDF(pdf, anno, proc, link_pdf) {
    if (link_pdf != null) {
        pdf.SetLink(link_pdf);
    }

    pdf.SetFont('Arial', 'B', 10);
    pdf.Cell(190, 10, "REGISTRAZIONE DEL PROCLAMATORE DI CONGREGAZIONE", 0, 0, 'C');
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
                D_Nasc.toLocaleString("it-IT", { day: "2-digit", month: '2-digit', year: 'numeric' }), 0, 0, 'L');
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
                D_Batt.toLocaleString("it-IT", { day: "2-digit", month: '2-digit', year: 'numeric' }), 0, 0, 'L');
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

    //tabella
    pdf.Cell(36, 7, "Mese", 1, 0, 'L');
    if (isNaN(proc.id)) {
        pdf.Cell(18, 7, "N", 1, 0, 'C');
    } else {
        pdf.Cell(18, 7, "Inc", 1, 0, 'C');
    }
    pdf.Cell(18, 7, "Pubb", 1, 0, 'C');
    pdf.Cell(18, 7, "Video", 1, 0, 'C');
    pdf.Cell(18, 7, "Ore", 1, 0, 'C');
    pdf.Cell(18, 7, "Visite", 1, 0, 'C');
    pdf.Cell(18, 7, "Studi", 1, 0, 'C');
    pdf.Cell(48, 7, "Note", 1, 0, 'L');
    pdf.Ln(7);

    var mesi = mesiAnnoTeocratico(anno)
    var somma = { 'Pubb': 0, 'Video': 0, 'Ore': 0, 'VU': 0, 'Studi': 0 }
    var conta = 0
    var keys = ['Pubb', 'Video', 'Ore', 'VU', 'Studi']
    rapporti = await readFile(null, 'rapporti')
    for (let mese of mesi) {
        rapporto = undefined
        if (isNaN(proc.id)) {
            rapporti_mese = rapporti.filter(item => ((item.Mese == mese) && (item.Inc == proc.id)))
            rapporto = {}
            rapporto.N = rapporti_mese.length
            if (rapporti_mese.length != 0) {
                keys.forEach(function (key, indiceKeys) {
                    rapporto[key] = rapporti_mese.map(item => item[key]).reduce((p, n) => p + n)
                })
            }
        } else {
            rapporto = rapporti.filter(item => ((item.Mese == mese) && (item.CE_Anag == proc.id)))
            rapporto = rapporto[0]
        }
        pdf.Cell(36, 7, new Date(mese).toLocaleString("it-IT", { year: 'numeric', month: 'long' }), 1, 0, 'L');
        if (rapporto) {
            pdf.Cell(18, 7, rapporto.Inc || rapporto.N, 1, 0, 'C');
            if ((rapporto.hasOwnProperty('N') && rapporto.N != 0) || rapporto.hasOwnProperty('Inc')) {
                conta++
            }
            for (key of keys) {
                somma[key] += Number(rapporto[key])
                pdf.Cell(18, 7, rapporto[key] || '', 1, 0, 'C');
            }
            pdf.Cell(48, 7, unescapeHtml(rapporto.Note || ''), 1, 0, 'L');
        } else {
            pdf.Cell(18, 7, '', 1, 0, 'C');
            for (key of keys) {
                pdf.Cell(18, 7, '', 1, 0, 'C');
            }
            pdf.Cell(48, 7, '', 1, 0, 'L');
        }
        pdf.Ln(7);
    }

    pdf.Cell(36, 7, "Totale", 1, 0, 'L');
    pdf.Cell(18, 7, "", 1, 0, 'C');
    for (key of keys) {
        pdf.Cell(18, 7, somma[key], 1, 0, 'C');
    }
    pdf.Cell(48, 7, "", 1, 0, 'L');
    pdf.Ln(7);

    pdf.Cell(36, 7, "Media", 1, 0, 'L');
    pdf.Cell(18, 7, "", 1, 0, 'C');
    for (key of keys) {
        pdf.Cell(18, 7, Number(somma[key] / conta).toFixed(2) || '', 1, 0, 'C');
    }
    pdf.Cell(48, 7, "", 1, 0, 'L');
    pdf.Ln(10);
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
        pdf.SetMargins(3, 3);
        pdf.SetY(3);
        pdf.AddPage();

        await cartolinaFPDF(pdf, anno, proc, null)
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
        let mm_colonna = 48;
        let mm_x = 0;
        let link_pdf = []
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
        pdf.SetFont('Arial', '', 16);
        pdf.Cell(mm_colonna * 4, 10, "Pionieri", 1, 0, 'C');
        pdf.Ln(10);
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
            pdf.Cell(mm_colonna * 4, 10, `Proclamatori - Gruppo ${gruppo['Num']} ${gruppo["Sorv_Gr"]}`, 1, 0, 'C');
            pdf.Ln(10);
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
        pdf.Cell(mm_colonna * 4, 10, "Inattivi", 1, 0, 'C');
        pdf.Ln(10);
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

        pdf.SetFont('Arial', '', 16);
        pdf.Cell(mm_colonna * 4, 10, "Totali", 1, 0, 'C');
        pdf.Ln(10);
        pdf.SetFont('Arial', '', 10);
        link_pdf_p = pdf.AddLink();
        pdf.Cell(mm_colonna, 8, 'Proclamatori', 0, 0, 'L', false, link_pdf_p);
        link_pdf_pa = pdf.AddLink();
        pdf.Cell(mm_colonna, 8, 'Pionieri Ausiliari', 0, 0, 'L', false, link_pdf_pa);
        link_pdf_pr = pdf.AddLink();
        pdf.Cell(mm_colonna, 8, 'Pionieri Regolari e Speciali', 0, 0, 'L', false, link_pdf_pr);
        pdf.Ln(8);

        for (riga of pionieri) {
            pdf.AddPage();
            pdf.SetY(3);
            await cartolinaFPDF(pdf, anno, riga, link_pdf[riga["id"]]);
        }
        for (proc_filter of proclamatori) {
            for (riga of proc_filter) {
                pdf.AddPage();
                pdf.SetY(3);
                await cartolinaFPDF(pdf, anno, riga, link_pdf[riga["id"]]);
            }
        }
        for (riga of inattivi) {
            pdf.AddPage();
            pdf.SetY(3);
            await cartolinaFPDF(pdf, anno, riga, link_pdf[riga["id"]]);
        }

        pdf.AddPage();
        pdf.SetY(3);
        await cartolinaFPDF(pdf, anno, { id: 'p', Nome: "Proclamatori" }, link_pdf_p);

        pdf.AddPage();
        pdf.SetY(3);
        await cartolinaFPDF(pdf, anno, { id: 'pa', Nome: "Pionieri Ausiliari" }, link_pdf_pa);

        pdf.AddPage();
        pdf.SetY(3);
        await cartolinaFPDF(pdf, anno, { id: 'pr', Nome: "Pionieri Regolari" }, link_pdf_pr);

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
    const { canceled, filePaths } = await dialog.showOpenDialog()
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

/*
async function getAll(event, table) {
    var result
    db.getAll(table, function (succ, data) {
        // succ - boolean, tells if the call is successful
        // data - array of objects that represents the rows.
        result = data
    })
    return result
}

async function getRows(event, table, select) {
    var result
    db.getRows(table, select, (succ, data) => {
        // succ - boolean, tells if the call is successful
        result = data
    })
    return result
}

function sum(event, tableName, where, fields) {

    var fname = path.join(userData, tableName + '.json')
    let exists = fs.existsSync(fname);
    let whereKeys;

    // Check if where is an object
    if (Object.prototype.toString.call(where) === "[object Object]") {
        // Check for number of keys
        whereKeys = Object.keys(where);
        if (whereKeys === 0) {
            return { succ: false, msg: "There are no conditions passed to the WHERE clause." }
        }
    } else {
        return { succ: false, msg: "WHERE clause should be an object." }
    }

    // Check if the json file exists, if it is, parse it.
    if (exists) {
        try {
            let table = JSON.parse(fs.readFileSync(fname));
            let rows = table[tableName];
            let somma = { 'N': 0 }
            for (let key of fields) {
                somma[key] = 0;
            }

            for (let i = 0; i < rows.length; i++) {
                let matched = 0; // Number of matched complete where clause
                for (var j = 0; j < whereKeys.length; j++) {
                    // Test if there is a matched key with where clause
                    if (rows[i].hasOwnProperty(whereKeys[j])) {
                        if (rows[i][whereKeys[j]] === where[whereKeys[j]]) {
                            matched++;
                        }
                    }
                }

                // Check if all conditions in the WHERE clause are matched
                if (matched === whereKeys.length) {
                    somma['N']++
                    for (key of fields) {
                        somma[key] += rows[i][key]
                    }
                }
            }

            return somma
        } catch (e) {
            return { succ: false, msg: e.toString() }
        }
    } else {
        return { succ: false, msg: 'Table file does not exist!' }
    }
}

async function insertTableContent(event, tableName, array) {
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    let fname = path.join(userData, tableName + '.json');
    let exists = fs.existsSync(fname);
    let tableRow = array
    if (exists) {
        // Table | json parsed
        let table = JSON.parse(fs.readFileSync(fname));

        let date = new Date()
        var id = date.getTime()
        // controlla se l'id è già presente
        let rows = table[tableName];
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].id == id) {
                await sleep(2)
                let date = new Date()
                id = date.getTime()
            }
        }

        tableRow.id = id;
        table[tableName].push(tableRow);
        try {
            fs.writeFileSync(fname, JSON.stringify(table, null, 2), (err) => {
            })
            return { succ: true, msg: 'Dati inseriti', id: id }
        } catch (e) {
            return { succ: false, msg: 'Errore scrittura file' }
        }
    }
    return { succ: false, msg: 'Tabella inesistente' }
}

async function updateRow(event, tableName, set, where) {
    //console.log(set)
    //console.log(where)
    let fname = path.join(userData, tableName + '.json');
    let exists = fs.existsSync(fname);
    let whereKeys = Object.keys(where);
    let setKeys = Object.keys(set);

    if (exists) {
        let table = JSON.parse(fs.readFileSync(fname));
        let rows = table[tableName];

        let nbRowsMatched = 0;
        let nbKeysMatchedPerRow = 0;
        let rowsMatchedIndexes = [];

        for (var i = 0; i < rows.length; i++) {
            nbKeysMatchedPerRow = 0;
            for (var j = 0; j < whereKeys.length; j++) {
                // Test if there is a matched key with where clause and single row of table
                if (rows[i].hasOwnProperty(whereKeys[j])) {
                    if (rows[i][whereKeys[j]] == where[whereKeys[j]]) {
                        nbKeysMatchedPerRow++;
                    }
                }
            }
            if (nbKeysMatchedPerRow > 0) {
                nbRowsMatched++;
                rowsMatchedIndexes.push(i);
            }
        }
        if (nbRowsMatched > 0) {
            // All field from where clause are present in this particular
            // row of the database table
            try {
                for (var k = 0; k < rowsMatchedIndexes.length; k++) {
                    var rowToUpdate = rows[rowsMatchedIndexes[k]];
                    for (var l = 0; l < setKeys.length; l++) {
                        var keyToUpdate = setKeys[l];
                        rowToUpdate[keyToUpdate] = set[keyToUpdate];
                    }
                }

                // Create a new object and pass the rows
                let obj = new Object();
                obj[tableName] = rows;

                // Write the object to json file
                try {
                    fs.writeFileSync(fname, JSON.stringify(obj, null, 2), (err) => {
                    })
                    return { succ: true, msg: nbRowsMatched + " righe aggiornate" }
                } catch (e) {
                    return { succ: false, msg: 'File non salvato' }
                }

            } catch (e) {
                return { succ: false, msg: e.toString() }
            }
        } else {
            return { succ: false, msg: "Valore non trovato" }
        }
    } else {
        return { succ: false, msg: "Tabella inesistente" }
    }
}

function deleteRow(event, table, where) {
    var result
    db.deleteRow(table, where, (succ, msg) => {
        if (succ) {
            result = { succ: true, msg: 'Dati eliminati' }
        } else {
            result = { succ: false, msg: 'Errore: ' + msg }
        }
    });
    return result
}

async function count(event, table) {
    var result
    db.count(table, (succ, data) => {
        result = { succ: succ, data: data }
    })
    return result
}
*/

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
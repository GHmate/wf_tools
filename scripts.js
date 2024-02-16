//indexedDB stuff
const DB_NAME = 'relic_names';
const DB_VERSION = 4; //random number tho
const DB_VERSION_STORE = 'versionData';
const DB_RELIC_STORE = 'relicData';
const INDEXED_DB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
const request = INDEXED_DB.open(DB_NAME, DB_VERSION);
let db;

let messageVariations = {};

request.onerror = function (evt) {
    console.error("Error openDb:", evt.target.error);
};
request.onupgradeneeded = function () {
    db = request.result;
    if (!db.objectStoreNames.contains(DB_VERSION_STORE)) {
        db.createObjectStore(DB_VERSION_STORE, {keyPath: 'id'});
    }
    if (!db.objectStoreNames.contains(DB_RELIC_STORE)) {
        db.createObjectStore(DB_RELIC_STORE, {keyPath: 'id'});
    }
};
request.onsuccess = function () {
    db = request.result;
    let objectStore = db.transaction(DB_VERSION_STORE, "readwrite").objectStore(DB_VERSION_STORE);
    for(const [key, value] of Object.entries(DEFAULT_VERSION_TEXTS)) {
        setupVersionData(objectStore, key);
    }
    let objectStore2 = db.transaction(DB_RELIC_STORE, "readwrite").objectStore(DB_RELIC_STORE);
    for (let i of [1, 2, 3, 4]) {
        for (const idString of ['rt', 'rn', 'rg']) {
            setupRelicData(objectStore2, '#' + idString + i);
        }
    }
}

function setupVersionData(objectStore, key) {
    let getRow = objectStore.get(key);
    getRow.onsuccess = function () {
        //restore / setup default values, if nothing found.
        if (!getRow.result) {
            objectStore.put({id: key, versions: DEFAULT_VERSION_TEXTS[key]});
        }
        //fill edit input fields and main variable from saved.
        readDB(DB_VERSION_STORE, key, function (stuff) {
            document.querySelector('#' + key + 'Versions').value = stuff;
            messageVariations[key] = convertTextToArray(stuff);
        });
    };
}
function setupRelicData(objectStore, key) {
    let getRow = objectStore.get(key);
    getRow.onsuccess = function () {
        readDB(DB_RELIC_STORE, key, function (stuff) {
            if (stuff !== 'type' && stuff !== 'grade' && stuff !== '') {
                document.querySelector(key).dispatchEvent(new Event('change'));
                document.querySelector(key).value = stuff;
            }
        });
    };
}

function writeDB(store, key, list, callback = null) {
    let request = db.transaction([store], 'readwrite')
        .objectStore(store)
        .put({id: key, versions: list});

    request.onerror = function () {
        console.error('Write failed');
    }
    request.onsuccess = function () {
        if (typeof callback === 'function') {
            callback();
        }
    };
}

function readDB(store, key, callback = null) {
    let request = db.transaction([store])
        .objectStore(store)
        .get(key);
    request.onerror = function () {
        console.error('Read failed');
    };
    request.onsuccess = function () {
        if (request.result) {
            if (typeof callback === 'function') {
                callback(request.result.versions);
            } else {
                return request.result.versions;
            }
        } else {
            //console.error('No data record');
        }
    };
}

function clearDB(store) {
    let storeObject = db.transaction([store], 'readwrite')
        .objectStore(store);
    let req = storeObject.clear();
    req.onerror = function (evt) {
        console.error('delete failed: ', evt.target.error);
    };
}

function saveVersions() {
    for(const [key, value] of Object.entries(DEFAULT_VERSION_TEXTS)) {
        let text = document.querySelector('#' + key + 'Versions').value;
        let customArray = convertTextToArray(text);
        if (!validateCustomArray(customArray)) {
            return;
        }
        messageVariations[key] = customArray;
        writeDB(DB_VERSION_STORE, key, text);
    }
    noti('Variations saved', 1000);
}

function saveRelics() {
    for (let i of [1, 2, 3, 4]) {
        for (const idString of ['rt', 'rn', 'rg']) {
            let val = document.querySelector('#' + idString + i).value;
            writeDB(DB_RELIC_STORE, '#' + idString + i, val);
        }
    }
    noti('Relics saved', 1000);
}

function validateCustomArray(customArray) {
    let lowerText = customArray.map(s => s.toLowerCase());
    let noSpecials = lowerText.map(s => s.replace(/[^a-zA-Z0-9]*/g, ''));
    let noRepeat = noSpecials.map(s => s.replace(/(.)\1+/g, '$1'));
    let duplicates = noRepeat.filter((item, index) => index !== noRepeat.indexOf(item));
    if (duplicates.length > 0) {
        noti('Duplicate entries found: [' + duplicates.join('], [') + '] in "' + customArray.join(' ; ') + '". (The game\'s repeat detection ignores upper/lowercase characters, ' +
            'special characters and repeated characters!) Save failed.', 30000, ERROR_COLOR);
        return false;
    }
    return true;
}

function resetVersions() {
    for(const [key, value] of Object.entries(DEFAULT_VERSION_TEXTS)) {
        document.querySelector('#' + key + 'Versions').value = value;
        messageVariations[key] = convertTextToArray(value);
        writeDB(DB_VERSION_STORE, key, value);
    }
    noti('Variations saved', 1000);
}

function forgetRelics() {
    for (let i of [1, 2, 3, 4]) {
        for (const idString of ['rt', 'rn', 'rg']) {
            clearDB(DB_RELIC_STORE);
        }
    }
    noti('Saved relics removed. Inputs reset to empty after a page reload.', 5000);
}

function convertTextToArray(text) {
    let temp = text.split(';');
    temp = temp.map(s => s.trim());
    return temp;
}

//Basic logic and frontend updates
var blockedTexts = [];
const ERROR_COLOR = '#ff2a2a';
const DEFAULT_VERSION_TEXTS = {
    host: "H; Host; Hosting",
    hostlf: "H/LF; Host/LF; Hosting/LF",
    int: "int; intshare; intact; intacts; intact share",
    exc: "exc; exceptional; exc share; exceptional share",
    fla: "fla; flawless; fla share; flawless share",
    rad: "rad; radshare; radiant; rads; radiant share",
    end: " ; pls; anyone?",
}
const LOOP_ORDER = ['grade3', 'grade2', 'grade1', 'grade0', 'start', 'end'];

window.onload = () => {
    document.querySelector('#settingsCollapseWrapper').addEventListener('hide.bs.collapse', function () {
        document.querySelector('.settings-button-holder a').style.color = '#fff'
    })
    document.querySelector('#settingsCollapseWrapper').addEventListener('show.bs.collapse', function () {
        document.querySelector('.settings-button-holder a').style.color = '#0d6efd';
    })
    document.querySelector('#infoCollapseWrapper').addEventListener('hide.bs.collapse', function () {
        document.querySelector('.info-button-holder a').style.color = '#fff'
    })
    document.querySelector('#infoCollapseWrapper').addEventListener('show.bs.collapse', function () {
        document.querySelector('.info-button-holder a').style.color = '#0d6efd';
    })
    document.querySelectorAll('.grid-container select').forEach(item => {
        item.addEventListener('change', event => {
            event.target.style.fontWeight = 'bold';
            event.target.style.color = '#000';
        })
    });
    let copyButton = document.querySelector('.js-button');
    if (copyButton) {
        copyButton.addEventListener('click', startCopy);
    }
    document.querySelectorAll('.form-check-input').forEach(item => {
        if (item.getAttribute("type") === 'checkbox') {
            item.addEventListener('click', recolorRow);
        }
    });
    document.querySelectorAll('.js-relic-name').forEach(item => {
        item.addEventListener('change', relicNameToUpper);
    });
    document.querySelectorAll('.active-text').forEach(item => {
        item.parentElement.addEventListener('click', clickCheck);
        return false;
    });
};

function copyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('Unable to copy');
    }
    document.body.removeChild(textArea);
}

function unblockVariation(text) {
    for (let [index, blockedText] of blockedTexts.entries()) {
        if (blockedText === text) {
            blockedTexts.splice(index, 1);
            break;
        }
    }
}
function isValidVariation(text) {
    for (let blockedText of blockedTexts) {
        if (blockedText === text) {
            return false;
        }
    }
    return true;
}
function blockVariation(text) {
    blockedTexts.push(text);
    window.setTimeout(unblockVariation, 125000, text);
}
function getValidVariation(dummyText, skeleton) {
    let tryThis = iterateString(dummyText, skeleton); //recursive magic!
    if (tryThis !== '' && isValidVariation(tryThis)) {
        blockVariation(tryThis);
        return tryThis;
    }
    return '';
}

function iterateString(string, skeleton) {
    //if the insert by the current 'skeleton' is valid, return with that.
    let dataToInsert = {};
    for (let [key, dataObj] of Object.entries(skeleton)) {
        dataToInsert[key] =  messageVariations[dataObj.name][dataObj.num];
    }
    let firstTry = doTheReplace(string, dataToInsert);
    if (isValidVariation(firstTry)) {
        return firstTry;
    }

    //if not, search which attribute to change
    let nextLoopedAttr = '';
    for (let key of LOOP_ORDER) {
        if (skeleton.hasOwnProperty(key)) {
            if (skeleton[key].num < messageVariations[skeleton[key].name].length - 1) {
                //found something to change
                nextLoopedAttr = key;
                break;
            } else {
                //if this was out last attribute, we can't do sh*t.
                if (key === LOOP_ORDER[LOOP_ORDER.length - 1]) {
                    return '';
                }
                //if we can change something later, the current number goes back to 0 and starts growing during next recursion.
                skeleton[key].num = 0;
            }
        }
    }
    //if nothing to change
    if (nextLoopedAttr === '') {
        return '';
    }
    //set the thing to change next iteration, and do a good ol' recursive call.
    skeleton[nextLoopedAttr].num += 1;
    return iterateString(string, skeleton);
}
function doTheReplace(string, data) {
    for (let [key, text] of Object.entries(data)) {
        string = string.replace('%' + key + '%', text);
    }
    return string;
}

var fadeStartTimer;
var fadeTimer;
function noti(text, timeout = 15000, color = '#fff') {
    let noti = document.querySelector('#noti-text');
    clearInterval(fadeTimer);
    clearInterval(fadeStartTimer);
    noti.style.opacity = '1';
    noti.style.display = 'block';
    noti.style.color = color;
    noti.innerText = text;
    fadeStartTimer = window.setTimeout(function () {
        fadeElement(document.querySelector('#noti-text'));
    }, timeout);
}

function fadeElement(element) {
    let op = 1;  // initial opacity
    fadeTimer = setInterval(function () {
        if (op <= 0.01) {
            clearInterval(fadeTimer);
            element.style.display = 'none';
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ")";
        op -= 0.05;
    }, 100);
}

function startCopy () {
    let relics = [];
    for (let i = 1; i <= 4; i++) {
        let rt = document.querySelector('#rt' + i);
        let rn = document.querySelector('#rn' + i);
        let rg = document.querySelector('#rg' + i);
        let ra = document.querySelector('#ra' + i);
        if (ra.checked) {
            if (rt.value !== 'Relic type' && rn.value !== '' && rg.value !== 'Relic grade') {
                let relic1 = {
                    'type': rt.value,
                    'name': rn.value,
                    'grade': rg.options[rg.selectedIndex].value
                }
                relics.push(relic1);
            }
        }
    }
    let teamSize = document.querySelector('input[name="team-size"]:checked').value;
    if (relics.length === 0) {
        noti('No valid or active relic detected! Nothing to copy.', 2000, ERROR_COLOR);
        return;
    }
    if (teamSize === '') {
        noti('Set the squad size!', 2000, ERROR_COLOR);
        return;
    }

    let copyText = generateSpamText(teamSize, relics);
    if (copyText === '') {
        noti('No available message variations, please wait or add new alternatives in the options menu!', 8000, ERROR_COLOR);
        return;
    }
    noti('Copied: ' + copyText);
    copyTextToClipboard(copyText);
}

function recolorRow(event) {
    const row = this.closest('.relic-block');
    row.classList.toggle('active');
    if (event.stopPropagation) {
        event.stopPropagation();
    } else {
        event.cancelBubble = true;
    }
}

function relicNameToUpper() {
    this.value = this.value.toUpperCase();
}

function clickCheck() {
    const input = this.querySelector('input');
    input.checked = !input.checked;
    input.dispatchEvent(new Event('click'));
}

function generateSpamText(teamSize, relics) {
    let skeleton = {};
    /* the skeleton is a data structure like this:
    {
        start: {name: 'host', num: 0},
        grade0: {name: 'rad', num: 0},
        ...
    }
    It helps us identify which string to replace using which options, and the num parameter is there to remember which of the versions are we trying to insert.*/

    let teamSizeText = '';
    if (teamSize === '1') {
        skeleton.start = {name: 'hostlf', num: 0};
    } else {
        teamSizeText = teamSize + '/4 ';
        skeleton.start = {name: 'host', num: 0};
    }
    let gradeVariationText = '';

    //get dummy text
    let copyText = '%start% ';
    for (let [index, relic] of relics.entries()) {
        gradeVariationText = '%grade' + index + '%';
        copyText += '[' + relic.type + ' ' + relic.name + ' Relic] ' + gradeVariationText + ' ';
        skeleton['grade' + index] = {name: relic.grade, num: 0};
    }
    copyText += teamSizeText + '%end%';
    skeleton.end = {name: 'end', num: 0};

    //generate valid version or die trying!!!
    return getValidVariation(copyText, skeleton);
}

function openSubmenu(buttonElement) {
    let divId = buttonElement.getAttribute('aria-controls');
    document.querySelectorAll('.todo-list-container').forEach(item => {
        if (item.id === divId) {
            item.classList.remove('d-none');
        } else {
            item.classList.add('d-none');
        }
    });
}

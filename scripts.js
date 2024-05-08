const DB_VERSION = 4; //random number
const INDEXED_DB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
const DB_VERSION_STORE = 'versionData';
const DB_RELIC_STORE = 'relicData';
const DB_WEEKLY_TASKS = 'weeklyTasks';

const scriptElement = document.querySelector('script[src^="./scripts.js"]');
const versionParam = scriptElement.src.match(/[?&]v=([^&]+)/);
const versionNumber = versionParam ? versionParam[1] : null;

let db; //indexedDB
let messageVariations = {};
let fadeStartTimer;
let fadeTimer;
let blockedTexts = [];
let weekly_data = {};
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
const DEFAULT_WEEKLIES = {
    metaData: {
        lastWeekTimestamp: '',
        versionNumber: versionNumber
    },
    acrithis_shop: {
        displayName: `Acrithis offerings`,
        isCompleted: false,
        isDisabled: false,
        info: '',
        lastChanged: ''
    },
    archon_hunt: {
        displayName: `Archon hunt`,
        isCompleted: false,
        isDisabled: false,
        info: '',
        lastChanged: ''
    },
    baro_kiteer: {
        displayName: `Baro Ki'Teer`,
        isCompleted: false,
        isDisabled: false,
        info: '',
        lastChanged: ''
    },
    bird_shard: {
        displayName: `Bird 3 archon shard`,
        isCompleted: false,
        isDisabled: false,
        info: '',
        lastChanged: ''
    },
    archimedea: {
        displayName: `Deep/Elite Archimedea`,
        isCompleted: false,
        isDisabled: false,
        info: '',
        lastChanged: ''
    },
    help_clem: {
        displayName: `Help Clem`,
        isCompleted: false,
        isDisabled: false,
        info: '',
        lastChanged: ''
    },
    kahl_missions: {
        displayName: `Kahl's mission`,
        isCompleted: false,
        isDisabled: false,
        info: '',
        lastChanged: ''
    },
    maroo_ayatan: {
        displayName: `Maroo's ayatan hunt`,
        isCompleted: false,
        isDisabled: false,
        info: '',
        lastChanged: ''
    },
    netracells: {
        displayName: `Netracells`,
        isCompleted: false,
        isDisabled: false,
        info: '',
        lastChanged: ''
    },
    nightwave_shop: {
        displayName: `Nightwave cred offerings`,
        isCompleted: false,
        isDisabled: false,
        info: '',
        lastChanged: ''
    },
    palladino_shop: {
        displayName: `Palladino shop`,
        isCompleted: false,
        isDisabled: false,
        info: '',
        lastChanged: ''
    },
    steel_path_shop: {
        displayName: `Steel path shop`,
        isCompleted: false,
        isDisabled: false,
        info: '',
        lastChanged: ''
    },
    circuit: {
        displayName: `The Circuit`,
        isCompleted: false,
        isDisabled: false,
        info: '',
        lastChanged: ''
    }
}

window.onload = () => {
    const site = document.body.dataset.site;
    switch (site) {
        case 'relics':
            onloadRelics();
            resetTooltips();
            break;
        case 'weekly':
            initIndexedDBWeeklies();
            break;
    }
};

async function setupVersionData() {
    for(const [key, value] of Object.entries(DEFAULT_VERSION_TEXTS)) {
        let savedRowData = await readIndexedDB(DB_VERSION_STORE, key);
        if (!savedRowData) {
            await writeIndexedDB(DB_VERSION_STORE, key, value);
            savedRowData = value;
        }
        document.querySelector('#' + key + 'Versions').value = savedRowData;
        messageVariations[key] = convertTextToArray(savedRowData);
    }
}
async function setupRelicData() {
    for (let i of [1, 2, 3, 4]) {
        for (const idString of ['rt', 'rn', 'rg']) {
            const key = '#' + idString + i;
            let data = await readIndexedDB(DB_RELIC_STORE, key);
            if (!data) {
                continue;
            }
            if (data !== 'type' && data !== 'grade' && data !== '') {
                document.querySelector(key).dispatchEvent(new Event('change'));
                document.querySelector(key).value = data;
            }
        }
    }
}
async function getWeeklyData() {
    try {
        let result = await readIndexedDB(DB_WEEKLY_TASKS, 'data');
        if (result) {
            if (!result.metaData || !result.metaData.versionNumber) {
                alert(`There was a version update (${versionNumber}), your saved data is reset.`);
                return DEFAULT_WEEKLIES;
            }
            if (result.metaData.versionNumber !== versionNumber) {
                alert(`There was a version update (${versionNumber}), it is possible that some of your saved data is lost.`);
                let newResult = DEFAULT_WEEKLIES;
                for (let [key, val] of Object.entries(result)) {
                    if (key !== 'metaData' && newResult[key]) {
                        newResult[key]['isCompleted'] = val['isCompleted'];
                        newResult[key]['isDisabled'] = val['isDisabled'];
                    }
                }
                newResult.metaData.lastWeekTimestamp = result.metaData.lastWeekTimestamp;
                await writeIndexedDB(DB_WEEKLY_TASKS, 'data', newResult);
                return newResult;
            }
            return result
        }
        return DEFAULT_WEEKLIES;
    } catch (error) {
        console.error(error);
    }
    return {};
}
function writeIndexedDB(storeName, id, value) {
    return new Promise(function(resolve, reject) {
        const objectRequest   = db.transaction(storeName, "readwrite").objectStore(storeName).put({id: id, data: value});

        objectRequest.onerror = function(event) {
            reject(Error('undefined error'));
        };
        objectRequest.onsuccess = function(event) {
            resolve(true);
        };
    });
}
function readIndexedDB(storeName, id) {
    return new Promise(function(resolve, reject) {
        const objectRequest = db.transaction(storeName).objectStore(storeName).get(id);
        objectRequest.onerror = function(event) {
            reject(Error('undefined error'));
        };
        objectRequest.onsuccess = function(event) {
            if (objectRequest.result) {
                resolve(objectRequest.result.data);
            } else {
                resolve(null);
            }
        };
    });
}
function clearIndexedDB(storeName) {
    return new Promise(function(resolve, reject) {
        const objectRequest   = db.transaction(storeName, "readwrite").objectStore(storeName).clear();

        objectRequest.onerror = function(event) {
            reject(Error('undefined error'));
        };
        objectRequest.onsuccess = function(event) {
            resolve(true);
        };
    });
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
        writeIndexedDB(DB_VERSION_STORE, key, text);
    }
    noti('Variations saved', 1000);
}
async function saveRelics() {
    for (let i of [1, 2, 3, 4]) {
        for (const idString of ['rt', 'rn', 'rg']) {
            let val = document.querySelector('#' + idString + i).value;
            await writeIndexedDB(DB_RELIC_STORE, '#' + idString + i, val);
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
        writeIndexedDB(DB_VERSION_STORE, key, value);
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
function onloadRelics() {
    initIndexedDBRelics();
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
    document.querySelectorAll('.js-activate-row').forEach(item => {
        item.addEventListener('click', recolorRow);
    });
    document.querySelectorAll('.js-relic-name').forEach(item => {
        item.addEventListener('change', relicNameToUpper);
    });
    document.querySelectorAll('.active-text').forEach(item => {
        item.parentElement.addEventListener('click', clickCheck);
        return false;
    });
    for (let button of document.querySelectorAll('input[type="button"].custom')) {
        button.onclick = () => {
            if (button.classList.contains('animated')) {
                return;
            }
            button.classList.add('animated');
            setTimeout(() => {
                button.classList.remove('animated');
            }, 500);

            const closestRelicBlock = button.closest('div.relic-block');
            if (closestRelicBlock) {
                const selects = closestRelicBlock.querySelectorAll('select');
                selects.forEach(select => {
                    const optionToSelect = select.querySelector('option[hidden]');
                    optionToSelect.selected = true;
                    select.style = undefined;
                });
                const nameInput = closestRelicBlock.querySelector('.js-relic-name');
                nameInput.value = '';
                nameInput.style = undefined;
                const star = closestRelicBlock.querySelector('.js-activate-row:checked');
                if (star) {
                    star.click();
                }
            }
        }
    }

}
function initIndexedDBRelics() {
    const request = INDEXED_DB.open('relic_names', DB_VERSION);

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
        setupVersionData();
        setupRelicData();
    }
}
function initIndexedDBWeeklies() {
    const request = INDEXED_DB.open('weeklies', DB_VERSION + 1);

    request.onerror = function (evt) {
        console.error("Error openDb:", evt.target.error);
    };
    request.onupgradeneeded = function () {
        db = request.result;
        if (!db.objectStoreNames.contains(DB_WEEKLY_TASKS)) {
            db.createObjectStore(DB_WEEKLY_TASKS, {keyPath: 'id'});
        }
    };
    request.onsuccess = async function () {
        db = request.result;
        weekly_data = await getWeeklyData();
        const apiData = await fetchApiData();
        if (!apiData.archonHunt) {
            throw new Error('Error fetching api time data.');
        }
        updateDataUsingApiData(apiData);
        updateWeeklyHtml(weekly_data);
        initPointsOfInterests(apiData);
    }
}
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
    const importantRelics = document.querySelectorAll('.relic-block.active');
    let onlyImportant = importantRelics.length > 0;
    const relicsToGenerate = onlyImportant ? importantRelics : document.querySelectorAll('.relic-block');
    for (let relicRow of relicsToGenerate) {
        const type = relicRow.querySelector('.js-relic-type').value;
        const name = relicRow.querySelector('.js-relic-name').value;
        const grade = relicRow.querySelector('.js-relic-grade').value;
        if (type === 'type' || name === '' || grade === 'grade') {
            continue;
        }
        relics.push({
            'type': type,
            'name': name,
            'grade': grade
        });
    }

    let teamSize = document.querySelector('input[name="team-size"]:checked').value;
    if (relics.length === 0) {
        if (onlyImportant) {
            noti('None of the important relics are valid!', 3000, ERROR_COLOR);
        } else {
            noti('No valid relic detected!', 3000, ERROR_COLOR);
        }
        return;
    }
    if (teamSize === '') {
        noti('Set the squad size!', 3000, ERROR_COLOR);
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
    document.querySelectorAll('.task-type-nav>.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    buttonElement.classList.add('active');
}
function updateWeeklyHtml(data) {
    let activeHtml = '';
    let completedHtml = '';
    let disabledHtml = '';
    let activeAmnt = 0;
    let completedAmnt = 0;
    let disabledAmnt = 0;
    for (let [key, dataObj] of Object.entries(data)) {
        if (key === 'metaData') {
            continue;
        }
        let infoHtml = '';
        if (dataObj.info) {
            infoHtml = `
                <div class="info">
                    <i class="bi-info-circle" data-bs-toggle="tooltip" title="${dataObj.info}"></i>
                </div>`;
        }
        if (dataObj.isDisabled) {
            disabledHtml += `
                <div class="todo-list-item" id="${key}">
                    <i class="bi-arrow-left-circle" onClick="restoreWeekly(this, '${key}')" data-bs-toggle="tooltip" title="Enable item"></i>
                    <div class="title">${dataObj.displayName}</div>
                    ${infoHtml}
                </div>`;
            disabledAmnt += 1;
            continue;
        }
        if (dataObj.isCompleted) {
            completedHtml += `
                <div class="todo-list-item" id="${key}">
                    <i class="bi-x-circle" onClick="uncompleteWeekly(this, '${key}')" data-bs-toggle="tooltip" title="Mark as incomplete"></i>
                    <div class="title">${dataObj.displayName}</div>
                    ${infoHtml}
                    <i class="bi-dash-circle-dotted" onClick="disableWeekly(this, '${key}')" data-bs-toggle="tooltip" title="Disable item"></i>
                </div>`;
            completedAmnt += 1;
            continue;
        }
        activeHtml += `
            <div class="todo-list-item" id="${key}">
                <i class="bi-check-circle" onClick="completeWeekly(this, '${key}')" data-bs-toggle="tooltip" title="Mark as complete"></i>
                <div class="title">${dataObj.displayName}</div>
                ${infoHtml}
                <i class="bi-dash-circle-dotted" onClick="disableWeekly(this, '${key}')" data-bs-toggle="tooltip" title="Disable item"></i>
            </div>`;
        activeAmnt += 1;
    }
    document.getElementById('active-container').innerHTML = activeHtml;
    document.getElementById('completed-container').innerHTML = completedHtml;
    document.getElementById('disabled-container').innerHTML = disabledHtml;
    document.querySelector('[aria-controls="active-container"]').innerHTML = `Active (${activeAmnt})`;
    document.querySelector('[aria-controls="completed-container"]').innerHTML = `Completed (${completedAmnt})`;
    document.querySelector('[aria-controls="disabled-container"]').innerHTML = `Disabled (${disabledAmnt})`;
    resetTooltips();
}
function restoreWeekly(element, id) {
    bootstrap.Tooltip.getInstance(element)?.hide();
    weekly_data[id].isDisabled = false;
    writeIndexedDB(DB_WEEKLY_TASKS, 'data', weekly_data).then(f => updateWeeklyHtml(weekly_data));
}
function disableWeekly(element, id) {
    bootstrap.Tooltip.getInstance(element)?.hide();
    weekly_data[id].isDisabled = true;
    writeIndexedDB(DB_WEEKLY_TASKS, 'data', weekly_data).then(f => updateWeeklyHtml(weekly_data));
}
function completeWeekly(element, id) {
    bootstrap.Tooltip.getInstance(element)?.hide();
    weekly_data[id].isCompleted = true;
    writeIndexedDB(DB_WEEKLY_TASKS, 'data', weekly_data).then(f => updateWeeklyHtml(weekly_data));
}
function uncompleteWeekly(element, id) {
    bootstrap.Tooltip.getInstance(element)?.hide();
    weekly_data[id].isCompleted = false;
    writeIndexedDB(DB_WEEKLY_TASKS, 'data', weekly_data).then(f => updateWeeklyHtml(weekly_data));
}
function resetTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    })
}
async function fetchApiData() {
    try {
        const response = await fetch('https://api.warframestat.us/pc');
        return await response.json();
    } catch (error) {
        throw new Error('Error fetching api data.');
    }
}
function updateDataUsingApiData(serverData) {
    const currentTime = new Date(serverData.timestamp);
    const baroStartTime = new Date(serverData.voidTrader.activation);
    const baroEndTime = new Date(serverData.voidTrader.expiry);
    const weekStartDateStr = serverData.archonHunt.activation;

    if (weekly_data.metaData.lastWeekTimestamp !== weekStartDateStr) {
        weekly_data.metaData.lastWeekTimestamp = weekStartDateStr;
        for (let [id, data] of Object.entries(weekly_data)) {
            weekly_data[id].isCompleted = false;
        }
        weekly_data.baro_kiteer.isDisabled = !isOnThisWeek(baroStartTime, weekStartDateStr);
    }

    const isBaroActive = currentTime >= baroStartTime && currentTime <= baroEndTime;
    weekly_data.baro_kiteer.info = isBaroActive ? `He is here! On ${serverData.voidTrader.location}` : `Arrives in: ${serverData.voidTrader.startString}`;
    writeIndexedDB(DB_WEEKLY_TASKS, 'data', weekly_data).then(f => updateWeeklyHtml(weekly_data));
}
function isOnThisWeek (date, weekStartDateStr) {
    const startOfWeek = new Date(weekStartDateStr);
    const endOfWeek = new Date(weekStartDateStr);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    return date >= startOfWeek && date < endOfWeek;
}
function removeWeeklySavedData() {
    clearIndexedDB(DB_WEEKLY_TASKS).then(function f() {
        alert('Save data removed from the computer.');
        close();
    });
}
function initPointsOfInterests(apiData) {
    let poiHtml = '';
	if (apiData.events) {
        const checks = ['Gift','Gifts'];
        for ([key, data] of Object.entries(apiData.events)) {
            if (data.description && data.active && checks.some(word => data.description.includes(word))) {
                let rewards = [];
                for (let reward of data.rewards) {
                    rewards.push(reward.asString);
                }
                poiHtml += `<span>${data.description}:</span><span>${rewards.join(', ')}</span><span>${data.node}</span>`;
				continue;
            }
			let rewardText = getUsefulRewards(data);
            if (rewardText) {
                poiHtml += `<span>Invasion:</span><span>${rewardText}</span><span>${data.description}</span>`;
            }
        }
    }
    if (apiData.alerts) {
        const checks = ['Gift','Gifts'];
        for ([key, data] of Object.entries(apiData.alerts)) {
            if (data.mission?.description && data.active && checks.some(word => data.mission.description.includes(word))) {
                poiHtml += `<span>${data.mission.description}:</span><span>${data.mission.reward.asString}</span><span>${data.mission.node}</span>`;
				continue;
            }
			let rewardText = getUsefulRewards(data);
            if (rewardText) {
                poiHtml += `<span>Alert:</span><span>${rewardText}</span><span>${data.tag ? data.tag : 'unnamed'}</span>`;
            }
        }
    }
    if (apiData.invasions) {
        for ([key, data] of Object.entries(apiData.invasions)) {
            let rewardText = getUsefulRewards(data);
            if (rewardText) {
                poiHtml += `<span>Invasion:</span><span>${rewardText}</span><span>${data.desc}</span>`;
            }
        }
    }

    if (poiHtml) {
        document.querySelector('[aria-controls="poiCollapseWrapper"]').classList.remove('d-none');
        document.querySelector('#poiCollapseWrapper > div').innerHTML = poiHtml;
    }
}
function getUsefulRewards(data) {
    if (data.completed) {
        return '';
    }

    let result = '';
    const usefulRewards = ['forma', 'catalyst', 'reactor', 'adapter'];
    if (data.defenderReward?.asString) {
        let rewardStr = data.defenderReward.asString.toLowerCase();
        if (usefulRewards.some(substring => rewardStr.includes(substring))) {
            result += `${rewardStr}`;
        }
    }
    if (data.attackerReward?.asString) {
        let rewardStr = data.attackerReward.asString.toLowerCase();
        if (usefulRewards.some(substring => rewardStr.includes(substring))) {
            result += `${rewardStr}`;
        }
    }
    if (data.mission?.reward?.asString) {
        let rewardStr = data.mission.reward.asString.toLowerCase();
        if (usefulRewards.some(substring => rewardStr.includes(substring))) {
            result += `${rewardStr}`;
        }
    }
    if (data.rewards) {
        for (let reward of data.rewards) {
			let rewardStr = reward.asString.toLowerCase();
			if (usefulRewards.some(substring => rewardStr.includes(substring))) {
				result += `${rewardStr}`;
			}
        }
    }

    return result;
}

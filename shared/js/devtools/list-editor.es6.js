import browser from 'webextension-polyfill'

const constants = require('../../data/constants')
const { getElementByIdOrFail } = require('./util.es6')

/** @type {HTMLSelectElement} */
// @ts-ignore
const listPicker = document.getElementById('list-picker')
/** @type {HTMLTextAreaElement} */
// @ts-ignore
const listEditor = document.getElementById('list-content')
const saveButton = getElementByIdOrFail('save')

const lists = constants.tdsLists
let selected = lists[0].name

function getListFormat (name) {
    return lists.find(l => l.name === name)?.format
}

// build switcher options
lists.forEach(({ name }) => {
    const option = document.createElement('option')
    option.value = name
    option.innerText = name
    listPicker.appendChild(option)
})

function listSwitcher () {
    selected = listPicker.selectedOptions[0].value
    loadList(selected)
    saveButton.removeAttribute('disabled')
}
listPicker.addEventListener('change', listSwitcher)
listSwitcher()

function sendMessage (messageType, options, callback) {
    browser.runtime.sendMessage({ messageType, options }, callback)
}

function loadList (name) {
    sendMessage('getListContents', name, ({ etag, data }) => {
        const value = getListFormat(name) === 'json' ? JSON.stringify(data, null, '  ') : data
        listEditor.value = value
    })
}

function saveList (name) {
    const value = listEditor.value
    sendMessage('setListContents', {
        name,
        value: getListFormat(name) === 'json' ? JSON.parse(value) : value
    }, () => loadList(name))
}

function reloadList (name) {
    sendMessage('reloadList', name, () => loadList(name))
}

saveButton.addEventListener('click', () => {
    saveList(selected)
})

getElementByIdOrFail('reload').addEventListener('click', () => {
    reloadList(selected)
})

/**
 * Refresh local changes to the given list. For example, if rule blocking
 * has been toggled in the panel, then the editor will reflect this once
 * the refresh button has been clicked.
 *
 * This can also be used to reset local unsaved changes back to their prior
 * state, without loading a remote version.
 */
getElementByIdOrFail('refreshLocal').addEventListener('click', () => {
    loadList(selected)
})

listEditor.addEventListener('keypress', () => {
    setTimeout(() => {
        console.log('changed', getListFormat(selected))
        if (getListFormat(selected) === 'json') {
            try {
                saveButton.removeAttribute('disabled')
            } catch (e) {
                console.log('parse error')
                saveButton.setAttribute('disabled', 'true')
            }
        } else {
            saveButton.removeAttribute('disabled')
        }
    }, 0)
})

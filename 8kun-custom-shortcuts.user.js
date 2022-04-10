// ==UserScript==
// @name         8kun Custom Shortcuts
// @description  Configurable shortcuts and enhanced keyboard navigations.
// @version      1.0.3
// @author       Marker
// @license      The Unlicense
// @namespace    https://github.com/marktaiwan/
// @homepageURL  https://github.com/marktaiwan/8kun-Custom-Shortcuts
// @supportURL   https://github.com/marktaiwan/8kun-Custom-Shortcuts/issues
// @match        https://8kun.top/*/*
// @grant        GM_openInTab
// @noframes
// ==/UserScript==

(function () {
'use strict';

let lastSelected = null;
const context = unsafeWindow || window; // workaround to get cancelAnimationFrame working in some script managers
const SCRIPT_ID = 'custom_shortcuts';
const CSS = `
/* Generated by Custom Shortcuts */
#options_div {
  min-width: 600px;
  min-height: 360px;
  width: 35vw;
  height: 75vh;
  max-width: 1000px
}
#options_tablist {
  overflow-y: auto;
}
.${SCRIPT_ID}--header {
  padding-bottom: 5px;
}
.${SCRIPT_ID}--table {
  margin-top: 5px;
  display: grid;
  grid-template-columns: 1fr 150px 150px;
  grid-column-gap: 5px;
  grid-row-gap: 5px;
}
.${SCRIPT_ID}--table input {
  font-size: 12px;
  align-self: center;
  text-align: center;
}
.${SCRIPT_ID}--highlighted:not(a), a.${SCRIPT_ID}--highlighted .post-image, a.${SCRIPT_ID}--highlighted .full-image {
  box-shadow: 0px 0px 0px 4px coral;
}
.threads .${SCRIPT_ID}--highlighted a {
  outline: none;
}
`;

/*
 *  - 'key' uses KeyboardEvent.code to represent keypress.
 *    For instance, 's' would be 'KeyS' and '5' would be either 'Digit5' or
 *    'Numpad5'.
 *  - 'ctrl', 'alt', 'shift' are Booleans and defaults to false if not present.
 */
const presets = {
  default: {
    toCatelog:   [{key: 'KeyC'}],
    focusSearch: [{key: 'KeyS'}],
  },
  preset_1: {
    scrollUp:          [{key: 'KeyW'}, {key: 'ArrowUp'}],
    scrollDown:        [{key: 'KeyS'}, {key: 'ArrowDown'}],
    scrollLeft:        [{key: 'KeyA'}, {key: 'ArrowLeft'}],
    scrollRight:       [{key: 'KeyD'}, {key: 'ArrowRight'}],
    pageUp:            [{key: 'KeyW', shift: true}],
    pageDown:          [{key: 'KeyS', shift: true}],
    toggleKeyboardNav: [{key: 'KeyQ'}],
    openSelected:      [{key: 'KeyE'}],
    openInNewTab:      [{key: 'KeyE', shift: true}],
    // OpenInBackground:  [],
    prev:              [{key: 'KeyZ'}],
    next:              [{key: 'KeyX'}],
    toPost:            [{key: 'KeyL'}],
    toIndex:           [{key: 'KeyI'}],
    toCatelog:         [{key: 'KeyC'}],
    toggleSound:       [{key: 'KeyM'}],
    toggleVideo:       [{key: 'KeyN'}],
    focusSearch:       [{key: 'KeyF', shift: true}],
    pageUpdate:        [{key: 'KeyR', shift: true}],
    historyBack:       [{key: 'KeyA', shift: true}],
    historyForward:    [{key: 'KeyD', shift: true}],
  },
  preset_2: {},
  preset_3: {},

  /* Keybinds that are applied globally */
  global: {
    useDefault:  [{key: 'Backquote', alt: true}],
    usePreset_1: [{key: 'Digit1', alt: true}],
    usePreset_2: [{key: 'Digit2', alt: true}],
    usePreset_3: [{key: 'Digit3', alt: true}]
  },

  /* Special non-configurable keybinds */
  reserved: {
    unfocus: [{key: 'Escape'}],
    toggleSettings: [{key: 'Slash', ctrl: true, shift: true}],
  }
};

const reservedKeys = [
  'Escape',
  'Backspace',
  'Delete',
  'Meta',
  'ContextMenu',
  // 'Enter',
  // 'Tab',
  // 'CapsLock',
  // 'ScrollLock',
  // 'NumLock',
];

/*
 *  'constant' executes the command twice, on keydown and keyup.
 *
 *  'repeat' indicates whether the command should act on
 *  subsequent events generated by the key being held down.
 *  Defaults to false.
 *
 *  'input' indicates whether the command should execute when an
 *  input field has focus.
 *  Defaults to false.
 *
 *  'global' indicates whether the keybind applies to all presets.
 *  Defaults to false.
 */
const actions = {
  scrollUp: {
    name: 'Scroll up',
    fn: event => scroll('up', event),
    constant: true,
    repeat: true
  },
  scrollDown: {
    name: 'Scroll down',
    fn: event => scroll('down', event),
    constant: true,
    repeat: true
  },
  scrollLeft: {
    name: 'Scroll left',
    fn: event => scroll('left', event),
    constant: true,
    repeat: true
  },
  scrollRight: {
    name: 'Scroll right',
    fn: event => scroll('right', event),
    constant: true,
    repeat: true
  },
  pageUp: {
    name: 'Page up',
    fn: (event) => {
      const selected = $(`.${SCRIPT_ID}--highlighted`);
      const scrollAmount = document.documentElement.clientHeight * 0.9;

      if (selected && getPageType() !== 'catalog') {
        // get nearest non visible
        const selector = 'div.file > a, div.file video';
        const selectables = [...$$(selector)].filter(notHidden);
        let position = selectables.indexOf(selected);
        let thumb = selected;

        while (position > 0) {
          thumb = selectables[--position];
          if (!isVisible(thumb)) break;
        }

        highlight(thumb, !event.repeat);
      } else {
        window.scrollBy(0, -scrollAmount);
      }
    },
    repeat: true
  },
  pageDown: {
    name: 'Page down',
    fn: (event) => {
      const selected = $(`.${SCRIPT_ID}--highlighted`);
      const scrollAmount = document.documentElement.clientHeight * 0.9;

      if (selected && getPageType() !== 'catalog') {
        // get nearest non visible
        const selector = 'div.file > a, div.file video';
        const selectables = [...$$(selector)].filter(notHidden);
        let position = selectables.indexOf(selected);
        let thumb = selected;

        while (position < selectables.length - 1) {
          thumb = selectables[++position];
          if (!isVisible(thumb)) break;
        }

        highlight(thumb, !event.repeat);
      } else {
        window.scrollBy(0, scrollAmount);
      }
    },
    repeat: true
  },
  toggleKeyboardNav: {
    name: 'Toggle keyboard navigation',
    fn: () => {
      const highlightedElement = $(`.${SCRIPT_ID}--highlighted`);
      let highlightedElementSelector;

      switch (getPageType()) {
        case 'index': case 'thread':
          highlightedElementSelector = 'div.file > a, div.file > div > video';
          break;
        case 'catalog':
          highlightedElementSelector = '.threads .thread';
          break;
        default:
          return;
      }

      if (highlightedElement) {
        unhighlight(highlightedElement);
      } else {
        if (lastSelected && isVisible(lastSelected) && notHidden(lastSelected)) {
          highlight(lastSelected);
        } else {
          highlight(getFirstVisibleOrClosest(highlightedElementSelector));
        }
      }

    }
  },
  openSelected: {
    name: 'Open selected',
    fn: () => {
      let mediaBox = $(`.${SCRIPT_ID}--highlighted`);

      if (!mediaBox) return;

      switch (getPageType()) {
        case 'index': case 'thread': {
          let video = null;
          // is webm
          if (mediaBox.matches('video')) {
            video = mediaBox;
            mediaBox = $('div.file > a', mediaBox.closest('div.file'));
          }
          if (mediaBox.getAttribute('href').startsWith('/player.php?')) {
            if (webmExpanded(mediaBox)) {
              video.previousElementSibling.click();
            } else {
              $('img', mediaBox).click();
              const video = $('video', mediaBox.nextElementSibling);
              video.addEventListener('loadedmetadata', e => {
                // only highlight if video still selected
                if (e.target.parentElement && e.target.classList.contains(`${SCRIPT_ID}--highlighted`)) {
                  highlight(e.target);
                }
              }, {once: true});
            }
          } else {
            mediaBox.click();
            const fullImg = $('.full-image', mediaBox);
            if (fullImg) {
              onloadstart(fullImg).then(fullImg => {
                // only highlight if image still selected
                if (fullImg.parentElement
                  && fullImg.parentElement.classList.contains(`${SCRIPT_ID}--highlighted`)) {
                  highlight(fullImg.parentElement);
                }
              });
            }
          }
          highlight(mediaBox);
          break;
        }
        case 'catalog': {
          click('.thread > a', mediaBox);
          break;
        }
      }
    }
  },
  openInNewTab: {
    name: 'Open selected in new tab',
    fn: () => {
      const mediaBox = $(`.${SCRIPT_ID}--highlighted`);
      if (!mediaBox) return;

      switch (getPageType()) {
        case 'index': case 'thread': {
          window.open($('.fileinfo > a', mediaBox.closest('div.file')).href, '_blank');
          break;
        }
        case 'catalog': {
          const anchor = $('.thread > a', mediaBox);
          if (anchor) window.open(anchor.href, '_blank');
          break;
        }
      }
    }
  },
  OpenInBackground: {
    name: 'Open selected in background tab',
    fn: () => {
      const mediaBox = $(`.${SCRIPT_ID}--highlighted`);
      if (!mediaBox) return;

      switch (getPageType()) {
        case 'index': case 'thread': {
          GM_openInTab($('.fileinfo > a', mediaBox.closest('div.file')).href, {active: false});
          break;
        }
        case 'catalog': {
          const anchor = $('.thread > a', mediaBox);
          if (anchor) GM_openInTab(anchor.href, {active: false});
          break;
        }
      }
    }
  },
  prev: {
    name: 'Previous page',
    fn: () => click('.pages input[value="Previous"]')
  },
  next: {
    name: 'Next page',
    fn: () => click('.pages input[value="Next"]')
  },
  toPost: {
    name: 'Go to selected post',
    fn: () => {
      let ele = $(`a.${SCRIPT_ID}--highlighted, video.${SCRIPT_ID}--highlighted`);  // exclude catalog
      if (!ele) return;
      if (ele.matches('video')) ele = $('div.file > a', ele.closest('div.file'));
      const postId = getPostId(ele);
      click(`#post_no_${postId}`);
    }
  },
  toIndex: {
    name: 'Go to index',
    fn: () => {
      const boardId = getBoardId();
      if (boardId) window.location.href = `/${boardId}/index.html`;
    }
  },
  toCatelog: {
    name: 'Go to catalog',
    fn: () => {
      const boardId = getBoardId();
      if (boardId) window.location.href = `/${boardId}/catalog.html`;
    }
  },
  toggleSound: {
    name: 'Mute/unmute webms',
    fn: () => {
      const video = $(`video.${SCRIPT_ID}--highlighted`);
      if (!video) return;
      video.muted = !video.muted;
    }
  },
  toggleVideo: {
    name: 'Play/pause webms',
    fn: () => {
      const video = $(`video.${SCRIPT_ID}--highlighted`);
      if (!video) return;
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    }
  },
  focusSearch: {
    name: 'Focus on search field',
    fn: () => {
      if (getPageType() != 'catalog') return;
      unhighlight($(`.${SCRIPT_ID}--highlighted`));
      const searchButton = $('#catalog_search_button');
      const searchField = $('#search_field');
      if (searchField) {
        searchField.focus();
      } else {
        searchButton.click();
      }
    }
  },
  pageUpdate: {
    name: 'Update page',
    fn: () => click('#update_thread, #update_catalog')
  },
  historyBack: {
    name: 'Go back in browser history',
    fn: () => window.history.back()
  },
  historyForward: {
    name: 'Go forward in browser history',
    fn: () => window.history.forward()
  },
  useDefault: {
    name: 'Global: Switch to default keybinds',
    fn: () => switchPreset('default'),
    global: true
  },
  usePreset_1: {
    name: 'Global: Switch to preset 1',
    fn: () => switchPreset('preset_1'),
    global: true
  },
  usePreset_2: {
    name: 'Global: Switch to preset 2',
    fn: () => switchPreset('preset_2'),
    global: true
  },
  usePreset_3: {
    name: 'Global: Switch to preset 3',
    fn: () => switchPreset('preset_3'),
    global: true
  },
  unfocus: {
    fn: (event) => {
      const target = event.target;
      let stopPropagation = true;

      if (target.matches('#quick-reply textarea')) {
        // exceptions
        stopPropagation = false;
      } else if (target.matches('.catalog_search #search_field')) {
        // first time pressing Esc on the catalog search field blurs it
        target.blur();
      } else if ($('.catalog_search #search_field')) {
        // pressing Esc while search is active but unfocused clears it
        click('#catalog_search_button');
        unhighlight($(`.${SCRIPT_ID}--highlighted`));
      } else {
        // default behavior
        target.blur();
      }

      return {stopPropagation};
    },
    input: true
  },
  toggleSettings: {
    fn: () => {
      const panel = $('#options_handler');
      if (!panel) return;
      if (panel.style.display == 'none') {
        window.Options.show();
        window.Options.select_tab(SCRIPT_ID);
      } else {
        window.Options.hide();
      }
    }
  }
};

const smoothscroll = (function () {
  let startTime = null;
  let pendingFrame = null;
  let keydown = {up: false, down: false, left: false, right: false};

  function reset() {
    startTime = null;
    keydown = {up: false, down: false, left: false, right: false};
    context.cancelAnimationFrame(pendingFrame);
  }
  function noKeyDown() {
    return !(keydown.up || keydown.down || keydown.left || keydown.right);
  }
  function step(timestamp) {

    if (noKeyDown() || !document.hasFocus()) {
      reset();
      return;
    }

    startTime = startTime || timestamp;
    const elapsed = timestamp - startTime;
    const maxVelocity = 40; // px/frame
    const easeDuration = 250;  // ms
    const scale = window.devicePixelRatio;

    const velocity = ((elapsed > easeDuration)
      ? maxVelocity
      : maxVelocity * (elapsed / easeDuration)
    ) / scale;

    let x = 0;
    let y = 0;

    if (keydown.up) y += 1;
    if (keydown.down) y += -1;
    if (keydown.left) x += -1;
    if (keydown.right) x += 1;

    const rad = Math.atan2(y, x);
    x = (x != 0) ? Math.cos(rad) : 0;
    y = Math.sin(rad) * -1;

    window.scrollBy(Math.round(x * velocity), Math.round(y * velocity));
    pendingFrame = window.requestAnimationFrame(step);
  }

  return function (direction, type) {
    switch (type) {
      case 'keydown':
        if (noKeyDown()) pendingFrame = window.requestAnimationFrame(step);
        keydown[direction] = true;
        break;
      case 'keyup':
        keydown[direction] = false;
        if (noKeyDown()) reset();
        break;
    }
  };
})();

function $(selector, parent = document) {
  return parent.querySelector(selector);
}

function $$(selector, parent = document) {
  return parent.querySelectorAll(selector);
}

function click(selector, parent = document) {
  const el = $(selector, parent);
  if (el) el.click();
}

function getStorage(key) {
  const store = JSON.parse(localStorage.getItem(SCRIPT_ID));
  return store[key];
}

function setStorage(key, val) {
  const store = JSON.parse(localStorage.getItem(SCRIPT_ID));
  store[key] = val;
  localStorage.setItem(SCRIPT_ID, JSON.stringify(store));
}

function getRect(ele) {
  // Relative to viewport
  const {top, bottom, left, height, width} = ele.getBoundingClientRect();
  const mid = (top + bottom) / 2;

  // Relative to document
  const x = left + window.pageXOffset + (width / 2);
  const y = top + window.pageYOffset + (height / 2);

  return {top, bottom, left, height, width, mid, x, y};
}

function isHidden(ele) {
  return (getPageType() == 'catalog')
    ? ele.closest('div.mix').style.display == 'none'
    : ele.closest('.files').style.display == 'none';
}

function notHidden(ele) {
  return !isHidden(ele);
}

function isVisible(ele) {
  ele = anchorToImg(ele);
  const clientHeight = document.documentElement.clientHeight;
  const {top, bottom, height, mid} = getRect(ele);
  const margin = Math.min(Math.max(50, height / 4), clientHeight / 4);

  return (mid > 0 + margin && mid < clientHeight - margin
    || top < 0 + margin && bottom > clientHeight - margin);
}

function getFirstVisibleOrClosest(selector) {
  const selectables = [...$$(selector)].filter(notHidden);
  const listLength = selectables.length;
  const viewportMid = document.documentElement.clientHeight / 2;
  if (listLength < 1) return;

  let closest = selectables[0];
  let closest_delta = Math.abs(getRect(closest).mid - viewportMid);

  for (let i = 0; i < listLength; i++) {
    const ele = selectables[i];
    if (ele.closest('.post-hover')) continue;  // skip quote preview
    if (isVisible(ele)) return ele;

    const ele_y = getRect(ele).mid;
    const ele_delta = Math.abs(ele_y - viewportMid);
    if (ele_delta < closest_delta) {
      [closest, closest_delta] = [ele, ele_delta];
    }
  }
  return closest;
}

function getPostId(anchor) {
  if (!anchor.matches('div.file > a')) return null;
  const post = anchor.closest('.post, .thread');
  const match = post.id.match(/_(\d+)$/);
  return match ? match[1] : null;
}

function anchorToImg(anchor) {
  if (!anchor.matches('div.file > a')) return anchor;
  const fullImg = $('.full-image', anchor);
  if (webmExpanded(anchor)) {
    return getWebm(anchor);
  } else if (fullImg && fullImg.style.display !== 'none') {
    return fullImg;
  } else {
    return $('.post-image', anchor);
  }
}

function getPageType() {
  return context.active_page;
}

function getBoardId() {
  return context.board_name;
}

function webmExpanded(fileThumb) {
  return (fileThumb.nextElementSibling && fileThumb.nextElementSibling.style.display !== 'none');
}

function getWebm(ele) {
  return $('video', ele.parentElement);
}

function highlight(ele, setSmooth = true) {
  if (!ele) return;

  unhighlight($(`.${SCRIPT_ID}--highlighted`));

  const anchor = (getPageType() == 'catalog') ? $('.thread > a', ele) : $('.fileinfo > a', ele.closest('div.file'));
  if (anchor) anchor.focus({preventScroll: true});

  if (webmExpanded(ele)) ele = getWebm(ele);
  ele.classList.add(`${SCRIPT_ID}--highlighted`);

  if (!isVisible(ele)) {
    if (setSmooth) {
      ele.scrollIntoView({behavior: 'smooth', block: 'center'});
    } else {
      ele.scrollIntoView({behavior: 'auto', block: 'nearest'});
    }
  }

  lastSelected = ele;
}

function unhighlight(ele) {
  if (!ele) return;
  ele.classList.remove(`${SCRIPT_ID}--highlighted`);
  document.activeElement.blur();
}

function scroll(direction, event) {
  const type = event.type;
  const selected = $(`.${SCRIPT_ID}--highlighted`);

  if (selected && type == 'keydown') {
    keyboardNav(direction, selected, !event.repeat);
  } else if (!event.repeat){
    smoothscroll(direction, type);
  }
}

function keyboardNav(direction, selectedElement, setSmooth) {
  const similar = (val1, val2, margin) => (val1 < val2 + margin && val1 > val2 - margin);
  const distance = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  let ele = selectedElement;
  if (ele.matches('video')) {
    ele = $('div.file > a', ele.closest('div.file'));
  }

  const originalId = getPostId(ele);
  const originalPos = getRect(anchorToImg(ele));
  const margin = 265 / 4;   // Quarter of maximum thumbnail size
  const selector = (getPageType() == 'catalog') ? '.threads .thread' : 'div.file > a';
  const selectables = [...$$(selector)].filter(notHidden);
  let position = selectables.indexOf(ele);

  switch (direction) {
    case 'left': {
      if (position > 0) ele = selectables[position - 1];
      break;
    }
    case 'right': {
      if (position < selectables.length - 1) ele = selectables[position + 1];
      break;
    }
    case 'up': case 'down': {
      let closest = ele;
      let closestDistance;
      let adjacentId, closestYDistance;

      while ((direction == 'up' && position > 0) || (direction == 'down' && position < selectables.length - 1)) {
        if (direction == 'up') position--;
        if (direction == 'down') position++;

        const current = selectables[position];
        const currentPos = getRect(anchorToImg(current));
        const currentDistance = distance(originalPos, currentPos);

        if (getPageType() == 'catalog') {
          // Skip same row, and only iterate over elements one row up/down.
          const currentYDistance = Math.abs(currentPos.y - originalPos.y);
          if (similar(currentPos.y, originalPos.y, margin)) continue;
          if (!closestYDistance) closestYDistance = currentYDistance;
          if (currentYDistance > closestYDistance) break;
        } else {
          // Skip same post, and only iterate over next/previous post.
          const currentId = getPostId(current);
          if (getPostId(current) == originalId) continue;
          if (!adjacentId) adjacentId = getPostId(current);
          if (currentId != adjacentId) break;
        }

        if (!closestDistance || currentDistance <= closestDistance) {
          closest = current;
          closestDistance = currentDistance;
        }
      }

      ele = closest;
      break;
    }
  }

  highlight(ele, setSmooth);
}

function onloadstart(img) {
  const interval = 100;
  let timeout;

  function loadCheck(img, resolveFn) {
    if (img.naturalWidth) {
      resolveFn(img);
    } else {
      timeout = window.setTimeout(loadCheck, interval, img, resolveFn);
    }
  }

  return (img.complete) ? Promise.resolve(img) : new Promise((resolve, reject) => {
    img.addEventListener('error', () => {
      window.clearTimeout(timeout);
      reject();
    }, {once: true});
    timeout = window.setTimeout(loadCheck, interval, img, resolve);
  });
}

function switchPreset(id) {
  const selector = $(`#${SCRIPT_ID}--preset-selector`);
  if (selector) {
    selector.value = id;
    selector.dispatchEvent(new Event('input'));
  } else {
    setStorage('usePreset', id);
  }
}

function getActiveKeybinds() {
  const keybinds = getStorage('keybinds');
  const id = getStorage('usePreset');
  return keybinds[id];
}

function getGlobalKeybinds() {
  const keybinds = getStorage('keybinds');
  return keybinds['global'];
}

/*
 *  Returns false if no match found, otherwise returns the bind settings
 */
function matchKeybind(key, ctrl, alt, shift) {
  const keybinds = {...getActiveKeybinds(), ...getGlobalKeybinds(), ...presets.reserved};
  for (const name in keybinds) {
    for (const slot of keybinds[name]) {
      if (slot === null || slot === undefined) continue;
      const {
        key: bindKey,
        ctrl: bindCtrl = false,
        alt: bindAlt = false,
        shift: bindShift = false
      } = slot;

      if (key == bindKey
        && ctrl == bindCtrl
        && alt == bindAlt
        && shift == bindShift
        && actions.hasOwnProperty(name)) {
        return name;
      }
    }
  }
  return false;
}

function initSettings() {
  function rowTemplate(name, id) {
    return `
<span>${name}</span>
<input data-command="${id}" data-slot="0" data-key="" data-ctrl="0" data-alt="0" data-shift="0" type="text">
<input data-command="${id}" data-slot="1" data-key="" data-ctrl="0" data-alt="0" data-shift="0" type="text">
`;
  }
  function printRows() {
    const arr = [];

    for (const id in actions) {
      if (actions[id].name) arr.push(rowTemplate(actions[id].name, id));
    }

    return arr.join('');
  }
  function clear(input) {
    input.value = '';
    input.dataset.key = '';
    input.ctrl = false;
    input.alt = false;
    input.shift = false;
  }
  function renderSingleKeybind(input) {
    function simplify(str) {
      return str.replace(/^(Key|Digit)/, '');
    }
    const keyCombinations = [];
    if (input.ctrl) keyCombinations.push('Ctrl');
    if (input.alt) keyCombinations.push('Alt');
    if (input.shift) keyCombinations.push('Shift');
    if (input.dataset.key !== '') keyCombinations.push(simplify(input.dataset.key));
    input.value = keyCombinations.join('+');
  }
  function renderAllKeybinds(table) {
    const panelWrapper = table || $(`.${SCRIPT_ID}--table`);
    const keybinds = {...getActiveKeybinds(), ...getGlobalKeybinds()};

    if (!panelWrapper) return;

    // Reset input fields
    for (const input of $$('[data-command]', panelWrapper)) {
      clear(input);
      input.disabled = (getStorage('usePreset') == 'default');
    }

    // Populate input from storage
    for (const name in keybinds) {
      const slots = keybinds[name];
      for (let i = 0; i < slots.length; i++) {
        const input = $(` [data-command="${name}"][data-slot="${i}"]`, panelWrapper);

        if (!slots[i] || !input || !slots[i].key) continue;

        const {key, ctrl = false, alt = false, shift = false} = slots[i];
        input.dataset.key = key;
        input.ctrl = ctrl;
        input.alt = alt;
        input.shift = shift;
        renderSingleKeybind(input);
      }
    }
  }
  function modifierLookup(which) {
    return ({16: 'shift', 17: 'ctrl', 18: 'alt'}[which]);
  }
  function saveKeybind(input) {
    const key = input.dataset.key;
    const ctrl = input.ctrl;
    const alt = input.alt;
    const shift = input.shift;
    const command = input.dataset.command;
    const slot = parseInt(input.dataset.slot);

    if (matchKeybind(key, ctrl, alt, shift)) {
      // existing keybind
      clear(input);
      input.blur();
      input.value = 'Keybind already in use';
      return;
    }
    if (reservedKeys.includes(key)) {
      // reserved key
      clear(input);
      input.blur();
      input.value = 'Key is reserved';
      return;
    }

    const presets = getStorage('keybinds');
    const keybinds = (actions[command].global)
      ? presets['global']
      : presets[getStorage('usePreset')];

    if (!keybinds[command]) {
      keybinds[command] = [];
    }
    if (key !== '') {
      // set
      keybinds[command][slot] = {key, ctrl, alt, shift};
      input.blur();
    } else {
      // delete
      delete keybinds[command][slot];
      if (keybinds[command].every(val => val === null)) delete keybinds[command];
    }
    setStorage('keybinds', presets);
    renderSingleKeybind(input);
  }
  function keydownHandler(e) {
    e.preventDefault();
    e.stopPropagation();
    const input = e.target;

    if (e.code == 'Escape' || e.code == 'Backspace' || e.code == 'Delete') {
      clear(input);
      saveKeybind(input);
      return;
    }

    if (e.repeat || input.dataset.key !== '') {
      return;
    }

    if (e.which >= 16 && e.which <= 18) {
      input[modifierLookup(e.which)] = true;
      renderSingleKeybind(input);
      return;
    }

    input.dataset.key = e.code;
    saveKeybind(input);
  }
  function keyupHandler(e) {
    e.preventDefault();
    e.stopPropagation();
    const input = e.target;

    if (e.which >= 16 && e.which <= 18 && !e.repeat && input.dataset.key == '') {
      input[modifierLookup(e.which)] = false;
      renderSingleKeybind(input);
    }
  }
  const panelWrapper = document.createElement('template');
  panelWrapper.innerHTML = `
<div id="${SCRIPT_ID}--panel">
  <div class="${SCRIPT_ID}--header panelHeader">
    <select id="${SCRIPT_ID}--preset-selector">
      <option value="default">Default</option>
      <option value="preset_1">Preset 1</option>
      <option value="preset_2">Preset 2</option>
      <option value="preset_3">Preset 3</option>
    </select>
  </div>
  <div class="${SCRIPT_ID}--body">
    <span>Esc/Backspace/Del to clear setting</span>
    <div class="${SCRIPT_ID}--table">
      <span><b>Action</b></span>
      <span><b>Slot 1</b></span>
      <span><b>Slot 2</b></span>
      ${printRows()}
    </div>
  </div>
</div>
`;

  for (const input of $$('[data-command]', panelWrapper.content)) {
    // event handlers
    input.addEventListener('keydown', keydownHandler);
    input.addEventListener('keyup', keyupHandler);

    // define getter and setters
    for (const modifier of ['ctrl', 'alt', 'shift']) {
      Object.defineProperty(input, modifier, {
        set: function (val) {
          this.dataset[modifier] = val ? '1' : '0';
        },
        get: function () {
          return (this.dataset[modifier] == '1');
        }
      });
    }
  }

  // selector
  const selector = $(`#${SCRIPT_ID}--preset-selector`, panelWrapper.content);
  selector.value = getStorage('usePreset');
  selector.addEventListener('input', () => {
    setStorage('usePreset', selector.value);
    selector.blur();
    renderAllKeybinds();
  });

  renderAllKeybinds($(`.${SCRIPT_ID}--table`, panelWrapper.content));
  window.Options.add_tab(SCRIPT_ID, 'keyboard-o', 'Shortcuts')
    .content[0].appendChild(panelWrapper.content);
}

function keyHandler(e) {
  const command = matchKeybind(e.code, e.ctrlKey, e.altKey, e.shiftKey);
  const ownSettingsSelector = `.${SCRIPT_ID}--table input, #${SCRIPT_ID}--preset-selector`;
  let stopPropagation = false;
  let preventDefault = false;

  if (command) {
    stopPropagation = true;
    preventDefault = true;
  }

  // By default not to run on site inputs
  if (e.target.matches('input, textarea') || e.target.matches(ownSettingsSelector)) {
    stopPropagation = false;
    preventDefault = false;
  }

  if (command
    && (actions[command].constant || (e.type == 'keydown'))
    && (actions[command].repeat || !e.repeat)
    && (actions[command].input || !e.target.matches('input, textarea'))
    && !e.target.matches(ownSettingsSelector)) {

    const o = actions[command].fn(e) || {};
    if (o.hasOwnProperty('stopPropagation')) stopPropagation = o.stopPropagation;
    if (o.hasOwnProperty('preventDefault')) preventDefault = o.preventDefault;

  }

  if (stopPropagation) e.stopPropagation();
  if (preventDefault) e.preventDefault();
}

function initCSS() {
  if ($('style.generated-css')) {
    const styleElement = $('style.generated-css');
    styleElement.innerHTML += CSS;
  } else {
    const styleElement = document.createElement('style');
    styleElement.setAttribute('type', 'text/css');
    styleElement.id = `${SCRIPT_ID}_css`;
    styleElement.innerHTML = CSS;
    document.head.append(styleElement);
  }
}

function init() {
  // Initialize localStorage on first run
  if (localStorage.getItem(SCRIPT_ID) == null) localStorage.setItem(SCRIPT_ID, '{}');
  if (getStorage('keybinds') == null) setStorage('keybinds', {
    default: presets.default,
    preset_1: presets.preset_1,
    preset_2: presets.preset_2,
    preset_3: presets.preset_3,
    global: presets.global
  });
  if (getStorage('usePreset') == null) setStorage('usePreset', 'preset_1');

  initCSS();
  initSettings();

  // 'capture' is set to true so that the event is dispatched to handler
  // before the native ones, so that the site shortcuts can be disabled
  // by stopPropagation();
  document.addEventListener('keydown', keyHandler, {capture: true});
  document.addEventListener('keyup', keyHandler, {capture: true});

  // Disable highlight when navigating away from current page.
  // Workaround for Firefox preserving page state when moving forward
  // and back in history.
  window.addEventListener('pagehide', function () {
    unhighlight($(`.${SCRIPT_ID}--highlighted`));
  });
}

function onReady() {
  if (window.jQuery) {
    init();
  } else {
    window.setTimeout(onReady, 500);
  }
}

onReady();
})();

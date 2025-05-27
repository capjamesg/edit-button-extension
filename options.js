// Saves options to chrome.storage

const saveOptions = () => {
console.log("autosaving")
  const overrides = document.getElementById('tbody').querySelectorAll('tr');
  // make overrides from csv to json; map 0 to 1
  const overridesJson = {};
  overrides.forEach(row => {
    const url = row.querySelectorAll('input[type="text"]')[0].value;
    const editable = row.querySelectorAll('input[type="text"]')[1].value;
    overridesJson[url] = editable;
  });
  const naturalLanguageHeuristics = document.getElementById('natural-language-heuristics').checked;
  const openInNewTab = document.getElementById('open-in-new-tab').checked;
  const lookForViewSource = document.getElementById('look-for-view-source').checked;
  chrome.storage.sync.set(
    { overrides: overridesJson, naturalLanguageHeuristics: naturalLanguageHeuristics, openInNewTab: openInNewTab, lookForViewSource: lookForViewSource },
    () => {}
  );
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
  chrome.storage.sync.get(
    { overrides: {}, naturalLanguageHeuristics: false, openInNewTab: false, lookForViewSource: false },
    (items) => {
      // transform items.overrides to csv
      var csv = Object.keys(items.overrides).map(key => `${key},${items.overrides[key]}`).join('\n');
      document.getElementById('overrides').value = csv;
      document.getElementById('natural-language-heuristics').checked = items.naturalLanguageHeuristics;
      document.getElementById('open-in-new-tab').checked = items.openInNewTab || false;
      document.getElementById('look-for-view-source').checked = items.lookForViewSource || false;
    }
  );
};

const downloadOverrides = () => {
  // get from table list
  const overrides = document.getElementById('tbody').querySelectorAll('tr');
  const csv = overrides.map(row => row.querySelectorAll('input[type="text"]')[0].value + ',' + row.querySelectorAll('input[type="text"]')[1].value).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.getElementById('download');
  a.setAttribute('href', url);
  a.setAttribute('download', 'overrides.csv');
  a.click();
};

document.getElementById('download').addEventListener('click', downloadOverrides);

document.addEventListener('DOMContentLoaded', restoreOptions);

const addRow = () => {
  const table = document.getElementById('tbody');
  const row = table.insertRow();
  const cell1 = row.insertCell(0);
  const cell2 = row.insertCell(1);
  const cell3 = row.insertCell(2);
  // cell1: url input
  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.placeholder = 'Enter URL';
  cell1.appendChild(urlInput);
  // cell2: editable input
  const editableInput = document.createElement('input');
  editableInput.type = 'text';
  editableInput.placeholder = 'Enter editable text';
  cell2.appendChild(editableInput);
  // cell3: delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => {
    deleteRow(row);
    saveOptions(); // Save after deleting a row
  });
  cell3.appendChild(deleteBtn);
  
  // Add autosave listeners to the new inputs
  addAutosaveListeners(urlInput);
  addAutosaveListeners(editableInput);
  
  saveOptions(); // Save after adding a new row
};

document.getElementById('add-row').addEventListener('click', addRow);

const deleteRow = (row) => {
  const table = document.getElementById('tbody');
  if (table.rows.length > 1) {
    table.deleteRow(row.rowIndex);
  } else {
    // If it's the last row, clear inputs instead of deleting
    row.querySelectorAll('input[type="text"]').forEach(input => input.value = '');
  }
};
// Function to add autosave listeners to an input
const addAutosaveListeners = (input) => {
  // Remove any existing listeners to prevent duplicates
  input.removeEventListener('input', saveOptions);
  input.removeEventListener('change', saveOptions);
  input.removeEventListener('blur', saveOptions);
  
  // Add new listeners
  input.addEventListener('input', saveOptions);
  input.addEventListener('change', saveOptions);
  input.addEventListener('blur', saveOptions);
};
// populate rows from sync
const populateRows = () => {
  chrome.storage.sync.get(
    { overrides: {}, crossOriginState: "{}", naturalLanguageHeuristics: false, openInNewTab: false, lookForViewSource: false },
    (items) => {
      const table = document.getElementById('tbody');
      Object.keys(items.overrides).forEach(key => {
        if (key === "") {
          return;
        }
        
        // Create a new row
        const row = table.insertRow();
        const cell1 = row.insertCell(0);
        const cell2 = row.insertCell(1);
        const cell3 = row.insertCell(2);
        
        // cell1: url input
        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.value = key;
        cell1.appendChild(urlInput);

        // cell2: editable input
        const editableInput = document.createElement('input');
        editableInput.type = 'text';
        editableInput.value = items.overrides[key];
        cell2.appendChild(editableInput);

        // cell3: delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
          deleteRow(row);
          saveOptions(); // Save after deleting a row
        });
        cell3.appendChild(deleteBtn);
      });
      var crossOriginState = JSON.parse(items.crossOriginState);
      // approved-cross-origin-links
      // denied-cross-origin-links
      var approvedLinks = document.getElementById('approved-cross-origin-links');
      var deniedLinks = document.getElementById('denied-cross-origin-links');
      Object.keys(crossOriginState).forEach(domain => {
        const state = crossOriginState[domain];
        if (state.edit && state.edit.state === 'approved') {
          const li = document.createElement('li');
          li.textContent = `${domain} is editable by ${state.edit.url} `; 
          const link = document.createElement('a');
          link.href = state.edit.url;
          link.textContent = `[Revoke]`;
          link.target = '_blank';
          link.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.runtime.sendMessage({ revokeCrossOriginRequest: true, domain: domain });
            console.log(`Revoke request sent for ${domain}`);
          });
          li.appendChild(link);
          approvedLinks.appendChild(li);
        } else if (state.edit && state.edit.state === 'denied') {
          const li = document.createElement('li');
          li.textContent = `${domain} is not editable by ${state.edit.url} `; 
          const link = document.createElement('a');
          link.href = state.edit.url;
          link.textContent = `[Revoke]`;
          link.target = '_blank';
          link.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.runtime.sendMessage({ revokeCrossOriginRequest: true, domain: domain });
            console.log(`Revoke request sent for ${domain}`);
          });
          li.appendChild(link);
          deniedLinks.appendChild(li);
        }
      });

      var naturalLanguageHeuristicsCheckbox = document.getElementById('natural-language-heuristics');
      naturalLanguageHeuristicsCheckbox.checked = items.naturalLanguageHeuristics || false;
      var openInNewTabCheckbox = document.getElementById('open-in-new-tab');
      openInNewTabCheckbox.checked = items.openInNewTab || false;
      var lookForViewSourceCheckbox = document.getElementById('look-for-view-source');
      lookForViewSourceCheckbox.checked = items.lookForViewSource || false;
      // Add autosave listeners to all inputs in the table
      addAutosaveListeners(naturalLanguageHeuristicsCheckbox);
      addAutosaveListeners(openInNewTabCheckbox);
      addAutosaveListeners(lookForViewSourceCheckbox);

    }
  );
};

document.addEventListener('DOMContentLoaded', populateRows);
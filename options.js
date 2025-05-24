// Saves options to chrome.storage

const saveOptions = () => {
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
    chrome.storage.sync.set(
      { overrides: overridesJson, naturalLanguageHeuristics: naturalLanguageHeuristics, openInNewTab: openInNewTab },
      () => {}
    );
  };
  
  // Restores select box and checkbox state using the preferences
  // stored in chrome.storage.
  const restoreOptions = () => {
    chrome.storage.sync.get(
      { overrides: "", naturalLanguageHeuristics: false, openInNewTab: false },
      (items) => {
        // transform items.overrides to csv
        var csv = Object.keys(items.overrides).map(key => `${key},${items.overrides[key]}`).join('\n');
        document.getElementById('overrides').value = csv;
        document.getElementById('natural-language-heuristics').checked = items.naturalLanguageHeuristics;
        document.getElementById('open-in-new-tab').checked = items.openInNewTab || false;
      }
    );
  };

  const downloadOverrides = () => {
    // get from table list
    const overrides = document.getElementById('tbody').querySelectorAll('tr');
    console.log(overrides);
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
    const table = document.getElementById('overrides');
    const row = table.insertRow();
    const cell1 = row.insertCell(0);
    const cell2 = row.insertCell(1);
    const cell3 = row.insertCell(2);
    cell1.innerHTML = '<input type="text" id="url" />';
    cell2.innerHTML = '<input type="text" id="editable" />';
    cell3.innerHTML = '<button type="button" id="delete">Delete</button>';
    cell3.addEventListener('click', () => {
      deleteRow(row);
      saveOptions(); // Save after deleting a row
    });
    saveOptions(); // Save after adding a new row
  };

  document.getElementById('add-row').addEventListener('click', addRow);

  const deleteRow = (row) => {
    const table = document.getElementById('overrides');
    table.deleteRow(row.rowIndex);
  };

  // Setup autosave for inputs
  const setupAutosave = () => {
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

    // Add listeners to all existing inputs
    document.querySelectorAll('input').forEach(addAutosaveListeners);

    // Watch for new rows being added
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          // If a new row was added, add listeners to its inputs
          if (node.nodeName === 'TR') {
            node.querySelectorAll('input').forEach(addAutosaveListeners);
          }
        });
      });
    });

    // Start observing the tbody for added rows
    const tbody = document.getElementById('tbody');
    observer.observe(tbody, { childList: true });
  };

  // populate rows from sync
  const populateRows = () => {
    chrome.storage.sync.get(
      { overrides: "" },
      (items) => {
        const table = document.getElementById('tbody');
        Object.keys(items.overrides).forEach(key => {
          // if url blank, skip
          if (key === "") {
            return;
          }
          const row = table.insertRow();
          const cell1 = row.insertCell(0);
          const cell2 = row.insertCell(1);
          const cell3 = row.insertCell(2);
          cell1.innerHTML = "<input type='text' value='" + key + "' />";
          cell2.innerHTML = "<input type='text' value='" + items.overrides[key] + "' />";
          cell3.innerHTML = '<button type="button" id="delete">Delete</button>';
          cell3.addEventListener('click', () => {
            deleteRow(row);
            saveOptions(); // Save after deleting a row
          });
        });

        // Setup autosave after populating initial rows
        setupAutosave();
      }
    );
  };

  document.addEventListener('DOMContentLoaded', populateRows);

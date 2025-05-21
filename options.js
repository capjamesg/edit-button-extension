// Saves options to chrome.storage

const saveOptions = () => {
    const overrides = document.getElementById('overrides').value;
    // make overrides from csv to json; map 0 to 1
    const overridesJson = {};
    overrides.split('\n').forEach(o => {
        const [key, value] = o.trim().split(',');
        overridesJson[key] = value;
        console.log("overridesJson", overridesJson);
    });
    const naturalLanguageHeuristics = document.getElementById('natural-language-heuristics').checked;
    chrome.storage.sync.set(
      { overrides: overridesJson, naturalLanguageHeuristics: naturalLanguageHeuristics },
      () => {
        // save 
        // Update status to let user know options were saved.
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
          status.textContent = '';
        }, 2000);
      }
    );
  };
  
  // Restores select box and checkbox state using the preferences
  // stored in chrome.storage.
  const restoreOptions = () => {
    chrome.storage.sync.get(
      { overrides: "" },
      (items) => {
        // transform items.overrides to csv
        var csv = Object.keys(items.overrides).map(key => `${key},${items.overrides[key]}`).join('\n');
        document.getElementById('overrides').value = csv;
        document.getElementById('natural-language-heuristics').checked = items.naturalLanguageHeuristics;
      }
    );
  };
  
  document.addEventListener('DOMContentLoaded', restoreOptions);
  document.getElementById('save').addEventListener('click', saveOptions);
  
document.addEventListener('DOMContentLoaded', async () => {
    // Ensure these elements exist in your HTML
    const addActionBtn = document.getElementById('addAction');
    const filterInput = document.getElementById('filterInput');
    const sortButton = document.getElementById('sortButton');
    const sortSelect = document.getElementById('sortSelect');
    const sortIcon = document.getElementById('sortIcon');

    // Check if elements are found before adding event listeners
    if (addActionBtn && filterInput && sortButton && sortSelect && sortIcon) {
        let actions = [];
        let isAscending = true; // Default sorting order is ascending
        let sortBy = 'name'; // Default sort field is 'name'

        // Load actions from the file system on startup
        await loadActionsFromFile();

        // Add action to the list
        addActionBtn.addEventListener('click', () => {
            const jsonInput = document.getElementById('jsonInput').value;

            try {
                const actionData = JSON.parse(jsonInput);

                // Extract necessary data, ensure we handle undefined or missing properties safely
                const actionName = actionData?.data?.name || 'Unnamed Action';
                const actionDescription = actionData?.data?.description || 'No Description Provided';
                const transitionMode = actionData?.data?.transitionMode || 'No Transition Mode';
                const transitions = actionData?.data?.next || [];
                const pack = actionData?.data?.action?.pack?.name || 'Unknown Pack';

                // Safely handle transitions and publish arrays
                const parsedTransitions = transitions.map((transition) => {
                    return {
                        when: transition?.when || 'Unknown',
                        publish: Array.isArray(transition?.publish)
                            ? transition.publish.map(pub => `${pub.key}: ${pub.value}`)
                            : [] // Safely handle empty or missing publish arrays
                    };
                });

                actions.push({
                    name: actionName,
                    alias: '',  // Alias (nickname) will be stored here
                    description: actionDescription,
                    transitionMode: transitionMode,
                    transitions: parsedTransitions,
                    pack: pack,
                    json: jsonInput // Store the raw JSON for future reference
                });

                // Save updated actions to file
                saveActionsToFile();

                document.getElementById('jsonInput').value = '';
                renderActions();
            } catch (e) {
                alert('Invalid JSON. Please check your input.');
            }
        });

        // Filter actions (Search bar functionality)
        filterInput.addEventListener('input', () => {
            renderActions(); // Re-render actions on search input change
        });

        // Toggle sort direction when the "Sort by" button is clicked
        sortButton.addEventListener('click', () => {
            isAscending = !isAscending;
            sortIcon.textContent = isAscending ? '⬆️' : '⬇️';  // Toggle between up/down arrow
            renderActions();
        });

        // Sort select dropdown change (Sort by field change)
        sortSelect.addEventListener('change', (e) => {
            sortBy = e.target.value; // Update the sortBy field based on dropdown selection
            renderActions();
        });

        // Render actions as square icons
        function renderActions() {
            const actionsList = document.getElementById('actionsList');
            actionsList.innerHTML = ''; // Clear the existing list

            const filterText = filterInput.value.toLowerCase(); // Search text from input

            // Sort actions based on user selection
            actions.sort((a, b) => {
                const fieldA = (a[sortBy] || '').toLowerCase(); // Use the selected field to sort
                const fieldB = (b[sortBy] || '').toLowerCase();
                return isAscending ? fieldA.localeCompare(fieldB) : fieldB.localeCompare(fieldA); // Ascending or descending
            });

            actions.forEach((action, index) => {
                // Ensure default values for alias, name, and description
                const alias = action.alias || '';
                const name = action.name || 'Unnamed Action';
                const description = action.description || 'No Description Provided';

                // Search across all fields, including the alias
                const matchText = [
                    alias.toLowerCase(),  // Include alias in search
                    name.toLowerCase(),
                    description.toLowerCase(),
                    action.transitionMode.toLowerCase(),
                    ...action.transitions.map(t => t.when.toLowerCase()),
                    ...action.transitions.flatMap(t => t.publish.map(p => p.toLowerCase())),
                    action.pack.toLowerCase()
                ].join(' ');

                // Filter actions based on search input
                if (matchText.includes(filterText)) {
                    const actionItem = document.createElement('div');
                    actionItem.classList.add('action-item');

                    // Use alias if it exists, otherwise show the name
                    const displayName = alias || name;

                    // Copy icon next to the title
                    const actionTitle = document.createElement('div');
                    actionTitle.classList.add('action-name');
                    actionTitle.innerHTML = `
                        ${displayName}
                        <button class="copy-icon" title="Copy JSON">
                            <img src="copy-icon.png" alt="Copy">
                        </button>
                    `;

                    // Trigger copy when copy icon next to title is clicked
                    const copyIcon = actionTitle.querySelector('.copy-icon');
                    copyIcon.addEventListener('click', (e) => {
                        e.stopPropagation();  // Prevent expanding the action
                        window.electron.send('copy-action', action.json);  // Trigger copy to clipboard
                    });

                    const actionDetails = document.createElement('div');
                    actionDetails.classList.add('action-details');
                    actionDetails.innerHTML = `
                        <p><strong>Alias:</strong> ${alias || 'No Alias Set'}</p>
                        <p><strong>Original Name:</strong> ${name}</p>
                        <p><strong>Description:</strong> ${description}</p>
                        <p><strong>Transition Mode:</strong> ${action.transitionMode}</p>
                        <p><strong>Transitions:</strong></p>
                        ${action.transitions.length > 0
                            ? action.transitions.map((t) => {
                                const publishItems = t.publish.length > 0
                                    ? t.publish.map(p => `• ${p}`).join('<br>')
                                    : 'No Data Aliases';
                                return `<p><strong>Condition:</strong> ${t.when}</p>
                                        <p><strong>Publish:</strong> ${publishItems}</p>`;
                            }).join('')
                            : 'No Transitions Available'
                        }
                        <p><strong>Pack:</strong> ${action.pack}</p>
                    `;

                    // Add Alias button and input field
                    const aliasButton = document.createElement('button');
                    aliasButton.classList.add('alias-button');
                    aliasButton.textContent = alias ? 'Edit Alias' : 'Add Alias';

                    // Alias input field (initially hidden)
                    const aliasInput = document.createElement('input');
                    aliasInput.type = 'text';
                    aliasInput.placeholder = 'Enter alias';
                    aliasInput.value = alias || '';
                    aliasInput.style.display = 'none';  // Hide input by default

                    // Save Alias button (only shown when editing alias)
                    const saveAliasButton = document.createElement('button');
                    saveAliasButton.textContent = 'Save Alias';
                    saveAliasButton.style.display = 'none';  // Hide save button by default

                    // Prevent collapsing when clicking on alias input or save button
                    aliasInput.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });
                    saveAliasButton.addEventListener('click', (e) => {
                        e.stopPropagation();  // Prevent collapsing
                        const newAlias = aliasInput.value.trim();
                        if (newAlias !== '') {
                            action.alias = newAlias;  // Set the new alias
                            saveActionsToFile();  // Save the updated alias
                            renderActions();  // Re-render the actions
                        }
                    });

                    aliasButton.addEventListener('click', (e) => {
                        e.stopPropagation();  // Prevent closing the action details
                        aliasInput.style.display = 'block';  // Show the input field
                        saveAliasButton.style.display = 'block';  // Show the save button
                        aliasButton.style.display = 'none';  // Hide the alias button during edit
                    });

                    actionDetails.appendChild(aliasButton);
                    actionDetails.appendChild(aliasInput);  // Add input field to the details
                    actionDetails.appendChild(saveAliasButton);  // Add save button to the details

                    // Floating Copy button in the expanded view
                    const floatingCopyButton = document.createElement('button');
                    floatingCopyButton.classList.add('floating-copy-button');
                    floatingCopyButton.textContent = 'Copy';
                    floatingCopyButton.addEventListener('click', (e) => {
                        e.stopPropagation();  // Prevent closing the action details
                        window.electron.send('copy-action', action.json);  // Trigger copy to clipboard
                    });

                    actionDetails.appendChild(floatingCopyButton);

                    // Delete button (small trash can icon)
                    const deleteButton = document.createElement('button');
                    deleteButton.classList.add('trash-icon');
                    deleteButton.innerHTML = `<img src="trash-icon.png" alt="Delete">`;
                    deleteButton.addEventListener('click', (e) => {
                        e.stopPropagation();  // Prevent closing the action details
                        deleteAction(index);
                    });

                    actionDetails.appendChild(deleteButton);

                    // Toggle expand on click (Expand width and height)
                    actionItem.addEventListener('click', () => {
                        const isExpanded = actionItem.classList.contains('expanded');
                        collapseAllItems();  // Collapse all other items
                        actionItem.classList.toggle('expanded', !isExpanded);  // Expand only this one
                        actionDetails.style.display = isExpanded ? 'none' : 'block';
                    });

                    actionItem.appendChild(actionTitle);
                    actionItem.appendChild(actionDetails);
                    actionsList.appendChild(actionItem);

                    // Add context menu for right-click copy
                    actionItem.addEventListener('contextmenu', (e) => {
                        e.preventDefault();  // Prevent default context menu
                        const confirmed = confirm('Do you want to copy the JSON?');
                        if (confirmed) {
                            window.electron.send('copy-action', action.json);  // Trigger copy to clipboard
                        }
                    });
                }
            });
        }

        // Collapse all other items when expanding a new one
        function collapseAllItems() {
            const actionItems = document.querySelectorAll('.action-item');
            actionItems.forEach(item => {
                item.classList.remove('expanded');
                const details = item.querySelector('.action-details');
                if (details) {
                    details.style.display = 'none';
                }
            });
        }

        // Delete action
        function deleteAction(index) {
            actions.splice(index, 1);
            saveActionsToFile();
            renderActions();
        }

        // Save actions to the file system
        function saveActionsToFile() {
            window.electron.send('save-actions', actions);

            window.electron.on('save-actions-result', (result) => {
                if (result.success) {
                    console.log('Actions saved successfully');
                } else {
                    console.error('Failed to save actions:', result.error);
                }
            });
        }

        // Load actions from the file system
        async function loadActionsFromFile() {
            try {
                const loadedActions = await window.electron.invoke('load-actions');
                actions = Array.isArray(loadedActions) ? loadedActions : [];
                renderActions();
            } catch (e) {
                console.error('Failed to load actions:', e);
                actions = [];
            }
        }

        // Listen for action copied confirmation
        window.electron.on('action-copied', (message) => {
            alert(message);
        });
    } else {
        console.error("One or more required elements were not found in the DOM.");
    }
});

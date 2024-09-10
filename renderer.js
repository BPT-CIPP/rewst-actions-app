document.addEventListener('DOMContentLoaded', async () => {
    let actions = [];
    let isAscending = true;
    let sortBy = 'name';
    let editMode = false; // Initially, edit mode is off

    // Load light/dark mode preference from localStorage
    const currentMode = localStorage.getItem('theme');
    if (currentMode === 'light') {
        document.body.classList.add('light-mode');
        document.getElementById('modeToggle').textContent = 'Toggle Dark Mode';
    }

    // Handle light/dark mode toggle
    document.getElementById('modeToggle').addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const mode = document.body.classList.contains('light-mode') ? 'light' : 'dark';
        localStorage.setItem('theme', mode);
        document.getElementById('modeToggle').textContent = mode === 'light' ? 'Toggle Dark Mode' : 'Toggle Light Mode';
    });

    // Load actions from the file system on startup
    await loadActionsFromFile();

    // Add action to the list
    document.getElementById('addAction').addEventListener('click', () => {
        const jsonInput = document.getElementById('jsonInput').value;
        try {
            const actionData = JSON.parse(jsonInput);
            const actionName = actionData?.data?.name || 'Unnamed Action';
            const actionDescription = actionData?.data?.description || 'No Description Provided';
            const transitionMode = actionData?.data?.transitionMode || 'No Transition Mode';
            const transitions = actionData?.data?.next || [];
            const pack = actionData?.data?.action?.pack?.name || 'Unknown Pack';

            actions.push({
                name: actionName,
                alias: '', 
                description: actionDescription,
                transitionMode: transitionMode,
                transitions: transitions.map(t => ({
                    when: t.when || 'Unknown',
                    publish: t.publish.map(p => `${p.key}: ${p.value}`)
                })),
                pack: pack,
                json: jsonInput 
            });

            saveActionsToFile();
            renderActions();
        } catch (e) {
            alert('Invalid JSON. Please check your input.');
        }
    });

    // Search functionality
    const filterInput = document.getElementById('filterInput');
    filterInput.addEventListener('input', () => {
        const query = filterInput.value.toLowerCase();
        const filteredActions = actions.filter(action => {
            const searchFields = [
                action.name || '',
                action.description || '',
                action.pack || '',
                action.alias || ''
            ];
            return searchFields.some(field => field.toLowerCase().includes(query));
        });
        renderActions(filteredActions); // Render only the filtered results
    });

    // Toggle Edit Mode to enable/disable drag-and-drop
    const editModeToggle = document.getElementById('editModeToggle');
    editModeToggle.addEventListener('click', () => {
        editMode = !editMode;
        if (editMode) {
            editModeToggle.textContent = 'Disable Edit Mode';
            editModeToggle.classList.add('active');
            $('#actionsList').sortable('enable'); // Enable dragging
        } else {
            editModeToggle.textContent = 'Enable Edit Mode';
            editModeToggle.classList.remove('active');
            $('#actionsList').sortable('disable'); // Disable dragging
        }
    });

    // Initially, disable dragging
    $('#actionsList').sortable({ disabled: true });

    // Handle sorting
    const sortSelect = document.getElementById('sortSelect');
    const sortButton = document.getElementById('sortButton');

    sortSelect.addEventListener('change', handleSortChange);
    sortButton.addEventListener('click', () => {
        isAscending = !isAscending;
        handleSortChange();
    });

    function handleSortChange() {
        sortBy = sortSelect.value;
        if (sortBy === 'manual') {
            // Enable drag-and-drop, disable sorting
            editModeToggle.style.display = 'inline';
            $('#actionsList').sortable('enable');
        } else {
            // Hide the Edit Mode button, disable drag-and-drop, and sort items
            editModeToggle.style.display = 'none';
            $('#actionsList').sortable('disable');
            sortActions();
        }
    }

    function sortActions() {
        if (sortBy === 'manual') return; // Manual sorting is enabled, don't sort

        actions.sort((a, b) => {
            const fieldA = a[sortBy]?.toLowerCase() || '';
            const fieldB = b[sortBy]?.toLowerCase() || '';

            if (isAscending) {
                return fieldA.localeCompare(fieldB);
            } else {
                return fieldB.localeCompare(fieldA);
            }
        });

        renderActions();
    }

    // Render actions and set up click-to-expand functionality with animation
    function renderActions(filteredActions = actions) {
        const actionsList = document.getElementById('actionsList');
        if (!actionsList) {
            console.error('Actions list element not found');
            return;
        }
        actionsList.innerHTML = ''; 

        filteredActions.forEach((action, index) => {
            const actionItem = document.createElement('div');
            actionItem.classList.add('action-item');
            
            // Use alias if available, otherwise show the name
            const actionDisplayName = action.alias ? action.alias : action.name;
            const actionDescription = action.description || 'No description available';
            const actionTransitionMode = action.transitionMode || 'No transition mode';
            const actionPack = action.pack || 'No pack available';

            // Build transition list
            const transitionDetails = action.transitions.map(transition => {
                const publishDetails = transition.publish.length > 0
                    ? transition.publish.map(pub => `<span>CTX.${pub}</span>`).join(', ')
                    : 'No Data Aliases';

                return `
                    <li>
                        <div><strong>Publish:</strong> ${publishDetails}</div>
                    </li>`;
            }).join('');

            // Alias, delete, and copy buttons
            const aliasButton = `<button class="alias-button">Add Alias</button>`;
            const deleteButton = `<button class="delete-button">🗑️</button>`;
            const copyButton = `<button class="copy-button">Copy JSON</button>`;
            const floatingCopyIcon = `<div class="floating-copy-icon" style="display:none;">📋</div>`;

            // Alias input field
            const aliasInput = action.alias 
                ? `<input type="text" class="alias-input" value="${action.alias}" style="display:none;">` 
                : `<input type="text" class="alias-input" placeholder="Type alias..." style="display:none;">`;

            actionItem.innerHTML = `
                <div class="action-name">${actionDisplayName}</div>
                <div class="action-details">
                    <p><strong>Description:</strong> ${actionDescription}</p>
                    <p><strong>Transition Mode:</strong> ${actionTransitionMode}</p>
                    <p><strong>Pack:</strong> ${actionPack}</p>
                    <div><strong>Transitions:</strong></div>
                    <ul>${transitionDetails}</ul>
                    ${aliasButton}
                    ${aliasInput}
                    ${copyButton}
                    ${deleteButton}
                    ${floatingCopyIcon}
                </div>`;

            // Handle expand/collapse on click (ignore alias button and inputs)
            actionItem.addEventListener('click', (event) => {
                if (!event.target.classList.contains('alias-button') && event.target.tagName !== 'INPUT') {
                    const isExpanded = actionItem.classList.contains('expanded');
                    collapseAllItems();  // Collapse all other items
                    actionItem.classList.toggle('expanded', !isExpanded);  // Expand only this one

                    // Add smooth transition for expansion
                    if (!isExpanded) {
                        actionItem.style.height = actionItem.scrollHeight + "px";
                    } else {
                        actionItem.style.height = "200px"; // Collapsed height
                    }
                }
            });

            // Handle adding an alias (prevent action from closing when editing alias)
            actionItem.querySelector('.alias-button').addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent closing the item
                const aliasInputField = actionItem.querySelector('.alias-input');
                aliasInputField.style.display = 'inline'; // Show the input field for typing
                aliasInputField.focus();

                // Save alias on Enter key press
                aliasInputField.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        action.alias = aliasInputField.value;
                        saveActionsToFile();
                        renderActions();  // Re-render to show updated alias
                    }
                });
            });

            // Handle deleting an action
            actionItem.querySelector('.delete-button').addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent collapsing
                actions.splice(index, 1);
                saveActionsToFile();
                renderActions();
            });

            // Handle copying action JSON to clipboard via button
            actionItem.querySelector('.copy-button').addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent collapsing
                navigator.clipboard.writeText(action.json).then(() => {
                    alert("Action JSON copied to clipboard!");
                });
            });

            // Handle right-click for copy functionality
            actionItem.addEventListener('contextmenu', (event) => {
                event.preventDefault(); // Prevent context menu
                navigator.clipboard.writeText(action.json).then(() => {
                    alert("Action JSON copied to clipboard via right-click!");
                });
            });

            // Show floating copy icon on hover (only when expanded)
            actionItem.addEventListener('mouseover', () => {
                const copyIcon = actionItem.querySelector('.floating-copy-icon');
                if (actionItem.classList.contains('expanded')) {
                    copyIcon.style.display = 'block';
                }
            });

            actionItem.addEventListener('mouseout', () => {
                const copyIcon = actionItem.querySelector('.floating-copy-icon');
                copyIcon.style.display = 'none';
            });

            // Handle copying via the floating copy icon
            actionItem.querySelector('.floating-copy-icon').addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent collapsing
                navigator.clipboard.writeText(action.json).then(() => {
                    alert("Action JSON copied using the floating icon!");
                });
            });

            actionsList.appendChild(actionItem);
        });
    }

    // Collapse all action items
    function collapseAllItems() {
        const actionItems = document.querySelectorAll('.action-item');
        actionItems.forEach(item => {
            item.classList.remove('expanded');
            item.style.height = "200px"; // Reset to collapsed height
        });
    }

    // Load actions from file (real implementation)
    async function loadActionsFromFile() {
        try {
            const loadedActions = await window.electron.invoke('load-actions');
            actions = Array.isArray(loadedActions) ? loadedActions : [];
            renderActions();
        } catch (error) {
            console.error('Failed to load actions:', error);
            actions = [];
        }
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
});

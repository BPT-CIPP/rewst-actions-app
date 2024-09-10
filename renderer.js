document.addEventListener('DOMContentLoaded', async () => {
    let actions = [];
    let isAscending = true;
    let sortBy = 'name';
    let editMode = false; // Initially, edit mode is off

    // Ensure themeSwitch is defined after loading the JS file
    if (typeof themeSwitch === 'function') {
        themeSwitch({
            selector: '#theme-switch', // Attach it to the bottom-left div
            savedTheme: true,          // Remember the user's preference
            storageKey: 'theme',       // Store the theme preference in localStorage
            darkModeClass: 'light-mode', // Use your 'light-mode' class
        });
    } else {
        console.error('themeSwitch is not defined');
    };

    // Listen for paste event to capture input globally
    document.addEventListener('paste', (event) => {
        const pastedText = (event.clipboardData || window.clipboardData).getData('text');
        handleActionInput(pastedText);
    });

    // Add action when clicking the "+" button
    document.getElementById('addAction').addEventListener('click', () => {
        const jsonInput = document.getElementById('jsonInput').value;
        handleActionInput(jsonInput);
    });

    // Function to handle adding new actions
    function handleActionInput(input) {
        try {
            const actionData = JSON.parse(input);

            const isDuplicate = actions.some((action) => action.json === input);
            if (isDuplicate) {
                const duplicate = actions.find((action) => action.json === input);
                const nameOrAlias = duplicate.alias || duplicate.name;
                alert(`Duplicate action detected! Check existing action: ${nameOrAlias}`);
                return;
            }

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
                json: input
            });

            saveActionsToFile();
            renderActions();
        } catch (e) {
            alert('Invalid JSON. Please check your input.');
        }
    }

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

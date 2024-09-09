document.addEventListener('DOMContentLoaded', async () => {
    let actions = [];

    // Load actions from the file system on startup
    await loadActionsFromFile();

    // Add action to the list
    document.getElementById('addAction').addEventListener('click', () => {
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

    // Filter actions
    document.getElementById('filterInput').addEventListener('input', () => {
        renderActions();
    });

    // Sort actions by name
    document.getElementById('sortByName').addEventListener('click', () => {
        actions.sort((a, b) => a.name.localeCompare(b.name));
        renderActions();
    });

    // Render actions as an accordion
    function renderActions() {
        const actionsList = document.getElementById('actionsList');
        actionsList.innerHTML = '';

        const filterText = document.getElementById('filterInput').value.toLowerCase();

        actions.forEach((action, index) => {
            if (action.name.toLowerCase().includes(filterText) || action.description.toLowerCase().includes(filterText)) {
                const accordionItem = document.createElement('div');
                accordionItem.classList.add('accordion-item');

                const accordionHeader = document.createElement('div');
                accordionHeader.classList.add('accordion-header');

                const actionTitle = document.createElement('h3');
                actionTitle.textContent = action.name;

                const copyButton = document.createElement('button');
                copyButton.textContent = 'Copy';
                copyButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.electron.send('copy-action', action.json);
                });

                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteAction(index);
                });

                accordionHeader.appendChild(actionTitle);
                accordionHeader.appendChild(copyButton);
                accordionHeader.appendChild(deleteButton);

                const accordionContent = document.createElement('div');
                accordionContent.classList.add('accordion-content');

                // Format the parsed transitions and display details, safely handling empty transitions
                const transitionsDisplay = action.transitions.length
                    ? action.transitions.map(t => `
                        When: ${t.when}
                            Publish:
                            ${t.publish.map(p => `• ${p}`).join('\n')}
                    `).join('\n')
                    : 'No Transitions Available';

                accordionContent.innerHTML = `
                    <p><strong>Description:</strong> ${action.description}</p>
                    <p><strong>Transition Mode:</strong> ${action.transitionMode}</p>
                    <p><strong>Transitions:</strong></p>
                    <pre>${transitionsDisplay}</pre>
                    <p><strong>Pack:</strong> ${action.pack}</p>
                `;

                accordionItem.appendChild(accordionHeader);
                accordionItem.appendChild(accordionContent);

                accordionHeader.addEventListener('click', () => {
                    accordionContent.style.display = accordionContent.style.display === 'block' ? 'none' : 'block';
                });

                actionsList.appendChild(accordionItem);
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
            // Ensure loadedActions is an array
            actions = Array.isArray(loadedActions) ? loadedActions : [];
            renderActions();
        } catch (e) {
            console.error('Failed to load actions:', e);
            actions = []; // Reset to an empty array in case of failure
        }
    }

    // Listen for action copied confirmation
    window.electron.on('action-copied', (message) => {
        alert(message);
    });
});

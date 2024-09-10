document.addEventListener('DOMContentLoaded', async () => {
    let actions = [];

    // Load logo dynamically
    const logoImg = document.getElementById('logo');
    const logoPath = 'logo.png'; // Path to your logo file
    logoImg.src = logoPath;

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

    // Sort actions by description
    document.getElementById('sortByDescription').addEventListener('click', () => {
        actions.sort((a, b) => a.description.localeCompare(b.description));
        renderActions();
    });

    // Sort actions by transition mode
    document.getElementById('sortByTransitionMode').addEventListener('click', () => {
        actions.sort((a, b) => a.transitionMode.localeCompare(b.transitionMode));
        renderActions();
    });

    // Sort actions by pack
    document.getElementById('sortByPack').addEventListener('click', () => {
        actions.sort((a, b) => a.pack.localeCompare(b.pack));
        renderActions();
    });

    // Render actions as an accordion
    function renderActions() {
        const actionsList = document.getElementById('actionsList');
        actionsList.innerHTML = '';

        const filterText = document.getElementById('filterInput').value.toLowerCase();

        actions.forEach((action, index) => {
            // Expanded search to include all relevant fields
            const matchText = [
                action.name.toLowerCase(),
                action.description.toLowerCase(),
                action.transitionMode.toLowerCase(),
                ...action.transitions.map(t => t.when.toLowerCase()),
                ...action.transitions.flatMap(t => t.publish.map(p => p.toLowerCase())),
                action.pack.toLowerCase()
            ].join(' ');

            // If the action matches any of the fields
            if (matchText.includes(filterText)) {
                const accordionItem = document.createElement('div');
                accordionItem.classList.add('accordion-item');

                const accordionHeader = document.createElement('div');
                accordionHeader.classList.add('accordion-header');

                const actionTitle = document.createElement('h3');
                actionTitle.textContent = action.name;

                const copyButton = document.createElement('button');
                copyButton.textContent = 'Copy';
                copyButton.classList.add('copyButton');
                copyButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.electron.send('copy-action', action.json);
                });

                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.classList.add('deleteButton');
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
                    ? action.transitions.map((t, i) => {
                        const whenAccordionItem = document.createElement('div');
                        whenAccordionItem.classList.add('accordion-item');

                        const whenAccordionHeader = document.createElement('div');
                        whenAccordionHeader.classList.add('accordion-header');
                        whenAccordionHeader.textContent = `${t.when}`;  // Just show the condition, without "When:"

                        const whenAccordionContent = document.createElement('div');
                        whenAccordionContent.classList.add('accordion-content');
                        whenAccordionContent.style.display = 'none'; // Initially collapsed

                        // If no publish items, show a placeholder "No Data Aliases"
                        const publishContent = t.publish.length > 0
                            ? `<pre>${t.publish.map(p => `• ${p}`).join('\n')}</pre>`
                            : `<p>No Data Aliases</p>`;

                        whenAccordionContent.innerHTML = `
                            <p><strong>Publish:</strong></p>
                            ${publishContent}
                        `;

                        whenAccordionItem.appendChild(whenAccordionHeader);
                        whenAccordionItem.appendChild(whenAccordionContent);

                        return whenAccordionItem;
                    })
                    : 'No Transitions Available';

                accordionContent.innerHTML = `
                    <p><strong>Description:</strong> ${action.description}</p>
                    <p><strong>Transition Mode:</strong> ${action.transitionMode}</p>
                    <p><strong>Transitions:</strong></p>
                `;

                // Append all nested 'When' accordion items
                if (Array.isArray(transitionsDisplay)) {
                    transitionsDisplay.forEach(item => accordionContent.appendChild(item));
                } else {
                    accordionContent.innerHTML += `<p>${transitionsDisplay}</p>`;
                }

                accordionContent.innerHTML += `<p><strong>Pack:</strong> ${action.pack}</p>`;

                accordionItem.appendChild(accordionHeader);
                accordionItem.appendChild(accordionContent);

                // Add event listener to the main action accordion
                accordionHeader.onclick = () => {
                    accordionContent.style.display = accordionContent.style.display === 'block' ? 'none' : 'block';
                };

                actionsList.appendChild(accordionItem);
            }
        });

        // Attach click events to all dynamically created "When" headers
        attachWhenAccordionEvents();
    }

    // Function to attach click events to all "When" accordion headers
    function attachWhenAccordionEvents() {
        const whenAccordionHeaders = document.querySelectorAll('.accordion-header');

        whenAccordionHeaders.forEach(header => {
            if (!header.textContent.includes('Copy') && !header.textContent.includes('Delete')) {  // Exclude main headers
                header.onclick = function() {
                    const content = this.nextElementSibling;
                    if (content.style.display === 'block') {
                        content.style.display = 'none';
                    } else {
                        content.style.display = 'block';
                    }
                    console.log('When accordion clicked'); // Debug log
                };
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


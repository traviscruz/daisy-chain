// Network state management
const NetworkState = {
    nodes: {},              // Stores all network nodes with their visual elements and states
    connections: [],        // Array of connection elements between nodes
    nodeCount: 0,          // Tracks total number of nodes in the network
    messagesSent: 0,       // Counter for successful message transmissions
    messagesFailed: 0,     // Counter for failed message transmissions
    currentSpeed: 1,       // Network speed multiplier (1x to 5x)
    removedNodes: new Set(), // Set of node IDs that have been removed but can be recovered
    maxNodeId: 0,          // Highest node ID ever created (for consistent node numbering)
    messageQueue: [],      // Array of pending messages waiting for token
    nodeIPs: {},           // Store IP addresses for each node
    isSimulationRunning: false,  // Flag to track if simulation is running
    transferInProgress: false    // Flag to track if a message transfer is currently in progress
};

// Token Passing Protocol State
const TokenState = {
    isActive: false,       // Flag indicating if token passing is currently running
    currentNode: null,     // ID of the node currently holding the token
    timer: null,          // Reference to the token passing interval timer
    interval: 3000,       // Time in milliseconds between token passes (3 seconds)
    direction: 1,         // Token direction: 1 for forward, -1 for backward
};

// DOM Elements
const DOM = {
    status: document.getElementById('status'),
    network: document.getElementById('network'),
    sourceNode: document.getElementById('sourceNode'),
    destinationNode: document.getElementById('destinationNode'),
    speedSlider: document.getElementById('speedSlider'),
    speedValue: document.getElementById('speedValue'),
    messageHistory: document.getElementById('messageHistory'),
    queueList: document.getElementById('queueList'),
    sendButton: document.querySelector('.btn-primary[onclick="sendMessage()"]'),
    stats: {
        activeNodes: document.getElementById('activeNodes'),
        brokenWires: document.getElementById('brokenWires'),
        messagesSent: document.getElementById('messagesSent'),
        successRate: document.getElementById('successRate')
    }
};

/**
 * Utility function to create a delay
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} - Promise that resolves after the delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generates a unique IP address for a node
 * @param {number} nodeId - The ID of the node
 * @returns {string} - The generated IP address
 */
function generateIPAddress(nodeId) {
    // Generate IP in format 192.168.1.xxx where xxx is based on nodeId
    return `192.168.1.${100 + nodeId}`;
}

/**
 * Creates a new network node with power control and visual elements
 * @param {number} id - Unique identifier for the node
 * @returns {HTMLElement} - The created node element
 */
function createNode(id) {
    const node = document.createElement('div');
    node.className = 'node';
    node.id = `node${id}`;
    node.style.width = 'var(--node-size)';  // Use CSS variable for consistent sizing
    
    // Generate and store IP address
    const ipAddress = generateIPAddress(id);
    NetworkState.nodeIPs[id] = ipAddress;
    
    // Add tooltip with IP address
    node.setAttribute('data-bs-toggle', 'tooltip');
    node.setAttribute('data-bs-placement', 'top');
    node.setAttribute('data-bs-title', `IP: ${ipAddress}`);
    
    const powerToggle = document.createElement('button');
    powerToggle.className = 'power-toggle';
    powerToggle.innerHTML = '<i class="fas fa-power-off"></i>';
    powerToggle.title = 'Toggle PC power';
    powerToggle.onclick = (e) => {
        e.stopPropagation();
        toggleNodePower(id);
    };
    
    const monitor = document.createElement('div');
    monitor.className = 'monitor';
    const monitorImg = document.createElement('img');
    monitorImg.src = 'images/pc-on.png';
    monitorImg.alt = 'PC';
    monitor.appendChild(monitorImg);
    
    const label = document.createElement('span');
    label.className = 'node-label';
    label.textContent = `PC ${id}`;  // Ensure consistent naming format
    
    node.appendChild(powerToggle);
    node.appendChild(monitor);
    node.appendChild(label);
    
    // Initialize tooltip
    new bootstrap.Tooltip(node);
    
    return node;
}

/**
 * Creates a new connection between nodes with data packet visualization
 * @returns {HTMLElement} - The created connection element
 */
function createConnection() {
    const connection = document.createElement('div');
    connection.className = 'connection';
    
    // Create multiple data packets for a more dynamic effect
    for (let i = 0; i < 8; i++) {  // Increased from 1 to 8 packets
        const dataPacket = document.createElement('div');
        dataPacket.className = 'data-packet';
        dataPacket.style.animationDelay = `${i * 0.15}s`;  // Stagger the animations
        connection.appendChild(dataPacket);
    }
    
    connection.addEventListener('click', () => {
        toggleWireFailure(connection);
    });
    
    return connection;
}

/**
 * Updates the network statistics display
 */
function updateStats() {
    const activeNodes = Object.values(NetworkState.nodes)
        .filter(node => !node.classList.contains('powered-off')).length;
    const brokenWires = NetworkState.connections
        .filter(conn => conn.classList.contains('broken')).length;
    const successRate = NetworkState.messagesSent === 0 ? 100 : 
        Math.round(((NetworkState.messagesSent - NetworkState.messagesFailed) / NetworkState.messagesSent) * 100);
    
    DOM.stats.activeNodes.textContent = activeNodes;
    DOM.stats.brokenWires.textContent = brokenWires;
    DOM.stats.messagesSent.textContent = NetworkState.messagesSent;
    DOM.stats.successRate.textContent = `${successRate}%`;
}

/**
 * Adds a data packet to the history log
 * @param {string} message - The data packet to log
 * @param {boolean} isSuccess - Whether the data packet represents a success or failure
 */
function addMessageToHistory(message, isSuccess) {
    const messageItem = document.createElement('div');
    messageItem.className = `message-item ${isSuccess ? 'success' : 'error'}`;
    
    // Get current date and time
    const now = new Date();
    const timestamp = now.toLocaleString();
    
    messageItem.innerHTML = `
        <i class="fas fa-${isSuccess ? 'check-circle' : 'times-circle'}"></i>
        <span class="timestamp">[${timestamp}]</span>
        <span>${message}</span>
    `;
    DOM.messageHistory.insertBefore(messageItem, DOM.messageHistory.firstChild);
}

/**
 * Toggles the power state of a node
 * @param {number} nodeId - The ID of the node to toggle
 */
function toggleNodePower(nodeId) {
    const node = NetworkState.nodes[nodeId];
    const isPoweredOff = node.classList.contains('powered-off');
    const monitorImg = node.querySelector('.monitor img');
    
    if (isPoweredOff) {
        node.classList.remove('powered-off');
        monitorImg.src = 'images/pc-on.png';
        DOM.status.textContent = `PC ${nodeId} powered on`;
        addMessageToHistory(`PC ${nodeId} powered on`, true);
    } else {
        // Remove any queued messages for this node before powering off
        const initialQueueLength = NetworkState.messageQueue.length;
        NetworkState.messageQueue = NetworkState.messageQueue.filter(msg => 
            msg.sourceNode !== nodeId && msg.destinationNode !== nodeId
        );
        
        // If any messages were removed, update the queue display
        if (NetworkState.messageQueue.length !== initialQueueLength) {
            updateQueueDisplay();
            addMessageToHistory(`Removed queued messages for PC ${nodeId}`, true);
        }
        
        node.classList.add('powered-off');
        monitorImg.src = 'images/pc-off.png';
        DOM.status.textContent = `PC ${nodeId} powered off`;
        addMessageToHistory(`PC ${nodeId} powered off`, true);
    }
    
    updateSelects();
    updateStats();
    updateNodeControlPanel();
    updateSendButtonState();
}

/**
 * Toggles the failure state of a connection
 * @param {HTMLElement} connection - The connection element to toggle
 */
function toggleWireFailure(connection) {
    const isBroken = connection.classList.contains('broken');
    
    if (isBroken) {
        connection.classList.remove('broken');
        DOM.status.textContent = 'Wire repaired';
        addMessageToHistory('Wire repaired', true);
    } else {
        connection.classList.add('broken');
        DOM.status.textContent = 'Wire broken';
        addMessageToHistory('Wire broken', true);
    }
    
    updateStats();
}

/**
 * Updates the node selection dropdowns
 */
function updateSelects() {
    const options = Object.keys(NetworkState.nodes)
        .filter(id => !NetworkState.nodes[id].classList.contains('powered-off'))
        .map(id => `<option value="${id}">PC ${id}</option>`)
        .join('');
    
    DOM.sourceNode.innerHTML = options;
    DOM.destinationNode.innerHTML = options;
}

/**
 * Adds a new node to the network
 */
function addNode() {
    NetworkState.maxNodeId++; // Track the highest ID ever created
    const newNodeId = NetworkState.maxNodeId;
    
    if (NetworkState.nodeCount > 0) {
        const connection = createConnection();
        DOM.network.appendChild(connection);
        NetworkState.connections.push(connection);
    }
    
    const node = createNode(newNodeId);
    DOM.network.appendChild(node);
    NetworkState.nodes[newNodeId] = node;
    NetworkState.nodeCount++;
    
    updateSelects();
    updateStats();
    updateNodeControlPanel();
    DOM.status.textContent = `Node PC ${newNodeId} added successfully!`;
    addMessageToHistory(`Node PC ${newNodeId} added successfully`, true);
}

/**
 * Removes the last node from the network
 */
function removeNode() {
    if (NetworkState.nodeCount <= 2) {
        DOM.status.textContent = 'Cannot remove node. Minimum 2 nodes required!';
        addMessageToHistory('Failed to remove node: Minimum limit reached', false);
        return;
    }
    
    const lastNode = NetworkState.nodes[NetworkState.nodeCount];
    lastNode.remove();
    delete NetworkState.nodes[NetworkState.nodeCount];
    
    if (NetworkState.connections.length > 0) {
        const lastConnection = NetworkState.connections.pop();
        lastConnection.remove();
    }
    
    NetworkState.nodeCount--;
    updateSelects();
    updateStats();
    DOM.status.textContent = `Node PC ${NetworkState.nodeCount + 1} removed successfully!`;
    addMessageToHistory(`Node PC ${NetworkState.nodeCount + 1} removed successfully`, true);
}

/**
 * Resets the network visualization to its initial state
 */
function resetNetwork() {
    Object.values(NetworkState.nodes).forEach(node => {
        node.classList.remove('active');
    });
    
    NetworkState.connections.forEach(conn => {
        conn.classList.remove('active');
        const dataPacket = conn.querySelector('.data-packet');
        dataPacket.classList.remove('moving');
        dataPacket.style.display = 'none';
    });
    
    DOM.status.textContent = '';
}

function toggleAllNodes() {
    const anyPoweredOff = Object.values(NetworkState.nodes)
        .some(node => node.classList.contains('powered-off'));
    
    // Store current token state
    const currentTokenNode = TokenState.currentNode;
    const wasTokenActive = TokenState.isActive;
    
    // Temporarily pause token passing
    if (TokenState.timer) {
        clearTimeout(TokenState.timer);
        TokenState.timer = null;
    }
    
    // Toggle all nodes
    Object.keys(NetworkState.nodes).forEach(nodeId => {
        const node = NetworkState.nodes[nodeId];
        const isPoweredOff = node.classList.contains('powered-off');
        
        if ((anyPoweredOff && isPoweredOff) || (!anyPoweredOff && !isPoweredOff)) {
            // Toggle power without triggering individual node animations
            if (isPoweredOff) {
                node.classList.remove('powered-off');
                node.querySelector('.monitor img').src = 'images/pc-on.png';
            } else {
                node.classList.add('powered-off');
                node.querySelector('.monitor img').src = 'images/pc-off.png';
                // Remove token icon when powering off
                node.classList.remove('has-token');
            }
        }
    });
    
    const toggleBtn = document.getElementById('toggleAllBtn');
    if (anyPoweredOff) {
        toggleBtn.className = 'btn btn-danger flex-grow-1';
        toggleBtn.innerHTML = '<i class="fas fa-power-off me-2"></i>Turn All Off';
    } else {
        toggleBtn.className = 'btn btn-success flex-grow-1';
        toggleBtn.innerHTML = '<i class="fas fa-power-off me-2"></i>Turn All On';
    }
    
    // Update stats once after all nodes are toggled
    updateStats();
    updateSelects();
    updateSendButtonState();
    
    // Handle token passing
    if (anyPoweredOff) {
        // Get active nodes after toggle
        const activeNodes = Object.entries(NetworkState.nodes)
            .filter(([_, node]) => !node.classList.contains('powered-off'))
            .map(([id]) => parseInt(id));
        
        if (activeNodes.length >= 2) {
            // If previous token node is still active, keep it
            if (wasTokenActive && currentTokenNode && 
                !NetworkState.nodes[currentTokenNode].classList.contains('powered-off')) {
                TokenState.currentNode = currentTokenNode;
            } else {
                TokenState.currentNode = activeNodes[0];
            }
            
            // Add token indicator
            const node = NetworkState.nodes[TokenState.currentNode];
            node.classList.add('has-token');
            
            // Resume token passing
            TokenState.isActive = true;
            TokenState.timer = setTimeout(passToken, TokenState.interval);
        }
    } else {
        TokenState.isActive = false;
        // Remove token icon from all nodes when turning all off
        Object.values(NetworkState.nodes).forEach(node => {
            node.classList.remove('has-token');
        });
    }
    
    const newState = anyPoweredOff ? 'on' : 'off';
    DOM.status.textContent = `All PCs powered ${newState}`;
    addMessageToHistory(`All PCs powered ${newState}`, true);
}

/**
 * Scrolls the network view to center a specific node
 * @param {number} nodeId - The ID of the node to scroll to
 */
function scrollToNode(nodeId) {
    const networkWrapper = document.querySelector('.network-wrapper');
    const node = NetworkState.nodes[nodeId];
    if (networkWrapper && node) {
        const nodeRect = node.getBoundingClientRect();
        const wrapperRect = networkWrapper.getBoundingClientRect();
        const scrollLeft = nodeRect.left - wrapperRect.left - (wrapperRect.width - nodeRect.width) / 2;
        networkWrapper.scrollTo({
            left: networkWrapper.scrollLeft + scrollLeft,
            behavior: 'smooth'
        });
    }
}

/**
 * Starts the token passing protocol
 */
function startTokenPassing() {
    // Get all powered-on nodes and convert their IDs to integers
    const activeNodes = Object.entries(NetworkState.nodes)
        .filter(([_, node]) => !node.classList.contains('powered-off'))
        .map(([id]) => parseInt(id));

    // Validate minimum node requirement for token passing
    if (activeNodes.length < 2) {
        DOM.status.textContent = 'Need at least 2 powered-on nodes for token passing!';
        addMessageToHistory('Failed to start token passing: Not enough active nodes', false);
        return;
    }

    // Initialize token passing state
    TokenState.isActive = true;
    TokenState.currentNode = activeNodes[0];  // Start with first active node
    TokenState.direction = 1;                 // Start in forward direction

    // Add visual token indicator to first node
    const node = NetworkState.nodes[TokenState.currentNode];
    node.classList.add('has-token');

    // Start the token passing cycle
    passToken();
}

/**
 * Passes the token to the next node
 */
function passToken() {
    if (!TokenState.isActive) return;  // Exit if token passing is not active

    // Remove visual token indicator from current node
    if (TokenState.currentNode) {
        const node = NetworkState.nodes[TokenState.currentNode];
        node.classList.remove('has-token');
    }

    // Get list of all powered-on nodes
    const activeNodes = Object.entries(NetworkState.nodes)
        .filter(([_, node]) => !node.classList.contains('powered-off'))
        .map(([id]) => parseInt(id));

    // Find current node's position in the active nodes array
    const currentIndex = activeNodes.indexOf(TokenState.currentNode);

    // Calculate next node index based on direction
    let nextIndex = currentIndex + TokenState.direction;
    if (nextIndex >= activeNodes.length) {
        nextIndex = 0;  // Wrap around to start if at end
    } else if (nextIndex < 0) {
        nextIndex = activeNodes.length - 1;  // Wrap around to end if at start
    }

    // Update current node to next node
    TokenState.currentNode = activeNodes[nextIndex];

    // Add visual token indicator to new node
    const node = NetworkState.nodes[TokenState.currentNode];
    node.classList.add('has-token');

    // Update status display and log
    DOM.status.textContent = `Token at PC ${TokenState.currentNode}`;
    addMessageToHistory(`Token passed to PC ${TokenState.currentNode}`, true);

    // Process any queued messages for this node
    processQueuedMessages();

    // Schedule next token pass
    TokenState.timer = setTimeout(passToken, TokenState.interval);
}

/**
 * Changes the direction of token passing
 */
function changeTokenDirection() {
    TokenState.direction *= -1;
    const directionBtn = document.getElementById('changeDirectionBtn');
    directionBtn.innerHTML = TokenState.direction === 1 ? 
        '<i class="fas fa-arrow-right me-2"></i>Forward' : 
        '<i class="fas fa-arrow-left me-2"></i>Backward';
    
    addMessageToHistory(`Token direction changed to ${TokenState.direction === 1 ? 'forward' : 'backward'}`, true);
}

/**
 * Updates the token passing interval
 */
function updateTokenInterval(value) {
    TokenState.interval = value * 1000; // Convert to milliseconds
    const intervalValue = document.getElementById('tokenIntervalValue');
    intervalValue.textContent = `${value}s`;
    
    addMessageToHistory(`Token interval updated to ${value} seconds`, true);
}

/**
 * Updates the queue display
 */
function updateQueueDisplay() {
    DOM.queueList.innerHTML = '';
    
    if (NetworkState.messageQueue.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'queue-item';
        emptyMessage.innerHTML = '<i class="fas fa-inbox"></i> No messages in queue';
        DOM.queueList.appendChild(emptyMessage);
        return;
    }
    
    NetworkState.messageQueue.forEach(msg => {
        const queueItem = document.createElement('div');
        queueItem.className = 'queue-item';
        
        const timestamp = new Date(msg.timestamp).toLocaleTimeString();
        
        queueItem.innerHTML = `
            <i class="fas fa-paper-plane"></i>
            <span>PC ${msg.sourceNode} → PC ${msg.destinationNode}</span>
            <span class="timestamp">${timestamp}</span>
        `;
        
        DOM.queueList.appendChild(queueItem);
    });
}

/**
 * Process any queued messages for the current node
 */
async function processQueuedMessages() {
    if (!TokenState.isActive || !TokenState.currentNode || NetworkState.transferInProgress) return;
    
    // Find messages in queue for current node
    const pendingMessages = NetworkState.messageQueue.filter(msg => msg.sourceNode === TokenState.currentNode);
    
    if (pendingMessages.length > 0) {
        // Get the first message in queue for this node
        const message = pendingMessages[0];
        
        // Remove it from queue
        NetworkState.messageQueue = NetworkState.messageQueue.filter(msg => 
            !(msg.sourceNode === message.sourceNode && msg.destinationNode === message.destinationNode)
        );
        
        // Update the queue display
        updateQueueDisplay();
        
        // Set the source and destination in the UI
        DOM.sourceNode.value = message.sourceNode;
        DOM.destinationNode.value = message.destinationNode;
        
        // Send the message
        await sendMessage();
    }
}

/**
 * Modify the sendMessage function to check for token and transfer status
 */
async function sendMessage() {
    const sourceNode = parseInt(DOM.sourceNode.value);
    const destinationNode = parseInt(DOM.destinationNode.value);
    
    // Check if a transfer is already in progress
    if (NetworkState.transferInProgress) {
        // Check if message is already queued
        const messageExists = NetworkState.messageQueue.some(msg => 
            msg.sourceNode === sourceNode && msg.destinationNode === destinationNode
        );
        
        if (!messageExists) {
            // Add new message to queue with timestamp
            NetworkState.messageQueue.push({
                sourceNode,
                destinationNode,
                timestamp: new Date()
            });
            
            DOM.status.textContent = `Message queued: PC ${sourceNode} will send to PC ${destinationNode} when current transfer completes`;
            addMessageToHistory(`Message queued from PC ${sourceNode} to PC ${destinationNode}`, true);
            updateQueueDisplay();
        } else {
            DOM.status.textContent = `Message already queued: PC ${sourceNode} to PC ${destinationNode}`;
            addMessageToHistory(`Message already queued from PC ${sourceNode} to PC ${destinationNode}`, false);
        }
        return;
    }
    
    // Check if source node has the token
    if (TokenState.currentNode !== sourceNode) {
        // Check if message is already queued
        const messageExists = NetworkState.messageQueue.some(msg => 
            msg.sourceNode === sourceNode && msg.destinationNode === destinationNode
        );
        
        if (!messageExists) {
            // Add new message to queue with timestamp
            NetworkState.messageQueue.push({
                sourceNode,
                destinationNode,
                timestamp: new Date()
            });
            
            DOM.status.textContent = `Message queued: PC ${sourceNode} will send to PC ${destinationNode} when it gets the token`;
            addMessageToHistory(`Message queued from PC ${sourceNode} to PC ${destinationNode}`, true);
            updateQueueDisplay();
        } else {
            DOM.status.textContent = `Message already queued: PC ${sourceNode} to PC ${destinationNode}`;
            addMessageToHistory(`Message already queued from PC ${sourceNode} to PC ${destinationNode}`, false);
        }
        return;
    }
    
    // Prevent sending to self
    if (sourceNode === destinationNode) {
        DOM.status.textContent = `Cannot send data packet: Source and destination cannot be the same node!`;
        addMessageToHistory(`Failed to send data packet: Cannot send to self`, false);
        NetworkState.messagesFailed++;
        updateStats();
        return;
    }
    
    if (NetworkState.nodes[sourceNode].classList.contains('powered-off')) {
        DOM.status.textContent = `Cannot send data packet: PC ${sourceNode} is powered off!`;
        addMessageToHistory(`Failed to send data packet: PC ${sourceNode} is powered off`, false);
        NetworkState.messagesFailed++;
        updateStats();
        return;
    }
    if (NetworkState.nodes[destinationNode].classList.contains('powered-off')) {
        DOM.status.textContent = `Cannot send data packet: PC ${destinationNode} is powered off!`;
        addMessageToHistory(`Failed to send data packet: PC ${destinationNode} is powered off`, false);
        NetworkState.messagesFailed++;
        updateStats();
        return;
    }
    
    // Set transfer in progress flag
    NetworkState.transferInProgress = true;
    
    resetNetwork();
    NetworkState.messagesSent++;
    
    // Add initial message about sending
    addMessageToHistory(`Initiated data packet transmission from PC ${sourceNode} to PC ${destinationNode}`, true);
    
    // Get all active node IDs in order
    const activeNodeIds = Object.keys(NetworkState.nodes)
        .map(id => parseInt(id))
        .sort((a, b) => a - b);
    
    // Find indices of source and destination in the active nodes array
    const sourceIndex = activeNodeIds.indexOf(sourceNode);
    const destIndex = activeNodeIds.indexOf(destinationNode);
    
    // Determine direction and create path
    const direction = sourceIndex < destIndex ? 1 : -1;
    const path = [];
    for (let i = sourceIndex; i !== destIndex + direction; i += direction) {
        path.push(activeNodeIds[i]);
    }
    
    try {
        // Scroll to the source node first
        scrollToNode(sourceNode);
        await sleep(500); // Wait for scroll to complete
        
        // Activate source node with a pulse effect
        NetworkState.nodes[sourceNode].classList.add('active');
        await sleep(300);
        
        for (let i = 0; i < path.length; i++) {
            const currentNode = path[i];
            
            // Scroll to the current node
            scrollToNode(currentNode);
            
            // Check if current node is powered off
            if (NetworkState.nodes[currentNode].classList.contains('powered-off')) {
                DOM.status.textContent = `Data packet failed: PC ${currentNode} is powered off!`;
                addMessageToHistory(`Data packet failed: PC ${currentNode} is powered off`, false);
                NetworkState.messagesFailed++;
                updateStats();
                setTimeout(resetNetwork, 2000);
                return;
            }
            
            if (i < path.length - 1) {
                const nextNode = path[i + 1];
                
                // Find the connection between current node and next node
                const connectionIndex = activeNodeIds.indexOf(Math.min(currentNode, nextNode));
                const connection = NetworkState.connections[connectionIndex];
                
                // Check if connection is broken
                if (connection.classList.contains('broken')) {
                    DOM.status.textContent = `Data packet failed: Wire between PC ${currentNode} and PC ${nextNode} is broken!`;
                    addMessageToHistory(`Data packet failed: Wire between PC ${currentNode} and PC ${nextNode} is broken`, false);
                    NetworkState.messagesFailed++;
                    updateStats();
                    setTimeout(resetNetwork, 2000);
                    return;
                }
                
                // Check if next node is powered off
                if (NetworkState.nodes[nextNode].classList.contains('powered-off')) {
                    DOM.status.textContent = `Data packet failed: PC ${nextNode} is powered off!`;
                    addMessageToHistory(`Data packet failed: PC ${nextNode} is powered off`, false);
                    NetworkState.messagesFailed++;
                    updateStats();
                    setTimeout(resetNetwork, 2000);
                    return;
                }
                
                // Activate the connection and prepare the data packet
                connection.classList.add('active');
                const dataPacket = connection.querySelector('.data-packet');
                dataPacket.style.display = 'block';
                
                // Set initial transform based on direction
                if (direction === -1) {
                    dataPacket.style.transform = 'translate(50%, -50%) scaleX(-1)';
                } else {
                    dataPacket.style.transform = 'translate(-50%, -50%)';
                }
                
                // Start the packet animation
                dataPacket.classList.add('moving');
                DOM.status.textContent = `Data packet passing through PC ${currentNode}...`;
                
                // Calculate animation duration based on speed
                const speed = parseFloat(DOM.speedSlider.value);
                const animationDuration = 1500 / speed; // Base duration of 1.5s adjusted by speed
                
                // Wait for the animation to complete
                await sleep(animationDuration);
                
                // Clean up the animation
                dataPacket.classList.remove('moving');
                dataPacket.style.display = 'none';
                
                // Activate the next node with a pulse effect
                NetworkState.nodes[nextNode].classList.add('active');
                await sleep(300);
            }
        }
        
        // Scroll to the destination node at the end
        scrollToNode(destinationNode);
        
        // Add a final pulse effect to the destination node
        NetworkState.nodes[destinationNode].classList.add('active');
        await sleep(500);
        
        DOM.status.textContent = `Data packet successfully delivered from PC ${sourceNode} to PC ${destinationNode}!`;
        addMessageToHistory(`Data packet successfully delivered from PC ${sourceNode} to PC ${destinationNode}`, true);
        updateStats();
    } finally {
        // Reset transfer in progress flag
        NetworkState.transferInProgress = false;
        setTimeout(resetNetwork, 2000);
        
        // Process next message in queue if any
        setTimeout(processQueuedMessages, 100);
    }
}

// Event Listeners
DOM.speedSlider.addEventListener('input', () => {
    const value = DOM.speedSlider.value;
    DOM.speedValue.textContent = `${value}x`;
    
    // Calculate and set the progress width
    const percentage = ((value - DOM.speedSlider.min) / (DOM.speedSlider.max - DOM.speedSlider.min)) * 100;
    DOM.speedSlider.style.setProperty('--range-progress', `${percentage}%`);
});

// Initialize the network
function initializeNetwork() {
    // Clear any existing nodes
    DOM.network.innerHTML = '';
    NetworkState.nodes = {};
    NetworkState.connections = [];
    NetworkState.nodeCount = 0;
    NetworkState.removedNodes.clear();
    NetworkState.maxNodeId = 0;
    
    // Add 5 PCs initially
    for (let i = 0; i < 5; i++) {
        addNode();
    }
    
    // Center the network container
    const networkWrapper = document.querySelector('.network-wrapper');
    if (networkWrapper) {
        networkWrapper.scrollLeft = (networkWrapper.scrollWidth - networkWrapper.clientWidth) / 2;
    }
    
    // Initialize token passing UI
    const tokenControls = document.createElement('div');
    tokenControls.className = 'token-controls mt-3';
    tokenControls.innerHTML = `
        <h6 class="mb-2"><i class="fas fa-sync me-2"></i>Token Passing Protocol</h6>
        <div class="d-flex gap-2 mb-2">
            <button id="changeDirectionBtn" class="btn btn-primary" onclick="changeTokenDirection()">
                <i class="fas fa-arrow-right me-2"></i>Forward
            </button>
        </div>
        <div class="speed-control">
            <label class="form-label d-flex justify-content-between">
                <span><i class="fas fa-clock me-2"></i>Token Interval</span>
                <span id="tokenIntervalValue">3s</span>
            </label>
            <input type="range" class="form-range" id="tokenIntervalSlider" 
                   min="1" max="10" value="3" step="1" 
                   oninput="updateTokenInterval(this.value)">
        </div>
    `;
    
    // Add token controls to the Node Management card
    const nodeManagementCard = document.querySelector('.col-md-4:nth-child(2) .card-body');
    nodeManagementCard.appendChild(tokenControls);
    
    // Initialize node control panel
    updateNodeControlPanel();

    // Initialize queue display
    updateQueueDisplay();

    // Update send button state
    updateSendButtonState();

    // Start token passing automatically
    startTokenPassing();
}

// Start the network
initializeNetwork();

function createParticles(element) {
    const container = document.createElement('div');
    container.className = 'particle-container';
    element.appendChild(container);

    // Create 50 particles (increased from 30)
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random angle for particle movement
        const angle = Math.random() * 360;
        const distance = 30 + Math.random() * 50; // Increased distance range
        
        particle.style.setProperty('--angle', `${angle}deg`);
        particle.style.setProperty('--x', `${distance}px`);
        particle.style.setProperty('--y', `${distance}px`);
        
        // Random delay for particle animation
        particle.style.animationDelay = `${Math.random() * 2}s`; // Increased delay range
        
        container.appendChild(particle);
    }
}

/**
 * Utility function to get random direction (left-to-right or right-to-left)
 * @returns {number} 1 for left-to-right, -1 for right-to-left
 */
function getRandomDirection() {
    return Math.random() < 0.5 ? 1 : -1;
}

/**
 * Utility function to get random node IDs within range
 * @param {number} min - Minimum node ID
 * @param {number} max - Maximum node ID
 * @returns {number[]} Array of two different random node IDs
 */
function getRandomNodePair(min, max) {
    const nodes = Array.from({length: max - min + 1}, (_, i) => i + min);
    const shuffled = nodes.sort(() => Math.random() - 0.5);
    // Ensure we get two different nodes
    return [shuffled[0], shuffled[1]];
}

/**
 * Runs a demo simulation of the network
 */
async function runDemoSimulation() {
    // Get all powered-on nodes
    const activeNodes = Object.entries(NetworkState.nodes)
        .filter(([_, node]) => !node.classList.contains('powered-off'))
        .map(([id]) => parseInt(id));

    if (activeNodes.length < 2) {
        DOM.status.textContent = 'Need at least 2 powered-on nodes for demo!';
        addMessageToHistory('Failed to start demo: Not enough active nodes', false);
        return;
    }

    // Enable stop button and disable run button
    const stopBtn = document.getElementById('stopSimBtn');
    const runBtn = document.querySelector('.btn-danger');
    if (!stopBtn || !runBtn) {
        console.error('Demo control buttons not found');
        return;
    }

    stopBtn.disabled = false;
    runBtn.disabled = true;

    // Set simulation flag to true
    NetworkState.isSimulationRunning = true;

    // Ensure token passing is active
    if (!TokenState.isActive) {
        startTokenPassing();
    }

    // Run demo for 30 seconds
    const endTime = Date.now() + 30000;
    
    try {
        while (Date.now() < endTime && NetworkState.isSimulationRunning) {
            // Check if simulation was stopped
            if (!NetworkState.isSimulationRunning) {
                break;
            }

            // Wait for token to be at a node
            await sleep(1000); // Check every second
            
            // Only proceed if simulation is still running and token passing is active
            if (NetworkState.isSimulationRunning && TokenState.isActive && TokenState.currentNode) {
                const sourceNode = TokenState.currentNode;
                
                // Get a random destination node that's different from source
                let destinationNode;
                do {
                    destinationNode = activeNodes[Math.floor(Math.random() * activeNodes.length)];
                } while (destinationNode === sourceNode);
                
                // Set the source and destination in the UI
                DOM.sourceNode.value = sourceNode;
                DOM.destinationNode.value = destinationNode;
                
                // Try to send message
                await sendMessage();
                
                // Wait for token to move to next node
                await sleep(TokenState.interval);
            }
        }
    } catch (error) {
        console.error('Error in demo simulation:', error);
        DOM.status.textContent = 'Demo simulation encountered an error!';
        addMessageToHistory('Demo simulation encountered an error', false);
    } finally {
        // Reset button states
        stopBtn.disabled = true;
        runBtn.disabled = false;
        
        // Only show completion message if simulation wasn't stopped manually
        if (NetworkState.isSimulationRunning) {
            DOM.status.textContent = 'Demo simulation completed!';
            addMessageToHistory('Demo simulation completed', true);
        }
        
        // Reset simulation flag
        NetworkState.isSimulationRunning = false;
    }
}

/**
 * Stops the current simulation
 */
function stopSimulation() {
    // Set simulation flag to false
    NetworkState.isSimulationRunning = false;
    
    // Store current token state
    const currentTokenNode = TokenState.currentNode;
    const wasTokenActive = TokenState.isActive;
    
    // Stop the demo simulation timer
    if (TokenState.timer) {
        clearTimeout(TokenState.timer);
        TokenState.timer = null;
    }

    // Clear message queue
    NetworkState.messageQueue = [];
    updateQueueDisplay();

    // Reset network state
    resetNetwork();

    // Update button states
    const stopBtn = document.getElementById('stopSimBtn');
    const runBtn = document.querySelector('.btn-danger');
    stopBtn.disabled = true;
    runBtn.disabled = false;

    // Restore token passing
    if (wasTokenActive && currentTokenNode) {
        TokenState.isActive = true;
        TokenState.currentNode = currentTokenNode;
        const node = NetworkState.nodes[currentTokenNode];
        if (node) {
            node.classList.add('has-token');
        }
        // Restart token passing with proper interval
        TokenState.timer = setTimeout(passToken, TokenState.interval);
    }

    DOM.status.textContent = 'Demo simulation stopped!';
    addMessageToHistory('Demo simulation stopped by user', true);
}

/**
 * Updates the node control panel
 */
function updateNodeControlPanel() {
    const nodeControlList = document.getElementById('nodeControlList');
    if (!nodeControlList) return;
    
    nodeControlList.innerHTML = '';
    
    // Get all node IDs (including removed ones) up to maxNodeId
    for (let i = 1; i <= NetworkState.maxNodeId; i++) {
        const nodeControlItem = document.createElement('div');
        nodeControlItem.className = 'node-control-item';
        nodeControlItem.id = `nodeControl${i}`;
        
        const isRemoved = NetworkState.removedNodes.has(i);
        const isPoweredOff = NetworkState.nodes[i] && NetworkState.nodes[i].classList.contains('powered-off');
        
        if (isRemoved) {
            nodeControlItem.classList.add('removed');
        } else if (isPoweredOff) {
            nodeControlItem.classList.add('powered-off');
        }
        
        let statusText = 'Active';
        let statusClass = 'active';
        
        if (isRemoved) {
            statusText = 'Removed';
            statusClass = 'removed';
        } else if (isPoweredOff) {
            statusText = 'Powered Off';
            statusClass = 'powered-off';
        }
        
        nodeControlItem.innerHTML = `
            <div>
                <strong>PC ${i}</strong>
                <div class="node-status ${statusClass}">${statusText}</div>
            </div>
            <div class="node-control-buttons">
                ${!isRemoved ? `
                    <button class="btn btn-sm ${isPoweredOff ? 'btn-success' : 'btn-warning'}" 
                            onclick="toggleNodePowerFromPanel(${i})" 
                            title="${isPoweredOff ? 'Power On' : 'Power Off'}">
                        <i class="fas fa-power-off"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" 
                            onclick="removeSpecificNode(${i})" 
                            title="Remove Node">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : `
                    <button class="btn btn-sm btn-success" 
                            onclick="recoverSpecificNode(${i})" 
                            title="Recover Node">
                        <i class="fas fa-undo"></i>
                    </button>
                `}
            </div>
        `;
        
        nodeControlList.appendChild(nodeControlItem);
    }
}

/**
 * Toggle node power from the management panel
 */
function toggleNodePowerFromPanel(nodeId) {
    if (NetworkState.removedNodes.has(nodeId)) return;
    toggleNodePower(nodeId);
    updateNodeControlPanel();
}

/**
 * Remove a specific node (visual removal with renumbering)
 */
function removeSpecificNode(nodeId) {
    if (NetworkState.removedNodes.has(nodeId)) return;
    
    // Check if we can remove (need at least 2 active nodes)
    const activeNodeCount = Object.keys(NetworkState.nodes).filter(id => 
        !NetworkState.removedNodes.has(parseInt(id))
    ).length;
    
    if (activeNodeCount <= 2) {
        DOM.status.textContent = 'Cannot remove node. Minimum 2 nodes required!';
        addMessageToHistory('Failed to remove node: Minimum limit reached', false);
        return;
    }
    
    // Check if the node being removed has the token
    if (TokenState.currentNode === nodeId) {
        // Get list of all powered-on nodes
        const activeNodes = Object.entries(NetworkState.nodes)
            .filter(([id, node]) => !node.classList.contains('powered-off') && !NetworkState.removedNodes.has(parseInt(id)))
            .map(([id]) => parseInt(id));
        
        // Find current node's position in the active nodes array
        const currentIndex = activeNodes.indexOf(nodeId);
        
        // Calculate next node index based on direction
        let nextIndex = currentIndex + TokenState.direction;
        if (nextIndex >= activeNodes.length) {
            nextIndex = 0;  // Wrap around to start if at end
        } else if (nextIndex < 0) {
            nextIndex = activeNodes.length - 1;  // Wrap around to end if at start
        }
        
        // Update token to next node
        TokenState.currentNode = activeNodes[nextIndex];
        
        // Add visual token indicator to new node
        const nextNode = NetworkState.nodes[TokenState.currentNode];
        nextNode.classList.add('has-token');
        
        // Update status display and log
        DOM.status.textContent = `Token transferred to PC ${TokenState.currentNode}`;
        addMessageToHistory(`Token transferred to PC ${TokenState.currentNode}`, true);
    }
    
    // Remove any queued messages for this node
    const initialQueueLength = NetworkState.messageQueue.length;
    NetworkState.messageQueue = NetworkState.messageQueue.filter(msg => 
        msg.sourceNode !== nodeId && msg.destinationNode !== nodeId
    );
    
    // If any messages were removed, update the queue display
    if (NetworkState.messageQueue.length !== initialQueueLength) {
        updateQueueDisplay();
        addMessageToHistory(`Removed queued messages for PC ${nodeId}`, true);
    }
    
    // Mark node as removed
    NetworkState.removedNodes.add(nodeId);
    
    // Rebuild the network with renumbering
    rebuildNetwork();
    
    DOM.status.textContent = `PC ${nodeId} removed successfully!`;
    addMessageToHistory(`PC ${nodeId} removed successfully`, true);
    updateNodeControlPanel();
}

/**
 * Recover a specific node
 */
function recoverSpecificNode(nodeId) {
    if (!NetworkState.removedNodes.has(nodeId)) return;
    
    // Remove from removed set
    NetworkState.removedNodes.delete(nodeId);
    
    // Rebuild the network
    rebuildNetwork();
    
    DOM.status.textContent = `PC ${nodeId} recovered successfully!`;
    addMessageToHistory(`PC ${nodeId} recovered successfully`, true);
    updateNodeControlPanel();
}

/**
 * Recover all removed nodes
 */
function recoverAllNodes() {
    if (NetworkState.removedNodes.size === 0) {
        DOM.status.textContent = 'No nodes to recover!';
        addMessageToHistory('No nodes to recover', false);
        return;
    }
    
    // Store current token state
    const currentTokenNode = TokenState.currentNode;
    const wasTokenActive = TokenState.isActive;
    
    NetworkState.removedNodes.clear();
    rebuildNetwork();
    
    // Restore token state
    if (wasTokenActive && currentTokenNode) {
        TokenState.isActive = true;
        TokenState.currentNode = currentTokenNode;
        const node = NetworkState.nodes[currentTokenNode];
        if (node) {
            node.classList.add('has-token');
        }
        // Restart token passing with proper interval
        if (TokenState.timer) {
            clearTimeout(TokenState.timer);
        }
        TokenState.timer = setTimeout(passToken, TokenState.interval);
    }
    
    DOM.status.textContent = 'All nodes recovered successfully!';
    addMessageToHistory('All nodes recovered successfully', true);
    updateNodeControlPanel();
}

/**
 * Rebuild the network with proper renumbering (the "illusion")
 */
function rebuildNetwork() {
    // Store current power states and IP addresses
    const powerStates = {};
    const ipAddresses = {};
    Object.keys(NetworkState.nodes).forEach(id => {
        powerStates[id] = NetworkState.nodes[id].classList.contains('powered-off');
        ipAddresses[id] = NetworkState.nodeIPs[id];
    });
    
    // Clear existing network
    DOM.network.innerHTML = '';
    NetworkState.nodes = {};
    NetworkState.connections = [];
    NetworkState.nodeCount = 0;
    
    // Get active node IDs (not removed) and sort them
    const activeNodeIds = [];
    for (let i = 1; i <= NetworkState.maxNodeId; i++) {
        if (!NetworkState.removedNodes.has(i)) {
            activeNodeIds.push(i);
        }
    }
    
    // Sort active node IDs to maintain order
    activeNodeIds.sort((a, b) => a - b);
    
    // Create nodes with their original IDs
    activeNodeIds.forEach((nodeId, index) => {
        NetworkState.nodeCount++;
        
        // Create connection if not the first node
        if (index > 0) {
            const connection = createConnection();
            DOM.network.appendChild(connection);
            NetworkState.connections.push(connection);
        }
        
        // Create node with original ID
        const node = createNode(nodeId);
        DOM.network.appendChild(node);
        NetworkState.nodes[nodeId] = node;
        
        // Restore power state if it existed
        if (powerStates[nodeId]) {
            node.classList.add('powered-off');
        }
        
        // Restore IP address
        NetworkState.nodeIPs[nodeId] = ipAddresses[nodeId] || generateIPAddress(nodeId);
    });
    
    updateSelects();
    updateStats();
}

/**
 * Resets the entire page by reloading it
 */
function resetPage() {
    window.location.reload();
}

/**
 * Updates the send button state based on whether any PCs are powered on
 */
function updateSendButtonState() {
    const hasActiveNodes = Object.values(NetworkState.nodes)
        .some(node => !node.classList.contains('powered-off'));
    
    if (DOM.sendButton) {
        DOM.sendButton.disabled = !hasActiveNodes;
        DOM.sendButton.title = hasActiveNodes ? 
            'Send data packet' : 
            'Cannot send: No powered-on PCs available';
    }
}
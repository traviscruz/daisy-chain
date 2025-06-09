/**
 * Daisy Chain Network Simulation
 * A visual simulation of a daisy chain network topology with interactive nodes and connections.
 * 
 * Features:
 * - Dynamic node addition/removal
 * - Visual data packet transmission
 * - Node power control
 * - Wire failure simulation
 * - Network statistics tracking
 * - Message history logging
 * - Animation speed control
 */

// Network state management
const NetworkState = {
    nodes: {},
    connections: [],
    nodeCount: 0,
    messagesSent: 0,
    messagesFailed: 0,
    currentSpeed: 1
};

// Token Passing Protocol State
const TokenState = {
    isActive: false,
    currentNode: null,
    timer: null,
    interval: 3000, // 3 seconds per node
    direction: 1, // 1 for forward, -1 for backward
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
 * Creates a new network node with power control and visual elements
 * @param {number} id - Unique identifier for the node
 * @returns {HTMLElement} - The created node element
 */
function createNode(id) {
    const node = document.createElement('div');
    node.className = 'node';
    node.id = `node${id}`;
    node.style.width = 'var(--node-size)';  // Use CSS variable for consistent sizing
    
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
    label.textContent = `PC ${id}`;
    
    node.appendChild(powerToggle);
    node.appendChild(monitor);
    node.appendChild(label);
    
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
    
    if (isPoweredOff) {
        node.classList.remove('powered-off');
        DOM.status.textContent = `PC${nodeId} powered on`;
        addMessageToHistory(`PC${nodeId} powered on`, true);
    } else {
        node.classList.add('powered-off');
        DOM.status.textContent = `PC${nodeId} powered off`;
        addMessageToHistory(`PC${nodeId} powered off`, true);
    }
    
    updateSelects();
    updateStats();
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
        .map(id => `<option value="${id}">PC${id}</option>`)
        .join('');
    
    DOM.sourceNode.innerHTML = options;
    DOM.destinationNode.innerHTML = options;
}

/**
 * Adds a new node to the network
 */
function addNode() {
    NetworkState.nodeCount++;
    
    if (NetworkState.nodeCount > 1) {
        const connection = createConnection();
        DOM.network.appendChild(connection);
        NetworkState.connections.push(connection);
    }
    
    const node = createNode(NetworkState.nodeCount);
    DOM.network.appendChild(node);
    NetworkState.nodes[NetworkState.nodeCount] = node;
    
    updateSelects();
    updateStats();
    DOM.status.textContent = `Node PC${NetworkState.nodeCount} added successfully!`;
    addMessageToHistory(`Node PC${NetworkState.nodeCount} added successfully`, true);
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
    DOM.status.textContent = `Node PC${NetworkState.nodeCount + 1} removed successfully!`;
    addMessageToHistory(`Node PC${NetworkState.nodeCount + 1} removed successfully`, true);
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
    
    Object.keys(NetworkState.nodes).forEach(nodeId => {
        const node = NetworkState.nodes[nodeId];
        const isPoweredOff = node.classList.contains('powered-off');
        
        if ((anyPoweredOff && isPoweredOff) || (!anyPoweredOff && !isPoweredOff)) {
            toggleNodePower(nodeId);
        }
    });
    
    const toggleBtn = document.getElementById('toggleAllBtn');
    if (anyPoweredOff) {
        toggleBtn.className = 'btn btn-success w-100 mt-3';
        toggleBtn.innerHTML = '<i class="fas fa-power-off me-2"></i>All PCs On';
    } else {
        toggleBtn.className = 'btn btn-danger w-100 mt-3';
        toggleBtn.innerHTML = '<i class="fas fa-power-off me-2"></i>All PCs Off';
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
    if (TokenState.isActive) {
        stopTokenPassing();
        return;
    }

    // Get all powered-on nodes
    const activeNodes = Object.entries(NetworkState.nodes)
        .filter(([_, node]) => !node.classList.contains('powered-off'))
        .map(([id]) => parseInt(id));

    if (activeNodes.length < 2) {
        DOM.status.textContent = 'Need at least 2 powered-on nodes for token passing!';
        addMessageToHistory('Failed to start token passing: Not enough active nodes', false);
        return;
    }

    TokenState.isActive = true;
    TokenState.currentNode = activeNodes[0];
    TokenState.direction = 1;

    // Update UI
    const startBtn = document.getElementById('startTokenBtn');
    startBtn.className = 'btn btn-danger';
    startBtn.innerHTML = '<i class="fas fa-stop me-2"></i>Stop Token Passing';

    // Add token to first node
    const node = NetworkState.nodes[TokenState.currentNode];
    node.classList.add('has-token');

    // Start the token passing
    passToken();
}

/**
 * Stops the token passing protocol
 */
function stopTokenPassing() {
    if (!TokenState.isActive) return;

    TokenState.isActive = false;
    if (TokenState.timer) {
        clearTimeout(TokenState.timer);
        TokenState.timer = null;
    }

    // Reset UI
    const startBtn = document.getElementById('startTokenBtn');
    startBtn.className = 'btn btn-success';
    startBtn.innerHTML = '<i class="fas fa-play me-2"></i>Start Token Passing';

    // Remove token from current node
    if (TokenState.currentNode) {
        const node = NetworkState.nodes[TokenState.currentNode];
        node.classList.remove('has-token');
    }

    DOM.status.textContent = 'Token passing stopped';
    addMessageToHistory('Token passing protocol stopped', true);
}

/**
 * Passes the token to the next node
 */
function passToken() {
    if (!TokenState.isActive) return;

    // Remove token from current node
    if (TokenState.currentNode) {
        const node = NetworkState.nodes[TokenState.currentNode];
        node.classList.remove('has-token');
    }

    // Get all powered-on nodes
    const activeNodes = Object.entries(NetworkState.nodes)
        .filter(([_, node]) => !node.classList.contains('powered-off'))
        .map(([id]) => parseInt(id));

    // Find current node index
    const currentIndex = activeNodes.indexOf(TokenState.currentNode);

    // Calculate next node index
    let nextIndex = currentIndex + TokenState.direction;
    if (nextIndex >= activeNodes.length) {
        nextIndex = 0;
    } else if (nextIndex < 0) {
        nextIndex = activeNodes.length - 1;
    }

    // Update current node
    TokenState.currentNode = activeNodes[nextIndex];

    // Add token to new node
    const node = NetworkState.nodes[TokenState.currentNode];
    node.classList.add('has-token');

    // Update status
    DOM.status.textContent = `Token at PC${TokenState.currentNode}`;
    addMessageToHistory(`Token passed to PC${TokenState.currentNode}`, true);

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
 * Modify the sendMessage function to check for token
 */
async function sendMessage() {
    const sourceNode = parseInt(DOM.sourceNode.value);
    const destinationNode = parseInt(DOM.destinationNode.value);
    
    // Check if source node has the token
    if (TokenState.currentNode !== sourceNode) {
        DOM.status.textContent = `Cannot send data packet: PC${sourceNode} does not have the token!`;
        addMessageToHistory(`Failed to send data packet: PC${sourceNode} does not have the token`, false);
        NetworkState.messagesFailed++;
        updateStats();
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
    
    resetNetwork();
    NetworkState.messagesSent++;
    
    // Add initial message about sending
    addMessageToHistory(`Initiated data packet transmission from PC ${sourceNode} to PC ${destinationNode}`, true);
    
    const direction = sourceNode < destinationNode ? 1 : -1;
    const path = [];
    for (let i = sourceNode; i !== destinationNode + direction; i += direction) {
        path.push(i);
    }
    
    // Scroll to the source node first
    scrollToNode(sourceNode);
    await sleep(500); // Wait for scroll to complete
    
    for (let i = 0; i < path.length; i++) {
        const currentNode = path[i];
        
        // Scroll to the current node
        scrollToNode(currentNode);
        
        if (NetworkState.nodes[currentNode].classList.contains('powered-off')) {
            DOM.status.textContent = `Data packet failed: PC ${currentNode} is powered off!`;
            addMessageToHistory(`Data packet failed: PC ${currentNode} is powered off`, false);
            NetworkState.messagesFailed++;
            updateStats();
            setTimeout(resetNetwork, 2000);
            return;
        }
        
        NetworkState.nodes[currentNode].classList.add('active');
        
        if (i < path.length - 1) {
            const connectionIndex = Math.min(currentNode, path[i + 1]) - 1;
            const connection = NetworkState.connections[connectionIndex];
            
            if (connection.classList.contains('broken')) {
                DOM.status.textContent = `Data packet failed: Wire between PC ${currentNode} and PC ${path[i + 1]} is broken!`;
                addMessageToHistory(`Data packet failed: Wire between PC ${currentNode} and PC ${path[i + 1]} is broken`, false);
                NetworkState.messagesFailed++;
                updateStats();
                setTimeout(resetNetwork, 2000);
                return;
            }
            
            if (NetworkState.nodes[path[i + 1]].classList.contains('powered-off')) {
                DOM.status.textContent = `Data packet failed: PC ${path[i + 1]} is powered off!`;
                addMessageToHistory(`Data packet failed: PC ${path[i + 1]} is powered off`, false);
                NetworkState.messagesFailed++;
                updateStats();
                setTimeout(resetNetwork, 2000);
                return;
            }
            
            connection.classList.add('active');
            const dataPacket = connection.querySelector('.data-packet');
            dataPacket.style.display = 'block';
            
            if (direction === -1) {
                dataPacket.style.transform = 'translate(50%, -50%) scaleX(-1)';
            } else {
                dataPacket.style.transform = 'translate(-50%, -50%)';
            }
            
            dataPacket.classList.add('moving');
            DOM.status.textContent = `Data packet passing through PC ${currentNode}...`;
            
            const speed = parseFloat(DOM.speedSlider.value);
            await sleep(1000 / speed);
            dataPacket.classList.remove('moving');
            dataPacket.style.display = 'none';
        }
    }
    
    // Scroll to the destination node at the end
    scrollToNode(destinationNode);
    
    DOM.status.textContent = `Data packet successfully delivered from PC ${sourceNode} to PC ${destinationNode}!`;
    addMessageToHistory(`Data packet successfully delivered from PC ${sourceNode} to PC ${destinationNode}`, true);
    updateStats();
    setTimeout(resetNetwork, 2000);
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
            <button id="startTokenBtn" class="btn btn-success" onclick="startTokenPassing()">
                <i class="fas fa-play me-2"></i>Start Token Passing
            </button>
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

    // Start token passing if not already active
    if (!TokenState.isActive) {
        startTokenPassing();
    }

    // Run demo for 30 seconds
    const endTime = Date.now() + 30000;
    
    while (Date.now() < endTime) {
        // Wait for token to be at a node
        await sleep(1000); // Check every second
        
        // Only proceed if token passing is active and we have a current node
        if (TokenState.isActive && TokenState.currentNode) {
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
    
    // Stop token passing after demo
    stopTokenPassing();
    DOM.status.textContent = 'Demo simulation completed!';
    addMessageToHistory('Demo simulation completed', true);
}


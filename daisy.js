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

// DOM Elements
const DOM = {
    status: document.getElementById('status'),
    network: document.getElementById('network'),
    fromNode: document.getElementById('fromNode'),
    toNode: document.getElementById('toNode'),
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
    label.textContent = `PC${id}`;
    
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
 * Adds a message to the history log
 * @param {string} message - The message to log
 * @param {boolean} isSuccess - Whether the message represents a success or failure
 */
function addMessageToHistory(message, isSuccess) {
    const messageItem = document.createElement('div');
    messageItem.className = `message-item ${isSuccess ? 'success' : 'error'}`;
    messageItem.innerHTML = `
        <i class="fas fa-${isSuccess ? 'check-circle' : 'times-circle'}"></i>
        <span>${message}</span>
    `;
    DOM.messageHistory.insertBefore(messageItem, DOM.messageHistory.firstChild);
    
    // Keep only last 10 messages
    if (DOM.messageHistory.children.length > 10) {
        DOM.messageHistory.removeChild(DOM.messageHistory.lastChild);
    }
}

/**
 * Shows a toast notification
 * @param {string} message - The message to display
 * @param {boolean} isSuccess - Whether the message represents a success or failure
 */
function showToast(message, isSuccess) {
    const toastContainer = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${isSuccess ? 'success' : 'error'}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    const icon = isSuccess ? 'check-circle' : 'times-circle';
    const iconClass = isSuccess ? 'success-icon' : 'error-icon';
    
    toast.innerHTML = `
        <div class="toast-header">
            <i class="fas fa-${icon} ${iconClass} me-2"></i>
            <strong class="me-auto">${isSuccess ? 'Success' : 'Error'}</strong>
            <button type="button" class="btn-close toast-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    
    bsToast.show();
    
    // Remove the toast element after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
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
        showToast(`PC${nodeId} powered on`, true);
        addMessageToHistory(`PC${nodeId} powered on`, true);
    } else {
        node.classList.add('powered-off');
        DOM.status.textContent = `PC${nodeId} powered off`;
        showToast(`PC${nodeId} powered off`, true);
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
        showToast('Wire repaired', true);
        addMessageToHistory('Wire repaired', true);
    } else {
        connection.classList.add('broken');
        DOM.status.textContent = 'Wire broken';
        showToast('Wire broken', true);
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
    
    DOM.fromNode.innerHTML = options;
    DOM.toNode.innerHTML = options;
}

/**
 * Adds a new node to the network
 */
function addNode() {
    if (NetworkState.nodeCount >= 10) {
        DOM.status.textContent = 'Maximum number of nodes (10) reached!';
        showToast('Failed to add node: Maximum limit reached', false);
        addMessageToHistory('Failed to add node: Maximum limit reached', false);
        return;
    }
    
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
    showToast(`Node PC${NetworkState.nodeCount} added successfully`, true);
    addMessageToHistory(`Node PC${NetworkState.nodeCount} added successfully`, true);
}

/**
 * Removes the last node from the network
 */
function removeNode() {
    if (NetworkState.nodeCount <= 2) {
        DOM.status.textContent = 'Cannot remove node. Minimum 2 nodes required!';
        showToast('Failed to remove node: Minimum limit reached', false);
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
    showToast(`Node PC${NetworkState.nodeCount + 1} removed successfully`, true);
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

/**
 * Sends a message through the network
 */
async function sendMessage() {
    const fromNode = parseInt(DOM.fromNode.value);
    const toNode = parseInt(DOM.toNode.value);
    
    if (fromNode === toNode) {
        DOM.status.textContent = 'Cannot send message to the same node!';
        showToast('Failed to send message: Same source and destination', false);
        addMessageToHistory('Failed to send message: Same source and destination', false);
        return;
    }
    
    if (NetworkState.nodes[fromNode].classList.contains('powered-off')) {
        DOM.status.textContent = `Cannot send message: PC${fromNode} is powered off!`;
        showToast(`Failed to send message: PC${fromNode} is powered off`, false);
        addMessageToHistory(`Failed to send message: PC${fromNode} is powered off`, false);
        NetworkState.messagesFailed++;
        updateStats();
        return;
    }
    if (NetworkState.nodes[toNode].classList.contains('powered-off')) {
        DOM.status.textContent = `Cannot send message: PC${toNode} is powered off!`;
        showToast(`Failed to send message: PC${toNode} is powered off`, false);
        addMessageToHistory(`Failed to send message: PC${toNode} is powered off`, false);
        NetworkState.messagesFailed++;
        updateStats();
        return;
    }
    
    resetNetwork();
    NetworkState.messagesSent++;
    
    const direction = fromNode < toNode ? 1 : -1;
    const path = [];
    for (let i = fromNode; i !== toNode + direction; i += direction) {
        path.push(i);
    }
    
    for (let i = 0; i < path.length; i++) {
        const currentNode = path[i];
        
        if (NetworkState.nodes[currentNode].classList.contains('powered-off')) {
            DOM.status.textContent = `Message failed: PC${currentNode} is powered off!`;
            showToast(`Message failed: PC${currentNode} is powered off`, false);
            addMessageToHistory(`Message failed: PC${currentNode} is powered off`, false);
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
                DOM.status.textContent = `Message failed: Wire between PC${currentNode} and PC${path[i + 1]} is broken!`;
                showToast(`Message failed: Wire between PC${currentNode} and PC${path[i + 1]} is broken`, false);
                addMessageToHistory(`Message failed: Wire between PC${currentNode} and PC${path[i + 1]} is broken`, false);
                NetworkState.messagesFailed++;
                updateStats();
                setTimeout(resetNetwork, 2000);
                return;
            }
            
            if (NetworkState.nodes[path[i + 1]].classList.contains('powered-off')) {
                DOM.status.textContent = `Message failed: PC${path[i + 1]} is powered off!`;
                showToast(`Message failed: PC${path[i + 1]} is powered off`, false);
                addMessageToHistory(`Message failed: PC${path[i + 1]} is powered off`, false);
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
            DOM.status.textContent = `Message passing through PC${currentNode}...`;
            
            const speed = parseFloat(DOM.speedSlider.value);
            await sleep(1000 / speed);
            dataPacket.classList.remove('moving');
            dataPacket.style.display = 'none';
        }
    }
    
    DOM.status.textContent = `Message successfully delivered from PC${fromNode} to PC${toNode}!`;
    showToast(`Message successfully delivered from PC${fromNode} to PC${toNode}`, true);
    addMessageToHistory(`Message successfully delivered from PC${fromNode} to PC${toNode}`, true);
    updateStats();
    setTimeout(resetNetwork, 2000);
}

/**
 * Toggles all nodes between on and off states
 */
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
        toggleBtn.className = 'btn btn-success w-100';
        toggleBtn.innerHTML = '<i class="fas fa-power-off me-2"></i>All PCs On';
    } else {
        toggleBtn.className = 'btn btn-danger w-100';
        toggleBtn.innerHTML = '<i class="fas fa-power-off me-2"></i>All PCs Off';
    }
    
    const newState = anyPoweredOff ? 'on' : 'off';
    DOM.status.textContent = `All PCs powered ${newState}`;
    showToast(`All PCs powered ${newState}`, true);
    addMessageToHistory(`All PCs powered ${newState}`, true);
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
    // Add 5 PCs initially
    for (let i = 0; i < 5; i++) {
        addNode();
    }
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


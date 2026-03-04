// Inventory Management System using localStorage

// Initialize Data Structure
const STORAGE_KEYS = {
    INVENTORY: 'inventoryItems',
    USER_PROFILE: 'userProfile'
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Check current page and initialize accordingly
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('index.html') || currentPage === '/') {
        initializeDashboard();
    } else if (currentPage.includes('about.html')) {
        initializeProfile();
    }
}

// ==================== DASHBOARD FUNCTIONS ====================

function initializeDashboard() {
    const itemForm = document.getElementById('itemForm');
    if (itemForm) {
        itemForm.addEventListener('submit', handleAddItem);
    }

    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', handleClearAll);
    }

    // Add input validation listeners
    const quantityInput = document.getElementById('itemQuantity');
    if (quantityInput) {
        quantityInput.addEventListener('input', function() {
            // Remove any non-numeric characters
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }

    const priceInput = document.getElementById('itemPrice');
    if (priceInput) {
        priceInput.addEventListener('input', function() {
            // Allow only numbers and one decimal point
            this.value = this.value.replace(/[^0-9.]/g, '');
            // Prevent multiple decimal points
            const parts = this.value.split('.');
            if (parts.length > 2) {
                this.value = parts[0] + '.' + parts[1];
            }
        });
    }

    // Display inventory immediately for faster page load
    displayInventoryList();
    displayStats();
    
    // Defer chart initialization to avoid UI blocking
    requestAnimationFrame(() => {
        initializeCharts();
    });
}

function handleAddItem(e) {
    e.preventDefault();

    const itemName = document.getElementById('itemName').value.trim();
    const itemQuantityInput = document.getElementById('itemQuantity').value.trim();
    const itemPriceInput = document.getElementById('itemPrice').value.trim();

    // Validation: Check if fields are empty
    if (!itemName || !itemQuantityInput || !itemPriceInput) {
        alert('Please fill in all fields');
        return;
    }

    // Validation: Check if quantity is a valid positive integer
    const itemQuantity = parseInt(itemQuantityInput);
    if (isNaN(itemQuantity) || itemQuantity <= 0 || !Number.isInteger(itemQuantity)) {
        alert('Quantity must be a positive whole number');
        return;
    }

    // Validation: Check if price is a valid non-negative number
    const itemPrice = parseFloat(itemPriceInput);
    if (isNaN(itemPrice) || itemPrice < 0) {
        alert('Price must be a valid non-negative number');
        return;
    }

    // Get existing inventory
    let inventory = getInventory();

    // Check if item already exists - PREVENT DUPLICATES
    const existingItem = inventory.find(item => item.name.toLowerCase() === itemName.toLowerCase());

    if (existingItem) {
        // Reject duplicate items
        alert(`The item "${itemName}" already exists in your inventory. Please use a different name or delete the existing item first.`);
        return;
    }

    // Add new item
    const newItem = {
        id: Date.now(),
        name: itemName,
        quantity: itemQuantity,
        price: itemPrice,
        dateAdded: new Date().toLocaleDateString()
    };
    inventory.push(newItem);

    // Save to localStorage
    saveInventory(inventory);

    // Clear form
    document.getElementById('itemForm').reset();
    document.getElementById('itemName').focus();

    // Refresh display
    displayInventoryList();
    if (document.getElementById('totalItems')) {
        displayStats();
        updateCharts();
    }
}

function displayInventoryList() {
    const inventory = getInventory();
    const inventoryList = document.getElementById('inventoryList');
    const clearAllBtn = document.getElementById('clearAllBtn');

    if (!inventoryList) return;

    if (inventory.length === 0) {
        inventoryList.innerHTML = '<p class="empty-message">No items in inventory yet. Add one to get started!</p>';
        if (clearAllBtn) clearAllBtn.style.display = 'none';
        return;
    }

    if (clearAllBtn) clearAllBtn.style.display = 'block';

    inventoryList.innerHTML = inventory.map(item => {
        const totalValue = (item.quantity * item.price).toFixed(2);
        return `
        <div class="inventory-item">
            <div class="item-info">
                <div class="item-name">${escapeHtml(item.name)}</div>
                <div class="item-details">
                    <span class="item-detail">Qty: ${item.quantity}</span>
                    <span class="item-detail">Price: $${parseFloat(item.price).toFixed(2)}</span>
                    <span class="item-detail">Total: $${totalValue}</span>
                </div>
                <div class="item-quantity">Added: ${item.dateAdded}</div>
            </div>
            <button class="btn btn-danger" onclick="deleteItem(${item.id})">Delete</button>
        </div>
        `;
    }).join('');
}

function deleteItem(id) {
    if (confirm('Are you sure you want to delete this item?')) {
        let inventory = getInventory();
        inventory = inventory.filter(item => item.id !== id);
        saveInventory(inventory);
        displayInventoryList();
        if (document.getElementById('totalItems')) {
            displayStats();
            updateCharts();
        }
    }
}

function handleClearAll() {
    if (confirm('Are you sure you want to clear all items? This cannot be undone.')) {
        saveInventory([]);
        displayInventoryList();
        if (document.getElementById('totalItems')) {
            displayStats();
            updateCharts();
        }
    }
}

// ==================== PROFILE FUNCTIONS ====================

function initializeProfile() {
    loadProfileData();
    displayStats();
    initializeCharts();

    // Save profile button removed; profile is read-only on Developer Profile page.
}

function loadProfileData() {
    const profile = getProfile();

    const userNameInput = document.getElementById('userName');
    const userEmailInput = document.getElementById('userEmail');
    const userCompanyInput = document.getElementById('userCompany');

    if (userNameInput) userNameInput.value = profile.name;
    if (userEmailInput) userEmailInput.value = profile.email;
    if (userCompanyInput) userCompanyInput.value = profile.company;
}

function saveProfileData() {
    const profile = {
        name: document.getElementById('userName').value || '',
        email: document.getElementById('userEmail').value || '',
        company: document.getElementById('userCompany').value || ''
    };

    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    alert('Profile saved successfully!');
}

function displayStats() {
    const inventory = getInventory();

    const totalItems = inventory.length;
    const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);

    const totalItemsEl = document.getElementById('totalItems');
    const totalQuantityEl = document.getElementById('totalQuantity');

    if (totalItemsEl) totalItemsEl.textContent = totalItems;
    if (totalQuantityEl) totalQuantityEl.textContent = totalQuantity;
}

// ==================== CHART FUNCTIONS ====================

let barChartInstance = null;
let pieChartInstance = null;
let lastInventoryHash = '';

function initializeCharts() {
    updateCharts();
}

function updateCharts() {
    const inventory = getInventory();
    // Avoid redrawing if inventory didn't change
    const currentHash = JSON.stringify(inventory);
    if (currentHash === lastInventoryHash) return;
    lastInventoryHash = currentHash;

    if (inventory.length === 0) {
        // Clear charts if no inventory
        if (barChartInstance) {
            barChartInstance.destroy();
            barChartInstance = null;
        }
        if (pieChartInstance) {
            pieChartInstance.destroy();
            pieChartInstance = null;
        }
        return;
    }

    updateBarChart(inventory);
    updatePieChart(inventory);
}

function updateBarChart(inventory) {
    const ctx = document.getElementById('barChart');
    if (!ctx) return;

    const labels = inventory.map(item => item.name);
    const data = inventory.map(item => item.quantity);

    // Destroy existing chart
    if (barChartInstance) {
        barChartInstance.destroy();
    }

    const colors = generateColors(inventory.length);

    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantity',
                data: data,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.7', '1')),
                borderWidth: 2,
                borderRadius: 5,
                hoverBackgroundColor: colors.map(color => color.replace('0.7', '0.9'))
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        padding: 15
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 11
                        }
                    },
                    title: {
                        display: true,
                        text: 'Quantity'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

function updatePieChart(inventory) {
    const ctx = document.getElementById('pieChart');
    if (!ctx) return;

    const labels = inventory.map(item => item.name);
    const data = inventory.map(item => item.quantity);
    const colors = generateColors(inventory.length);

    // Destroy existing chart
    if (pieChartInstance) {
        pieChartInstance.destroy();
    }

    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 11
                        },
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function generateColors(count) {
    const baseColors = [
        'rgba(99, 102, 241, 0.7)',      // Indigo
        'rgba(139, 92, 246, 0.7)',     // Violet
        'rgba(236, 72, 153, 0.7)',     // Pink
        'rgba(59, 130, 246, 0.7)',     // Blue
        'rgba(34, 197, 94, 0.7)',      // Green
        'rgba(248, 113, 113, 0.7)',    // Red
        'rgba(251, 146, 60, 0.7)',     // Orange
        'rgba(14, 165, 233, 0.7)'      // Cyan
    ];

    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
}

// ==================== STORAGE FUNCTIONS ====================

function getInventory() {
    const data = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    return data ? JSON.parse(data) : [];
}

function saveInventory(inventory) {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
}

function getProfile() {
    const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return data ? JSON.parse(data) : {
        name: '',
        email: '',
        company: ''
    };
}

// ==================== UTILITY FUNCTIONS ====================

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Update stats and charts whenever inventory changes (for profile page auto-update)
setInterval(() => {
    if (document.getElementById('totalItems')) {
        displayStats();
        updateCharts();
    }
}, 1000);

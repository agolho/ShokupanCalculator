// State Management
const STATE = {
    pan: { x: 20, y: 10, z: 10, volume: 2000, directLiters: 2.0 },
    mode: 'pan',
    manualFlour: 500,
    settings: {
        grPerLiter: 286,
        density: 1.0,
        hydration: 70,
    },
    costs: {
        flour: 36, milk: 50, sugar: 50, butter: 400, salt: 45, yeast: 1000,
        electricity: 3, bakingTime: 35, ovenPower: 2.0
    },
    ingredients: [
        // Default Ingredients
        { id: 'sugar', name: 'Sugar', percent: 6, isLiquid: false },
        { id: 'butter', name: 'Butter', percent: 5, isLiquid: false },
        { id: 'salt', name: 'Salt', percent: 1.7, isLiquid: false },
        { id: 'yeast', name: 'Yeast', percent: 0.6, isLiquid: false },
        // Composite
        {
            id: 'yudane',
            name: 'Yudane',
            type: 'preferment',
            percent: 20,
            composition: { flour: 1, water: 2 }
        },
        // Liquid Example
        { id: 'milk', name: 'Milk', percent: 10, isLiquid: true } // 10% Milk
    ]
};

// DOM Cache
const domCache = {};
const inputIds = [
    'x', 'y', 'z', 'directLiters', 'grPerLiter', 'density', 'hydration', 'manualFlour'
];

let isLoadingState = false;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    cacheDomElements();
    init();
    window.toggleIngType = toggleIngType;
    window.toggleCalcMode = toggleCalcMode;
    attachGlobalListeners();
});

function cacheDomElements() {
    inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) domCache[id] = el;
    });
}

function init() {
    loadState();
}

// --- Logic ---

function calculateIngredients() {
    if (isLoadingState) return;

    // 1. Calculate Volume & Total Dough Target
    let x = parseFloat(domCache.x.value) || 0;
    let y = parseFloat(domCache.y.value) || 0;
    let z = parseFloat(domCache.z.value) || 0;

    // Sync Liters
    if (document.activeElement && document.activeElement.id === 'directLiters') {
        const newLiters = parseFloat(domCache.directLiters.value) || 0;
        const currentVol = x * y * z;
        if (currentVol > 0) {
            const scale = Math.cbrt((newLiters * 1000) / currentVol);
            x *= scale; y *= scale; z *= scale;
            domCache.x.value = x.toFixed(2);
            domCache.y.value = y.toFixed(2);
            domCache.z.value = z.toFixed(2);
        }
    } else {
        const volLiters = (x * y * z) / 1000;
        if (domCache.directLiters) domCache.directLiters.value = volLiters.toFixed(2);
    }
    const volumeLiters = (x * y * z) / 1000;
    document.getElementById('volume').textContent = (volumeLiters * 1000).toFixed(0) + ' cm³';

    const grPerLiter = parseFloat(domCache.grPerLiter.value) || 286;
    const density = parseFloat(domCache.density.value) || 1.0;

    // 2. Calculate Total Percentage (Needed for both modes if we want correct ratios)
    const targetHydration = (parseFloat(domCache.hydration.value) || 70) / 100;
    let totalPercentage = 1 + targetHydration;

    // Solids Sum
    STATE.ingredients.forEach(ing => {
        if (ing.type === 'preferment') return; // Handled as Flour+Water
        if (!ing.isLiquid) {
            totalPercentage += (ing.percent / 100);
        }
    });

    let totalFlour = 0;

    if (STATE.mode === 'flour') {
        // Direct Flour Mode
        totalFlour = parseFloat(domCache.manualFlour.value) || 0;
    } else {
        // Pan Calculation Mode
        let totalDoughTarget = volumeLiters * grPerLiter * density;
        totalFlour = totalDoughTarget / totalPercentage;
    }

    const totalTargetWater = totalFlour * targetHydration;

    // 3. Process Ingredients
    let prefermentFlourTotal = 0;
    let prefermentWaterTotal = 0;
    let assignedLiquidTotal = 0;

    // A. Pre-ferments
    STATE.ingredients.forEach(ing => {
        if (ing.type === 'preferment') {
            const pFlour = totalFlour * (ing.percent / 100);
            const ratio = ing.composition || { flour: 1, water: 0 };
            const waterRatio = ratio.water / ratio.flour;
            const pWater = pFlour * waterRatio;

            ing.breakdown = { flour: pFlour, water: pWater };
            ing.weight = Math.round(pFlour + pWater);
            ing.currentWeight = ing.weight;

            prefermentFlourTotal += pFlour;
            prefermentWaterTotal += pWater;
        }
    });

    // B. Standard Ingredients
    STATE.ingredients.forEach(ing => {
        if (ing.type === 'preferment') return;

        let weight = Math.round(totalFlour * (ing.percent / 100));
        ing.weight = weight;
        ing.currentWeight = weight;

        if (ing.isLiquid) {
            assignedLiquidTotal += weight;
        }
    });

    // 4. Calculate Main Water
    // Total Water Needed = TargetHydration * TotalFlour
    // Already Supplied = Preferment Water + Assigned Liquids (Milk, Eggs)
    // Remaining = Main Water

    const waterSupplied = prefermentWaterTotal + assignedLiquidTotal;
    const mainWater = Math.max(0, totalTargetWater - waterSupplied);
    const mainFlour = Math.max(0, totalFlour - prefermentFlourTotal);

    // 5. Results
    // Recalculate Total Weight for check
    let totalCalcWeight = mainFlour + mainWater + prefermentFlourTotal + prefermentWaterTotal;
    STATE.ingredients.forEach(i => {
        if (i.type !== 'preferment') totalCalcWeight += i.weight;
    });

    const results = {
        mainFlour: Math.round(mainFlour),
        mainWater: Math.round(mainWater), // Explicit Water
        totalFlour: Math.round(totalFlour),
        totalWater: Math.round(totalTargetWater),
        actualHydration: targetHydration * 100,
        totalDough: Math.round(totalCalcWeight),
        ingredients: STATE.ingredients
    };

    updateUI(results);
    saveState();
}

function updateUI(results) {
    // Static fields
    setText('flour', results.mainFlour + ' g');
    setText('totalDough', results.totalDough + ' g');
    setText('totalFlour', results.totalFlour + ' g');
    setText('totalWater', results.totalWater + ' g');
    setText('actualHydration', results.actualHydration.toFixed(1) + '%');

    // Dynamic Ingredients
    const container = document.getElementById('dynamicIngredients');
    container.innerHTML = '';

    // 1. Render Implicit Water first (or last? Conventionally first liquid)
    const waterDiv = document.createElement('div');
    waterDiv.className = 'result-item';
    waterDiv.style.backgroundColor = '#f0f8ff50'; // Slight tint
    waterDiv.innerHTML = `
        <div class="ingredient-label-group">
             <span class="result-label" style="font-weight:bold;">Water (Auto):</span>
        </div>
        <span class="result-value" style="font-weight:bold;">${results.mainWater} g</span>
    `;
    container.appendChild(waterDiv);

    // 2. Render Other Ingredients
    results.ingredients.forEach((ing, index) => {
        const div = document.createElement('div');
        div.className = 'result-item';

        const badge = ing.isLiquid ? `<span class="badge" style="background:#e3f2fd; color:#0d47a1; font-size:0.7em; padding:1px 4px; border-radius:3px; margin-right:4px;">Liq</span>` : '';

        const controlHtml = `
            <div class="number-input-custom tiny">
                <button onclick="adjustPercent(${index}, -0.1)">-</button>
                <span class="value-display" onclick="editPercent(${index})">${ing.percent.toFixed(1)}%</span>
                <button onclick="adjustPercent(${index}, 0.1)">+</button>
            </div>
        `;

        const actionsHtml = `
            <button class="icon-btn remove-btn" onclick="removeIngredient(${index})">&times;</button>
        `;

        let breakdownHtml = '';
        if (ing.type === 'preferment' && ing.breakdown) {
            breakdownHtml = `
                 <div style="font-size:0.85em; color:#666; margin-left: 10px; margin-top:2px;">
                    ↳ Flour: ${Math.round(ing.breakdown.flour)}g, Water: ${Math.round(ing.breakdown.water)}g
                </div>
            `;
        }

        div.innerHTML = `
            <div style="flex:1;">
                <div class="ingredient-label-group">
                    <div style="display:flex; align-items:center; gap:8px;">
                        ${controlHtml}
                        <div style="display:flex; align-items:center;">
                            ${badge}
                            <span class="result-label">${ing.name}:</span>
                        </div>
                    </div>
                </div>
                ${breakdownHtml}
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <span class="result-value">${ing.weight} g</span>
                ${actionsHtml}
            </div>
        `;
        container.appendChild(div);
    });
}


function toggleCalcMode() {
    const radios = document.getElementsByName('calcMode');
    let mode = 'pan';
    for (const r of radios) { if (r.checked) mode = r.value; }

    STATE.mode = mode;

    const panSection = document.getElementById('panInputSection');
    const flourSection = document.getElementById('flourInputSection');
    const resultPanVolume = document.getElementById('volume').parentElement;

    // Additional UI Toggle logic if needed (e.g. hiding Gr/L settings)
    const grPerLiterSection = document.getElementById('grPerLiter').closest('.input-group');
    const densitySection = document.getElementById('density').closest('.input-group');

    if (mode === 'flour') {
        panSection.style.display = 'none';
        flourSection.style.display = 'block';
        if (resultPanVolume) resultPanVolume.style.visibility = 'hidden';
        if (grPerLiterSection) grPerLiterSection.style.display = 'none';
        if (densitySection) densitySection.style.display = 'none';
    } else {
        panSection.style.display = 'flex'; // Restore flex for layout
        flourSection.style.display = 'none';
        if (resultPanVolume) resultPanVolume.style.visibility = 'visible';
        if (grPerLiterSection) grPerLiterSection.style.display = 'block';
        if (densitySection) densitySection.style.display = 'block';
    }

    calculateIngredients();
}

function toggleIngType() {
    const radios = document.getElementsByName('ingType');
    let type = 'simple';
    for (const r of radios) { if (r.checked) type = r.value; }

    const compFields = document.getElementById('compositeFields');
    const simpleFields = document.getElementById('simpleFields');
    const percentLabel = document.getElementById('percentLabel');
    const percentHint = document.getElementById('percentHint');

    if (type === 'preferment') {
        compFields.style.display = 'block';
        simpleFields.style.display = 'none';
        percentLabel.textContent = 'Flour Share (%)';
        percentHint.style.display = 'block';
    } else {
        compFields.style.display = 'none';
        simpleFields.style.display = 'block';
        percentLabel.textContent = 'Percentage (%)';
        percentHint.style.display = 'none';
    }
}

function adjustPercent(index, delta) {
    STATE.ingredients[index].percent = Math.max(0, parseFloat((STATE.ingredients[index].percent + delta).toFixed(1)));
    calculateIngredients();
}

function editPercent(index) {
    const newPct = prompt(`Enter new percentage for ${STATE.ingredients[index].name}:`, STATE.ingredients[index].percent);
    if (newPct !== null && !isNaN(newPct)) {
        STATE.ingredients[index].percent = parseFloat(parseFloat(newPct).toFixed(1));
        calculateIngredients();
    }
}

function removeIngredient(index) {
    if (confirm(`Remove ${STATE.ingredients[index].name}?`)) {
        STATE.ingredients.splice(index, 1);
        calculateIngredients();
    }
}

function addIngredient(name, percent, type = 'simple', composition = null, isLiquid = false) {
    const newIng = {
        id: 'custom_' + Date.now(),
        name: name,
        percent: parseFloat(percent),
        isLiquid: isLiquid,
        type: type,
    };
    if (type === 'preferment' && composition) {
        newIng.composition = composition;
    }
    STATE.ingredients.push(newIng);
    calculateIngredients();
}

// Logic for Modal "Add" button
function handleModalAdd() {
    const name = document.getElementById('newIngName').value;
    const pct = document.getElementById('newIngPercent').value;

    const radios = document.getElementsByName('ingType');
    let type = 'simple';
    for (const r of radios) { if (r.checked) type = r.value; }

    let composition = null;
    let isLiquid = false;

    if (type === 'preferment') {
        const f = parseFloat(document.getElementById('compFlour').value) || 1;
        const w = parseFloat(document.getElementById('compWater').value) || 1;
        composition = { flour: f, water: w };
    } else {
        isLiquid = document.getElementById('newIngIsLiquid').checked;
    }

    if (name && pct) {
        addIngredient(name, pct, type, composition, isLiquid);
        document.getElementById('addIngredientModal').style.display = 'none';
        document.getElementById('newIngName').value = '';
        document.getElementById('newIngPercent').value = '1';
        document.getElementById('newIngIsLiquid').checked = false;
    }
}


// --- Helper Utilities ---

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function attachGlobalListeners() {
    // Inputs
    inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calculateIngredients);
    });

    // Add Btn
    const addBtn = document.getElementById('addIngredientBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            document.getElementById('addIngredientModal').style.display = 'flex';
            document.getElementById('newIngName').focus();
        });
    }
    // Confirm Btn
    const confirmBtn = document.getElementById('confirmAddIng');
    if (confirmBtn) {
        confirmBtn.onclick = handleModalAdd;
    }
    // Close Btns
    document.querySelectorAll('.close-button, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
}


// --- Persistence ---
function saveState() {
    const serializable = {
        pan: {
            x: domCache.x.value,
            y: domCache.y.value,
            z: domCache.z.value,
            directLiters: domCache.directLiters.value
        },
        mode: STATE.mode,
        manualFlour: domCache.manualFlour.value,
        settings: {
            grPerLiter: domCache.grPerLiter.value,
            density: domCache.density.value,
            hydration: domCache.hydration.value
        },
        ingredients: STATE.ingredients
    };
    localStorage.setItem('shokupanState_v4', JSON.stringify(serializable)); // v4
}

function loadState() {
    const saved = JSON.parse(localStorage.getItem('shokupanState_v4'));
    if (saved) {
        if (saved.pan) {
            if (domCache.x) domCache.x.value = saved.pan.x;
            if (domCache.y) domCache.y.value = saved.pan.y;
            if (domCache.z) domCache.z.value = saved.pan.z;
            if (domCache.directLiters) domCache.directLiters.value = saved.pan.directLiters;
        }
        if (saved.mode) {
            STATE.mode = saved.mode;
            // Update Radio Buttons
            const radios = document.getElementsByName('calcMode');
            for (const r of radios) {
                if (r.value === saved.mode) r.checked = true;
            }
            // Trigger UI update
            toggleCalcMode();
        }
        if (saved.manualFlour && domCache.manualFlour) {
            domCache.manualFlour.value = saved.manualFlour;
        }
        if (saved.settings) {
            if (domCache.grPerLiter) domCache.grPerLiter.value = saved.settings.grPerLiter;
            if (domCache.density) domCache.density.value = saved.settings.density;
            if (domCache.hydration) domCache.hydration.value = saved.settings.hydration;
        }
        if (saved.ingredients) STATE.ingredients = saved.ingredients;
    }
}

// Export functions for global access
window.removeIngredient = removeIngredient;
window.adjustPercent = adjustPercent;
window.editPercent = editPercent;
window.toggleIngType = toggleIngType;

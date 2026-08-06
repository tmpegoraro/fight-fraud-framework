document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loadingEl = document.getElementById('loading');
    const matrixWrapper = document.querySelector('.matrix-wrapper');
    const matrixContainer = document.getElementById('matrix-container');
    
    const panelOverlay = document.getElementById('panel-overlay');
    const detailPanel = document.getElementById('detail-panel');
    const closePanelBtn = document.getElementById('close-panel');
    
    // Panel Elements
    const detailTitle = document.getElementById('detail-title');
    const detailId = document.getElementById('detail-id');
    const detailTactic = document.getElementById('detail-tactic');
    const detailDescription = document.getElementById('detail-description');
    const detailParentContainer = document.getElementById('detail-parent-container');
    const detailParent = document.getElementById('detail-parent');
    const detailPlatformsContainer = document.getElementById('detail-platforms-container');
    const detailPlatforms = document.getElementById('detail-platforms');
    const detailSourcesContainer = document.getElementById('detail-sources-container');
    const detailSources = document.getElementById('detail-sources');
    const detailAdherence = document.getElementById('detail-adherence');
    const adherenceFeedback = document.getElementById('adherence-save-feedback');
    const statusFilter = document.getElementById('status-filter');
    const filterBar = document.getElementById('filter-bar');
    
    // Translation Elements
    const langEngBtn = document.getElementById('lang-eng');
    const langPtBtn = document.getElementById('lang-pt');
    const descriptionEngContainer = document.getElementById('description-eng-container');
    const descriptionPtContainer = document.getElementById('description-pt-container');
    const descPtReadonly = document.getElementById('detail-description-pt');
    
    let currentDetailItem = null;
    let currentDetailTactic = null;
    let currentStatusFilter = 'todos';
    let currentLanguage = 'ENG';

    // Data Storage
    let tacticsMap = new Map(); // id -> { id, name, items: [] }
    let techniquesMap = new Map(); // tech_id -> item_data
    let adherenceMap = new Map(); // tech_id -> status
    let translationsMap = new Map(); // tech_id -> description_pt

    // 1. Fetch and Parse CSV
    Papa.parse('f3_matrix_export.csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: async function(results) {
            await Promise.all([fetchAdherence(), fetchTranslations()]);
            processData(results.data);
            renderMatrix();
            loadingEl.style.display = 'none';
            matrixWrapper.style.display = 'block';
            filterBar.style.display = 'flex';
        },
        error: function(error) {
            console.error("Error parsing CSV:", error);
            loadingEl.innerHTML = `<p style="color:red">Erro ao carregar dados: ${error.message}</p>`;
        }
    });

    async function fetchAdherence() {
        try {
            const response = await fetch('/api/adherence');
            const data = await response.json();
            for (const [key, status] of Object.entries(data)) {
                adherenceMap.set(key, status);
            }
        } catch (error) {
            console.error("Error fetching adherence:", error);
        }
    }

    async function fetchTranslations() {
        try {
            const response = await fetch('/api/translations');
            const data = await response.json();
            for (const [techId, descPt] of Object.entries(data)) {
                translationsMap.set(techId, descPt);
            }
        } catch (error) {
            console.error("Error fetching translations:", error);
        }
    }

    // 2. Process Data
    function processData(data) {
        // First pass: extract all unique tactics
        data.forEach(row => {
            if (!row.tactic_id) return;
            
            const t_ids = row.tactic_id.split(',').map(s => s.trim());
            const t_names = row.tactic_name.split(',').map(s => s.trim());
            
            t_ids.forEach((tid, idx) => {
                if (!tacticsMap.has(tid)) {
                    tacticsMap.set(tid, {
                        id: tid,
                        name: t_names[idx] || tid,
                        items: []
                    });
                }
            });
            
            // Store technique in a global map
            techniquesMap.set(row.technique_id, row);
        });

        // Second pass: assign techniques/subtechniques to tactics
        data.forEach(row => {
            if (!row.tactic_id) return;
            
            const t_ids = row.tactic_id.split(',').map(s => s.trim());
            
            t_ids.forEach(tid => {
                const tactic = tacticsMap.get(tid);
                tactic.items.push(row);
            });
        });

        // Sort items in each tactic: parent techniques first, then subtechniques under their parent
        tacticsMap.forEach(tactic => {
            const sorted = [];
            const parents = tactic.items.filter(i => !i.parent_technique_id);
            const subs = tactic.items.filter(i => i.parent_technique_id);

            // Sort parents alphabetically by name or ID
            parents.sort((a, b) => a.technique_name.localeCompare(b.technique_name));

            parents.forEach(p => {
                sorted.push(p);
                // Find and append subtechniques for this parent
                const children = subs.filter(s => s.parent_technique_id === p.technique_id);
                children.sort((a, b) => a.technique_id.localeCompare(b.technique_id));
                sorted.push(...children);
            });
            
            tactic.items = sorted;
        });
    }

    // 3. Render Matrix
    function renderMatrix() {
        matrixContainer.innerHTML = '';
        
        // Ordem oficial das táticas conforme o site do MITRE F3
        const tacticOrder = [
            "Reconnaissance",
            "Resource Development",
            "Initial Access",
            "Stealth",
            "Defense Impairment",
            "Positioning",
            "Execution",
            "Monetization"
        ];

        // Convert Map to array and sort by the predefined order
        const tacticsList = Array.from(tacticsMap.values()).sort((a, b) => {
            let indexA = tacticOrder.indexOf(a.name);
            let indexB = tacticOrder.indexOf(b.name);
            
            // Caso alguma tática não esteja na lista, joga pro final
            if (indexA === -1) indexA = 999;
            if (indexB === -1) indexB = 999;
            
            return indexA - indexB;
        });

        tacticsList.forEach(tactic => {
            const filteredItems = tactic.items.filter(item => {
                const key = `${tactic.id}_${item.technique_id}`;
                const status = adherenceMap.get(key) || 'nao_avaliado';
                return currentStatusFilter === 'todos' || status === currentStatusFilter;
            });

            if (filteredItems.length === 0) return; // Oculta a coluna se não houver itens correspondentes
            
            const col = document.createElement('div');
            col.className = 'tactic-column';
            
            // Header
            const header = document.createElement('div');
            header.className = 'tactic-header';
            header.innerHTML = `
                <div class="tactic-name">${tactic.name}</div>
                <div class="tactic-id">${tactic.id}</div>
                <div class="tactic-count">${filteredItems.length} técnicas</div>
            `;
            col.appendChild(header);
            
            // List
            const list = document.createElement('div');
            list.className = 'techniques-list';
            
            filteredItems.forEach(item => {
                const isSub = !!item.parent_technique_id;
                const card = document.createElement('div');
                card.className = isSub ? 'subtechnique-card' : 'technique-card';
                
                // If it's a parent, check if it has subtechniques (for UI styling)
                if (!isSub) {
                    const hasSubs = tactic.items.some(i => i.parent_technique_id === item.technique_id);
                    if (hasSubs) card.classList.add('has-subtechniques');
                }

                const key = `${tactic.id}_${item.technique_id}`;
                const status = adherenceMap.get(key) || 'nao_avaliado';
                card.classList.add(`status-${status}`);

                card.innerHTML = `
                    <div class="${isSub ? 'subtechnique-name' : 'technique-name'}">${item.technique_name}</div>
                    <div class="technique-id">${item.technique_id}</div>
                `;
                
                card.addEventListener('click', () => openDetailPanel(tactic, item));
                list.appendChild(card);
            });
            
            col.appendChild(list);
            matrixContainer.appendChild(col);
        });
    }

    // 4. Panel Interactions
    function openDetailPanel(tactic, item) {
        currentDetailItem = item;
        currentDetailTactic = tactic;
        detailTitle.textContent = item.technique_name;
        detailId.textContent = item.technique_id;
        detailTactic.textContent = tactic.name || 'Desconhecido';
        
        const key = `${tactic.id}_${item.technique_id}`;
        detailAdherence.value = adherenceMap.get(key) || 'nao_avaliado';
        adherenceFeedback.textContent = '';
        
        detailDescription.textContent = item.description || 'Nenhuma descrição fornecida.';
        
        // Handle Translation view
        const ptText = translationsMap.get(item.technique_id) || '';
        descPtReadonly.textContent = ptText || item.description || 'Nenhuma descrição fornecida.';
        
        updateLanguageView();
        
        // Parent Technique
        if (item.parent_technique_id) {
            const parent = techniquesMap.get(item.parent_technique_id);
            detailParent.textContent = parent ? `${parent.technique_name} (${item.parent_technique_id})` : item.parent_technique_id;
            detailParentContainer.style.display = 'block';
        } else {
            detailParentContainer.style.display = 'none';
        }

        // Platforms
        if (item.platforms) {
            detailPlatforms.textContent = item.platforms;
            detailPlatformsContainer.style.display = 'block';
        } else {
            detailPlatformsContainer.style.display = 'none';
        }

        // Sources
        if (item.sources) {
            detailSources.innerHTML = '';
            const urls = item.sources.split(',').map(s => s.trim());
            urls.forEach(url => {
                if(!url) return;
                const li = document.createElement('li');
                li.innerHTML = `<a href="${url}" target="_blank">${url}</a>`;
                detailSources.appendChild(li);
            });
            detailSourcesContainer.style.display = 'block';
        } else {
            detailSourcesContainer.style.display = 'none';
        }

        panelOverlay.classList.add('active');
        detailPanel.classList.add('active');
    }

    function closePanel() {
        panelOverlay.classList.remove('active');
        detailPanel.classList.remove('active');
    }

    closePanelBtn.addEventListener('click', closePanel);
    panelOverlay.addEventListener('click', closePanel);

    detailAdherence.addEventListener('change', async (e) => {
        if (!currentDetailItem || !currentDetailTactic) return;
        const newStatus = e.target.value;
        const techId = currentDetailItem.technique_id;
        const tacticId = currentDetailTactic.id;
        const key = `${tacticId}_${techId}`;
        
        adherenceFeedback.textContent = 'Salvando...';
        adherenceFeedback.style.color = '#666';

        try {
            const response = await fetch('/api/adherence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tactic_id: tacticId, technique_id: techId, status: newStatus })
            });

            if (response.ok) {
                adherenceMap.set(key, newStatus);
                adherenceFeedback.textContent = 'Salvo!';
                adherenceFeedback.style.color = 'green';
                renderMatrix(); // update colors and potentially filter
                setTimeout(() => { adherenceFeedback.textContent = ''; }, 2000);
            } else {
                adherenceFeedback.textContent = 'Erro ao salvar';
                adherenceFeedback.style.color = 'red';
            }
        } catch (error) {
            console.error("Save error:", error);
            adherenceFeedback.textContent = 'Erro de conexão';
            adherenceFeedback.style.color = 'red';
        }
    });

    statusFilter.addEventListener('change', (e) => {
        currentStatusFilter = e.target.value;
        renderMatrix();
    });

    // Language Toggle Logic
    function updateLanguageView() {
        if (currentLanguage === 'ENG') {
            langEngBtn.classList.add('active');
            langPtBtn.classList.remove('active');
            descriptionEngContainer.style.display = 'block';
            descriptionPtContainer.style.display = 'none';
        } else {
            langEngBtn.classList.remove('active');
            langPtBtn.classList.add('active');
            descriptionEngContainer.style.display = 'none';
            descriptionPtContainer.style.display = 'block';
        }
    }

    langEngBtn.addEventListener('click', () => {
        currentLanguage = 'ENG';
        updateLanguageView();
    });

    langPtBtn.addEventListener('click', () => {
        currentLanguage = 'PT-BR';
        updateLanguageView();
    });
});

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const dbPath = path.join(__dirname, 'database.sqlite');
const csvPath = path.join(__dirname, '../temp/exemplo.csv');

const db = new sqlite3.Database(dbPath);

const csvContent = fs.readFileSync(csvPath, 'utf8');

const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    delimiter: ';'
});

const statusMap = {
    'Aderente': 'aderente',
    'Parcialmente aderente': 'parcial',
    'Não aderente': 'nao_aderente',
    'Em implantação': 'implantacao',
    'Não aplicável': 'nao_aplicavel'
};

const validTeams = ["Cartões", "Canais", "Uso Ilícito", "Onboarding", "Compliance"];

function cleanTeams(teamStr) {
    if (!teamStr) return "";
    
    // Normaliza a string (ex: corrige Uso Ilicito para Uso Ilícito)
    let str = teamStr.replace(/Uso Ilicito/gi, "Uso Ilícito");
    
    const found = [];
    for (const valid of validTeams) {
        // Usa string includes para verificação exata ou regex ignorando case
        const regex = new RegExp(valid, 'i');
        if (regex.test(str)) {
            found.push(valid);
        }
    }
    return found.join(',');
}

let updatedCount = 0;

db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    
    const stmt = db.prepare(`
        INSERT INTO adherence_v2 (tactic_id, technique_id, status, teams, updated_at) 
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(tactic_id, technique_id) 
        DO UPDATE SET status=excluded.status, teams=excluded.teams, updated_at=CURRENT_TIMESTAMP
    `);

    for (const row of parsed.data) {
        const techniqueId = row['Technique ID'];
        const tacticIdsRaw = row['Tactic ID'];
        const coberturaRaw = row['Cobertura'] ? row['Cobertura'].trim() : '';
        const timeRaw = row['Time'] ? row['Time'].trim() : '';
        
        if (!techniqueId || !tacticIdsRaw) continue;
        
        // Se a cobertura não existir no mapa ou vier vazia, não atualizamos a técnica no banco
        const status = statusMap[coberturaRaw];
        if (!status) {
            continue;
        }

        const teams = cleanTeams(timeRaw);
        
        const tactics = tacticIdsRaw.split(',').map(s => s.trim()).filter(Boolean);
        for (const tacticId of tactics) {
            stmt.run(tacticId, techniqueId, status, teams);
            updatedCount++;
        }
    }
    
    stmt.finalize();
    db.run("COMMIT", () => {
        console.log(`Importação concluída com sucesso! ${updatedCount} registros (pares Tática-Técnica) inseridos/atualizados.`);
        db.close();
    });
});

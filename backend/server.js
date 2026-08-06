const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Configuração
app.use(cors());
app.use(express.json());

// Servir os arquivos estáticos da pasta frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Conectar ao banco de dados SQLite
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        
        // Criar a tabela automaticamente caso não exista
        db.run(`
            CREATE TABLE IF NOT EXISTS adherence_v2 (
                tactic_id TEXT NOT NULL,
                technique_id TEXT NOT NULL,
                status TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (tactic_id, technique_id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS translations (
                technique_id TEXT PRIMARY KEY,
                description_pt TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }
});

// Endpoint GET: Retorna todas as aderências
app.get('/api/adherence', (req, res) => {
    const sql = `SELECT tactic_id, technique_id, status FROM adherence_v2`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Transforma o array em um dicionário usando tactic_id + technique_id
        const result = {};
        rows.forEach(row => {
            const key = `${row.tactic_id}_${row.technique_id}`;
            result[key] = row.status;
        });
        
        res.json(result);
    });
});

// Endpoint POST: Atualiza ou insere o status de uma técnica
app.post('/api/adherence', (req, res) => {
    const { tactic_id, technique_id, status } = req.body;
    
    if (!tactic_id || !technique_id || !status) {
        return res.status(400).json({ error: 'tactic_id, technique_id e status são obrigatórios' });
    }

    // Usamos INSERT ... ON CONFLICT REPLACE
    const sql = `
        INSERT INTO adherence_v2 (tactic_id, technique_id, status, updated_at) 
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(tactic_id, technique_id) 
        DO UPDATE SET status=excluded.status, updated_at=CURRENT_TIMESTAMP
    `;
    
    db.run(sql, [tactic_id, technique_id, status], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Status atualizado com sucesso!', tactic_id, technique_id, status });
    });
});

// Endpoint GET: Retorna todas as traduções
app.get('/api/translations', (req, res) => {
    const sql = `SELECT technique_id, description_pt FROM translations`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        const result = {};
        rows.forEach(row => {
            result[row.technique_id] = row.description_pt;
        });
        res.json(result);
    });
});

// Inicializar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Página principal: http://localhost:${port}/index.html`);
});

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS adherence (
            technique_id TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error("Erro ao criar a tabela:", err.message);
        } else {
            console.log("Banco de dados inicializado com sucesso e tabela 'adherence' pronta.");
        }
    });
});

db.close();

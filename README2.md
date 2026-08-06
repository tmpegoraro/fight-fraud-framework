# Explorador Interativo de Matriz de Fraudes - F3 (Sicredi)

## Visão Geral
Este projeto é um **Explorador Interativo do MITRE Fight Fraud Framework™ (F3)**, customizado para o time de Prevenção a Fraudes. A ferramenta permite visualizar e interagir com as Táticas e Técnicas do framework original da MITRE, além de permitir o mapeamento interno (Status de Aderência) das defesas de fraude da empresa, e contar com suporte à tradução para o Português (PT-BR).

---

## Arquitetura do Projeto
O projeto foi modernizado a partir de uma matriz estática e dividido em três camadas principais:

### 1. Frontend (`/frontend`)
Aplicação Single-Page (SPA) desenvolvida com **HTML, CSS (Vanilla) e JavaScript**.
* **Como funciona:** Ele carrega o esqueleto das táticas e técnicas diretamente do arquivo `f3_matrix_export.csv` utilizando a biblioteca `PapaParse`. Em seguida, faz chamadas assíncronas (`fetch`) para a API do backend para buscar o status atual de aderência de cada técnica e suas descrições traduzidas, unindo tudo na interface.
* **Arquivos-chave:**
  * `index.html`: Estrutura base, painel lateral de detalhes, barra de filtros e toggle de idioma.
  * `app.js`: Lógica core da aplicação. Cria os cards dinamicamente, controla o painel de detalhes lateral e salva o status no backend quando modificado.
  * `styles.css`: Estilização elegante da matriz, responsividade, variáveis de cor, e comportamentos do CSS Flexbox.

### 2. Backend (`/backend`)
Uma API REST leve feita em **Node.js com Express**, utilizando **SQLite** como banco de dados embarcado.
* **Como funciona:** Atua como um serviço de persistência de dados. O arquivo `server.js` gerencia as rotas e se comunica com o `database.sqlite`.
* **Banco de Dados (SQLite):**
  * Tabela `adherence_v2`: Salva a chave composta de `(tactic_id, technique_id)` juntamente com seu respectivo status de aderência (Aderente, Em implantação, Não aplicável, etc).
  * Tabela `translations`: Armazena o `technique_id` e a sua respectiva `description_pt`.
* **Endpoints:**
  * `GET /api/adherence`: Retorna um dicionário com todos os status configurados.
  * `POST /api/adherence`: Grava ou atualiza um status de uma técnica específica.
  * `GET /api/translations`: Retorna todas as traduções armazenadas no banco.

### 3. Scripts de Manipulação e Tradução de Dados
Scripts utilitários em **Python** localizados na raiz do projeto, utilizados para manter o fluxo de dados em ordem sem afetar os dados originais da MITRE.
* `export_f3_to_csv.py`: Converte a base de conhecimento oficial da MITRE (STIX JSON) e gera um arquivo mastigado estruturado em CSV (`frontend/f3_matrix_export.csv`).
* `translate_desc.py`: Script inteligente que lê o CSV base (inglês), detecta técnicas não traduzidas, executa a tradução automática (substituindo termos de contexto como "fraud actors" por "fraudadores") e insere essas traduções diretamente na tabela `translations` do SQLite do Backend.

---

## Funcionalidades e Fluxo de Uso
* **Filtros e Visualização**: Permite filtrar rapidamente todas as técnicas na tela por seu status de aderência.
* **Internacionalização Híbrida**: Os títulos e a base estrutural permanecem na linguagem nativa e global do framework (Inglês). Porém, um *toggle* na interface permite que a vasta descrição dos relatórios mude instantaneamente para PT-BR consultando o banco de dados.
* **Segregação de Status de Aderência**: Aderência agora é amarrada entre **Tática + Técnica** (Chave Composta). O que significa que se uma Técnica X (ex: *Card Dump Capture*) for usada na tática A, ela pode ter um status, e a mesma Técnica X usada na tática B pode ter um status de defesa completamente diferente.

## Como Executar Localmente
Para rodar este ecossistema, são necessários dois processos (Terminal 1 e Terminal 2):

1. **Iniciando a API (Backend):**
```bash
cd backend
npm install
node server.js
```
*(A API começará a escutar na porta :3000)*

2. **Servindo a Aplicação (Frontend):**
Como o frontend consome APIs locais via `fetch`, ele precisa rodar dentro de um servidor HTTP (e não abrindo o arquivo no navegador localmente via `file://`).
Pode-se usar extensões como o *Live Server* no VS Code ou rodar o utilitário nativo do Python:
```bash
cd frontend
python -m http.server 8000
```
Acesse `http://localhost:8000` no seu navegador!

3. **(Opcional) Executar traduções:**
Para popular novamente ou atualizar o banco com novas traduções:
```bash
python translate_desc.py
```

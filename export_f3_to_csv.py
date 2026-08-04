"""
Exportador do MITRE Fight Fraud Framework (F3) para CSV.

Este script extrai todas as táticas, técnicas e sub-técnicas do STIX bundle 
disponibilizado no repositório oficial do projeto MITRE F3:
(https://github.com/center-for-threat-informed-defense/fight-fraud-framework)

Onde estão os dados originais?
Os dados vêm do arquivo JSON "public/f3-stix-v1.1.json" que contém o modelo STIX 2.1 completo.

Como rodar novamente:
1. Garanta que você tem o arquivo 'public/f3-stix-v1.1.json' no mesmo diretório ou atualize o caminho no final do script.
2. Rode o comando: `python export_f3_to_csv.py`
3. O script irá gerar/atualizar o arquivo `f3_matrix_export.csv` com as informações mais recentes.
"""

import json
import csv
import sys
from pathlib import Path

def export_f3_to_csv(stix_file_path, output_csv_path):
    print(f"Carregando dados STIX de: {stix_file_path}")
    with open(stix_file_path, 'r', encoding='utf-8') as f:
        bundle = json.load(f)
    
    objects = bundle.get('objects', [])
    
    # 1. Extrair táticas
    tactics_map = {} # nome curto -> {id, nome}
    tactic_objects = [o for o in objects if o.get('type') == 'x-mitre-tactic']
    for t in tactic_objects:
        shortname = t.get('x_mitre_shortname')
        t_id = None
        for ext in t.get('external_references', []):
            if ext.get('source_name') == 'mitre-f3':
                t_id = ext.get('external_id')
                break
        tactics_map[shortname] = {
            'id': t_id or t.get('id'),
            'name': t.get('name')
        }
    
    # 2. Extrair técnicas e sub-técnicas
    attack_patterns = [o for o in objects if o.get('type') == 'attack-pattern']
    
    rows = []
    
    for ap in attack_patterns:
        # Obter ID e URL
        tech_id = None
        sources = []
        for ext in ap.get('external_references', []):
            if ext.get('source_name') == 'mitre-f3':
                tech_id = ext.get('external_id')
            if 'url' in ext:
                url = ext['url']
                if url.startswith('https://ctid.mitre.org/fraud/techniques/'):
                    url = url.replace('https://ctid.mitre.org/fraud/techniques/', 'https://ctid.mitre.org/fraud/#/technique/')
                sources.append(url)
        
        tech_name = ap.get('name', '')
        description = ap.get('description', '')
        
        # Determinar técnica pai
        parent_id = ''
        if tech_id and '.' in tech_id:
            parent_id = tech_id.split('.')[0]
            
        # Determinar referência ao ATT&CK
        attack_reference = ''
        if tech_id and (tech_id.startswith('T') or tech_id.startswith('TA')):
            attack_reference = tech_id
            
        # Plataformas
        platforms = ', '.join(ap.get('x_mitre_platforms', []))
        
        # Táticas
        ap_tactic_ids = []
        ap_tactic_names = []
        for phase in ap.get('kill_chain_phases', []):
            phase_name = phase.get('phase_name')
            if phase_name in tactics_map:
                ap_tactic_ids.append(tactics_map[phase_name]['id'])
                ap_tactic_names.append(tactics_map[phase_name]['name'])
                
        tactic_id_str = ', '.join(ap_tactic_ids)
        tactic_name_str = ', '.join(ap_tactic_names)
        sources_str = ', '.join(sources)
        
        rows.append({
            'tactic_id': tactic_id_str,
            'tactic_name': tactic_name_str,
            'technique_id': tech_id,
            'technique_name': tech_name,
            'parent_technique_id': parent_id,
            'description': description,
            'attack_reference': attack_reference,
            'sources': sources_str,
            'platforms': platforms
        })
        
    # Ordenar as linhas pelo technique_id
    rows.sort(key=lambda x: x['technique_id'] if x['technique_id'] else '')
    
    # 3. Exportar para CSV
    fieldnames = [
        'tactic_id', 'tactic_name', 'technique_id', 'technique_name', 
        'parent_technique_id', 'description', 'attack_reference', 'sources', 'platforms'
    ]
    
    print(f"Escrevendo {len(rows)} técnicas/sub-técnicas em {output_csv_path}")
    with open(output_csv_path, 'w', encoding='utf-8-sig', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(rows)
        
    print("Exportação concluída!")
    print(f"Táticas encontradas: {len(tactic_objects)}")
    
    techs = [r for r in rows if not r['parent_technique_id']]
    subtechs = [r for r in rows if r['parent_technique_id']]
    print(f"Técnicas exportadas: {len(techs)}")
    print(f"Sub-técnicas exportadas: {len(subtechs)}")

if __name__ == '__main__':
    stix_file = Path('public/f3-stix-v1.1.json')
    if not stix_file.exists():
        print(f"Erro: Não foi possível encontrar os dados STIX em {stix_file.absolute()}")
        sys.exit(1)
        
    export_f3_to_csv(stix_file, 'f3_matrix_export.csv')

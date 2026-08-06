import csv
import time
import sys
import urllib.request
import urllib.parse
import json
import sqlite3
import os

sys.stdout.reconfigure(encoding='utf-8')

# Connect to database
db_path = os.path.join('backend', 'database.sqlite')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Ensure translations table exists
cursor.execute('''
    CREATE TABLE IF NOT EXISTS translations (
        technique_id TEXT PRIMARY KEY,
        description_pt TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
''')
conn.commit()

input_file = 'f3_matrix_export.csv'
output_file = 'f3_matrix_export.csv'

print("Reading CSV...", flush=True)
rows = []
with open(input_file, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        rows.append(row)

def google_translate(text, sl='en', tl='pt'):
    url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" + sl + "&tl=" + tl + "&dt=t&q=" + urllib.parse.quote(text)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    response = urllib.request.urlopen(req)
    data = json.loads(response.read().decode('utf-8'))
    return "".join([x[0] for x in data[0] if x[0]])

def is_english(text):
    text_lower = text.lower()
    return " the " in text_lower or " and " in text_lower or " of " in text_lower or " to " in text_lower or " or " in text_lower

print(f"Translating missing descriptions...", flush=True)
for i, row in enumerate(rows):
    desc = row.get('description', '')
    tech_id = row.get('technique_id')
    
    if not desc or not tech_id:
        continue
        
    # Check if translation exists in DB
    cursor.execute('SELECT 1 FROM translations WHERE technique_id = ?', (tech_id,))
    exists = cursor.fetchone()
    
    if not exists:
        desc = desc.replace('\u2011', '-')
        
        success = False
        retries = 3
        while not success and retries > 0:
            try:
                desc_pt = google_translate(desc)
                if not desc_pt:
                    raise Exception("Empty translation")

                desc_pt = desc_pt.replace('atores de fraude', 'fraudadores')
                desc_pt = desc_pt.replace('Atores de fraude', 'Fraudadores')
                desc_pt = desc_pt.replace('atores fraudulentos', 'fraudadores')
                desc_pt = desc_pt.replace('Atores fraudulentos', 'Fraudadores')
                
                # Insert into DB
                cursor.execute('''
                    INSERT INTO translations (technique_id, description_pt)
                    VALUES (?, ?)
                ''', (tech_id, desc_pt))
                conn.commit()
                
                print(f"[{i+1}/{len(rows)}] Translated and saved: {tech_id}", flush=True)
                success = True
            except Exception as e:
                retries -= 1
                print(f"[{i+1}/{len(rows)}] Retry {3-retries} for {tech_id}: {e}", flush=True)
                time.sleep(2)
        
        time.sleep(1)

conn.close()
        
print("Done!", flush=True)

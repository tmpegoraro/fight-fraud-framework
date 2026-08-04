'''
import csv
import time
import sys
import urllib.request
import urllib.parse
import json

sys.stdout.reconfigure(encoding='utf-8')

input_file = 'f3_matrix_export.csv'
output_file = 'f3_matrix_export.csv'

print("Reading CSV...", flush=True)
rows = []
with open(input_file, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
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
    if desc and is_english(desc):
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
                
                row['description'] = desc_pt
                print(f"[{i+1}/{len(rows)}] Translated: {row['technique_id']}", flush=True)
                success = True
            except Exception as e:
                retries -= 1
                print(f"[{i+1}/{len(rows)}] Retry {3-retries} for {row['technique_id']}: {e}", flush=True)
                time.sleep(2)
        
        time.sleep(1)
        
        with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
            writer.writeheader()
            writer.writerows(rows)

print("Writing to CSV to frontend...", flush=True)
import shutil
shutil.copyfile(output_file, 'frontend/f3_matrix_export.csv')
print("Done!", flush=True)
'''

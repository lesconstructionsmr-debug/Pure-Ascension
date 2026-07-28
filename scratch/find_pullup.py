import urllib.request
import json

url = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
print("Downloading database...")
response = urllib.request.urlopen(url)
data = json.loads(response.read().decode('utf-8'))

print(f"Total exercises: {len(data)}")
for ex in data:
    name = ex.get('name', '')
    if 'pull-up' in name.lower() or 'pullup' in name.lower() or 'pull up' in name.lower():
        print(f"Name: {name}")
        print(f"Images: {ex.get('images', [])}")
        print("-" * 40)

import glob, os, re
import bs4

html_files = sorted(glob.glob('**/*.html', recursive=True))

print(f"=== FULL AUDIT OF {len(html_files)} PAGES ===")

issues = []

for f in html_files:
    with open(f, 'r', encoding='utf-8') as fp:
        html = fp.read()
    
    soup = bs4.BeautifulSoup(html, 'html.parser')
    
    # 1. Doctype
    if not html.strip().startswith('<!DOCTYPE html>'):
        issues.append(f"{f}: Missing standard <!DOCTYPE html>")
        
    # 2. Viewport & charset
    if not soup.find('meta', charset=True):
        issues.append(f"{f}: Missing meta charset")
    if not soup.find('meta', attrs={'name': 'viewport'}):
        issues.append(f"{f}: Missing meta viewport")
        
    # 3. Canonical
    canonical = soup.find('link', rel='canonical')
    if not canonical or not canonical.get('href'):
        issues.append(f"{f}: Missing canonical link")
        
    # 4. Favicons
    favicons = soup.find_all('link', rel=lambda x: x and 'icon' in x)
    if len(favicons) < 2:
        issues.append(f"{f}: Insufficient favicon links ({len(favicons)})")
        
    # 5. Header Concept C
    header = soup.find('header', class_='ribbon')
    if not header or 'concept-c' not in header.get('class', []):
        issues.append(f"{f}: Missing header.ribbon.concept-c")
    else:
        # Check tiers
        if not header.find(class_='masthead-tier'):
            issues.append(f"{f}: Missing masthead-tier in header")
        if not header.find(class_='directory-tier'):
            issues.append(f"{f}: Missing directory-tier in header")
            
    # 6. Footer check
    footer = soup.find('footer')
    if not footer:
        issues.append(f"{f}: Missing footer")
    else:
        # Check inputs
        f_inputs = {i.get('name'): i.get('autocomplete') for i in footer.find_all('input')}
        if 'first-name' in f_inputs and f_inputs['first-name'] != 'given-name':
            issues.append(f"{f}: footer first-name autocomplete is {f_inputs.get('first-name')}")
        if 'last-name' in f_inputs and f_inputs['last-name'] != 'family-name':
            issues.append(f"{f}: footer last-name autocomplete is {f_inputs.get('last-name')}")
        if 'email' in f_inputs and f_inputs['email'] != 'email':
            issues.append(f"{f}: footer email autocomplete is {f_inputs.get('email')}")
            
    # 7. Check for lingering old brand names
    for bad_word in ['The Reading Room', 'Reading Room', 'readingroom']:
        if bad_word.lower() in html.lower():
            # Exclude false positives if any
            matches = [m.start() for m in re.finditer(re.escape(bad_word), html, re.IGNORECASE)]
            for pos in matches:
                snippet = html[max(0, pos-20):min(len(html), pos+40)]
                issues.append(f"{f}: Old brand found -> ...{snippet}...")

    # 8. Check reading pages specific items
    if 'essays/' in f and f != 'essays/index.html' or 'poems/' in f and f != 'poems/index.html' or 'fiction/' in f and f != 'fiction/index.html':
        back_link = soup.select_one('.sidebar-back-link')
        if not back_link:
            issues.append(f"{f}: Missing .sidebar-back-link")
        reading_time = soup.select_one('.sidebar-reading-time')
        if not reading_time:
            issues.append(f"{f}: Missing .sidebar-reading-time")

print(f"Total issues found: {len(issues)}")
for iss in issues:
    print(" - " + iss)


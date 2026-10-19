import glob
import os

html_files = glob.glob('**/*.html', recursive=True)

# 1. Update HTML files
for path in html_files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Domain in canonical, og:url, og:image, twitter:image
    content = content.replace('https://pranshu.space', 'https://dendrafolio.com')
    content = content.replace('http://pranshu.space', 'https://dendrafolio.com')
    
    # Twitter handle in meta tags and footer social links
    content = content.replace('content="@pranshuspace"', 'content="@dendrafolio"')
    content = content.replace("content='@pranshuspace'", "content='@dendrafolio'")
    content = content.replace('x.com/pranshuspace', 'x.com/dendrafolio')
    
    # Legal page text: 'pranshu.space' as site name
    content = content.replace('All content on pranshu.space is', 'All content on dendrafolio.com is')
    content = content.replace('for pranshu.space.', 'for dendrafolio.com.')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print(f'Updated {len(html_files)} HTML files.')

# 2. Update robots.txt
if os.path.exists('robots.txt'):
    with open('robots.txt', 'r', encoding='utf-8') as f:
        r_content = f.read()
    r_content = r_content.replace('https://pranshu.space', 'https://dendrafolio.com')
    with open('robots.txt', 'w', encoding='utf-8') as f:
        f.write(r_content)
    print('Updated robots.txt.')

# 3. Update sitemap.xml
if os.path.exists('sitemap.xml'):
    with open('sitemap.xml', 'r', encoding='utf-8') as f:
        s_content = f.read()
    s_content = s_content.replace('https://pranshu.space', 'https://dendrafolio.com')
    with open('sitemap.xml', 'w', encoding='utf-8') as f:
        f.write(s_content)
    print('Updated sitemap.xml.')

# 4. Update CNAME
with open('CNAME', 'w', encoding='utf-8') as f:
    f.write('dendrafolio.com\n')
print('Updated CNAME.')


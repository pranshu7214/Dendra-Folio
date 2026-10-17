import glob

files = glob.glob('**/*.html', recursive=True)
updated_files = []

target_f1 = 'name="field_1" placeholder="First Name..." aria-label="First Name" required'
replace_f1 = 'name="field_1" placeholder="First Name..." aria-label="First Name" autocomplete="given-name" required'

target_f2 = 'name="field_2" placeholder="Last Name..." aria-label="Last Name"'
replace_f2 = 'name="field_2" placeholder="Last Name..." aria-label="Last Name" autocomplete="family-name"'

target_f0 = 'name="field_0" placeholder="Your email address..." aria-label="Email Address" required'
replace_f0 = 'name="field_0" placeholder="Your email address..." aria-label="Email Address" autocomplete="email" required'

for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        content = fp.read()
    
    old_content = content
    content = content.replace(target_f1, replace_f1)
    content = content.replace(target_f2, replace_f2)
    content = content.replace(target_f0, replace_f0)
    
    if content != old_content:
        with open(f, 'w', encoding='utf-8') as fp:
            fp.write(content)
        updated_files.append(f)

print(f'Successfully updated {len(updated_files)} files with autocomplete attributes:')
for uf in updated_files:
    print(' -', uf)


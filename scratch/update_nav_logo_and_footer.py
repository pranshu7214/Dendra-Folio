import os
import re

base_dir = r"d:\Documents\Oxford Files\15 Dendra House"

html_files = [
    "index.html",
    "about/index.html",
    "legal/index.html",
    "essays/index.html",
    "essays/divine-love.html",
    "essays/education-shapes-power.html",
    "essays/shaping-the-future.html",
    "poems/index.html",
    "poems/creatures-of-deep.html",
    "poems/never-sick.html",
    "poems/safe-and-alone.html",
    "poems/the-home.html",
    "poems/the-scalpel.html",
    "fiction/index.html",
    "fiction/the-rehearsed-lie.html",
]

for rel_path in html_files:
    full_path = os.path.join(base_dir, rel_path)
    if not os.path.exists(full_path):
        print(f"File not found: {full_path}")
        continue

    with open(full_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update nav logo img src
    # Match <div class="nav-logo"> ... <img src="...final-logo.png" ...
    content = re.sub(
        r'(<div class="nav-logo">[\s\S]*?<img src=")([^"]*?)final-logo\.png(")',
        r'\g<1>\g<2>final-logo-nav.png\g<3>',
        content
    )

    # 2. Update footer form
    # We want to replace:
    # <form class="footer-subscribe-form" ...>
    #   <input type="text" name="b_name" ...>
    #   <input type="email" ...>
    #   <button type="submit">Join ...</button>
    # </form>
    footer_form_pattern = re.compile(
        r'(<form class="footer-subscribe-form"[^>]*>)\s*'
        r'(<input type="text" name="b_name"[^>]*>)\s*'
        r'(<input type="email" name="field_0"[^>]*>)\s*'
        r'(<button type="submit">[^<]*<span class="btn-arrow">[^<]*</span></button>)\s*'
        r'(</form>)',
        re.MULTILINE
    )

    def replace_footer(match):
        form_open = match.group(1)
        bot_trap = match.group(2)
        button = match.group(4)
        return (
            f'{form_open}\n'
            f'        {bot_trap}\n'
            f'        <div class="footer-form-inputs">\n'
            f'          <div class="footer-name-row">\n'
            f'            <input type="text" name="field_1" placeholder="First Name..." aria-label="First Name" required>\n'
            f'            <input type="text" name="field_2" placeholder="Last Name..." aria-label="Last Name">\n'
            f'          </div>\n'
            f'          <div class="footer-email-row">\n'
            f'            <input type="email" name="field_0" placeholder="Your email address..." aria-label="Email Address" required>\n'
            f'            {button}\n'
            f'          </div>\n'
            f'        </div>\n'
            f'      </form>'
        )

    new_content, count = footer_form_pattern.subn(replace_footer, content)
    if count == 0:
        print(f"Warning: footer pattern not matched in {rel_path}")
    
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"Updated {rel_path} (footer replaced: {count})")


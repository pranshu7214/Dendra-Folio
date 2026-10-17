import glob
import re

files = glob.glob('**/*.html', recursive=True)
updated = []

for f in files:
    is_root = ('\\' not in f and '/' not in f)
    prefix = "" if is_root else "../"
    
    # Determine active category
    norm_f = f.replace('\\', '/')
    is_home = (norm_f == 'index.html')
    is_essays = norm_f.startswith('essays/')
    is_poems = norm_f.startswith('poems/')
    is_fiction = norm_f.startswith('fiction/')
    is_about = norm_f.startswith('about/')
    
    home_active = "active" if is_home else ""
    essays_active = "active" if is_essays else ""
    poems_active = "active" if is_poems else ""
    fiction_active = "active" if is_fiction else ""
    about_active = "active" if is_about else ""
    
    new_ribbon = f'''  <header class="ribbon concept-c">
    <div class="masthead-tier">
      <div class="tier-left">
        <a href="/" aria-label="Home" class="home-icon {home_active}">
          <i class="fa-solid fa-house"></i>
        </a>
      </div>

      <div class="tier-center nav-logo">
        <a href="/" aria-label="Dendra Folio Home">
          <img src="{prefix}images/final-logo-nav.png" alt="Dendra Folio Logo">
          <span class="masthead-brand">Dendra Folio</span>
        </a>
      </div>

      <div class="tier-right">
        <a class="subscribe-btn sign-in-btn">Sign In</a>
      </div>

      <!-- Mobile Elements -->
      <a href="/" class="mobile-home-icon {home_active}"><i class="fa-solid fa-house"></i></a>
      <div class="menu-toggle" role="button" aria-label="Toggle Navigation" tabindex="0"><i class="fa-solid fa-bars"></i></div>
    </div>

    <nav class="directory-tier desktop-only">
      <a href="{prefix}essays/" class="{essays_active}">Essays</a>
      <span class="tier-dot">·</span>
      <a href="{prefix}poems/" class="{poems_active}">Poems</a>
      <span class="tier-dot">·</span>
      <a href="{prefix}fiction/" class="{fiction_active}">Fiction</a>
      <span class="tier-dot">·</span>
      <a href="{prefix}about/" class="{about_active}">About</a>
    </nav>
  </header>'''

    with open(f, 'r', encoding='utf-8') as fp:
        content = fp.read()
    
    # Match <header class="ribbon"> ... </header>
    pattern = r'<header class="ribbon.*?</header>'
    new_content, count = re.subn(pattern, new_ribbon, content, flags=re.DOTALL)
    
    if count > 0:
        with open(f, 'w', encoding='utf-8') as fp:
            fp.write(new_content)
        updated.append(f)

print(f"Updated {len(updated)} files with Concept C Dual-Tier Masthead:")
for u in updated:
    print(" -", u)


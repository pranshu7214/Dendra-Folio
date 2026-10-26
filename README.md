# Dendra Folio

An independent literary and philosophical publication publishing essays, poetry, and narrative fiction.

---

## 📜 Master Article Register & Archival Policy

The authoritative record for every publication on Dendra Folio is maintained in:
👉 [`dendra-folio-articles.csv`](dendra-folio-articles.csv)

### 🔒 The Golden Rules of Article IDs

1. **Permanence & Immutability**:
   Once an Article ID is assigned to a piece, it is **permanent and immutable**. It must never be renamed, reformatted, or altered.

2. **No Deletion from Register**:
   If an article is ever taken down, unpublished, or vaulted, its record is **NEVER deleted** from the spreadsheet or database. 

3. **Strict Non-Reusability (Retirement Rule)**:
   A retired Article ID is **never recycled or assigned to another piece**. It remains permanently linked to the original title in the register to prevent collision with reader bookmarks, reading progress tracking, social shares, or database foreign keys.

4. **Lifecycle Statuses**:
   * `Published`: Live on the production website and catalog.
   * `Draft`: In progress or scheduled for publication.
   * `Retired`: Taken down or withdrawn from the public site. Row preserved indefinitely in the master register with notes explaining the takedown.

---

## 🏷️ Article ID Schema

Format: `DF-[CATEGORY]-[SEQUENCE]`

```
DF-PRS-0001
│   │    └── 4-digit zero-padded number (0001 to 9999, up to 9,999 pieces per category)
│   └────── Category Code (PRS = Prose, VRS = Verses, TLS = Tales)
└────────── Dendra Folio Brand Prefix
```

| Pillar | Category Code | Shorthand | Sequence Range | Example ID |
| :--- | :--- | :--- | :--- | :--- |
| **Essays** | Prose | `PRS` | `0001` – `9999` | `DF-PRS-0001` |
| **Poems** | Verses | `VRS` | `0001` – `9999` | `DF-VRS-0001` |
| **Fiction** | Tales | `TLS` | `0001` – `9999` | `DF-TLS-0001` |

---

## 🗄️ Master Article Catalog

| Article ID | Category | Title | Genre | Published | Word Count | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DF-PRS-0001` | Prose | The Divine Depth of Love | Philosophy | 2025-06-30 | ~3,782 | `Published` |
| `DF-PRS-0002` | Prose | Education Reform and Human Intelligence | Education | 2026-01-20 | ~1,525 | `Published` |
| `DF-PRS-0003` | Prose | How Education Shapes Power | Education | 2026-02-05 | ~1,358 | `Published` |
| `DF-VRS-0001` | Verses | The Scalpel | Poetry | 2025-12-12 | ~242 | `Published` |
| `DF-VRS-0002` | Verses | The Home | Poetry | 2026-01-31 | ~354 | `Published` |
| `DF-VRS-0003` | Verses | Never Sick, Never Small | Poetry | 2026-02-08 | ~212 | `Published` |
| `DF-VRS-0004` | Verses | Safe and Alone | Poetry | 2026-03-14 | ~391 | `Published` |
| `DF-VRS-0005` | Verses | The Creatures of the Deep | Poetry | 2026-05-22 | ~429 | `Published` |
| `DF-TLS-0001` | Tales | The Rehearsed Lie | Thriller | 2026-05-02 | ~3,200 | `Published` |

---

## 🔌 Inscription Map (Supabase & Database Readiness)

Article IDs are completely hidden from readers on the visual UI, but inscribed into machine-readable hooks throughout the markup:

1. **HTML `<head>` Meta Tags** (in every reading page):
   ```html
   <meta name="article:id" content="DF-PRS-0001" />
   <meta property="article:id" content="DF-PRS-0001" />
   <meta name="dc.identifier" content="DF-PRS-0001" />
   ```

2. **DOM Container Hook** (in every reading page):
   ```html
   <main data-article-id="DF-PRS-0001">
   ```
   *Client-side JavaScript can query this via `document.querySelector('main').dataset.articleId` to read bookmarks, track reading progress, or record view time in Supabase.*

3. **Catalog & Showcase Cards**:
   All listing anchors on [`index.html`](index.html), [`essays/index.html`](essays/index.html), [`poems/index.html`](poems/index.html), and [`fiction/index.html`](fiction/index.html) feature:
   ```html
   <a href="divine-love.html" class="...card..." data-article-id="DF-PRS-0001">
   ```

---

## 🛠️ Editorial Checklist: Adding a New Piece

When preparing a new article for publication:

1. Open [`dendra-folio-articles.csv`](dendra-folio-articles.csv).
2. Check the highest existing ID for the target category (e.g. `DF-PRS-0003`).
3. Increment the sequence number by one (e.g. `DF-PRS-0004`).
4. Append the new row with title, dates, word count, excerpt, and URL.
5. Inscribe `data-article-id="DF-PRS-0004"` into the HTML `<head>`, `<main>`, and corresponding index cards.
6. If the piece is ever removed in the future:
   * Keep the row in `dendra-folio-articles.csv`.
   * Set `status` = `Retired`.
   * Add a reason in the `notes` column.
   * **Do not reassign that ID to any other piece.**

---

## ⚡ Supabase SQL Schema (Reference)

```sql
CREATE TABLE public.articles (
    article_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Prose', 'Verses', 'Tales')),
    genre TEXT,
    published_date DATE,
    display_date TEXT,
    author TEXT DEFAULT 'Pranshu Gupta',
    url TEXT UNIQUE NOT NULL,
    relative_path TEXT NOT NULL,
    reading_time TEXT,
    word_count INTEGER,
    status TEXT DEFAULT 'Published' CHECK (status IN ('Published', 'Draft', 'Retired')),
    excerpt TEXT,
    og_image TEXT,
    database_synced TEXT DEFAULT 'Ready',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to published pieces
CREATE POLICY "Public read published articles" 
ON public.articles FOR SELECT 
USING (status = 'Published');
```

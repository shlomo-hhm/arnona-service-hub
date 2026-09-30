# מרכז שירותי ארנונה (Arnona Service Hub)

כלי עבודה פנימי לעובדי ניידת השירות של עיריית ירושלים. מרכז את כל טפסי ושירותי
הארנונה במקום אחד, עם חיפוש מהיר בעברית (כולל ניסוח חופשי של תושבים), קטגוריות,
מועדפים, פריטים אחרונים, ו-Wizard שמסייע לאתר את הטופס הנכון כשלא ברור מראש.

Static Web App: React + TypeScript + Vite + Tailwind CSS. ללא Backend, ללא
בסיס נתונים — כל הנתונים חיים ב-`src/data/forms.ts` וכל ההעדפות האישיות
(מועדפים, אחרונים) נשמרות ב-`localStorage` של הדפדפן בלבד (ללא סנכרון בין מכשירים).

## הפעלה מקומית

דרישות: Node.js 18 ומעלה.

```bash
npm install
npm run dev
```

האפליקציה תיפתח בכתובת שתוצג בטרמינל (בדרך כלל `http://localhost:5173`).

## Build לפרסום

```bash
npm run build
```

הפלט נוצר בתיקיית `dist/` — קבצים סטטיים בלבד, מוכנים להעלאה לכל שירות אחסון
סטטי.

לבדיקה מקומית של ה-build:

```bash
npm run preview
```

## הוספת שירות חדש

כל שירות הוא אובייקט בודד במערך `services` בקובץ `src/data/forms.ts`.
**אין צורך לשנות שום קומפוננטה** — הוספה, קטגוריות, אייקונים, וסינון מתעדכנים
אוטומטית מהנתונים.

1. פתח את `src/data/forms.ts`.
2. הוסף אובייקט חדש למערך, בהתאם למבנה `Service`:

```ts
{
  id: 'unique-id',                // מזהה ייחודי, אנגלית, ללא רווחים
  title: 'שם קצר לתצוגה',
  officialTitle: 'השם הרשמי המלא',
  description: 'תיאור קצר של השירות',
  whenToUse: 'מתי להשתמש בשירות הזה',
  category: 'שם הקטגוריה',        // קטגוריות חדשות מתווספות אוטומטית לגריד
  keywords: ['מילת חיפוש 1', 'ניסוח של תושב', '...'],
  url: 'https://...',              // ר' אזהרה למטה
  type: 'online-form' | 'info-page' | 'pdf' | 'personal-area' | 'external-official',
  loginRequired: false,
  popular: false,                  // true = מועמד להופיע ב"הכי שימושיים" (עד 8)
  verified: true,
  source: 'Jerusalem Municipality',
  notes: '',                       // טקסט חופשי, יוצג בטולטיפ מידע אם לא ריק
}
```

3. שמור. השירות יופיע אוטומטית בחיפוש, בקטגוריה שלו, ובגריד הכללי.

### עריכת קישור קיים

חפש את השירות לפי `id` בקובץ `src/data/forms.ts` ועדכן את שדה `url` בלבד.
**אין להמציא, לנחש או "לתקן" כתובות** — יש להעתיק כתובת מדויקת מהמקור הרשמי.
אם אין ודאות מלאה שהכתובת נכונה, סמן `verified: false` — המערכת תציג אזהרה
לפני פתיחת השירות.

## פרסום

### Vercel

1. התקן את Vercel CLI (`npm i -g vercel`) או חבר את הריפו ל-vercel.com.
2. מריצים `vercel` בתיקיית הפרויקט ופועלים לפי ההנחיות (Framework Preset:
   Vite; Build Command: `npm run build`; Output Directory: `dist`).
3. אין צורך ב-`vercel.json` — זהו אתר סטטי טהור ללא ראוטים דינמיים בצד שרת.

### Netlify

1. חברו את הריפו ב-app.netlify.com, או השתמשו ב-Netlify CLI.
2. Build command: `npm run build`
3. Publish directory: `dist`

### GitHub Pages

1. `npm run build`
2. פרסמו את תוכן `dist/` לענף `gh-pages` (למשל בעזרת `gh-pages` package או
   GitHub Actions).
3. ודאו ש-`vite.config.ts` מכיל `base: './'` (כבר מוגדר כך בפרויקט זה) כדי
   שהנתיבים היחסיים יעבדו תחת תת-נתיב של GitHub Pages.

## מבנה הפרויקט

```
src/
  components/   קומפוננטות UI כלליות (Service, לא Arnona-specific)
  data/         forms.ts — מקור האמת היחיד לכל השירותים
  hooks/        useFavorites, useRecent, useLocalStorage
  utils/        search.ts (חיפוש Fuzzy), categories.ts, icons.ts
  App.tsx       הרכבת המסך הראשי
  main.tsx      נקודת הכניסה
```

## הרחבה עתידית

הקומפוננטות בנויות סביב הטיפוס הכללי `Service` ולא סביב "ארנונה" באופן
ספציפי. כדי להוסיף תחום שירות חדש (חניה, רישוי עסקים, חינוך וכו') — ניתן
להוסיף עוד רשומות `Service` עם `category` חדשה (ולסמן קובץ נתונים נפרד אם
רוצים, ולאחד אותם למערך אחד ב-`forms.ts`), ללא כל שינוי בקומפוננטות.

## Link checker

`.github/workflows/link-check.yml` runs `scripts/check-links.mjs` every Sunday (and on manual dispatch: Actions > Link check > Run workflow). It checks every `url` in `src/data/forms.ts` (HEAD, then GET fallback, redirects followed) and keeps a single open issue labelled `broken-links` up to date; the issue closes itself once all links are fine. Run locally with `node scripts/check-links.mjs` (Node 18+, no install needed). Notes: the municipal CDN blocks bot-looking user agents, so the checker sends a browser UA; `jeronlineforms` returns HTTP 200 for unknown forms, so the checker also verifies each form's `/Scripts/<Form>/styles.css` bundle; URLs that differ only by query string cannot be validated that way.

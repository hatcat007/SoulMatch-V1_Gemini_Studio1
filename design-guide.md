# SoulMatch Design System & Guide

## 1. Introduktion & Filosofi

Velkommen til SoulMatch Design System. Dette dokument er den centrale kilde til sandhed for vores visuelle identitet, UI-komponenter og designprincipper. Vores mål er at skabe en ensartet, intuitiv og tryg oplevelse for alle brugere, der bekæmper ensomhed i Danmark.

### Vores Designprincipper

-   **Tryghed Først (Safety First):** Designet skal altid fremstå professionelt, sikkert og troværdigt. Brugeren skal føle sig tryg ved at interagere med appen og andre mennesker.
-   **Indbydende & Inkluderende (Welcoming & Inclusive):** Vores visuelle sprog er varmt, venligt og imødekommende. Vi designer for alle, uanset baggrund.
-   **Opfordrende (Encouraging):** Designet skal motivere til handling – især til at deltage i events og mødes i den virkelige verden.
-   **Simpelt & Fokuseret (Simple & Focused):** Vi undgår unødig kompleksitet. Hver skærm har et klart formål, og brugerflowet er ubesværet.

---

## 2. Visuel Identitet

### 2.1. Logo

Vores logo repræsenterer forbindelse og fællesskab.

**Primært Logo:**
`https://q1f3.c3.e2-9.dev/soulmatch-uploads-public/SoulMatch%20logo.jpeg`

**Retningslinjer for brug:**
-   **Frirum:** Bevar altid et frirum omkring logoet svarende til højden på "S"-et i "SoulMatch".
-   **Baggrund:** Logoet skal primært bruges på lyse eller hvide baggrunde.
-   **Ændringer:** Logoet må ikke strækkes, forvrænges, omfarves eller ændres på nogen måde.

### 2.2. Farvepalette

Vores farver er valgt for at skabe en følelse af ro, tillid og varme.

#### Light Mode

| Farve               | HEX-kode  | Tailwind Klasse     | Anvendelse                                          |
| ------------------- | --------- | ------------------- | --------------------------------------------------- |
| **Primary**         | `#006B76` | `primary`           | Vigtige knapper (CTAs), aktive links, branding.     |
| **Primary Light**   | `#E6F0F1` | `primary-light`     | Baggrunde for sektioner, hover-effekter, tags.       |
| **Primary Dark**    | `#005F69` | `primary-dark`      | Hover-effekter på primære knapper.                  |
| **Accent**          | `#8A2BE2` | `accent`            | Specielle highlights, AI-funktioner, notifikationer. |
| **Baggrund**        | `#F8F9FA` | `background`        | Appens overordnede baggrundsfarve.                  |
| **Tekst Primær**    | `#212529` | `text-primary`      | Overskrifter og primær brødtekst.                   |
| **Tekst Sekundær**  | `#6C757D` | `text-secondary`    | Undertekster, labels, mindre vigtig information.    |

#### Dark Mode

| Farve               | HEX-kode  | Tailwind Klasse         | Anvendelse                                      |
| ------------------- | --------- | ----------------------- | ----------------------------------------------- |
| **Baggrund**        | `#121826` | `dark-background`       | Appens overordnede baggrundsfarve.              |
| **Overflade**       | `#1d2432` | `dark-surface`          | Baggrund for kort, modaler og navigation.       |
| **Overflade Lys**   | `#2a3343` | `dark-surface-light`    | Baggrund for input-felter, hover-effekter.      |
| **Kant**            | `#3c465b` | `dark-border`           | Kanter og skillevægge.                          |
| **Tekst Primær**    | `#e2e8f0` | `dark-text-primary`     | Overskrifter og primær brødtekst.               |
| **Tekst Sekundær**  | `#94a3b8` | `dark-text-secondary`   | Undertekster, labels.                           |

#### Statusfarver

| Status    | Light Mode                 | Dark Mode                      | Anvendelse                                    |
| --------- | -------------------------- | ------------------------------ | --------------------------------------------- |
| **Succes**| `bg-green-100`, `text-green-800` | `bg-green-900/30`, `text-green-300` | Bekræftelser, succesfulde handlinger.         |
| **Fejl**  | `bg-red-100`, `text-red-600`     | `bg-red-900/20`, `text-red-400`       | Fejlmeddelelser, advarsler om sletning.     |
| **Advarsel**| `bg-yellow-100`, `text-yellow-800` | `bg-yellow-900/30`, `text-yellow-300` | Vigtig information, der kræver opmærksomhed. |

### 2.3. Typografi

Vi bruger **Nunito** som vores primære font for dens venlige, læselige og moderne udtryk.

| Element         | Størrelse        | Vægt         | Tailwind Klasse                  |
| --------------- | ---------------- | ------------ | -------------------------------- |
| **Overskrift 1**| 30px (1.875rem)  | Bold (700)   | `text-3xl font-bold`             |
| **Overskrift 2**| 24px (1.5rem)    | Bold (700)   | `text-2xl font-bold`             |
| **Overskrift 3**| 20px (1.25rem)   | Bold (700)   | `text-xl font-bold`              |
| **Brødtekst**   | 16px (1rem)      | Normal (400) | `text-base`                      |
| **Label/Lille** | 14px (0.875rem)  | Semibold(600)| `text-sm font-semibold`          |
| **Ekstra Lille**| 12px (0.75rem)   | Normal (400) | `text-xs`                        |

---

## 3. Layout & Spacing

Konsistens i afstand er nøglen til et rent og professionelt design. Vores system er baseret på en **4px grid**.

| Værdi | Tailwind Eksempel |
| ----- | ----------------- |
| 4px   | `p-1`, `space-x-1`|
| 8px   | `p-2`, `space-x-2`|
| 12px  | `p-3`             |
| 16px  | `p-4`, `m-4`      |
| 24px  | `p-6`             |
| 32px  | `p-8`             |

**Generelle Layouts:**
-   **Mobil:** Enkelt kolonne-layout med `BottomNav` i bunden.
-   **Desktop:** To-kolonne-layout, hvor `BottomNav` omdannes til en `Sidebar` i venstre side, og hovedindholdet vises til højre.

---

## 4. Ikonografi

Vi bruger **Lucide Icons** for deres rene, lette og konsistente stil.
-   **Standardstørrelse:** 24px til navigation og store ikoner. 20px eller 16px til mindre ikoner i knapper eller lister.
-   **Stroke Width:** `1.5` for organisation-ikoner, `2` for standard-ikoner, `2.5` for aktive navigations-ikoner.
-   **Anvendelse:** Ikoner skal altid ledsages af en tekst-label, medmindre funktionen er universelt genkendelig (f.eks. et 'X' for at lukke). Brug `aria-label` for ikon-knapper uden synlig tekst.

---

## 5. Komponentbibliotek

Dette er kernen i vores design system. Hver komponent er designet til at være genanvendelig, konsistent og tilgængelig.

### 5.1. Knapper (Buttons)

| Type                | Beskrivelse                                        | Klasse (Eksempel)                                                                |
| ------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Primær (CTA)**    | Til den vigtigste handling på en side.             | `bg-primary text-white font-bold py-3 px-6 rounded-full shadow-lg`                 |
| **Sekundær**        | Til mindre vigtige handlinger.                     | `bg-primary-light text-primary font-bold py-3 px-6 rounded-full`                 |
| **Tekst/Link**      | Til navigation eller handlinger med lav prioritet.  | `text-primary font-bold hover:underline`                                         |
| **Destruktiv**      | Til handlinger, der sletter data.                  | `bg-red-600 text-white font-bold ...`                                            |

**States:** Alle knapper skal have tydelige `hover`, `focus`, `active`, og `disabled` states.

### 5.2. Kort (Cards)

Kort er den primære måde, vi viser indhold som events og mødesteder.

-   **`EventCard`:** Viser billede, tidspunkt, titel, antal deltagere og host. Har en `hover`-effekt, hvor billedet zoomer let.
-   **`PlaceCard`:** Kompakt design med billede, tilbud, navn, adresse og kategori.
-   **Generelt:** Alle kort har `rounded-2xl`, `bg-white dark:bg-dark-surface`, og en let `shadow-sm`.

### 5.3. Formularer (Forms)

-   **Input-felter:** Skal have en label, `bg-gray-50 dark:bg-dark-surface-light`, `rounded-lg`, og en tydelig `focus`-state med en `primary` ring.
-   **Textareas:** Følger samme stil som input-felter.
-   **`ToggleSwitch`:** En specialdesignet switch til til/fra-valg.
-   **`CategorySelector`:** En genanvendelig komponent med indbygget søgefunktion og dropdown-funktionalitet til valg af kategorier.

### 5.4. Modaler (Modals)

-   **Baggrund:** En mørk, semi-transparent overlay (`bg-black bg-opacity-50`).
-   **Indhold:** En centreret boks (`bg-white dark:bg-dark-surface`, `rounded-2xl`) med indholdet.
-   **Lukning:** Skal kunne lukkes ved at klikke uden for modalen eller på et 'X'-ikon. Focus skal fanges inde i modalen.
-   **Eksempler:** `PlaceDetailModal`, `ShareModal`, `ReportUserModal`.

### 5.5. Navigation

-   **`BottomNav` (Mobil):** Fast i bunden med 5 ikoner. Den centrale "Opret"-knap er større og hævet.
-   **`OrganizationSidebar` (Desktop):** Fast i venstre side med ikoner og tekst-labels.

### 5.6. Feedback & Notifikationer

-   **`Toast`:** Vises nederst til højre. Forsvinder automatisk efter 5 sekunder. Bruges til ikke-kritiske notifikationer.
-   **`LoadingScreen`:** En fuldskærms- eller inline-komponent med SoulMatch-logoet og en blød fade-animation. Bruges ved indlæsning af appen eller sider.
-   **Fejlmeddelelser:** Vises inline i formularer eller som en banner-komponent for side-dækkende fejl. Skal være i fejlfarven (rød).

---

## 6. Animation & Bevægelse (Motion)

Vi bruger **Framer Motion** til at tilføje subtile og meningsfulde animationer.

-   **Side-overgange:** En simpel `fade`-effekt (`opacity: 0` til `1`).
-   **Modal-visning:** En kombination af `scale` og `opacity` for en blød pop-up-effekt.
-   **Liste-elementer:** Når nye elementer tilføjes til en liste (f.eks. tags), animeres de ind med `opacity` og `scale`.
-   **Loading-animationer:** `pulse-slow` animation for at indikere aktivitet.

---

## 7. Tilgængelighed (Accessibility - a11y)

Vi stræber efter at overholde **WCAG 2.1 AA**-standarderne.

-   **Farvekontrast:** Al tekst skal have en kontrastratio på mindst 4.5:1 mod sin baggrund.
-   **Semantisk HTML:** Korrekt brug af `<nav>`, `<main>`, `<button>`, etc.
-   **Tastatur-navigation:** Alle interaktive elementer skal være tilgængelige og kunne betjenes via tastatur. En tydelig `focus`-ring skal være synlig.
-   **ARIA-attributter:** Brug af `aria-label`, `role`, og `aria-live` for at give kontekst til skærmlæsere, især for ikon-knapper og dynamisk indhold som toasts.
-   **Billeder:** Alle billeder, der formidler indhold, skal have en beskrivende `alt`-tekst. Dekorative billeder skal have en tom `alt=""`.

---

## 8. Sprog & Tone (Voice & Tone)

-   **Sprog:** Dansk.
-   **Tone:**
    -   **Velkommende:** "Velkommen tilbage", "Fortæl os lidt om dig selv".
    -   **Opmuntrende:** "Find din nye SoulMate", "Skal vi tage afsted sammen? 😊".
    -   **Klar og direkte:** "Opret Event", "Gem Ændringer".
    -   **Tryghedsskabende:** "Din anmeldelse er anonym."
-   **Emojis:** Brug af emojis (😊, 😎, 🎉) er opfordret, hvor det passer, for at skabe en venlig og uformel tone, der appellerer til vores målgruppe.

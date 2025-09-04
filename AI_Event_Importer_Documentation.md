# Dokumentation: Importer Event med AI

## 1. Formål

"Importer Event med AI" er et avanceret værktøj designet til at spare organisationer tid og besvær. Funktionen bruger Google Gemini AI til automatisk at analysere ustruktureret information – såsom tekst fra en e-mail, et billede af en plakat eller en PDF-fil – og omdanne den til et fuldt oprettet, velformateret event i SoulMatch-systemet. Dette inkluderer automatisk udfyldning af titel, beskrivelse, tidspunkt, adresse, kategori og endda generering af unikke billeder til eventet.

## 2. Brugerflow: Trin for Trin

Processen er designet til at være så intuitiv som muligt og er opdelt i klare etaper.

### Trin 1: Vælg Import-Type

Når brugeren navigerer til siden, bliver de mødt med et simpelt valg:
- **"Et enkelt event":** Til oprettelse af ét event ad gangen.
- **"Flere events":** Til batch-oprettelse af flere events fra separate filer.

### Trin 2: Angiv Information

#### For et enkelt event:
Brugeren kan levere information på tre måder, som kan kombineres:
1.  **Tekst-input:** Indsæt tekst direkte i et tekstfelt (f.eks. fra en hjemmeside, e-mail eller et dokument).
2.  **Fil-upload:** Upload op til 8 filer. Understøttede formater er:
    -   Billeder (`.jpg`, `.png`, etc.) – f.eks. et billede af en fysisk plakat.
    -   PDF-dokumenter (`.pdf`) – f.eks. en event-flyer.
3.  **Kombination:** Brugeren kan både indsætte tekst og uploade filer for at give AI'en mest muligt kontekst.

#### For flere events (Batch-import):
Brugeren kan kun uploade filer. Hver fil (billede eller PDF) bliver behandlet som et separat, unikt event.

### Trin 3: Konfigurer AI-Indstillinger

Før AI'en aktiveres, kan brugeren finjustere, hvordan den skal arbejde:
- **Billedgenerering:**
    -   **Stil:** Vælg mellem `Realistisk` (fotolignende) eller `Illustration` (kunstnerisk). Brugeren kan også vælge `Intet billede`.
    -   **Antal:** Vælg, hvor mange billeder (1-4) AI'en skal generere til eventet.
    -   **Inkluder Titel:** En til/fra-knap, der bestemmer, om eventets titel skal forsøges integreret som tekst i de genererede billeder.
- **Emojis i Beskrivelse (kun for enkelt event):**
    -   Vælg, hvor mange emojis AI'en skal tilføje til den genererede beskrivelse for at gøre den mere levende (`Ingen`, `En smule`, `Mange`, eller `Lad AI beslutte`).

### Trin 4: AI-Analyse & Behandling

Når brugeren klikker på "Importer", sker følgende bag scenen:
1.  **Dataforberedelse:** Tekst og filer sendes til Gemini AI-modellen. Filer bliver konverteret til et format, AI'en kan læse (base64).
2.  **Informations-ekstraktion:** AI'en analyserer alt det modtagne materiale og identificerer:
    -   Titel
    -   Beskrivelse (som den renskriver og forbedrer)
    -   Start- og sluttidspunkt
    -   Adresse
    -   Den mest passende kategori fra systemets liste
    -   Et passende emoji-ikon
3.  **Konfliktløsning:** Hvis AI'en finder flere mulige datoer eller tidspunkter i materialet, stopper processen midlertidigt, og en dialogboks vises, hvor brugeren kan vælge det korrekte tidspunkt.
4.  **Billedgenerering (To-trins proces):**
    a. Først analyserer en avanceret tekst-model (Gemini 2.5 Flash) eventets beskrivelse og genererer en kort, præcis og visuel prompt på engelsk.
    b. Denne optimerede prompt sendes derefter til en billedgenererings-model (Imagen), som skaber de ønskede billeder. Dette sikrer højere kvalitet og færre fejl.
5.  **Upload af Billeder:** De AI-genererede billeder uploades automatisk til lageret og knyttes til det kommende event.

### Trin 5: Gennemse og Bekræft

#### For et enkelt event:
Brugeren præsenteres for en forudfyldt oprettelsesformular med alle de data, AI'en har fundet. Her kan brugeren:
-   Redigere alle felter.
-   Se og fjerne AI-genererede billeder.
-   Klikke "Opret Event" for at færdiggøre processen.

#### For flere events (Batch-import):
Brugeren kommer til en speciel "Gennemse"-side, som er opdelt i to sektioner:
-   **Succesfulde Imports:** En liste over de events, AI'en succesfuldt kunne oprette, vist med titel, tidspunkt og de genererede billeder.
-   **Fejlede Imports:** En liste over de filer, som AI'en *ikke* kunne behandle, inklusiv en fejlbesked (f.eks. "Kunne ikke finde en gyldig dato").

Herfra kan brugeren med ét klik godkende og oprette alle de succesfulde events.

## 3. Teknisk Oversigt

-   **AI-model (Tekst):** `gemini-2.5-flash` bruges til at analysere den multimodale input (tekst + billeder/PDFs) og til at generere den visuelle prompt.
-   **AI-model (Billeder):** `imagen-4.0-generate-001` bruges til at generere billederne baseret på den optimerede prompt.
-   **Struktureret Output:** Vi instruerer Gemini-modellen til at returnere data i et specifikt JSON-format ved hjælp af en `responseSchema`. Dette sikrer, at vi modtager pålidelige og forudsigelige data, som systemet kan arbejde med.
-   **Datahåndtering:** Uploadede filer konverteres til base64-strenge, før de sendes til Gemini API'en. AI-genererede billeder modtages som base64 og uploades derefter til appens S3-kompatible lager.

## 4. Fordele

-   **Tidsbesparelse:** Reducerer manuel dataindtastning markant. En organisation kan oprette flere events på få minutter.
-   **Brugervenlighed:** Kræver ingen teknisk snilde. Hvis man har en plakat, kan man oprette et event.
-   **Kvalitetsløft:** AI'en forbedrer event-beskrivelser og genererer automatisk flotte, relevante billeder, hvilket gør events mere attraktive for brugerne.
-   **Fleksibilitet:** Understøtter flere input-typer og arbejdsgange (enkelt vs. batch), hvilket passer til forskellige behov.

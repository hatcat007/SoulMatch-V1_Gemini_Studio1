-- SoulMatch Supabase Schema
-- version: 1.0

-- 1. Create Tables
CREATE TABLE "public"."users" (
    "id" bigint NOT NULL,
    "name" character varying,
    "age" smallint,
    "avatar_url" text,
    "online" boolean DEFAULT false,
    "bio" text,
    "location" text,
    "personality_type" character varying(4),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."users" OWNER TO "postgres";
CREATE SEQUENCE "public"."users_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE "public"."users_id_seq" OWNER TO "postgres";
ALTER SEQUENCE "public"."users_id_seq" OWNED BY "public"."users"."id";
ALTER TABLE ONLY "public"."users" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."users_id_seq"'::"regclass");
ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

CREATE TABLE "public"."organizations" (
    "id" bigint NOT NULL,
    "name" character varying,
    "logo_url" text,
    "address" text,
    "description" text,
    "phone" character varying,
    "email" character varying,
    "website" character varying,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."organizations" OWNER TO "postgres";
CREATE SEQUENCE "public"."organizations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE "public"."organizations_id_seq" OWNER TO "postgres";
ALTER SEQUENCE "public"."organizations_id_seq" OWNED BY "public"."organizations"."id";
ALTER TABLE ONLY "public"."organizations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."organizations_id_seq"'::"regclass");
ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");

CREATE TABLE "public"."events" (
    "id" bigint NOT NULL,
    "title" character varying,
    "time" text,
    "host_name" character varying,
    "host_avatar_url" text,
    "icon" character varying,
    "color" character varying,
    "category" character varying,
    "description" text,
    "organization_id" bigint,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."events" OWNER TO "postgres";
CREATE SEQUENCE "public"."events_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE "public"."events_id_seq" OWNER TO "postgres";
ALTER SEQUENCE "public"."events_id_seq" OWNED BY "public"."events"."id";
ALTER TABLE ONLY "public"."events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."events_id_seq"'::"regclass");
ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

CREATE TABLE "public"."places" (
    "id" bigint NOT NULL,
    "name" character varying,
    "offer" text,
    "address" text,
    "icon" character varying,
    "category" character varying,
    "description" text,
    "is_sponsored" boolean,
    "phone" character varying,
    "opening_hours" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."places" OWNER TO "postgres";
CREATE SEQUENCE "public"."places_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE "public"."places_id_seq" OWNER TO "postgres";
ALTER SEQUENCE "public"."places_id_seq" OWNED BY "public"."places"."id";
ALTER TABLE ONLY "public"."places" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."places_id_seq"'::"regclass");
ALTER TABLE ONLY "public"."places"
    ADD CONSTRAINT "places_pkey" PRIMARY KEY ("id");

CREATE TABLE "public"."event_participants" (
    "event_id" bigint NOT NULL,
    "user_id" bigint NOT NULL
);
ALTER TABLE "public"."event_participants" OWNER TO "postgres";
ALTER TABLE ONLY "public"."event_participants"
    ADD CONSTRAINT "event_participants_pkey" PRIMARY KEY ("event_id", "user_id");
ALTER TABLE ONLY "public"."event_participants"
    ADD CONSTRAINT "event_participants_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."event_participants"
    ADD CONSTRAINT "event_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

CREATE TABLE "public"."user_traits" (
    "user_id" bigint NOT NULL,
    "trait" character varying NOT NULL,
    "value" smallint
);
ALTER TABLE "public"."user_traits" OWNER TO "postgres";
ALTER TABLE ONLY "public"."user_traits"
    ADD CONSTRAINT "user_traits_pkey" PRIMARY KEY ("user_id", "trait");
ALTER TABLE ONLY "public"."user_traits"
    ADD CONSTRAINT "user_traits_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. Insert Data
-- Note: User IDs are explicitly set to match mock data.
-- We will reset the sequence after insertion.
INSERT INTO "public"."users" ("id", "name", "age", "avatar_url", "online", "bio", "location", "personality_type") VALUES
(1, 'Anne', 24, 'https://picsum.photos/id/1011/100/100', true, 'Kreativt menneske som elsker film, gaming, katte og gåture. Lad os mødes til en god kaffe 😊', 'Aalborg, Denmark', 'INFJ'),
(2, 'Jens', 26, 'https://picsum.photos/id/1025/100/100', true, NULL, NULL, NULL),
(3, 'Sofie', 22, 'https://picsum.photos/id/1012/100/100', true, NULL, NULL, NULL),
(4, 'Victoria', 25, 'https://picsum.photos/id/1013/100/100', false, NULL, NULL, NULL),
(101, 'Chris', 20, 'https://i.pravatar.cc/80?u=101', true, NULL, NULL, NULL),
(102, 'Søren', 22, 'https://i.pravatar.cc/80?u=102', false, NULL, NULL, NULL),
(103, 'Jens', 20, 'https://i.pravatar.cc/80?u=103', true, NULL, NULL, NULL),
(104, 'Chris', 20, 'https://i.pravatar.cc/80?u=104', false, NULL, NULL, NULL),
(105, 'Ib', 20, 'https://i.pravatar.cc/80?u=105', true, NULL, NULL, NULL),
(999, 'Mig', 25, 'https://i.pravatar.cc/80?u=999', true, NULL, NULL, NULL);

-- Reset user sequence
SELECT setval('public.users_id_seq', (SELECT MAX(id) FROM public.users));

INSERT INTO "public"."organizations" ("id", "name", "logo_url", "address", "description", "phone", "email", "website") VALUES
(1, 'SIND Ungdom Aalborg', 'https://i.imgur.com/8S8V5c2.png', 'Danmarksgade 52, Aalborg, Denmark', 'SIND Ungdom i Aalborg er et klubtilbud for unge psykisk sårbare i alderen 16-35 år.', '+45 12 34 56 78', 'info@sind-aalborg.dk', 'www.sind-aalborg.dk'),
(2, 'Studenterhuset Aalborg', 'https://i.imgur.com/fL5FfJ4.png', 'Gammeltorv 10, 9000 Aalborg', 'Aalborgs internationale studenterhus. Vi arrangerer koncerter, debatter, fester og meget mere.', '+45 98 76 54 32', 'info@studenterhuset.dk', 'www.studenterhuset.dk'),
(3, 'Ventilen Aalborg', 'https://i.imgur.com/h5r8uGk.png', 'Kirkegårdsgade 2, 9000 Aalborg', 'Et mødested for unge, der føler sig ensomme. Her kan du møde andre unge og være en del af et fællesskab.', '+45 11 22 33 44', 'aalborg@ventilen.dk', 'www.ventilen.dk');

SELECT setval('public.organizations_id_seq', (SELECT MAX(id) FROM public.organizations));

INSERT INTO "public"."events" ("id", "title", "time", "host_name", "host_avatar_url", "icon", "color", "category", "description", "organization_id") VALUES
(1, 'Musik koncert sammen', 'Lige nu', 'Jesper fra Studenterhuset Aalborg', 'https://picsum.photos/id/237/40/40', '🎸', 'bg-yellow-100', 'Musik', 'Kom og hør Andreas Odbjerg.\nVi gir den første øl 🍺 #stopensomhed', 2),
(2, 'Fælles spisning', 'Om 31 min', 'SIND Ungdom Aalborg', 'https://i.imgur.com/8S8V5c2.png', '🍽️', 'bg-teal-100', 'Mad', 'Vi mødes til en hyggelig aften med god mad og snak. Alle er velkomne, og vi laver maden sammen. Medbring godt humør!', 1),
(3, 'Fælles brætspil', 'I dag klokken 18:00', 'Ventilen Aalborg', 'https://picsum.photos/id/239/40/40', '🎲', 'bg-green-100', 'Brætspil', 'Er du til Settlers, Bezzerwizzer eller noget helt tredje? Kom og vær med til en aften i brætspillets tegn. Vi har masser af spil, men tag også gerne dit eget yndlingsspil med.', 3);

SELECT setval('public.events_id_seq', (SELECT MAX(id) FROM public.events));

INSERT INTO "public"."event_participants" ("event_id", "user_id") VALUES
(1, 101), (1, 102), (1, 103), (1, 104), (1, 105),
(2, 1), (2, 2), (2, 3),
(3, 101), (3, 2), (3, 4);

INSERT INTO "public"."places" ("id", "name", "offer", "address", "icon", "category", "description", "is_sponsored", "phone", "opening_hours") VALUES
(1, 'Espresso House', '2 x gratis kaffe', 'Bispensgade 16, 9000 Aalborg', '☕', 'Café', 'Espresso House er Nordens største kaffebarkæde. Vi støtter kampen mod ensomhed ved at tilbyde et hyggeligt mødested, hvor nye venskaber kan blomstre over en god kop kaffe.', true, '+45 12 34 56 78', 'Man-Fre: 07:30 - 19:00'),
(2, 'Heidis bier bar', '25% rabat på hele regningen', 'Jomfru Anes Gård 5, 9000 Aalborg', '🍻', 'Bar', 'Kom og oplev ægte afterski-stemning midt i Aalborg! Vi tror på, at fællesskab og fest er den bedste medicin mod ensomhed.', false, '+45 87 65 43 21', 'Tors-Lør: 20:00 - 05:00'),
(3, 'McDonalds', 'Gratis cheeseburger ved køb af menu', 'Nytorv 2, 9000 Aalborg', '🍔', 'Restaurant', 'Et velkendt og uformelt sted at mødes. Vi støtter lokalsamfundet og vil gerne give en lille ekstra ting til nye venner, der mødes hos os.', true, '+45 98 76 54 32', 'Alle dage: 10:00 - 01:00');

SELECT setval('public.places_id_seq', (SELECT MAX(id) FROM public.places));

INSERT INTO "public"."user_traits" ("user_id", "trait", "value") VALUES
(1, 'Abstrakt opfattelse', 70),
(1, 'Emotionel tænkning', 80),
(1, 'Rationel tænkning', 40),
(1, 'Konkret opfattelse', 60);

-- 3. Row Level Security (RLS) Policies
-- Enable RLS for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_traits ENABLE ROW LEVEL SECURITY;

-- Policies for public access (read-only for authenticated users)
CREATE POLICY "Allow read access to all authenticated users" ON public.users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access to all authenticated users" ON public.organizations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access to all authenticated users" ON public.events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access to all authenticated users" ON public.places FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access to all authenticated users" ON public.event_participants FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access to all authenticated users" ON public.user_traits FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for individual user access (e.g., updating their own profile)
-- Example: Allow users to update their own profile
CREATE POLICY "Allow users to update their own profile" ON public.users
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Grant usage on schema and sequences to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

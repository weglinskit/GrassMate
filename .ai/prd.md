📄 Product Requirements Document (PRD) – GrassMate (MVP)

Wersja: 1.0
Produkt: GrassMate – Inteligentne rekomendacje pielęgnacji trawnika
Cel: Ułatwić właścicielom trawników podejmowanie decyzji o najważniejszych zabiegach pielęgnacyjnych dzięki prostym rekomendacjom pogodowym i rocznemu harmonogramowi.

⸻

1. Problem

Właściciele trawników nie wiedzą, kiedy wykonywać najważniejsze zabiegi (koszenie, nawożenie, podlewanie, aeracja, wertykulacja), zwłaszcza w kontekście aktualnych i prognozowanych warunków pogodowych. Brak tej wiedzy prowadzi do:
	•	błędnego doboru terminu zabiegu (np. nawożenie przed upałem, koszenie trawy po deszczu),
	•	nieoptymalnego podlewania,
	•	trudności w utrzymaniu zdrowego trawnika na przestrzeni całego sezonu.

GrassMate ma wypełnić tę lukę prostym i intuicyjnym asystentem działającym w przeglądarce.

⸻

2. Cele produktu

Cele główne
	1.	Dostarczyć użytkownikowi roczny, uproszczony harmonogram pielęgnacji trawnika.
	2.	Generować inteligentne rekomendacje pogodowe (np. „zbliżają się opady – wykonaj nawożenie”).
	3.	Pozwolić użytkownikowi śledzić wykonane zabiegi i otrzymywać przypomnienia.

Kryteria sukcesu MVP
	1.	≥ 70% użytkowników wykonuje zaproponowany zabieg w ciągu 48 godzin od powiadomienia lub zaplanowanego terminu.
	2.	≥ 80% użytkowników ocenia rekomendacje jako pomocne (≥ 4/5 gwiazdek).

⸻

3. Zakres MVP

3.1. Funkcjonalności wchodzące w zakres MVP

A. Roczny harmonogram zabiegów
	•	Statyczna baza najważniejszych zabiegów zależnych od sezonu.
	•	Każdy zabieg posiada: nazwę, opis, priorytet, minimalny cooldown, ewentualny okres wykonywania.

B. Dynamiczne rekomendacje pogodowe

Źródła danych:
	•	Open-Meteo (prognoza + dane historyczne)

Logika generuje rekomendacje m.in. dla:
	•	Podlewania
	•	Nawożenia
	•	Koszenia

Uwzględnia:
	•	sumę opadów z ostatnich 72h,
	•	liczbę dni bez opadów (susza),
	•	prognozowane opady,
	•	prognozowaną temperaturę,
	•	minimalny cooldown od ostatnio wykonanego zabiegu.

C. Lista nadchodzących zabiegów
	•	Uproszczony widok listy, nie pełny kalendarz.
	•	Dynamiczne i statyczne zabiegi wyświetlane razem.
	•	Szablony treści rekomendacji.

D. Oznaczanie wykonania zabiegu
	•	Użytkownik może oznaczyć zabieg jako:
	•	Wykonany (z datą wykonania),
	•	Odrzucony,
	•	Automatycznie wygasły po czasie.

E. Minimalna historia
	•	Zawiera wszystkie wykonane, odrzucone i wygasłe zabiegi.

F. Logowanie użytkownika
	•	Rejestracja i logowanie przez e-mail + hasło.
	•	Przechowywanie historii i profilu użytkownika w zewnętrznej bazie danych.

G. Profil trawnika (opcjonalny)

Pola:
	•	nasłonecznienie (domyślnie „średnie”),
	•	wielkość trawnika (domyślna wartość),
	•	rodzaj powierzchni.

Zmiana profilu powoduje przebudowanie przyszłych rekomendacji.

H. Powiadomienia web push
	•	Web Push (po opt-in z przeglądarki).
	•	Dwa stałe szablony powiadomień:
	1.	Zabieg planowy
	2.	Rekomendacja pogodowa

I. Odświeżanie logiki rekomendacji
	•	Raz na 24h automatyczne przeliczenie zabiegów.

⸻

3.2. Zakres wyłączony z MVP
	•	Aplikacja mobilna / PWA
	•	Zaawansowana analiza zdjęć lub diagnozowanie chorób
	•	Integracje z robotami koszącymi / systemami nawadniania
	•	Własne zabiegi użytkownika
	•	Rozbudowane wykresy i statystyki
	•	Społeczność, zdjęcia, porównania trawników
	•	Google OAuth (roadmapa)

⸻

4. User Stories

4.1. Onboarding
	•	Jako użytkownik chcę szybko rozpocząć korzystanie z podstawowych rekomendacji, nawet jeśli nie znam parametrów mojego trawnika.

4.2. Lista zabiegów
	•	Jako użytkownik chcę widzieć listę nadchodzących zabiegów, aby móc planować pracę.

4.3. Dynamiczne rekomendacje
	•	Jako użytkownik chcę otrzymywać powiadomienie, że nadchodzą opady i warto wykonać nawożenie.

4.4. Oznaczanie wykonania
	•	Jako użytkownik chcę oznaczyć wykonanie zabiegu w aplikacji i wybrać datę wykonania, aby harmonogram był aktualny.

4.5. Historia
	•	Jako użytkownik chcę widzieć, co zostało zrobione w tym sezonie.

4.6. Logowanie
	•	Jako użytkownik chcę zalogować się na swój profil i mieć zapisane zabiegi niezależnie od urządzenia.

⸻

5. Logika rekomendacji

5.1. Źródła danych (Open-Meteo)
	•	temperatury dzienne (max),
	•	opady (mm, 24h),
	•	sumy opadów z 72h,
	•	dni bez opadów,
	•	prognozy 3–7 dniowe.

5.2. Reguły pogodowe

Susza
	•	≥ 5 dni bez opadów → rekomendacja podlewania
	•	≥ 10 dni → zwiększyć rekomendowane podlewanie

Opady
	•	5 mm/24h → nie podlewać
	•	10 mm/24h → nie kosić

Temperatura
	•	≥ 30°C → zwiększyć podlewanie, zakaz nawożenia
	•	≥ 32–35°C → unikać koszenia

Dynamiczne zalecenia z odstępu od ostatniego zabiegu
	•	Podlewanie np. co X dni lub X mm/m²
	•	Koszenie min. co 5 dni
	•	Nawożenie min. co 30 dni

⸻

6. Powiadomienia

6.1. Typy powiadomień
	1.	Planowy zabieg z kalendarza
	2.	Rekomendacja pogodowa:
„Zbliżają się opady (≥5 mm). Rozważ nawożenie dziś — deszcz pomoże w rozprowadzeniu nawozu.”

6.2. Reguły wysyłki
	•	Tylko po opt-in.
	•	Tylko raz dziennie.
	•	Rekomendacje nie powtarzają się w czasie cooldown.

⸻

7. Wymagania techniczne

Technologie sugerowane
	•	Frontend: React / Svelte / Next.js (dowolne proste SPA)
	•	Backend: Node.js / serverless (np. AWS Lambda)
	•	Baza danych: Supabase / Firebase / Planetscale / PostgreSQL
	•	Scheduler: cron / serverless scheduler
	•	Dostawca powiadomień: Web Push API
	•	Dostawca pogody: Open-Meteo (bez kosztów)

⸻

8. Dane i przechowywanie

8.1. Dane użytkownika
	•	email + hasło (hashowane),
	•	profil trawnika,
	•	historia zabiegów,
	•	logi wykonania/odrzucenia/wygaszenia.

8.2. Dane pogodowe
	•	pobierane na żądanie,
	•	przechowywane maksymalnie 24h.

⸻

9. Wymagania UX/UI

Widoki MVP:
	1.	Login / rejestracja
	2.	Dashboard z nadchodzącymi zabiegami
	3.	Historia zabiegów
	4.	Edycja profilu trawnika
	5.	Widok „oznacz wykonanie zabiegu”
	6.	Panel ustawień (powiadomienia, konto)

Design minimalny, „lifestylowy”, lekki, delikatnie ogrodniczy.

⸻

10. Analityka

Zbierane zdarzenia:
	•	reminder_sent
	•	reminder_clicked
	•	task_completed
	•	task_skipped
	•	task_expired
	•	weather_recommendation_created
	•	survey_answer (1–5 gwiazdek)

⸻

11. Ryzyka
	1.	Niedokładność danych pogodowych → błędne rekomendacje
	2.	Zbyt agresywne powiadomienia → wyłączenie powiadomień przez użytkownika
	3.	Uproszczone modele podlewania mogą wymagać korekt w sezonie
	4.	Jednoosobowe prowadzenie beta testów może opóźnić iteracje

⸻

12. Roadmapa (wysoki poziom)

Etap 1 – MVP (4–6 tygodni)
	•	Logowanie
	•	Harmonogram roczny
	•	Integracja z Open-Meteo
	•	Generowanie rekomendacji pogodowych
	•	Web Push
	•	Lista zabiegów
	•	Oznaczanie wykonania / odrzucenia
	•	Historia
	•	Minimalny UX

Etap 2 – Po MVP
	•	Google OAuth
	•	PWA / mobilna wersja
	•	Zaawansowane modele podlewania
	•	Personalizacja oparta o typ gleby
	•	Testy z większą grupą użytkowników
	•	Integracje z robotami koszącymi

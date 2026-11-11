# Project: Animated Interactive Wedding Invitation Platform

## 1. Overview
A web application allowing hosts to select an animated invitation template, upload a guest list via CSV, and generate unique, trackable invitation links. Guests receive a WhatsApp message with their unique link, which opens an animated, interactive web invitation tailored specifically to them (showing only the events they are invited to).

## 2. Tech Stack
*   **Framework:** Next.js (React)
*   **Styling:** Tailwind CSS
*   **Animations:** Framer Motion (for page transitions, scroll reveals, and interactive elements)
*   **CSV Parsing:** PapaParse
*   **Database/Backend:** Supabase (PostgreSQL) for storing guest data and unique routing codes.
*   **Icons:** Lucide React

## 3. Core Workflows

### A. Host Workflow (Dashboard)
1.  **Template Selection:** Host selects a predefined template design.
2.  **Guest List Upload:** Host uploads a CSV file.
    *   *Expected CSV Columns:* `Guest Name`, `WhatsApp Number`, `Invited Events` (comma-separated, e.g., "Dinner,Grah Shanti,Wedding,Reception").
3.  **Data Processing & ID Generation:** 
    *   System parses the CSV.
    *   Generates a unique NanoID or UUID for each row.
    *   Saves the record to the database: `id`, `host_id`, `guest_name`, `phone`, `allowed_events`, `unique_code`.
4.  **Distribution:**
    *   Dashboard displays a table of all processed guests.
    *   Each row has a "Send via WhatsApp" button.
    *   Clicking the button triggers the WhatsApp URL scheme: 
        `https://wa.me/<WhatsApp Number>?text=Dear <Guest Name>, you are cordially invited... Please view your invitation here: https://<domain>/invite/<unique_code>`

### B. Guest Workflow (Invitation Viewer)
1.  **Authentication/Routing:** Guest clicks the link `domain.com/invite/XYZ123`.
2.  **Data Fetch:** System queries the database for code `XYZ123`.
3.  **Dynamic Rendering:** 
    *   The web app renders the animated invitation.
    *   The navigation/pages are dynamically filtered based on the `allowed_events` array for that specific guest. If a guest is not invited to the "Reception", that page/slide does not exist in their DOM.

## 4. Database Schema (Supabase)

**Table: `guests`**
*   `id` (uuid, primary key)
*   `unique_code` (text, unique, indexed)
*   `guest_name` (text)
*   `phone_number` (text)
*   `allowed_events` (jsonb array, e.g., `["wedding", "reception"]`)
*   `viewed_status` (boolean, default: false)

## 5. Template 1: Base Content Structure
Use the following JSON structure to populate the first default template, extracted from the provided physical and digital reference cards.

```json
{
  "couple": {
    "bride": "Maitri",
    "groom": "Abhishekkumar",
    "hashtag": "#AbhiसेMaitriतक"
  },
  "parents": {
    "bride_parents": "Mrs. Yashmi & Mr. Bharatkumar Ramchandra Jariwala",
    "groom_parents": "Mrs. Bhumika & Mr. Manish Kumudchandra Mashruwala"
  },
  "events": {
    "spicy_food_dinner": {
      "id": "dinner",
      "title": "Spicy Food / Dinner Ceremony",
      "date": "Wednesday 25th November 2026",
      "time": "8:00 P.M. onwards",
      "venue": "Mango Farm, Opp Mahavir Soc. Banglow No. 4, Near Kiran Hospital, Katargam, Surat",
      "host": "Jariwala Family"
    },
    "sangeet": {
      "id": "sangeet",
      "title": "Mosariya Sangeet",
      "date": "29th November 2026",
      "time": "7:30 P.M. onwards",
      "venue": "D.B. Patel Sport Ground, Bhimrad-Althan Rd, Nr Shrungle hills, Surat"
    },
    "grah_shanti": {
      "id": "grah_shanti",
      "title": "Grah Shanti",
      "date": "Monday 14th December 2026",
      "time": "10:00 A.M.",
      "venue": "Singapuri Ni Wadi - Garden, Salabatpura, Surat"
    },
    "baraat": {
      "id": "baraat",
      "title": "Baraat",
      "date": "14th December 2026",
      "time": "7:00 P.M. onwards",
      "venue": "3/2054, Vachli Sheri, Salabatpura, Surat"
    },
    "wedding": {
      "id": "wedding",
      "title": "Wedding Ceremony",
      "date": "Monday 14th December 2026",
      "time": "8:00 P.M.",
      "venue": "Singapuri Ni Wadi - Garden, Salabatpura, Surat"
    },
    "reception_jariwala": {
      "id": "reception_jariwala",
      "title": "Wedding Reception",
      "date": "Saturday 19th December 2026",
      "time": "8:00 P.M. onwards",
      "venue": "Hiramoti Party Plot, Udhana - Magdalla Road, Near Prime Shoppers, Vesu, Surat"
    }
  }
}
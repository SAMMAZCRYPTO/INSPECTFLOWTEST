# InspectFlow - Supabase Migration

InspectFlow is a comprehensive inspection management platform with **Supabase** as the backend.

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** (required for local Supabase)
- **Node.js** v16 or higher
- **npm** or **yarn**

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Supabase Locally

```bash
# First time setup - this will download Docker images
npx supabase start

# This will output your Anon Key - copy it!
```

### 3. Configure Environment

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<paste-your-anon-key-here>
```

### 4. Run Development Server

```bash
npm run dev
```

Visit **http://localhost:5173** 🎉

### 5. Access Supabase Studio

Visit **http://localhost:54323** to:
- View database tables
- Run SQL queries  
- Manage auth users
- Browse storage files

---

## 📚 Project Structure

```
inspectflow/
├── src/
│   ├── api/
│   │   ├── supabaseClient.js    # Supabase client configuration
│   │   ├── entities.js           # Entity CRUD wrappers
│   │   └── storage.js            # File upload helpers
│   ├── components/               # React components
│   ├── pages/                    # Page templates
│   └── main.jsx                  # App entry point
├── supabase/
│   ├── config.toml               # Supabase configuration
│   ├── functions/                # Edge Functions for AI
│   │   ├── parse-notification/   # Gemini: Parse notification PDFs
│   │   └── parse-report/         # Gemini: Parse report PDFs
│   └── migrations/               # SQL migrations
│       ├── 20250101000000_create_types.sql
│       ├── 20250101000001_create_tables.sql
│       ├── 20250101000002_setup_rls.sql
│       └── 20250101000003_setup_storage_and_functions.sql
├── .env.local                    # Local environment variables (gitignored)
└── package.json
```

---

## 🗄️ Database Structure

### Tables

1. **projects** - Project/contract grouping
2. **tpi_agencies** - Third-party inspection agencies
3. **inspectors** - Inspector profiles
4. **inspections** - Core inspection records
5. **inspection_reviews** - Performance scoring
6. **inspection_attendance** - Check-in/out tracking

### Storage Buckets

1. **inspection-documents** - PDFs (notifications, reports, IRCs)
2. **inspector-cvs** - Inspector CV files
3. **avatars** - User profile pictures

---

## 👥 User Roles

- **admin** - Full system access
- **qc_manager** - Manage inspections, assign inspectors
- **inspection_engineer** - Review and approve reports
- **inspector** - Perform inspections, upload reports
- **tpi_manager** - Manage agency inspectors

---

## 🤖 AI Integration (Google Gemini)

InspectFlow uses **Google Gemini 2.0 Flash** for automatic PDF parsing:

✅ **Notification PDFs** → Auto-extract PO numbers, dates, supplier info, line items  
✅ **Report PDFs** → Identify NCRs, findings, observations, test results  
✅ **Multimodal** → Process PDFs, images, tables directly  
✅ **Free Tier** → 1,500 requests/day

### Quick Setup

1. **Get API Key:** https://ai.google.dev/
2. **Add to `.env.local`:**
   ```env
   GEMINI_API_KEY=your-api-key-here
   ```
3. **Set Supabase Secret:**
   ```bash
   npx supabase secrets set GEMINI_API_KEY=your-key
   ```

### Usage Example

```javascript
import { uploadAndParseNotification } from '@/api/ai';

// Upload and auto-extract in one call
const data = await uploadAndParseNotification(pdfFile);
// Returns: { po_number, supplier_name, items_being_offered, ... }
```

📖 **Detailed Guide:** [docs/AI_INTEGRATION.md](./docs/AI_INTEGRATION.md)

---

## 🔧 Useful Commands

```bash
# Start Supabase
npx supabase start

# Stop Supabase
npx supabase stop

# View Supabase status (get keys)
npx supabase status

# Reset database (⚠️ deletes all data)
npx supabase db reset

# Generate TypeScript types
npx supabase gen types typescript --local > src/types/database.types.ts

# Run development server
npm run dev

# Build for production
npm run build
```

---

## 🛠️ API Usage Examples

### Authentication

```javascript
import { User } from '@/api/entities';

// Sign up
await User.signUp({
  email: 'inspector@example.com',
  password: 'password123',
  options: {
    data: {
      role: 'inspector',
      full_name: 'John Doe'
    }
  }
});

// Sign in
await User.signIn({
  email: 'inspector@example.com',
  password: 'password123'
});

// Get current user
const user = await User.getUser();
```

### CRUD Operations

```javascript
import { Inspection, Inspector } from '@/api/entities';

// List inspections
const inspections = await Inspection.list({ status: 'in_progress' });

// Get single inspection
const inspection = await Inspection.get('uuid-here');

// Create new inspection
const newInspection = await Inspection.create({
  po_number: 'PO-12345',
  notification_number: 'NOT-001',
  supplier_name: 'ABC Manufacturing',
  status: 'received'
});

// Update inspection
await Inspection.update('uuid', { status: 'completed' });

// Delete inspection
await Inspection.delete('uuid');
```

### File Uploads

```javascript
import { uploadInspectionReport, uploadInspectorCV } from '@/api/storage';

// Upload inspection report
const reportUrl = await uploadInspectionReport(
  fileObject,
  inspectionId,
  'final'
);

// Upload inspector CV
const cvUrl = await uploadInspectorCV(fileObject, inspectorId);
```

---

## 🧪 Testing

### Create Test Users

Use Supabase Studio (http://localhost:54323):

1. Go to **Authentication** → **Users**
2. Click **Add user**
3. Add email and password
4. In **User Metadata**, add:
   ```json
   {
     "role": "admin",
     "full_name": "Test Admin"
   }
   ```

---

## 🚨 Troubleshooting

### Docker not running

**Error:** `Cannot connect to Docker daemon`

**Solution:** Start Docker Desktop and wait for it to fully initialize.

### Port conflicts

**Error:** `Port 54321 already in use`

**Solution:** 
```bash
npx supabase stop
# Or kill process using the port
```

### Environment variables not loaded

**Error:** Connection errors or undefined URLs

**Solution:**
1. Ensure `.env.local` exists
2. Restart dev server: `npm run dev`
3. Verify with: `npx supabase status`

---

## 📖 Further Documentation

- **Supabase Docs:** https://supabase.com/docs
- **Local Development:** https://supabase.com/docs/guides/cli/local-development
- **Row Level Security:** https://supabase.com/docs/guides/auth/row-level-security

---

## 🔄 Migration from Base44

This project has been migrated from Base44 to Supabase. The API layer maintains backward compatibility:

- `base44.entities.Inspection` → `Inspection` (from `@/api/entities`)
- `base44.auth` → `User` (from `@/api/entities`)
- File uploads use new `storage.js` helpers

All existing components should work with minimal changes.

---

## 📝 License

Private - InspectFlow Inspection Management System

---

**Built with ❤️ using Supabase, React, and Vite**
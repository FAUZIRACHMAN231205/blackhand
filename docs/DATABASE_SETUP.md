# Database Schema Setup Guide

## Overview

This guide will walk you through setting up the database schema for the BLACKHAND Digital Identity System in Supabase.

## Prerequisites

- Active Supabase project
- Access to Supabase SQL Editor
- Basic understanding of SQL and databases

## Tables Structure

### 1. **user_profiles** - Extended User Information

Stores additional user information beyond Supabase auth.

```sql
- id (UUID) - Primary key, references auth.users
- email (TEXT) - User email
- full_name (TEXT) - User's full name
- avatar_url (TEXT) - Profile picture URL
- bio (TEXT) - User bio
- created_at (TIMESTAMP) - Account creation date
- updated_at (TIMESTAMP) - Last update date
```

### 2. **projects** - User's Digital Identity Projects

Stores all projects created by users.

```sql
- id (UUID) - Primary key
- user_id (UUID) - References auth.users
- title (TEXT) - Project title
- description (TEXT) - Project description
- slug (TEXT) - URL-friendly identifier
- status (TEXT) - draft, published, or archived
- thumbnail_url (TEXT) - Project preview image
- created_at (TIMESTAMP) - Creation date
- updated_at (TIMESTAMP) - Last update date
```

### 3. **project_items** - Items Within Projects

Stores individual items/content within projects.

```sql
- id (UUID) - Primary key
- project_id (UUID) - References projects
- title (TEXT) - Item title
- description (TEXT) - Item description
- content (TEXT) - Item content
- image_url (TEXT) - Item image
- display_order (INTEGER) - Order of display
- created_at (TIMESTAMP) - Creation date
- updated_at (TIMESTAMP) - Last update date
```

### 4. **user_activity** - Activity Logging

Tracks user activities for analytics.

```sql
- id (UUID) - Primary key
- user_id (UUID) - References auth.users
- activity_type (TEXT) - Type of activity
- activity_data (JSONB) - Additional data as JSON
- ip_address (INET) - User IP address
- user_agent (TEXT) - Browser user agent
- created_at (TIMESTAMP) - Activity timestamp
```

### 5. **user_settings** - User Preferences

Stores user-specific settings and preferences.

```sql
- id (UUID) - Primary key, references auth.users
- theme (TEXT) - light, dark, or auto
- notifications_enabled (BOOLEAN) - Email notifications
- email_updates (BOOLEAN) - Newsletter/updates
- privacy_level (TEXT) - private, friends, or public
- created_at (TIMESTAMP) - Creation date
- updated_at (TIMESTAMP) - Last update date
```

## Setup Instructions

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Copy and Run the Schema SQL

1. Copy the entire content from `docs/DATABASE_SCHEMA.sql`
2. Paste it into the SQL editor
3. Click **Run** button

### Step 3: Verify Tables Created

After running the SQL:

1. Go to **Table Editor** in the sidebar
2. You should see all new tables:
   - `user_profiles`
   - `projects`
   - `project_items`
   - `user_activity`
   - `user_settings`

### Step 4: Enable Real-Time (Optional)

To enable real-time updates for tables:

1. Go to **Replication** settings
2. Enable replication for tables you want real-time updates

## Row Level Security (RLS)

All tables have RLS (Row Level Security) enabled with policies:

- **user_profiles**: Users can only view/update their own profile
- **projects**: Users can only manage their own projects
- **project_items**: Users can only manage items in their projects
- **user_settings**: Users can only view/update their own settings
- **user_activity**: Managed by system only

## Automatic Triggers

The schema includes a trigger (`on_auth_user_created`) that:

- Automatically creates a `user_profiles` row when a new user signs up
- Automatically creates a `user_settings` row with defaults
- No manual action needed when users register

## API Integration

### Getting User Profile with Statistics

Query the pre-built view:

```sql
SELECT * FROM public.user_profile_with_stats
WHERE id = auth.uid();
```

This returns:

- User profile information
- Total project count
- Published projects count

## Next Steps

1. **Implement API Routes**: Create endpoints to interact with these tables
2. **Update Frontend Components**: Use Supabase client library to fetch data
3. **Add More Views**: Create additional database views for common queries
4. **Set Up Storage**: Configure Supabase Storage for image uploads
5. **Implement Policies**: Adjust RLS policies based on your business logic

## Troubleshooting

### Tables not appearing?

- Refresh the Table Editor
- Check for SQL errors in the query results
- Ensure you're in the correct database

### Permission denied errors?

- Verify RLS policies are correctly applied
- Check that user is authenticated
- Ensure the user ID matches in the policy conditions

### Performance issues?

- Check that indexes are created (visible in Indexes tab)
- Consider adding more indexes for frequently queried columns
- Monitor query performance in SQL Editor

## Support

For more information:

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

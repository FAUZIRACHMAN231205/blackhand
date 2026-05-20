-- Database Schema untuk BLACKHAND Admin & Works Management

-- Table untuk menyimpan album/karya
CREATE TABLE IF NOT EXISTS works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- 'Paintings', 'Digital Art', 'Sculptures'
  featured_image_url VARCHAR(500), -- URL gambar featured dari work_images
  is_featured BOOLEAN DEFAULT false, -- Apakah karya ini featured showcase
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_published BOOLEAN DEFAULT true
);

-- Table untuk menyimpan multiple images per karya (max 6)
CREATE TABLE IF NOT EXISTS work_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  display_order INT NOT NULL DEFAULT 1, -- Urutan gambar 1-6
  is_featured BOOLEAN DEFAULT false, -- Image mana yang featured
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(work_id, display_order)
);

-- Index untuk performance
CREATE INDEX IF NOT EXISTS works_category_idx ON works(category);
CREATE INDEX IF NOT EXISTS works_created_by_idx ON works(created_by);
CREATE INDEX IF NOT EXISTS works_is_published_idx ON works(is_published);
CREATE INDEX IF NOT EXISTS works_is_featured_idx ON works(is_featured);
CREATE INDEX IF NOT EXISTS work_images_work_id_idx ON work_images(work_id);

-- RLS (Row Level Security) untuk works table
ALTER TABLE works ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users dapat melihat published works
CREATE POLICY "Users can view published works" ON works
  FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Policy: Admin (via email check) dapat melihat semua works
CREATE POLICY "Admins can view all works" ON works
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN (
      'manyungalang@gmail.com',
      'fauzirachman10091985@gmail.com'
    )
  );

-- Policy: Hanya admin yang dapat membuat works
CREATE POLICY "Only admins can create works" ON works
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email' IN (
      'manyungalang@gmail.com',
      'fauzirachman10091985@gmail.com'
    )
  );

-- Policy: Admin dapat update & delete works mereka
CREATE POLICY "Admins can update works" ON works
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN (
      'manyungalang@gmail.com',
      'fauzirachman10091985@gmail.com'
    )
  );

CREATE POLICY "Admins can delete works" ON works
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN (
      'manyungalang@gmail.com',
      'fauzirachman10091985@gmail.com'
    )
  );

-- RLS untuk work_images
ALTER TABLE work_images ENABLE ROW LEVEL SECURITY;

-- Policy: Semua user authenticated bisa lihat work_images dari published works
CREATE POLICY "Users can view published work images" ON work_images
  FOR SELECT
  TO authenticated
  USING (
    work_id IN (SELECT id FROM works WHERE is_published = true)
  );

-- Policy: Admin bisa lihat semua work_images
CREATE POLICY "Admins can view all work images" ON work_images
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN (
      'manyungalang@gmail.com',
      'fauzirachman10091985@gmail.com'
    )
  );

-- Policy: Admin dapat manage work_images
CREATE POLICY "Admins can manage work images" ON work_images
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN (
      'manyungalang@gmail.com',
      'fauzirachman10091985@gmail.com'
    )
  );

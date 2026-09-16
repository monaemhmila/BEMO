-- Performance indexes for Portrait AI

-- User indexes
CREATE INDEX IF NOT EXISTS idx_user_clerk_id ON  User(clerk_id);
CREATE INDEX IF NOT EXISTS idx_user_email ON User(email);
CREATE INDEX IF NOT EXISTS idx_user_created_at ON User(created_at);

-- Model indexes
CREATE INDEX IF NOT EXISTS idx_model_user_training ON Model(user_id, training_status);
CREATE INDEX IF NOT EXISTS idx_model_fal_request ON Model(fal_ai_request_id);
CREATE INDEX IF NOT EXISTS idx_model_created_at ON Model(created_at);

-- OutputImages indexes
CREATE INDEX IF NOT EXISTS idx_images_user_status ON OutputImages(user_id, status);
CREATE INDEX IF NOT EXISTS idx_images_model_status ON OutputImages(model_id, status);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON OutputImages(created_at);

-- Story indexes
CREATE INDEX IF NOT EXISTS idx_story_user_status ON Story(user_id, status);
CREATE INDEX IF NOT EXISTS idx_story_created_at ON Story(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_category_age ON Story(category, child_age);
CREATE INDEX IF NOT EXISTS idx_story_completed_at ON Story(completed_at);

-- StoryPage indexes
CREATE INDEX IF NOT EXISTS idx_page_story_number ON StoryPage(story_id, page_number);
CREATE INDEX IF NOT EXISTS idx_page_story_status ON StoryPage(story_id, status);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_story_user_created ON Story(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_user_created ON OutputImages(user_id, created_at DESC);

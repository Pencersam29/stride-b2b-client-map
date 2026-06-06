-- Make address and contact_email nullable since they are optional in the form
ALTER TABLE clients ALTER COLUMN address DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN contact_email DROP NOT NULL;

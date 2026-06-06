INSERT INTO clients (name, type, address, city, province_state, country, contact_name, contact_email, status, notes, lat, lng)
SELECT * FROM (VALUES
  ('Maple Grove Homecare', 'Homecare', '123 King St W', 'Toronto', 'ON', 'Canada', 'Sarah Mitchell', 'sarah@maplegrovehomecare.ca', 'Signed', 'Long-term contract. Very satisfied with services.', 43.6532, -79.3832),
  ('Sunset Ridge Retirement', 'Retirement Home', '456 Burrard St', 'Vancouver', 'BC', 'Canada', 'James Thornton', 'j.thornton@sunsetridge.ca', 'In Pipeline', 'Demo scheduled for next week. Interested in full package.', 49.2827, -123.1207),
  ('Prairie Care Services', 'Homecare', '789 Portage Ave', 'Winnipeg', 'MB', 'Canada', 'Linda Kowalski', 'linda@prairiecare.ca', 'Prospect', 'Initial outreach done. Need follow-up call.', 49.8951, -97.1384),
  ('Golden Years Residence', 'Retirement Home', '321 Ste-Catherine St', 'Montreal', 'QC', 'Canada', 'Pierre Beaumont', 'p.beaumont@goldenyears.ca', 'Not Interested', 'Switched to competitor. May revisit in 6 months.', 45.5017, -73.5673),
  ('Atlantic Home Health', 'Homecare', '55 Spring Garden Rd', 'Halifax', 'NS', 'Canada', 'Patricia MacLeod', 'pmacleod@atlantichomehealth.ca', 'On Hold', 'Budget freeze until Q3. Very interested otherwise.', 44.6488, -63.5752),
  ('Sunrise Senior Living', 'Retirement Home', '1000 Michigan Ave', 'Chicago', 'IL', 'USA', 'Robert Chen', 'rchen@sunrisesenior.com', 'Signed', 'Pilot program successful. Expanding to 3 locations.', 41.8781, -87.6298),
  ('Bay Area HomeHelp', 'Homecare', '500 Market St', 'San Francisco', 'CA', 'USA', 'Jennifer Walsh', 'jwalsh@bayareahomehelp.com', 'In Pipeline', 'Contract in legal review. Expected close next month.', 37.7749, -122.4194),
  ('Lone Star Care Group', 'Homecare', '1500 Commerce St', 'Dallas', 'TX', 'USA', 'Mike Rodriguez', 'mrodriguez@lonestarecare.com', 'Prospect', 'Referred by Chicago client. Very warm lead.', 32.7767, -96.7970),
  ('East Coast Elder Care', 'Retirement Home', '200 Boylston St', 'Boston', 'MA', 'USA', 'Anne Sullivan', 'anne@eastcoasteldercare.com', 'Signed', 'Annual contract renewed. Very happy customer.', 42.3601, -71.0589),
  ('Rocky Mountain Homecare', 'Homecare', '1700 Lincoln St', 'Denver', 'CO', 'USA', 'David Park', 'dpark@rockymtnhomecare.com', 'On Hold', 'Pending funding approval from state.', 39.7392, -104.9903)
) AS v(name, type, address, city, province_state, country, contact_name, contact_email, status, notes, lat, lng)
WHERE NOT EXISTS (SELECT 1 FROM clients LIMIT 1);

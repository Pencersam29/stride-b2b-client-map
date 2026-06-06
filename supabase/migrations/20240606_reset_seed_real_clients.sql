-- Remove all previously seeded fake clients
DELETE FROM clients;

-- Insert only real clients: Right at Home and Paramed, different Canadian offices
INSERT INTO clients (name, type, address, city, province_state, country, contact_name, contact_email, status, notes, lat, lng)
VALUES
  (
    'Right at Home Canada',
    'Homecare',
    '4211 Yonge St Suite 325',
    'Toronto',
    'ON',
    'Canada',
    'Sales Team',
    'info@rightathome.ca',
    'In Pipeline',
    'National homecare franchise network. Key account.',
    43.7479,
    -79.4076
  ),
  (
    'ParaMed Home Health Care',
    'Homecare',
    '700 West Georgia St Suite 1500',
    'Vancouver',
    'BC',
    'Canada',
    'Sales Team',
    'info@paramed.com',
    'Prospect',
    'Large national provider. Initial outreach done.',
    49.2839,
    -123.1214
  );

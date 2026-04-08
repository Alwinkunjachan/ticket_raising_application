  Database (PostgreSQL)                                                                                                                              
  # Start PostgreSQL                                                                                                                                 
  brew services start postgresql@18                                                                                                                  
                                                                                                                                                     
  # Stop PostgreSQL                                                                                                                                  
  brew services stop postgresql@18

  # Restart PostgreSQL                                                                                                                                  
brew services restart postgresql@18

  Server (Express API — port 3000)                                                                                                                   
  cd /Users/alwinkunjachan/Desktop/Project/Ticket_raising_application/server
  npm run dev                                                                                                                                        
                                                            
  Client (Angular — port 4200)                                                                                                                       
  cd /Users/alwinkunjachan/Desktop/Project/Ticket_raising_application/client
  npx ng serve                                                                                                                                       
                                                            
  Open http://localhost:4200 in your browser once both server and client are running.

  Database commands
  ⏺ # From terminal                                                                                                                                                                   
  psql -l                                                                                                                         
                                                                                                                                                                                    
  Or once inside psql:                                                                                                                                                              
                                                                                                                                                                                    
  -- List all databases                                                                                                                                                             
  \l                                                                                                                                                                                

  -- Connect to a different database
  \c database_name

    # Connect to the linear_clone database
  psql linear_clone

  Once inside, useful commands:

  -- List all tables
  \dt

  -- View table structure
  \d issues
  \d projects

  -- Query data
  SELECT * FROM projects;
  SELECT identifier, title, status, priority FROM issues;
  SELECT * FROM members;

  -- Count issues
  SELECT COUNT(*) FROM issues;

  -- Exit
  \q

  INSERT INTO projects (id, name, identifier, description, issue_counter, created_at, updated_at)                                 
  VALUES (gen_random_uuid(), 'My Project', 'MYP', 'Description', 0, NOW(), NOW());                                                                             
                                                                                                                                                               
  INSERT INTO members (id, name, email, created_at, updated_at)                                                                                                
  VALUES (gen_random_uuid(), 'John Doe', 'john@example.com', NOW(), NOW());                                                                                    
                                                                                                                                                               
  -- UPDATE (Modify)                                        
  UPDATE projects SET name = 'New Name' WHERE identifier = 'MYP';
  UPDATE issues SET status = 'done' WHERE identifier = 'LIN-1';
  UPDATE members SET name = 'Jane Doe' WHERE email = 'john@example.com';                                                                                       
                                                                                                                                                               
  -- DELETE (Remove)                                                                                                                                           
  DELETE FROM issues WHERE identifier = 'LIN-1';                                                                                                               
  DELETE FROM projects WHERE identifier = 'MYP';            
  DELETE FROM members WHERE email = 'john@example.com';
                                                                                                                                                               
  -- Delete all rows from a table
  DELETE FROM issues;                                                                                                                                          
                                                            
  -- Delete with condition                                                                                                                                     
  DELETE FROM issues WHERE status = 'cancelled';
  DELETE FROM issues WHERE project_id = (SELECT id FROM projects WHERE identifier = 'LIN');
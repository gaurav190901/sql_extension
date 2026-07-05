-- Problem : find-users-with-valid-e-mails
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-07-05T16:44:37.891Z
--

select * 
from users
where mail regexp '^[A-Za-z][A-Za-z0-9_.-]*@leetcode\\.com$'
and mail like binary'%@leetcode.com';
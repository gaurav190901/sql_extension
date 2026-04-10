-- Problem : find-customer-referee
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-04-10T10:13:57.799Z
--

select name from customer where referee_id!=2 OR referee_id is NULL;
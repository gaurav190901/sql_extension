-- Problem : fix-names-in-a-table
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-04-11T09:57:19.116Z
--

# Write your MySQL query statement below
select user_id,concat(upper(left(name,1)),lower(substring(name,2)))as name from users order by user_id;
-- Problem : not-boring-movies
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-04-10T10:19:52.457Z
--

# Write your MySQL query statement below
select * from cinema where mod(id,2)!=0 and description !='boring' order by rating desc;
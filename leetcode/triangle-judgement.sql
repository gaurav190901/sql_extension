-- Problem : triangle-judgement
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-07-12T17:07:55.944Z
--

# Write your MySQL query statement below
select *,if(x+y>z and z+x>y and z+y>x,'Yes','No')as triangle from triangle;
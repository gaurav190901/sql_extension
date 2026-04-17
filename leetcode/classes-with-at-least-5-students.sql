-- Problem : classes-with-at-least-5-students
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-04-17T06:25:21.052Z
--

# Write your MySQL query statement below
select class from courses group by class having count(student)>=5;
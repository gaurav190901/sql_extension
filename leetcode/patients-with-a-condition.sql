-- Problem : patients-with-a-condition
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-07-13T15:50:53.285Z
--

# Write your MySQL query statement below
select * from patients where conditions like ('DIAB1%') or conditions like ('% DIAB1%');